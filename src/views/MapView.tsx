import { useEffect, useMemo, useState, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import { STATIONS } from '@/data/stations';
import { VETC_USER } from '@/data/vetcUser';
import { markerColor, makePrediction } from '@/data/mockHelpers';
import { formatVND } from '@/utils/formatVND';
import { t } from '@/i18n/translations';
import 'leaflet/dist/leaflet.css';

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.flyTo(center, 13, { duration: 1 }); }, [center, map]);
  return null;
}

function PredictionSparkline({ data }: { data: number[] }) {
  const lang = useAppStore((s) => s.lang);
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
        {trend < 0 ? t('queue_clear', lang) : trend > 0 ? t('queue_busy', lang) : t('queue_stable', lang)}
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
  const lang = useAppStore((s) => s.lang);

  let queue = queueOverrides[station.id] ?? station.queue;
  if (rushHourActive) queue = Math.min(Math.ceil(queue * 2.5), station.slots * 3);
  const waitMins = Math.ceil((queue / Math.max(station.slots, 1)) * station.avgMins);
  const color = markerColor(queue, station.slots);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
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
          {isBest && <span className="text-[10px] bg-tasco-blue/20 text-tasco-blue px-1.5 py-0.5 rounded-full">⭐ {t('badge_best', lang)}</span>}
          {station.evCertified && <span className="text-[10px] bg-ev-green/20 text-ev-green px-1.5 py-0.5 rounded-full">⚡ EV</span>}
        </div>
      </div>
      <div className="flex items-center gap-3 mt-2">
        <span className="font-mono text-xs px-2 py-0.5 rounded-full" style={{ background: `${color}22`, color }}>
          ~{waitMins} {t('mins_unit', lang)}
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
          aria-label={t('book_btn', lang)}
        >
          {t('book_btn', lang)}
        </button>
      </div>
    </motion.div>
  );
}

