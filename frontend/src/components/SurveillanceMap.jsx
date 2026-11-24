import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  Filter, 
  MapPin, 
  AlertTriangle, 
  Info, 
  Search, 
  ShieldCheck, 
  ChevronRight,
  Droplet
} from 'lucide-react';
import VillageDetailCard from './VillageDetailCard';

// Fix for default Leaflet icon paths in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom SVG Circle Marker Factory based on risk level
function createCustomPin(riskLevel) {
  let color = '#10b981'; // GREEN
  let pulse = false;

  if (riskLevel === 'YELLOW') color = '#f59e0b';
  else if (riskLevel === 'ORANGE') {
    color = '#f97316';
    pulse = true;
  } else if (riskLevel === 'RED') {
    color = '#ef4444';
    pulse = true;
  }

  const html = `
    <div class="custom-marker" style="position: relative; width: 28px; height: 28px;">
      ${pulse ? `<div class="pulse-ring" style="background-color: ${color};"></div>` : ''}
      <div style="
        position: relative;
        width: 24px;
        height: 24px;
        background: ${color};
        border: 2.5px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-pin',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

// Map Controller to fit all village bounds initially and pan when a village is selected
function MapController({ selectedVillage, villages, resetKey, onMapReady }) {
  const map = useMap();
  const initialFittedRef = React.useRef(false);

  // Notify parent component of Leaflet map instance
  React.useEffect(() => {
    if (onMapReady) {
      onMapReady(map);
    }
  }, [map, onMapReady]);

  // Initial fitBounds on loaded villages across Assam & Meghalaya
  React.useEffect(() => {
    if (!initialFittedRef.current && villages && villages.length > 0) {
      const validCoords = villages
        .filter((v) => v.latitude && v.longitude)
        .map((v) => [v.latitude, v.longitude]);

      if (validCoords.length > 0) {
        const bounds = L.latLngBounds(validCoords);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 });
        initialFittedRef.current = true;
      }
    }
  }, [villages, map]);

  // Reset to full Northeast India bounds when requested
  React.useEffect(() => {
    if (resetKey > 0 && villages && villages.length > 0) {
      const validCoords = villages
        .filter((v) => v.latitude && v.longitude)
        .map((v) => [v.latitude, v.longitude]);

      if (validCoords.length > 0) {
        const bounds = L.latLngBounds(validCoords);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 });
      } else {
        map.flyTo([26.15, 92.65], 7, { duration: 1 });
      }
    }
  }, [resetKey, villages, map]);

  // Smooth pan when a village is clicked
  React.useEffect(() => {
    if (selectedVillage && selectedVillage.latitude && selectedVillage.longitude) {
      map.flyTo([selectedVillage.latitude, selectedVillage.longitude], 10, { duration: 1.2 });
    }
  }, [selectedVillage, map]);

  return null;
}

export default function SurveillanceMap({ 
  villages = [], 
  selectedVillage: propSelectedVillage,
  onSelectVillage, 
  onSelectAction 
}) {
  const [map, setMap] = useState(null);
  const [internalSelectedVillage, setInternalSelectedVillage] = useState(null);
  const [highlightCard, setHighlightCard] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [resetKey, setResetKey] = useState(0);

  // Use controlled prop if passed, otherwise fallback to internal state
  const selectedVillage = propSelectedVillage !== undefined ? propSelectedVillage : internalSelectedVillage;

  // Extract unique districts
  const districts = useMemo(() => {
    const list = Array.from(new Set(villages.map((v) => v.district))).filter(Boolean);
    return ['ALL', ...list];
  }, [villages]);

  // Filtered villages
  const filteredVillages = useMemo(() => {
    return villages.filter((v) => {
      const matchSearch =
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.district.toLowerCase().includes(searchQuery.toLowerCase());

      const matchDistrict = districtFilter === 'ALL' || v.district === districtFilter;
      const matchRisk = riskFilter === 'ALL' || v.risk_level === riskFilter;

      return matchSearch && matchDistrict && matchRisk;
    });
  }, [villages, searchQuery, districtFilter, riskFilter]);

  // Central village selection handler
  const handleVillageSelect = (village) => {
    setInternalSelectedVillage(village);
    if (onSelectVillage) {
      onSelectVillage(village);
    }

    if (village) {
      // Trigger temporary glowing highlight on the detail card
      setHighlightCard(true);
      setTimeout(() => setHighlightCard(false), 1200);

      // Smoothly scroll detail card into view if needed
      setTimeout(() => {
        const cardElement = document.getElementById('village-detail-card-panel');
        if (cardElement) {
          cardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 50);
    }
  };

  const handleInspectDetails = (village) => {
    handleVillageSelect(village);
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Filters Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search village name or code (e.g. V101)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-sm text-white pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Filter Dropdowns & Chips */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          
          {/* District Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
            <span className="text-slate-400 font-medium">District:</span>
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer"
            >
              {districts.map((d) => (
                <option key={d} value={d} className="bg-slate-900 text-white">
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Risk Level Filter Chips */}
          <div className="flex items-center space-x-1">
            {['ALL', 'RED', 'ORANGE', 'YELLOW', 'GREEN'].map((risk) => (
              <button
                key={risk}
                onClick={() => setRiskFilter(risk)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                  riskFilter === risk
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {risk}
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* Main Grid: GIS Map + Selected Village Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Interactive Leaflet Map (2 Cols on lg) */}
        <div className="lg:col-span-2 h-[520px] rounded-xl overflow-hidden border border-slate-800 shadow-2xl relative">
          <MapContainer
            center={[26.15, 92.65]}
            zoom={7}
            scrollWheelZoom={true}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController
              selectedVillage={selectedVillage}
              villages={villages}
              resetKey={resetKey}
              onMapReady={setMap}
            />

            {filteredVillages.map((village) => {
              const icon = createCustomPin(village.risk_level);
              return (
                <Marker
                  key={village.code}
                  position={[village.latitude, village.longitude]}
                  icon={icon}
                  eventHandlers={{
                    click: () => handleVillageSelect(village),
                  }}
                >
                  <Popup>
                    <div className="text-xs p-1">
                      <div className="font-bold text-sm text-blue-400 mb-1">{village.name}</div>
                      <div><strong>Code:</strong> {village.code}</div>
                      <div><strong>District:</strong> {village.district}</div>
                      <div><strong>Risk Level:</strong> <span className="font-bold">{village.risk_level}</span></div>
                      <div><strong>Risk Score:</strong> {village.risk_score}</div>
                      <div><strong>Population:</strong> {village.population?.toLocaleString()}</div>
                      <button
                        type="button"
                        ref={(node) => {
                          if (node) {
                            L.DomEvent.disableClickPropagation(node);
                            L.DomEvent.disableScrollPropagation(node);
                          }
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVillageSelect(village);
                        }}
                        className="mt-2.5 w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs text-center shadow-md shadow-blue-600/30 transition flex items-center justify-center space-x-1 cursor-pointer"
                      >
                        <span>Inspect Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Quick Fit All Villages Map Action */}
          <button
            onClick={() => {
              handleVillageSelect(null);
              setResetKey((k) => k + 1);
            }}
            className="absolute top-4 right-4 z-[400] bg-slate-900/95 hover:bg-slate-800 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg backdrop-blur flex items-center space-x-1.5 transition hover:text-white"
            title="Fit zoom to view all monitored villages across Assam & Meghalaya"
          >
            <MapPin className="w-3.5 h-3.5 text-blue-400" />
            <span>Fit All Villages (Zoom 7)</span>
          </button>

          {/* Map Legend Overlay */}
          <div className="absolute bottom-4 left-4 z-[400] bg-slate-900/90 backdrop-blur border border-slate-800 p-2.5 rounded-lg shadow-lg text-[11px] space-y-1">
            <p className="font-bold text-slate-300 uppercase tracking-wider text-[10px] mb-1">Risk Legend</p>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-slate-300">Green: Safe / Normal (&lt; 20)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
              <span className="text-slate-300">Yellow: Moderate Vigilance (20-50)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
              <span className="text-slate-300">Orange: High Alert (50-75)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
              <span className="text-slate-300">Red: Critical Outbreak (&gt; 75)</span>
            </div>
          </div>
        </div>

        {/* Side Panel: Selected Village Info or Quick Guidance */}
        <div id="village-detail-card-panel" className="space-y-4 scroll-mt-20">
          {selectedVillage ? (
            <div className={`transition-all duration-300 rounded-xl ${
              highlightCard ? 'ring-2 ring-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.5)]' : ''
            }`}>
              <VillageDetailCard
                village={selectedVillage}
                onClose={() => handleVillageSelect(null)}
                onSelectAction={onSelectAction}
              />
            </div>
          ) : (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg text-center flex flex-col items-center justify-center min-h-[140px]">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-2">
                <MapPin className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-sm">Select a Village</h4>
              <p className="text-xs text-slate-400 max-w-xs mt-0.5">
                Click any colored pin marker on the map or select from the directory below to view epidemiological risk metrics and dispatch emergency supplies.
              </p>
            </div>
          )}

          {/* Quick Village Directory List */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Village Directory ({filteredVillages.length})
              </h4>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {filteredVillages.map((v) => {
                const isSelected = selectedVillage?.code === v.code;
                return (
                  <div
                    key={v.code}
                    onClick={() => handleVillageSelect(v)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 text-white ring-1 ring-blue-500 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold">{v.name}</span>
                        <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                          {v.code}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{v.district}</p>
                    </div>
                    <div className="text-right flex items-center space-x-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        v.risk_level === 'ORANGE' || v.risk_level === 'RED'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : v.risk_level === 'YELLOW'
                          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {v.risk_level}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
