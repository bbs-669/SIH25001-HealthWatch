import React, { useState } from 'react';
import { 
  ClipboardList, 
  Droplet, 
  AlertCircle, 
  CheckCircle2, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Trash2, 
  Clock, 
  ShieldAlert, 
  Send
} from 'lucide-react';
import { api } from '../services/api';

// UUID v4 generator helper
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function AshaPortal({ 
  villages = [], 
  offlineQueue, 
  initialVillageCode = 'V101', 
  onReportSubmitted 
}) {
  const [activeFormTab, setActiveFormTab] = useState('symptom'); // 'symptom' | 'water'
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error'|'queued', message: '' }

  // Symptom Form State
  const [symptomData, setSymptomData] = useState({
    village_code: initialVillageCode || 'V101',
    reporter_role: 'ASHA',
    symptom_type: 'DIARRHEA',
    case_count: 1,
    severity: 'MILD',
  });

  // Water Form State
  const [waterData, setWaterData] = useState({
    village_code: initialVillageCode || 'V101',
    source_type: 'WELL',
    ph: 7.0,
    turbidity_ntu: 3.5,
    bacterial_contaminated: false,
    source_method: 'MANUAL_KIT',
  });

  const {
    queue,
    queueCount,
    effectiveOnline,
    isSimulatedOffline,
    toggleOfflineMode,
    enqueueReport,
    removeQueueItem,
    clearQueue,
    flushQueue,
    isSyncing,
    lastSyncResult,
  } = offlineQueue;

  // Handle Symptom Submission
  const handleSubmitSymptom = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    const sync_uuid = `asha-${generateUUID()}`;
    const payload = {
      ...symptomData,
      case_count: Number(symptomData.case_count),
      sync_uuid,
    };

    if (!effectiveOnline) {
      // Offline mode: store in local queue
      enqueueReport('SYMPTOM', payload);
      setFeedback({
        type: 'queued',
        message: `Offline mode active. Symptom report saved to local queue (UUID: ${sync_uuid.slice(0, 8)}...). It will auto-sync when back online.`,
      });
      setSubmitting(false);
      return;
    }

    try {
      const res = await api.submitSymptomReport(payload);
      setFeedback({
        type: 'success',
        message: `Symptom report logged successfully! Case ID: #${res.id} (${res.symptom_type} - ${res.case_count} cases in ${res.village_code}).`,
      });
      if (onReportSubmitted) onReportSubmitted();
    } catch (err) {
      // If network failure occurred, offer to enqueue
      enqueueReport('SYMPTOM', payload);
      setFeedback({
        type: 'queued',
        message: `Network transmission failed: "${err.message}". Report safely cached in offline storage.`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Water Quality Submission
  const handleSubmitWater = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    const payload = {
      ...waterData,
      ph: Number(waterData.ph),
      turbidity_ntu: Number(waterData.turbidity_ntu),
    };

    if (!effectiveOnline) {
      enqueueReport('WATER', payload);
      setFeedback({
        type: 'queued',
        message: `Offline mode active. Water quality test saved to local queue.`,
      });
      setSubmitting(false);
      return;
    }

    try {
      const res = await api.submitWaterLog(payload);
      setFeedback({
        type: 'success',
        message: `Water test logged! Sample ID: #${res.id} (${res.source_type} at ${res.village_code}, pH: ${res.ph}, Turbidity: ${res.turbidity_ntu} NTU).`,
      });
      if (onReportSubmitted) onReportSubmitted();
    } catch (err) {
      enqueueReport('WATER', payload);
      setFeedback({
        type: 'queued',
        message: `Network transmission failed: "${err.message}". Water log safely queued offline.`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Trigger manual sync of offline queue
  const handleFlush = async () => {
    try {
      const res = await flushQueue();
      setFeedback({
        type: 'success',
        message: `Offline Sync Complete! Flushed ${res.syncedCount} queued reports to the central database.`,
      });
      if (onReportSubmitted) onReportSubmitted();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: `Sync failed: ${err.message}`,
      });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Field Reporting Header & Offline Control Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ClipboardList className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white">ASHA & ANM Field Surveillance Portal</h2>
              <p className="text-xs text-slate-400">
                Designed for low-connectivity rural health workers in Assam & Meghalaya with offline sync
              </p>
            </div>
          </div>
        </div>

        {/* Sync Status Controls */}
        <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end">
          <button
            onClick={toggleOfflineMode}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              isSimulatedOffline
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
          >
            {isSimulatedOffline ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
            <span>{isSimulatedOffline ? 'Simulate Offline: ON' : 'Network: ONLINE'}</span>
          </button>

          {queueCount > 0 && (
            <button
              onClick={handleFlush}
              disabled={isSyncing || !effectiveOnline}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white transition ${
                !effectiveOnline
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/30'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync Now ({queueCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-xl border flex items-start space-x-3 text-xs sm:text-sm ${
          feedback.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : feedback.type === 'queued'
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          ) : feedback.type === 'queued' ? (
            <Clock className="w-5 h-5 flex-shrink-0 text-amber-400" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          )}
          <div className="flex-1">
            <p className="font-semibold">{feedback.type === 'queued' ? 'Stored Locally (Offline Queue)' : feedback.type === 'success' ? 'Transmission Successful' : 'Error'}</p>
            <p className="mt-0.5 text-xs opacity-90">{feedback.message}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Dual Form Tabs + Offline Sync Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form Container (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          
          {/* Form Switcher Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950/60">
            <button
              onClick={() => setActiveFormTab('symptom')}
              className={`flex-1 py-3 px-4 text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 border-b-2 transition ${
                activeFormTab === 'symptom'
                  ? 'border-blue-500 text-blue-400 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>1. Symptom Cluster Report</span>
            </button>
            <button
              onClick={() => setActiveFormTab('water')}
              className={`flex-1 py-3 px-4 text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 border-b-2 transition ${
                activeFormTab === 'water'
                  ? 'border-cyan-500 text-cyan-400 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Droplet className="w-4 h-4" />
              <span>2. Field Water Quality Log</span>
            </button>
          </div>

          {/* Form Body */}
          <div className="p-6">
            
            {/* TAB A: SYMPTOM REPORT */}
            {activeFormTab === 'symptom' && (
              <form onSubmit={handleSubmitSymptom} className="space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Village Select */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Target Village</label>
                    <select
                      value={symptomData.village_code}
                      onChange={(e) => setSymptomData({ ...symptomData, village_code: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      {villages.map((v) => (
                        <option key={v.code} value={v.code}>
                          {v.name} ({v.code}) - {v.district}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Reporter Role */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Reporter Role</label>
                    <select
                      value={symptomData.reporter_role}
                      onChange={(e) => setSymptomData({ ...symptomData, reporter_role: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="ASHA">ASHA Worker (Field)</option>
                      <option value="CLINIC">Sub-Centre / Clinic ANM</option>
                      <option value="VILLAGER_SMS">Community Volunteer</option>
                    </select>
                  </div>
                </div>

                {/* Symptom Type Pill Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Symptom Type</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'DIARRHEA', label: 'Diarrhea', icon: '💧' },
                      { id: 'VOMITING', label: 'Vomiting', icon: '🤢' },
                      { id: 'FEVER', label: 'Fever', icon: '🌡️' },
                      { id: 'JAUNDICE', label: 'Jaundice', icon: '🟡' },
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setSymptomData({ ...symptomData, symptom_type: item.id })}
                        className={`py-2.5 px-3 rounded-lg border text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
                          symptomData.symptom_type === item.id
                            ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Case Count */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Observed Case Count</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={symptomData.case_count}
                      onChange={(e) => setSymptomData({ ...symptomData, case_count: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  {/* Severity */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Clinical Severity</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['MILD', 'SEVERE'].map((sev) => (
                        <button
                          type="button"
                          key={sev}
                          onClick={() => setSymptomData({ ...symptomData, severity: sev })}
                          className={`py-2 px-3 rounded-lg border text-xs font-bold transition ${
                            symptomData.severity === sev
                              ? sev === 'SEVERE'
                                ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                                : 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                        >
                          {sev}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{effectiveOnline ? 'Submit Symptom Report (POST /reports/symptom)' : 'Save to Offline Queue (Local Sync)'}</span>
                  </button>
                </div>

              </form>
            )}

            {/* TAB B: WATER QUALITY LOG */}
            {activeFormTab === 'water' && (
              <form onSubmit={handleSubmitWater} className="space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Village Select */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Water Source Village</label>
                    <select
                      value={waterData.village_code}
                      onChange={(e) => setWaterData({ ...waterData, village_code: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                    >
                      {villages.map((v) => (
                        <option key={v.code} value={v.code}>
                          {v.name} ({v.code}) - {v.district}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Water Source Type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Source Type</label>
                    <select
                      value={waterData.source_type}
                      onChange={(e) => setWaterData({ ...waterData, source_type: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="WELL">Deep Borewell / Open Well</option>
                      <option value="RIVER">Brahmaputra / Local River</option>
                      <option value="TAP">Community Tap Standpost</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* pH Value */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-slate-300">pH Level</label>
                      <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                        waterData.ph < 6.5 || waterData.ph > 8.5
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        pH {waterData.ph}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5.0"
                      max="9.0"
                      step="0.1"
                      value={waterData.ph}
                      onChange={(e) => setWaterData({ ...waterData, ph: parseFloat(e.target.value) })}
                      className="w-full accent-cyan-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>Acidic (5.0)</span>
                      <span>Neutral (7.0)</span>
                      <span>Alkaline (9.0)</span>
                    </div>
                  </div>

                  {/* Turbidity NTU */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-slate-300">Turbidity (NTU)</label>
                      <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                        waterData.turbidity_ntu > 10
                          ? 'bg-rose-500/20 text-rose-400'
                          : waterData.turbidity_ntu > 5
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {waterData.turbidity_ntu} NTU
                      </span>
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="100.0"
                      value={waterData.turbidity_ntu}
                      onChange={(e) => setWaterData({ ...waterData, turbidity_ntu: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">WHO Safe Limit: &lt; 5.0 NTU</p>
                  </div>
                </div>

                {/* Bacterial Contamination Toggle */}
                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Rapid Coliform / Bacterial Test</span>
                    <span className="text-[11px] text-slate-400">Did the field H2S or nitrate paper kit indicate bacterial presence?</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWaterData({ ...waterData, bacterial_contaminated: !waterData.bacterial_contaminated })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      waterData.bacterial_contaminated
                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {waterData.bacterial_contaminated ? 'CONTAMINATED (+)' : 'CLEAR (-)'}
                  </button>
                </div>

                {/* Submit Action */}
                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm shadow-lg shadow-cyan-600/30 flex items-center justify-center space-x-2 transition disabled:opacity-50"
                  >
                    <Droplet className="w-4 h-4" />
                    <span>{effectiveOnline ? 'Submit Water Quality Log (POST /reports/water)' : 'Save to Offline Queue (Local Sync)'}</span>
                  </button>
                </div>

              </form>
            )}

          </div>

        </div>

        {/* Right Drawer: Offline Sync Queue Inspector */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col h-full">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Offline Storage Queue</span>
              </h3>
              <p className="text-[11px] text-slate-400">Cached locally in browser localStorage</p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {queueCount} Pending
            </span>
          </div>

          {queueCount === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <CheckCircle2 className="w-10 h-10 text-emerald-500/40 mb-2" />
              <p className="text-xs font-semibold text-slate-400">Queue is Clean</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                Turn on "Simulate Offline" mode above and submit a report to test offline caching and idempotent sync.
              </p>
            </div>
          ) : (
            <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[360px] pr-1">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-950 p-3 rounded-lg border border-slate-800 relative group text-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-amber-400">
                        {item.type === 'SYMPTOM' ? '🩺 Symptom Cluster' : '💧 Water Quality Log'}
                      </span>
                      <p className="text-slate-300 font-mono mt-0.5">
                        Village: <strong>{item.data.village_code}</strong>
                      </p>
                      {item.type === 'SYMPTOM' ? (
                        <p className="text-slate-400 text-[11px]">
                          {item.data.symptom_type} ({item.data.case_count} cases, {item.data.severity})
                        </p>
                      ) : (
                        <p className="text-slate-400 text-[11px]">
                          {item.data.source_type} (pH: {item.data.ph}, {item.data.turbidity_ntu} NTU)
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 font-mono mt-1 truncate">
                        UUID: {item.data.sync_uuid || 'N/A'}
                      </p>
                    </div>
                    <button
                      onClick={() => removeQueueItem(item.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition"
                      title="Delete from offline queue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {queueCount > 0 && (
            <div className="pt-3 border-t border-slate-800 mt-3 flex items-center justify-between">
              <button
                onClick={clearQueue}
                className="text-[11px] text-slate-400 hover:text-rose-400 transition"
              >
                Clear Queue
              </button>
              <button
                onClick={handleFlush}
                disabled={isSyncing || !effectiveOnline}
                className="py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition disabled:opacity-40"
              >
                {isSyncing ? 'Syncing...' : 'Sync to Backend'}
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