export default function MapView() {
  const {
    selectedStationId, setSelectedStation, mapFilter, setMapFilter,
    rushHourActive, toggleRushHour, queueOverrides, setQueueOverride,
    vetcBarVisible, setVetcBarVisible, addToast, setActiveView, lang
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
        const name = station.name.split('@')[1]?.trim() || station.name;
        if (next === 0 && current > 0) {
          addToast({ message: t('toast_cleared', lang, { name }), type: 'success' });
        }
        if (next >= station.slots * 2) {
          addToast({ message: t('toast_full', lang, { name }), type: 'warning' });
        }
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [queueOverrides, setQueueOverride, addToast, lang]);

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

  // Eco counter
  const totalQueuedCars = STATIONS.reduce((sum, s) => sum + (queueOverrides[s.id] ?? s.queue), 0);
  const idleMinsSaved = rushHourActive ? 0 : Math.round(totalQueuedCars * 3.2);
  const co2Avoided = (idleMinsSaved * 0.017).toFixed(2);

  const filters: { id: typeof mapFilter; labelKey: 'filter_balanced' | 'filter_fastest' | 'filter_nearest' | 'filter_cheapest' }[] = [
    { id: 'balanced', labelKey: 'filter_balanced' },
    { id: 'fastest', labelKey: 'filter_fastest' },
    { id: 'nearest', labelKey: 'filter_nearest' },
    { id: 'cheapest', labelKey: 'filter_cheapest' },
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
            id="vetc-bar"
          >
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">
                  🛣️ {t('vetc_alert', lang)}
                </div>
                <div className="text-xs text-foreground mt-1">
                  {t('vetc_cause', lang, { dist: VETC_USER.lastTrip.distanceKm.toLocaleString(), pct: VETC_USER.lastTrip.dirtPrediction })}
                </div>
                <div className="text-xs text-vetc-orange mt-1 flex items-center gap-1">
                  ⭐ {t('vetc_cause_rec', lang)}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => { setMapFilter('nearest'); setSelectedStation(STATIONS.find(s => s.evCertified)?.id || STATIONS[0].id); }}
                  className="text-xs text-vetc-orange hover:text-vetc-orange/80 transition-colors"
                >
                  {t('vetc_find', lang)}
                </button>
                <button onClick={() => setVetcBarVisible(false)} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Dismiss">✕</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 px-4 py-2 flex-wrap" id="map-filter">
        <div className="flex gap-1 bg-muted/30 rounded-lg p-0.5">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setMapFilter(f.id)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                mapFilter === f.id ? 'bg-tasco-blue/20 text-tasco-blue' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(f.labelKey, lang)}
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
        <div className="ml-auto flex items-center gap-2" id="rush-toggle">
          <span className="text-xs text-muted-foreground">{t('rush_toggle', lang)}</span>
          <button
            onClick={toggleRushHour}
            className={`w-10 h-5 rounded-full transition-all duration-300 relative ${
              rushHourActive ? 'bg-tasco-red' : 'bg-muted'
            }`}
            role="switch"
            aria-checked={rushHourActive}
            aria-label={t('rush_toggle', lang)}
          >
            <div className={`w-4 h-4 rounded-full bg-foreground absolute top-0.5 transition-all duration-300`}
              style={{ left: rushHourActive ? '22px' : '2px' }} />
          </button>
        </div>
      </div>

      {/* Eco counter */}
      <AnimatePresence>
        {rushHourActive ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-1"
          >
            <div className="text-[11px] text-tasco-red/80 flex items-center gap-1">
              {t('rush_eco_on', lang, { n: totalQueuedCars, co2: (totalQueuedCars * 0.054).toFixed(1) })}
            </div>
          </motion.div>
        ) : totalQueuedCars > 0 ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-1"
          >
            <div className="text-[11px] text-ev-green/80 flex items-center gap-1">
              🌱 {t('rush_eco', lang, { n: idleMinsSaved, co2: co2Avoided })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Side Panel */}
        <div className="w-[340px] lg:w-[380px] shrink-0 glass m-3 mr-0 rounded-2xl overflow-hidden flex flex-col">
          {/* Journey context strip */}
          <div className="px-3 pt-3 pb-2">
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="text-ev-green">✓ {t('journey_logged', lang)}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-tasco-blue font-medium">● {t('journey_finding', lang)}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-muted-foreground">💳 {t('journey_autopay', lang)}</span>
            </div>
          </div>
          <div className="px-3 pb-2 border-b border-border">
            <div className="text-sm font-heading font-semibold">{t('map_title', lang, { n: filteredStations.length })}</div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin">
            {filteredStations.map((station) => (
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
                    <div className="text-xs p-1" style={{ color: '#111', minWidth: 220 }}>
                      <div className="font-bold text-sm mb-1">{station.name}</div>
                      <div className="mb-1">{station.address}</div>
                      <div className="flex gap-2 mb-1">
                        <span>{t('wait_est', lang)}: ~{Math.ceil((queue / Math.max(station.slots, 1)) * station.avgMins)} {t('mins_unit', lang)}</span>
                        <span>⭐ {station.rating}</span>
                      </div>
                      <div className="flex gap-1 mb-1">
                        {station.evCertified && <span style={{ color: '#16a34a' }}>⚡ EV</span>}
                        {station.mitsuiCert && <span style={{ color: '#2563eb' }}>🏅 Mitsui</span>}
                      </div>
                      <div className="mb-2">{formatVND(station.priceMin)} – {formatVND(station.priceMax)}</div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveView('simulation'); }}
                        style={{
                          width: '100%', padding: '6px 0', borderRadius: 8,
                          background: '#0ea5e9', color: '#fff', border: 'none',
                          fontWeight: 600, fontSize: 12, cursor: 'pointer',
                        }}
                      >
                        🚗 {t('book_btn', lang)}
                      </button>
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
