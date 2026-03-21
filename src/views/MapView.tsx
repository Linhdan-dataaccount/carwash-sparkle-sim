import { useEffect, useMemo, useState, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import { STATIONS } from '@/data/stations';
import { VETC_USER } from '@/data/vetcUser';
import { markerColor, makePrediction } from '@/data/mockHelpers';
import { formatVND } from '@/utils/formatVND';
import 'leaflet/dist/leaflet.css';

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.flyTo(center, 13, { duration: 1 }); }, [center, map]);
  return null;
}

function PredictionSparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 160},${40 - (v / max) * 36}`).join(' ');
  const trend = data[data.length - 1] - data[0];
  const color = trend < 0 ? '#00ff88' : trend > 0 ? '#ff4444' : '#ffd600';
  return (
    <div className="mt-2">
      <svg width="160" height="44" viewBox="0 0 160 44">
        <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div className="text-xs mt-0.5" style={{ color }}>
        {trend < 0 ? 'Đang giảm ✓' : trend > 0 ? 'Đang tăng ⚠' : 'Ổn định'}
      </div>
    </div>
  );
}

function StationCard({ station, isSelected, isBest, onClick }: {
  station: typeof STATIONS[0]; isSelected: boolean; isBest: boolean; onClick: () => void;
}) {
  const queueOverrides = useAppStore((s) => s.queueOverrides);
  const rushHourActive = useAppStore((s) => s.rushHourActive);
  const setActiveView = useAppStore((s) => s.setActiveView);

  let queue = queueOverrides[station.id] ?? station.queue;
  if (rushHourActive) queue = Math.min(Math.ceil(queue * 2.5), station.slots * 3);
  const waitMins = Math.ceil((queue / Math.max(station.slots, 1)) * station.avgMins);
  const color = markerColor(queue, station.slots);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`p-3 rounded-xl cursor-pointer transition-all duration-200 border ${
        isSelected ? 'border-tasco-blue/50 bg-tasco-blue/5' : 'border-border hover:border-border/50 hover:bg-muted/30'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground truncate">{station.name}</div>
          <div className="text-xs text-muted-foreground truncate">{station.address}</div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {isBest && <span className="text-[10px] bg-tasco-blue/20 text-tasco-blue px-1.5 py-0.5 rounded-full">⭐ Best</span>}
          {station.evCertified && <span className="text-[10px] bg-ev-green/20 text-ev-green px-1.5 py-0.5 rounded-full">⚡ EV</span>}
        </div>
      </div>
      <div className="flex items-center gap-3 mt-2">
        <span className="font-mono text-xs px-2 py-0.5 rounded-full" style={{ background: `${color}22`, color }}>
          ~{waitMins} phút
        </span>
        <div className="flex gap-0.5">
          {Array.from({ length: station.slots }).map((_, i) => (
            <div key={i} className="w-3 h-3 rounded-sm" style={{ background: i < station.inProgress ? color : 'rgba(255,255,255,0.08)' }} />
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-auto">⭐ {station.rating}</span>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-muted-foreground font-mono">{formatVND(station.priceMin)} – {formatVND(station.priceMax)}</span>
        <button
          onClick={(e) => { e.stopPropagation(); setActiveView('simulation'); }}
          className="text-xs text-tasco-blue hover:text-tasco-blue/80 transition-colors"
        >
          Đặt lịch →
        </button>
      </div>
    </motion.div>
  );
}

export default function MapView() {
  const {
    selectedStationId, setSelectedStation, mapFilter, setMapFilter,
    rushHourActive, toggleRushHour, queueOverrides, setQueueOverride,
    vetcBarVisible, setVetcBarVisible, addToast, setActiveView
  } = useAppStore();

  const [evFilter, setEvFilter] = useState(false);
  const [wifiFilter, setWifiFilter] = useState(false);

  // Queue animation
  useEffect(() => {
    const interval = setInterval(() => {
      const station = STATIONS[Math.floor(Math.random() * STATIONS.length)];
      const current = queueOverrides[station.id] ?? station.queue;
      const rand = Math.random();
      let next = current;
      if (rand < 0.4) next = Math.min(current + 1, station.slots + 2);
      else if (rand < 0.8) next = Math.max(0, current - 1);

      if (next !== current) {
        setQueueOverride(station.id, next);
        if (next === 0 && current > 0) {
          addToast({ message: `🟢 ${station.name.split('@')[1]?.trim() || station.name} vừa giải phóng!`, type: 'success' });
        }
        if (next >= station.slots * 2) {
          addToast({ message: `🔴 ${station.name.split('@')[1]?.trim() || station.name} đang đầy`, type: 'warning' });
        }
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [queueOverrides, setQueueOverride, addToast]);

  // Random toasts
  useEffect(() => {
    const interval = setInterval(() => {
      const msgs = [
        { message: '⭐ Best Choice thay đổi → Thủ Đức tiết kiệm 12 phút', type: 'info' as const },
        { message: '🛣️ VETC: Phát hiện hành trình xa — xe có thể cần rửa Premium', type: 'vetc' as const },
      ];
      addToast(msgs[Math.floor(Math.random() * msgs.length)]);
    }, 25000);
    return () => clearInterval(interval);
  }, [addToast]);

  const filteredStations = useMemo(() => {
    let list = [...STATIONS];
    if (evFilter) list = list.filter((s) => s.evCertified);
    if (wifiFilter) list = list.filter((s) => s.hasWifi);

    const getQueue = (s: typeof STATIONS[0]) => {
      let q = queueOverrides[s.id] ?? s.queue;
      if (rushHourActive) q = Math.min(Math.ceil(q * 2.5), s.slots * 3);
      return q;
    };

    switch (mapFilter) {
      case 'fastest':
        list.sort((a, b) => getQueue(a) * a.avgMins - getQueue(b) * b.avgMins);
        break;
      case 'nearest':
        list.sort((a, b) => Math.abs(a.lat - 10.8) - Math.abs(b.lat - 10.8));
        break;
      case 'cheapest':
        list.sort((a, b) => a.priceMin - b.priceMin);
        break;
      default:
        list.sort((a, b) => (b.rating - a.rating) + (getQueue(a) - getQueue(b)) * 0.3);
    }
    return list;
  }, [mapFilter, queueOverrides, rushHourActive, evFilter, wifiFilter]);

  const bestStationId = filteredStations[0]?.id;
  const selectedStation = STATIONS.find((s) => s.id === selectedStationId);
  const mapCenter: [number, number] = selectedStation ? [selectedStation.lat, selectedStation.lng] : [10.79, 106.71];

  const filters: { id: typeof mapFilter; label: string }[] = [
    { id: 'balanced', label: 'Cân bằng' },
    { id: 'fastest', label: 'Nhanh nhất' },
    { id: 'nearest', label: 'Gần nhất' },
    { id: 'cheapest', label: 'Rẻ nhất' },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* VETC Bar */}
      <AnimatePresence>
        {vetcBarVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="vetc-bar mx-4 mt-3 px-4 py-3 overflow-hidden"
          >
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">
                  🛣️ VETC Alert · Xe của bạn có thể cần rửa
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {VETC_USER.lastTrip.route} · {VETC_USER.lastTrip.distanceKm.toLocaleString()}km · {VETC_USER.lastTrip.tollPasses} trạm thu phí · {VETC_USER.lastTrip.hoursAgo} giờ trước
                  {' · '}AI Dirt Prediction: <span className="font-mono text-vetc-orange">{VETC_USER.lastTrip.dirtPrediction}%</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => { setMapFilter('nearest'); setSelectedStation(STATIONS.find(s => s.evCertified)?.id || STATIONS[0].id); }}
                  className="text-xs text-vetc-orange hover:text-vetc-orange/80 transition-colors"
                >
                  Tìm trạm gần nhất →
                </button>
                <button onClick={() => setVetcBarVisible(false)} className="text-muted-foreground hover:text-foreground transition-colors">✕</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
        <div className="flex gap-1 bg-muted/30 rounded-lg p-0.5">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setMapFilter(f.id)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                mapFilter === f.id ? 'bg-tasco-blue/20 text-tasco-blue' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setEvFilter(!evFilter)}
            className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
              evFilter ? 'border-ev-green/50 bg-ev-green/10 text-ev-green' : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            ⚡ EV
          </button>
          <button
            onClick={() => setWifiFilter(!wifiFilter)}
            className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
              wifiFilter ? 'border-tasco-blue/50 bg-tasco-blue/10 text-tasco-blue' : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            📶 WiFi
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Rush Hour</span>
          <button
            onClick={toggleRushHour}
            className={`w-10 h-5 rounded-full transition-all duration-300 relative ${
              rushHourActive ? 'bg-tasco-red' : 'bg-muted'
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-foreground absolute top-0.5 transition-all duration-300 ${
              rushHourActive ? 'left-5.5' : 'left-0.5'
            }`} style={{ left: rushHourActive ? '22px' : '2px' }} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Side Panel */}
        <div className="w-[340px] lg:w-[380px] shrink-0 glass m-3 mr-0 rounded-2xl overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border">
            <div className="text-sm font-heading font-semibold">{filteredStations.length} trạm rửa xe tại TP.HCM</div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin">
            {filteredStations.map((station, i) => (
              <StationCard
                key={station.id}
                station={station}
                isSelected={selectedStationId === station.id}
                isBest={station.id === bestStationId}
                onClick={() => setSelectedStation(station.id)}
              />
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 m-3 rounded-2xl overflow-hidden relative">
          <MapContainer
            center={[10.79, 106.71]}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {selectedStation && <MapUpdater center={[selectedStation.lat, selectedStation.lng]} />}
            {STATIONS.map((station) => {
              let queue = queueOverrides[station.id] ?? station.queue;
              if (rushHourActive) queue = Math.min(Math.ceil(queue * 2.5), station.slots * 3);
              const color = markerColor(queue, station.slots);
              const isBest = station.id === bestStationId;
              const isSelected = station.id === selectedStationId;

              return (
                <CircleMarker
                  key={station.id}
                  center={[station.lat, station.lng]}
                  radius={isSelected ? 14 : isBest ? 12 : 10}
                  pathOptions={{
                    color: isBest ? '#00d4ff' : color,
                    fillColor: color,
                    fillOpacity: 0.8,
                    weight: isBest ? 3 : isSelected ? 2 : 1,
                  }}
                  eventHandlers={{ click: () => setSelectedStation(station.id) }}
                >
                  <Popup>
                    <div className="text-xs p-1" style={{ color: '#111', minWidth: 200 }}>
                      <div className="font-bold text-sm mb-1">{station.name}</div>
                      <div className="mb-1">{station.address}</div>
                      <div className="flex gap-2 mb-1">
                        <span>Chờ: ~{Math.ceil((queue / Math.max(station.slots, 1)) * station.avgMins)} phút</span>
                        <span>⭐ {station.rating}</span>
                      </div>
                      <div className="flex gap-1 mb-1">
                        {station.evCertified && <span className="text-green-600">⚡ EV</span>}
                        {station.mitsuiCert && <span className="text-blue-600">🏅 Mitsui</span>}
                      </div>
                      <div>{formatVND(station.priceMin)} – {formatVND(station.priceMax)}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>

          {/* VETC chip when bar dismissed */}
          {!vetcBarVisible && (
            <button
              onClick={() => setVetcBarVisible(true)}
              className="absolute top-3 left-3 z-[1000] vetc-bar px-3 py-1.5 text-xs flex items-center gap-1.5"
            >
              🛣️ VETC <span className="font-mono text-vetc-orange">{VETC_USER.lastTrip.dirtPrediction}%</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
