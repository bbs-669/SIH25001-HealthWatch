import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const STORAGE_KEY = 'sih_offline_reports_queue';

export function useOfflineQueue() {
  const [queue, setQueue] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  // Monitor real browser network events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save queue changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error('Failed to write to localStorage', e);
    }
  }, [queue]);

  // Computed effective online status
  const effectiveOnline = isOnline && !isSimulatedOffline;

  // Enqueue a report locally
  const enqueueReport = useCallback((type, data) => {
    const item = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type, // 'SYMPTOM' or 'WATER'
      data,
      enqueuedAt: new Date().toISOString(),
      status: 'PENDING_OFFLINE',
    };
    setQueue((prev) => [item, ...prev]);
    return item;
  }, []);

  // Remove single item from queue
  const removeQueueItem = useCallback((id) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Clear entire queue
  const clearQueue = useCallback(() => {
    setQueue([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Flush queue to backend (demonstrates idempotency & offline sync)
  const flushQueue = useCallback(async () => {
    if (queue.length === 0) return { success: true, count: 0 };
    if (!effectiveOnline) {
      throw new Error('Cannot sync while offline or simulated offline mode is active.');
    }

    setIsSyncing(true);
    setLastSyncResult(null);

    const successfulIds = [];
    const errors = [];

    for (const item of queue) {
      try {
        if (item.type === 'SYMPTOM') {
          await api.submitSymptomReport(item.data);
        } else if (item.type === 'WATER') {
          await api.submitWaterLog(item.data);
        }
        successfulIds.push(item.id);
      } catch (err) {
        errors.push({ id: item.id, error: err.message });
      }
    }

    // Keep only failed items in queue
    setQueue((prev) => prev.filter((item) => !successfulIds.includes(item.id)));

    const result = {
      success: errors.length === 0,
      syncedCount: successfulIds.length,
      failedCount: errors.length,
      errors,
      syncedAt: new Date().toISOString(),
    };

    setLastSyncResult(result);
    setIsSyncing(false);
    return result;
  }, [queue, effectiveOnline]);

  return {
    queue,
    queueCount: queue.length,
    isOnline,
    isSimulatedOffline,
    effectiveOnline,
    setIsSimulatedOffline,
    toggleOfflineMode: () => setIsSimulatedOffline((prev) => !prev),
    enqueueReport,
    removeQueueItem,
    clearQueue,
    flushQueue,
    isSyncing,
    lastSyncResult,
  };
}
