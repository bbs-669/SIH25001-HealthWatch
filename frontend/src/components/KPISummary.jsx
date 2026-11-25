import React, { useState } from 'react';
import { MapPin, AlertOctagon, Package, Droplets, Brain, RefreshCw, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export default function KPISummary({ villages = [], resources = [], onRecalculateAll }) {
  const [recalculating, setRecalculating] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const totalVillages = villages.length;
  
  // High risk villages: Orange or Red
  const highRiskVillages = villages.filter(
    (v) => v.risk_level === 'ORANGE' || v.risk_level === 'RED'
  );

  const totalORS = resources.reduce((acc, r) => acc + (r.ors_packets || 0), 0);
  const totalChlorine = resources.reduce((acc, r) => acc + (r.chlorine_tablets || 0), 0);
  const totalNurses = resources.reduce((acc, r) => acc + (r.nurses_available || 0), 0);

  const handleRunAiDiagnostics = async () => {
    setRecalculating(true);
    setToastMessage(null);
    try {
      const res = await api.recalculateAllRisk();
      setToastMessage(`AI Model Recalculated: ${res.villages_updated} Villages Evaluated (${res.summary?.high_risk_alerts || 0} High Risk Alerts)`);
      if (onRecalculateAll) {
        onRecalculateAll();
      }
      setTimeout(() => setToastMessage(null), 4000);
    } catch (e) {
      console.error('Failed to run AI diagnostics:', e);
      setToastMessage('AI diagnostics error. Please check backend connection.');
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setRecalculating(false);
    }
  };

  const cards = [
    {
      title: 'Monitored Villages',
      value: totalVillages,
      subtitle: 'Assam & Meghalaya Focus',
      icon: MapPin,
      gradient: 'from-blue-600/20 to-cyan-600/10',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
    },
    {
      title: 'Active Outbreak Alerts',
      value: highRiskVillages.length,
      subtitle: highRiskVillages.length > 0 ? `${highRiskVillages.map(v => v.code).join(', ')} Critical` : 'All Quiet',
      icon: AlertOctagon,
      gradient: highRiskVillages.length > 0 ? 'from-amber-600/30 to-rose-600/20' : 'from-emerald-600/20 to-teal-600/10',
      border: highRiskVillages.length > 0 ? 'border-amber-500/40' : 'border-emerald-500/30',
      text: highRiskVillages.length > 0 ? 'text-amber-400' : 'text-emerald-400',
      pulse: highRiskVillages.length > 0,
    },
    {
      title: 'Available ORS Stock',
      value: totalORS.toLocaleString(),
      subtitle: 'Across 2 Regional PHCs',
      icon: Package,
      gradient: 'from-purple-600/20 to-indigo-600/10',
      border: 'border-purple-500/30',
      text: 'text-purple-400',
    },
    {
      title: 'Chlorine Water Tablets',
      value: totalChlorine.toLocaleString(),
      subtitle: `${totalNurses} Field Nurses Ready`,
      icon: Droplets,
      gradient: 'from-teal-600/20 to-emerald-600/10',
      border: 'border-teal-500/30',
      text: 'text-teal-400',
    },
  ];

  return (
    <div className="mb-6 space-y-3">
      {/* Top Action Bar with AI Diagnostics Trigger */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-900/60 border border-slate-800/80 px-4 py-2 rounded-xl text-xs">
        <div className="flex items-center space-x-2 text-slate-300">
          <Brain className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-200">Epidemiological Risk Surveillance:</span>
          <span className="text-slate-400 hidden md:inline">Monsoon Turbidity, Coliform Anomaly & Symptom Clustering</span>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          {toastMessage && (
            <span className="text-[11px] font-medium text-cyan-300 bg-cyan-950/80 border border-cyan-800/60 px-2.5 py-0.5 rounded-full flex items-center space-x-1 animate-fadeIn">
              <CheckCircle2 className="w-3 h-3 text-cyan-400" />
              <span>{toastMessage}</span>
            </span>
          )}
          <button
            onClick={handleRunAiDiagnostics}
            disabled={recalculating}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md shadow-cyan-600/20 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : ''}`} />
            <span>{recalculating ? 'Analyzing...' : 'Run AI Diagnostics'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${card.gradient} bg-slate-900/80 p-4 border ${card.border} shadow-lg transition-all hover:scale-[1.01]`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{card.title}</p>
                  <div className="flex items-baseline space-x-2 mt-1">
                    <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{card.value}</span>
                    {card.pulse && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                        ALERT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 truncate">{card.subtitle}</p>
                </div>
                <div className={`p-2.5 rounded-lg bg-slate-800/80 ${card.text}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
