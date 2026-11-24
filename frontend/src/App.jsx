import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import KPISummary from './components/KPISummary';
import SurveillanceMap from './components/SurveillanceMap';
import AshaPortal from './components/AshaPortal';
import SmsSimulator from './components/SmsSimulator';
import ResourceDispatch from './components/ResourceDispatch';
import { useOfflineQueue } from './hooks/useOfflineQueue';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('map'); // 'map' | 'asha' | 'sms' | 'resources'
  const [villages, setVillages] = useState([]);
  const [resources, setResources] = useState([]);
  const [preselectedVillageCode, setPreselectedVillageCode] = useState('V101');
  const [loading, setLoading] = useState(true);

  // Offline queue hook
  const offlineQueue = useOfflineQueue();

  // Load all foundational data from FastAPI backend
  const loadData = useCallback(async () => {
    try {
      const [vData, rData] = await Promise.all([
        api.getVillages().catch(() => []),
        api.getResources().catch(() => []),
      ]);
      setVillages(vData || []);
      setResources(rData || []);
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // Polling every 15s for live updates
    return () => clearInterval(interval);
  }, [loadData]);

  // Quick Action Switcher from Map Pin Card
  const handleMapAction = (targetTab, villageCode) => {
    setPreselectedVillageCode(villageCode);
    setActiveTab(targetTab);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      
      {/* Top Navigation & Status Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        queueCount={offlineQueue.queueCount}
        isSimulatedOffline={offlineQueue.isSimulatedOffline}
        toggleOfflineMode={offlineQueue.toggleOfflineMode}
        effectiveOnline={offlineQueue.effectiveOnline}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16">
        
        {/* Top KPI Cards (Always visible on primary dashboard) */}
        <KPISummary villages={villages} resources={resources} />

        {/* Tab 1: GIS Surveillance Risk Map */}
        {activeTab === 'map' && (
          <SurveillanceMap
            villages={villages}
            onSelectAction={handleMapAction}
          />
        )}

        {/* Tab 2: ASHA Field Portal */}
        {activeTab === 'asha' && (
          <AshaPortal
            villages={villages}
            offlineQueue={offlineQueue}
            initialVillageCode={preselectedVillageCode}
            onReportSubmitted={loadData}
          />
        )}

        {/* Tab 3: SMS Simulator */}
        {activeTab === 'sms' && (
          <SmsSimulator onReportSubmitted={loadData} />
        )}

        {/* Tab 4: PHC Resources & Dispatch */}
        {activeTab === 'resources' && (
          <ResourceDispatch
            resources={resources}
            villages={villages}
            onRefresh={loadData}
            preselectedVillageCode={preselectedVillageCode}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950/90 py-5 text-center text-xs text-slate-400">
        <p>Smart India Hackathon (SIH25001) Prototype • Community Health Monitoring & Early Warning System</p>
        <p className="text-[10px] text-slate-500 mt-1">Assam & Meghalaya Rural Health Surveillance Pilot</p>
      </footer>

    </div>
  );
}
