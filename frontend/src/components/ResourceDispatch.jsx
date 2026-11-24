import React, { useState } from 'react';
import { 
  Package, 
  Droplets, 
  Stethoscope, 
  Users, 
  Truck, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  ShieldCheck,
  Building2,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';

export default function ResourceDispatch({ 
  resources = [], 
  villages = [], 
  onRefresh, 
  preselectedVillageCode 
}) {
  const [selectedPhcId, setSelectedPhcId] = useState(resources[0]?.id || 1);
  const [targetVillageCode, setTargetVillageCode] = useState(preselectedVillageCode || 'V101');
  const [orsCount, setOrsCount] = useState(50);
  const [chlorineCount, setChlorineCount] = useState(100);
  const [testKitsCount, setTestKitsCount] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Active PHC record
  const currentPhc = resources.find((r) => r.id === Number(selectedPhcId)) || resources[0];

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!currentPhc) return;

    // Client-side stock check
    if (orsCount > currentPhc.ors_packets) {
      setFeedback({
        type: 'error',
        message: `Insufficient ORS packets. Available: ${currentPhc.ors_packets}, Requested: ${orsCount}`,
      });
      return;
    }

    if (chlorineCount > currentPhc.chlorine_tablets) {
      setFeedback({
        type: 'error',
        message: `Insufficient Chlorine tablets. Available: ${currentPhc.chlorine_tablets}, Requested: ${chlorineCount}`,
      });
      return;
    }

    if (testKitsCount > currentPhc.test_kits) {
      setFeedback({
        type: 'error',
        message: `Insufficient Test kits. Available: ${currentPhc.test_kits}, Requested: ${testKitsCount}`,
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    const payload = {
      phc_id: Number(currentPhc.id),
      target_village_code: targetVillageCode,
      ors_packets: Number(orsCount),
      chlorine_tablets: Number(chlorineCount),
      test_kits: Number(testKitsCount),
    };

    try {
      const res = await api.dispatchResources(payload);
      setFeedback({
        type: 'success',
        message: `${res.message} Dispatched ${orsCount} ORS packets and ${chlorineCount} chlorine tablets to ${res.dispatched_to}.`,
        details: res,
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: `Dispatch failed: ${err.message}`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <span className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Truck className="w-6 h-6" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-white">PHC Medical Inventory & Emergency Dispatch</h2>
            <p className="text-xs text-slate-400">
              District surveillance portal for rapid distribution of ORS and water chlorination supplies
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Stock</span>
        </button>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div className={`p-4 rounded-xl border flex items-start space-x-3 text-xs sm:text-sm ${
          feedback.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          )}
          <div>
            <p className="font-semibold">{feedback.type === 'success' ? 'Dispatch Approved & Stock Deducted' : 'Dispatch Error'}</p>
            <p className="mt-0.5 text-xs opacity-90">{feedback.message}</p>
          </div>
        </div>
      )}

      {/* Primary Health Centre (PHC) Inventory Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {resources.map((phc) => {
          const isSelected = currentPhc?.id === phc.id;
          return (
            <div
              key={phc.id}
              onClick={() => setSelectedPhcId(phc.id)}
              className={`rounded-xl border p-5 transition cursor-pointer relative shadow-xl ${
                isSelected
                  ? 'bg-slate-900 border-purple-500 ring-1 ring-purple-500'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-purple-400" />
                    <h3 className="font-bold text-white text-base">{phc.phc_name}</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">District: <strong className="text-slate-200">{phc.district}</strong></p>
                </div>
                {isSelected && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    SELECTED SOURCE
                  </span>
                )}
              </div>

              {/* Stock Items Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                
                {/* ORS Packets */}
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>ORS Packets</span>
                    <Package className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <p className="text-lg font-extrabold text-white mt-1 font-mono">
                    {phc.ors_packets.toLocaleString()}
                  </p>
                </div>

                {/* Chlorine Tablets */}
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Chlorine Tabs</span>
                    <Droplets className="w-3.5 h-3.5 text-teal-400" />
                  </div>
                  <p className="text-lg font-extrabold text-white mt-1 font-mono">
                    {phc.chlorine_tablets.toLocaleString()}
                  </p>
                </div>

                {/* Diagnostic Test Kits */}
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Water Test Kits</span>
                    <Stethoscope className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <p className="text-lg font-extrabold text-white mt-1 font-mono">
                    {phc.test_kits.toLocaleString()}
                  </p>
                </div>

                {/* Active Nurses */}
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>On-Duty Nurses</span>
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <p className="text-lg font-extrabold text-white mt-1 font-mono">
                    {phc.nurses_available}
                  </p>
                </div>

              </div>

            </div>
          );
        })}
      </div>

      {/* Emergency Stock Dispatch Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 mb-5">
          <Truck className="w-5 h-5 text-purple-400" />
          <h3 className="text-base font-bold text-white">Approve Emergency Relief Supply Dispatch</h3>
        </div>

        <form onSubmit={handleDispatch} className="space-y-5">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Origin PHC Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Source Primary Health Centre (PHC)
              </label>
              <select
                value={selectedPhcId}
                onChange={(e) => setSelectedPhcId(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
              >
                {resources.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.phc_name} ({p.district})
                  </option>
                ))}
              </select>
            </div>

            {/* Target Village Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Target Village for Emergency Relief
              </label>
              <select
                value={targetVillageCode}
                onChange={(e) => setTargetVillageCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
              >
                {villages.map((v) => (
                  <option key={v.code} value={v.code}>
                    {v.name} ({v.code}) - Risk: {v.risk_level}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* Quantities Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                ORS Packets to Dispatch
              </label>
              <input
                type="number"
                min="0"
                max={currentPhc?.ors_packets || 0}
                value={orsCount}
                onChange={(e) => setOrsCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Max Available: <span className="text-white font-mono">{currentPhc?.ors_packets}</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Chlorine Tablets (Purification)
              </label>
              <input
                type="number"
                min="0"
                max={currentPhc?.chlorine_tablets || 0}
                value={chlorineCount}
                onChange={(e) => setChlorineCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Max Available: <span className="text-white font-mono">{currentPhc?.chlorine_tablets}</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Water Testing Diagnostic Kits
              </label>
              <input
                type="number"
                min="0"
                max={currentPhc?.test_kits || 0}
                value={testKitsCount}
                onChange={(e) => setTestKitsCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Max Available: <span className="text-white font-mono">{currentPhc?.test_kits}</span>
              </p>
            </div>

          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || (orsCount === 0 && chlorineCount === 0 && testKitsCount === 0)}
              className="w-full py-3.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center space-x-2 transition disabled:opacity-40"
            >
              <Truck className="w-4 h-4" />
              <span>Approve & Execute Emergency Dispatch (POST /resources/dispatch)</span>
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}
