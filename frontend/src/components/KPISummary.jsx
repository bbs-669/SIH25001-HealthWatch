import React from 'react';
import { MapPin, AlertOctagon, Package, Droplets, ShieldAlert } from 'lucide-react';

export default function KPISummary({ villages = [], resources = [] }) {
  const totalVillages = villages.length;
  
  // High risk villages: Orange or Red
  const highRiskVillages = villages.filter(
    (v) => v.risk_level === 'ORANGE' || v.risk_level === 'RED'
  );

  const totalORS = resources.reduce((acc, r) => acc + (r.ors_packets || 0), 0);
  const totalChlorine = resources.reduce((acc, r) => acc + (r.chlorine_tablets || 0), 0);
  const totalNurses = resources.reduce((acc, r) => acc + (r.nurses_available || 0), 0);

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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
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
  );
}
