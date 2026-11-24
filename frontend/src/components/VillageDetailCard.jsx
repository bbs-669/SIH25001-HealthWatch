import React from 'react';
import { X, Users, AlertTriangle, ArrowRight, Shield, Droplet } from 'lucide-react';

export default function VillageDetailCard({ village, onClose, onSelectAction }) {
  if (!village) return null;

  const getRiskBadge = (level) => {
    switch (level) {
      case 'RED':
        return { bg: 'bg-rose-500/20 text-rose-400 border-rose-500/40', label: 'CRITICAL OUTBREAK' };
      case 'ORANGE':
        return { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/40', label: 'HIGH VIGILANCE' };
      case 'YELLOW':
        return { bg: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40', label: 'MODERATE RISK' };
      default:
        return { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', label: 'NORMAL / GREEN' };
    }
  };

  const badge = getRiskBadge(village.risk_level);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl relative">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-bold text-white">{village.name}</h3>
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {village.code}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">District: <span className="text-slate-200 font-medium">{village.district}</span></p>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Risk Metrics */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
          <p className="text-[11px] font-medium text-slate-400">Risk Assessment</p>
          <div className="mt-1">
            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${badge.bg}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1.5">Score: <strong className="text-white">{village.risk_score}</strong>/100</p>
        </div>

        <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
          <p className="text-[11px] font-medium text-slate-400 flex items-center space-x-1">
            <Users className="w-3 h-3 text-slate-400" />
            <span>Population</span>
          </p>
          <p className="text-lg font-bold text-white mt-1">
            {village.population?.toLocaleString() || 'N/A'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Coord: {village.latitude?.toFixed(2)}°, {village.longitude?.toFixed(2)}°
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => onSelectAction && onSelectAction('asha', village.code)}
          className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-semibold transition"
        >
          <Droplet className="w-3.5 h-3.5" />
          <span>Report Symptoms/Water</span>
        </button>

        <button
          onClick={() => onSelectAction && onSelectAction('resources', village.code)}
          className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition"
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Dispatch Stock</span>
        </button>
      </div>
    </div>
  );
}
