import React, { useState } from 'react';
import { 
  X, 
  Users, 
  AlertTriangle, 
  Shield, 
  Droplet, 
  Brain, 
  RefreshCw, 
  CheckCircle2, 
  Activity, 
  Flame,
  AlertOctagon
} from 'lucide-react';
import { api } from '../services/api';

export default function VillageDetailCard({ 
  village, 
  onClose, 
  onSelectAction, 
  onVillageUpdated 
}) {
  const [recalculating, setRecalculating] = useState(false);
  const [localRiskData, setLocalRiskData] = useState(null);

  if (!village) return null;

  // Active risk metrics (use local re-scored data if freshly recalculated)
  const currentRiskScore = localRiskData?.risk_score ?? village.risk_score ?? 0;
  const currentRiskLevel = localRiskData?.risk_level ?? village.risk_level ?? 'GREEN';
  const currentProbability = localRiskData?.outbreak_probability ?? village.outbreak_probability ?? 0.1;
  const currentFactors = localRiskData?.risk_factors || village.risk_factors || [
    'Water Quality Parameters Normal & Low Symptom Incidence'
  ];

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

  const badge = getRiskBadge(currentRiskLevel);

  // Trigger on-demand AI risk recalculation
  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const analysis = await api.getVillageRiskAnalysis(village.code);
      setLocalRiskData(analysis);
      if (onVillageUpdated) {
        onVillageUpdated();
      }
    } catch (err) {
      console.error('Failed to recalculate risk:', err);
    } finally {
      setRecalculating(false);
    }
  };

  const getFactorTagStyle = (factorText) => {
    const text = factorText.toLowerCase();
    if (text.includes('bacterial') || text.includes('critical') || text.includes('severe')) {
      return {
        bg: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
        icon: AlertOctagon,
      };
    }
    if (text.includes('turbidity') || text.includes('surge') || text.includes('spike')) {
      return {
        bg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
        icon: Flame,
      };
    }
    if (text.includes('diarrhea') || text.includes('vomiting') || text.includes('fever') || text.includes('sms')) {
      return {
        bg: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
        icon: Activity,
      };
    }
    return {
      bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
      icon: CheckCircle2,
    };
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl relative">
      
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-bold text-white">{village.name}</h3>
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {village.code}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            District: <span className="text-slate-200 font-medium">{village.district}</span>
          </p>
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

      {/* Risk Metrics Grid */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        
        {/* Risk Score */}
        <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-slate-400">Epidemiological Risk</p>
            <span className="font-mono text-[10px] text-slate-400">Score / 100</span>
          </div>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="text-xl font-extrabold text-white font-mono">{currentRiskScore}</span>
            <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold border ${badge.bg}`}>
              {badge.label}
            </span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                currentRiskLevel === 'RED' ? 'bg-rose-500' :
                currentRiskLevel === 'ORANGE' ? 'bg-amber-500' :
                currentRiskLevel === 'YELLOW' ? 'bg-yellow-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, currentRiskScore))}%` }}
            />
          </div>
        </div>

        {/* Population & Outbreak Likelihood */}
        <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-400 flex items-center space-x-1">
              <Users className="w-3 h-3 text-slate-400" />
              <span>Population</span>
            </p>
            <p className="text-base font-bold text-white mt-0.5">
              {village.population?.toLocaleString() || 'N/A'}
            </p>
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Outbreak Likelihood:</span>
            <span className={`font-mono font-bold ${
              currentProbability >= 0.7 ? 'text-rose-400' :
              currentProbability >= 0.4 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {Math.round(currentProbability * 100)}%
            </span>
          </div>
        </div>

      </div>

      {/* Explainable AI Risk Drivers Section */}
      <div className="mt-4 pt-3.5 border-t border-slate-800/80">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-300">
            <Brain className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI Risk Drivers (Explainable Surveillance)</span>
          </div>
          
          {/* Recalculate AI Risk Button */}
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-cyan-500/30 transition disabled:opacity-50"
            title="Run on-demand inference with trained scikit-learn model"
          >
            <RefreshCw className={`w-3 h-3 ${recalculating ? 'animate-spin' : ''}`} />
            <span>{recalculating ? 'Scoring...' : 'Recalculate AI Risk'}</span>
          </button>
        </div>

        {/* Contributing Risk Factor Tags */}
        <div className="space-y-1.5">
          {currentFactors.map((factor, idx) => {
            const style = getFactorTagStyle(factor);
            const Icon = style.icon;
            return (
              <div
                key={idx}
                className={`flex items-start space-x-2 p-2 rounded-lg border text-xs leading-tight transition ${style.bg}`}
              >
                <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span className="font-medium">{factor}</span>
              </div>
            );
          })}
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
