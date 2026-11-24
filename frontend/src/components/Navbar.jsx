import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  MapPin, 
  ClipboardList, 
  MessageSquare, 
  Truck, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  queueCount, 
  isSimulatedOffline, 
  toggleOfflineMode, 
  effectiveOnline 
}) {
  const [backendStatus, setBackendStatus] = useState('checking'); // 'ok' | 'offline' | 'checking'

  useEffect(() => {
    let isMounted = true;
    const check = async () => {
      try {
        await api.checkHealth();
        if (isMounted) setBackendStatus('ok');
      } catch {
        if (isMounted) setBackendStatus('offline');
      }
    };

    check();
    const interval = setInterval(check, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { id: 'map', label: 'GIS Surveillance Map', icon: MapPin },
    { id: 'asha', label: 'ASHA Field Portal', icon: ClipboardList, badge: queueCount > 0 ? queueCount : null },
    { id: 'sms', label: 'SMS & IoT Simulator', icon: MessageSquare },
    { id: 'resources', label: 'PHC Supply & Dispatch', icon: Truck },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Hackathon Identity */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('map')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg text-white tracking-tight">HealthWatch</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  SIH25001
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Northeast India Water-Borne Disease Early Warning
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 sm:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center space-x-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.label}</span>
                  {item.badge && (
                    <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 font-bold rounded-full text-[10px]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Status Controls */}
          <div className="flex items-center space-x-3">
            
            {/* Backend Connectivity Indicator */}
            <div 
              title={backendStatus === 'ok' ? 'FastAPI Backend Online (8000)' : 'FastAPI Backend Unreachable'}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-slate-300"
            >
              <span className={`w-2 h-2 rounded-full ${
                backendStatus === 'ok' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-rose-500 animate-pulse'
              }`} />
              <span className="hidden lg:inline text-[11px] font-mono">
                {backendStatus === 'ok' ? 'API :8000' : 'API Disconnected'}
              </span>
            </div>

            {/* Offline Simulation Toggle */}
            <button
              onClick={toggleOfflineMode}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isSimulatedOffline
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
              title="Click to toggle offline mode simulation for ASHA testing"
            >
              {isSimulatedOffline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>Simulate Offline: ON</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Online</span>
                </>
              )}
            </button>

          </div>

        </div>
      </div>
    </header>
  );
}
