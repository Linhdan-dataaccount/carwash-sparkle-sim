import { useEffect, useState, useMemo } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, type DashSection } from '@/store/appStore';
import { CHEMICALS } from '@/data/inventory';
import { REVIEWS } from '@/data/reviews';
import { generateOrder } from '@/data/liveOrders';
import { KPI_DATA, REVENUE_DATA, QUALITY_DATA, VETC_TRANSACTIONS } from '@/data/mockHelpers';
import { STATIONS, PARTNER_TIER_CONFIG, ENV_IMPACT, type PartnerTier } from '@/data/stations';
import { formatVND } from '@/utils/formatVND';
import { t } from '@/i18n/translations';
import { ImpactPanel } from '@/components/dashboard/ImpactPanel';

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const tick = () => {
      const elapsed = performance.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      setValue(Math.round(target * progress));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

function KPICard({ kpi, delay, lang }: { kpi: typeof KPI_DATA[0]; delay: number; lang: 'vi' | 'en' }) {
  const displayValue = useCountUp(kpi.value);
  const formatted = kpi.format === 'vnd' ? formatVND(displayValue) :
    kpi.format === 'rating' ? `⭐ ${(displayValue / 10).toFixed(1)}` :
    kpi.format === 'cars' ? `${displayValue} ${lang === 'vi' ? 'xe' : 'cars'}` : String(displayValue);

  const labelKeys: Record<string, keyof typeof import('@/i18n/translations').T> = {
    'Doanh thu hôm nay': 'kpi_revenue',
    'Xe đã rửa': 'kpi_washed',
    'Đánh giá TB': 'kpi_rating',
    'Hàng chờ hiện tại': 'kpi_queue',
    'Doanh thu VETC': 'kpi_vetc',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`glass p-4 flex-1 min-w-[160px] ${(kpi as any).accent ? 'border-l-[3px] border-l-vetc-orange' : ''}`}
    >
      <div className="text-xs text-muted-foreground mb-1" aria-live="polite">{labelKeys[kpi.label] ? t(labelKeys[kpi.label], lang) : kpi.label}</div>
      <div className="text-xl font-heading font-bold font-mono">{formatted}</div>
      {kpi.delta && (
        <div className={`text-xs mt-1 ${kpi.deltaDir === 'up' ? 'text-tasco-green' : 'text-muted-foreground'}`}>
          {kpi.delta}
        </div>
      )}
    </motion.div>
  );
}

function VNDTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;
  return (
    <div className="glass px-3 py-2 text-xs">
      <div className="font-medium mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-mono">{formatVND(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

type ExtDashSection = DashSection | 'impact';

const SECTION_KEYS: { id: ExtDashSection; labelKey: keyof typeof import('@/i18n/translations').T; icon: string }[] = [
  { id: 'overview', labelKey: 'dash_overview', icon: '📊' },
  { id: 'orders', labelKey: 'dash_orders', icon: '📋' },
  { id: 'inventory', labelKey: 'dash_inventory', icon: '🧪' },
  { id: 'quality', labelKey: 'dash_quality', icon: '🏅' },
  { id: 'vetc', labelKey: 'dash_vetc', icon: '💳' },
  { id: 'partners' as any, labelKey: 'dash_partners', icon: '🤝' },
  { id: 'impact', labelKey: 'dash_impact', icon: '🌱' },
];

export default function DashboardView() {
  const { dashboardSection, setDashboardSection, orders, setOrders, addToast, lang } = useAppStore();
  const [vetcTxns, setVetcTxns] = useState(VETC_TRANSACTIONS);
  const [activeSection, setActiveSection] = useState<ExtDashSection>(dashboardSection);

  // Sync with store for non-impact sections
  useEffect(() => {
    if (activeSection !== 'impact') {
      setDashboardSection(activeSection as DashSection);
    }
  }, [activeSection, setDashboardSection]);

  useEffect(() => {
    setActiveSection(dashboardSection);
  }, [dashboardSection]);

  // Live orders rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setOrders((prev) => {
        const updated = prev.map((o) => {
          if (o.status === 'queued' && Math.random() > 0.6) return { ...o, status: 'in_progress' as const, staff: 'Trần Thị Mai' };
          if (o.status === 'in_progress' && Math.random() > 0.7) return { ...o, status: 'complete' as const };
          return o;
        });
        return [generateOrder(), ...updated].slice(0, 12);
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [setOrders]);

  // VETC txn additions
  useEffect(() => {
    const interval = setInterval(() => {
      const plates = ['51A-123.45', '59B-456.78', '43C-789.01', '72D-234.56'];
      const services = ['Basic Wash', 'Premium Wash', 'Premium EV Wash'];
      const amounts = [-60_000, -65_000, -150_000, -180_000, -200_000];
      const now = new Date();
      setVetcTxns((prev) => [{
        plate: plates[Math.floor(Math.random() * plates.length)],
        service: services[Math.floor(Math.random() * services.length)],
        amount: amounts[Math.floor(Math.random() * amounts.length)],
        time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
      }, ...prev].slice(0, 15));
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Inventory alerts
  useEffect(() => {
    const low = CHEMICALS.filter((c) => c.current <= c.reorderAt);
    if (low.length > 0) {
      const c = low[Math.floor(Math.random() * low.length)];
      const timer = setTimeout(() => {
        addToast({ message: `⚠️ ${c.name} ${lang === 'vi' ? 'còn' : 'at'} ${Math.round((c.current / c.max) * 100)}%`, type: 'warning' });
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [addToast, lang]);

  const rushData = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      demand: i < 6 ? 5 : i < 8 ? 30 + Math.random() * 20 : i < 12 ? 50 + Math.random() * 30 :
        i < 14 ? 40 + Math.random() * 20 : i < 17 ? 55 + Math.random() * 25 :
        i < 20 ? 80 + Math.random() * 20 : 30 + Math.random() * 15,
    }));
  }, []);

  const co2Count = useCountUp(Math.round(ENV_IMPACT.co2SavedKg * 100));

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div className="w-16 hover:w-[200px] transition-all duration-300 overflow-hidden bg-card/50 border-r border-border group shrink-0">
        <div className="py-4 space-y-1">
          {SECTION_KEYS.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-all ${
                activeSection === sec.id ? 'text-tasco-blue bg-tasco-blue/5' : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-label={t(sec.labelKey, lang)}
            >
              <span className="text-lg shrink-0">{sec.icon}</span>
              <span className="text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">{t(sec.labelKey, lang)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-semibold">{t(SECTION_KEYS.find((s) => s.id === activeSection)?.labelKey || 'dash_overview', lang)}</h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
            <span className="w-2 h-2 rounded-full bg-tasco-green" style={{ animation: 'pulse-dot 2s ease-in-out infinite' }} />
            {t('dash_live', lang)}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* OVERVIEW */}
          {activeSection === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* KPI Cards */}
              <div className="flex gap-3 mb-4 flex-wrap">
                {KPI_DATA.map((kpi, i) => <KPICard key={kpi.label} kpi={kpi} delay={i} lang={lang} />)}
                {/* CO₂ KPI Card */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: KPI_DATA.length * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="glass p-4 flex-1 min-w-[160px] border-l-[3px] border-l-ev-green"
                >
                  <div className="text-xs text-muted-foreground mb-1">{t('kpi_co2', lang)}</div>
                  <div className="text-xl font-heading font-bold font-mono text-ev-green">
                    🌱 {(co2Count / 100).toFixed(1)} <span className="text-xs font-normal">kg</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">{t('kpi_co2_sub', lang)}</div>
                </motion.div>
              </div>

              {/* Revenue Chart */}
              <div className="glass p-4 mb-4">
                <h3 className="text-sm font-heading font-semibold mb-3">{t('dash_hourly_rev', lang)}</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={REVENUE_DATA}>
                    <defs>
                      <linearGradient id="basicGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#00d4ff" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="premiumGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="detailGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#6b7280' }} interval={3} />
                    <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} />
                    <Tooltip content={<VNDTooltip />} />
                    <Area type="monotone" dataKey="basic" name="Basic" stroke="#00d4ff" fill="url(#basicGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="premium" name="Premium" stroke="#7c3aed" fill="url(#premiumGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="detailing" name="Detailing" stroke="#f97316" fill="url(#detailGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Two columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="glass p-4">
                  <h3 className="text-sm font-heading font-semibold mb-3">{t('dash_recent_orders', lang)}</h3>
                  <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
                    {orders.slice(0, 6).map((o) => (
                      <motion.div
                        key={o.id}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 text-xs p-2 rounded-lg hover:bg-muted/20 transition-colors"
                      >
                        {o.method === 'VETC' && <span className="text-[10px] bg-vetc-orange/20 text-vetc-orange px-1.5 rounded">VETC</span>}
                        <span className="font-mono text-muted-foreground w-20 shrink-0">{o.plate}</span>
                        <span className="flex-1 truncate">{o.car}</span>
                        <span className="font-mono w-20 text-right">{formatVND(o.price)}</span>
                        <span className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            o.status === 'complete' ? 'bg-tasco-green' :
                            o.status === 'in_progress' ? 'bg-tasco-yellow animate-pulse' : 'bg-muted-foreground'
                          }`} />
                          <span className="text-[10px] text-muted-foreground">
                            {o.status === 'complete' ? t('status_complete', lang) :
                             o.status === 'in_progress' ? t('status_progress', lang) : t('status_queued', lang)}
                          </span>
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="glass p-4">
                  <h3 className="text-sm font-heading font-semibold mb-3">{t('dash_recent_reviews', lang)}</h3>
                  <div className="space-y-2 max-h-[240px] overflow-y-auto">
                    {REVIEWS.map((r, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="text-xs p-2 rounded-lg border border-border"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span>{'⭐'.repeat(r.stars)}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                            r.tag === 'Positive' ? 'bg-tasco-green/10 text-tasco-green' :
                            r.tag === 'Negative' ? 'bg-tasco-red/10 text-tasco-red' : 'bg-tasco-yellow/10 text-tasco-yellow'
                          }`}>{r.tag}</span>
                        </div>
                        <p className="text-muted-foreground">{r.comment}</p>
                        <div className="text-[10px] text-muted-foreground mt-1">{r.car} · {r.ago}</div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ORDERS */}
          {activeSection === 'orders' && (
            <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="glass p-4">
                <div className="space-y-1">
                  <div className="grid grid-cols-7 gap-2 text-xs text-muted-foreground px-2 pb-2 border-b border-border">
                    <span>{t('col_plate', lang)}</span><span>{t('col_car', lang)}</span><span>{t('col_service', lang)}</span><span>{t('col_price', lang)}</span><span>{t('col_payment', lang)}</span><span>{t('col_station', lang)}</span><span>{t('col_status', lang)}</span>
                  </div>
                  <AnimatePresence>
                    {orders.map((o) => (
                      <motion.div
                        key={o.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="grid grid-cols-7 gap-2 text-xs px-2 py-2 rounded-lg hover:bg-muted/20 transition-colors items-center"
                      >
                        <span className="font-mono">{o.plate}</span>
                        <span className="truncate">{o.car}</span>
                        <span className="truncate">{o.service}</span>
                        <span className="font-mono">{formatVND(o.price)}</span>
                        <span>{o.method === 'VETC' ? <span className="text-vetc-orange">VETC</span> : o.method}</span>
                        <span className="truncate">{o.station}</span>
                        <span className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${
                            o.status === 'complete' ? 'bg-tasco-green' :
                            o.status === 'in_progress' ? 'bg-tasco-yellow animate-pulse' : 'bg-muted-foreground'
                          }`} />
                          {o.status === 'complete' ? t('status_complete', lang) : o.status === 'in_progress' ? t('status_progress', lang) : t('status_queued', lang)}
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}

          {/* INVENTORY */}
          {activeSection === 'inventory' && (
            <motion.div key="inventory" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="glass p-4 mb-4">
                <h3 className="text-sm font-heading font-semibold mb-3">{t('dash_stock', lang)}</h3>
                <div className="space-y-3">
                  {CHEMICALS.map((c, i) => {
                    const pct = (c.current / c.max) * 100;
                    const daysLeft = (c.current / c.dailyUse).toFixed(1);
                    const isLow = c.current <= c.reorderAt;
                    const isUrgent = parseFloat(daysLeft) < 2;
                    return (
                      <motion.div
                        key={c.name}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className={`p-3 rounded-lg border ${isLow ? 'border-l-[3px] border-l-vetc-orange border-border' : 'border-border'}`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-medium">{c.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-muted-foreground">{c.current}{c.unit} / {c.max}{c.unit}</span>
                            {isUrgent && <span className="text-[10px] bg-tasco-red/20 text-tasco-red px-1.5 py-0.5 rounded">⚠️ {t('inv_reorder', lang)}</span>}
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, delay: i * 0.06 }}
                            className={`h-full rounded-full ${isLow ? 'bg-tasco-red' : pct < 50 ? 'bg-tasco-yellow' : 'bg-tasco-green'}`}
                          />
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">{t('inv_days', lang, { n: daysLeft })}</div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Rush Forecast */}
              <div className="glass p-4">
                <h3 className="text-sm font-heading font-semibold mb-3">{t('dash_forecast', lang)}</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={rushData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#6b7280' }} interval={3} />
                    <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} />
                    <Tooltip content={({ active, payload, label }) => active && payload ? (
                      <div className="glass px-3 py-2 text-xs"><span className="font-mono">{label}: {Math.round(payload[0].value as number)}%</span></div>
                    ) : null} />
                    <Bar dataKey="demand" fill="#00d4ff" radius={[4, 4, 0, 0]} opacity={0.7} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="vetc-bar p-2 text-xs mt-3">
                  {t('dash_forecast_tip', lang)}
                </div>
              </div>
            </motion.div>
          )}

          {/* QUALITY */}
          {activeSection === 'quality' && (
            <motion.div key="quality" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="glass p-4">
                <h3 className="text-sm font-heading font-semibold mb-3">{t('leaderboard_title', lang)}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left py-2 px-2">#</th>
                        <th className="text-left py-2 px-2">{t('col_name', lang)}</th>
                        <th className="text-center py-2 px-2">{t('col_score', lang)}</th>
                        <th className="text-center py-2 px-2">{t('col_rating', lang)}</th>
                        <th className="text-center py-2 px-2">{t('col_sla', lang)}</th>
                        <th className="text-center py-2 px-2">{t('col_chem', lang)}</th>
                        <th className="text-center py-2 px-2">{t('col_issues', lang)}</th>
                        <th className="text-center py-2 px-2">{t('col_mitsui', lang)}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {QUALITY_DATA.map((row, i) => (
                        <motion.tr
                          key={row.name}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className={`border-b border-border/50 ${
                            row.score >= 90 ? 'text-tasco-green' : row.score >= 75 ? 'text-tasco-yellow' : 'text-tasco-red'
                          }`}
                        >
                          <td className="py-2 px-2 font-mono">{row.rank}</td>
                          <td className="py-2 px-2 text-foreground font-medium">{row.name}</td>
                          <td className="text-center py-2 px-2 font-mono font-bold">{row.score}</td>
                          <td className="text-center py-2 px-2 text-foreground">⭐ {row.rating}</td>
                          <td className="text-center py-2 px-2 font-mono">{row.sla}%</td>
                          <td className="text-center py-2 px-2 text-foreground">{row.chemEff}</td>
                          <td className="text-center py-2 px-2 font-mono">{row.issues}</td>
                          <td className="text-center py-2 px-2">{row.mitsui ? '🏅' : '—'}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                  {t('mitsui_footer', lang, { n: QUALITY_DATA.filter((r) => r.mitsui).length, total: QUALITY_DATA.length })}
                </div>
              </div>
            </motion.div>
          )}

          {/* VETC */}
          {activeSection === 'vetc' && (
            <motion.div key="vetc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Checkout Time Comparison */}
              <div className="glass p-4 mb-4">
                <h3 className="text-sm font-heading font-semibold mb-3">{t('compare_title', lang)}</h3>
                <div className="space-y-3">
                  {/* VETC */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <span className="text-xs font-bold text-vetc-orange">VETC</span>
                          <span className="text-[10px] text-muted-foreground ml-2">{t('compare_auto', lang)}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-ev-green">~11s</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: '7%' }} transition={{ duration: 0.6 }} className="h-full rounded-full bg-ev-green" />
                      </div>
                    </div>
                  </div>
                  {/* Cash */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <span className="text-xs font-medium">{t('compare_cash', lang)}</span>
                          <span className="text-[10px] text-muted-foreground ml-2">{t('compare_cash_sub', lang)}</span>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">~2m 30s</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 0.8, delay: 0.2 }} className="h-full rounded-full bg-tasco-red/60" />
                      </div>
                    </div>
                  </div>
                  {/* Card/QR */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <span className="text-xs font-medium">{t('compare_card', lang)}</span>
                          <span className="text-[10px] text-muted-foreground ml-2">{t('compare_card_sub', lang)}</span>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">~45s</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: '30%' }} transition={{ duration: 0.7, delay: 0.4 }} className="h-full rounded-full bg-tasco-yellow/60" />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Winner callout */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                  <span className="text-xs font-medium text-ev-green">{t('compare_winner', lang)}</span>
                  <span className="text-lg font-heading font-bold text-tasco-blue">13×</span>
                </div>
                {/* Daily scale */}
                <div className="text-[10px] text-muted-foreground mt-2">
                  {t('compare_daily', lang, { n: 89, h: Math.round(89 * 0.6 * 2.3 / 60) })}
                </div>
              </div>

              <div className="glass p-4 mb-4 vetc-bar">
                <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
                  <span>{t('dash_vetc_total', lang)}: <span className="font-mono font-bold">{formatVND(8_200_000)}</span></span>
                  <span>54 / 89 {lang === 'vi' ? 'giao dịch' : 'transactions'} (61%)</span>
                  <span className="text-tasco-green font-mono">+12.450 {lang === 'vi' ? 'điểm phân phối' : 'distribution points'}</span>
                </div>
              </div>

              <div className="glass p-4">
                <h3 className="text-sm font-heading font-semibold mb-3">{t('dash_vetc_txns', lang)}</h3>
                <div className="space-y-1">
                  <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground px-2 pb-2 border-b border-border">
                    <span>{t('col_plate', lang)}</span><span>{t('col_service', lang)}</span><span>{t('col_amount', lang)}</span><span>{t('col_time', lang)}</span>
                  </div>
                  <AnimatePresence>
                    {vetcTxns.map((tx, i) => (
                      <motion.div
                        key={`${tx.plate}-${tx.time}-${i}`}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-4 gap-2 text-xs px-2 py-2 rounded-lg hover:bg-muted/20 transition-colors"
                      >
                        <span className="font-mono">{tx.plate}</span>
                        <span>{tx.service}</span>
                        <span className="font-mono text-vetc-orange">{formatVND(Math.abs(tx.amount))}</span>
                        <span className="text-muted-foreground">{tx.time}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}

          {/* PARTNERS */}
          {activeSection === ('partners' as any) && (
            <motion.div key="partners" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Network Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['tasco_hub', 'verified', 'basic'] as PartnerTier[]).map((tier, i) => {
                  const cfg = PARTNER_TIER_CONFIG[tier];
                  const count = STATIONS.filter(s => s.partnerTier === tier).length;
                  const avgRating = (STATIONS.filter(s => s.partnerTier === tier).reduce((s, st) => s + st.rating, 0) / count).toFixed(1);
                  return (
                    <motion.div
                      key={tier}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="glass p-4"
                      style={{ borderLeft: `3px solid ${cfg.color}` }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{cfg.icon}</span>
                        <span className="text-sm font-heading font-semibold">{lang === 'vi' ? cfg.labelVi : cfg.labelEn}</span>
                      </div>
                      <div className="text-2xl font-heading font-bold font-mono" style={{ color: cfg.color }}>{count}</div>
                      <div className="text-xs text-muted-foreground mt-1">{lang === 'vi' ? 'Đánh giá TB' : 'Avg rating'}: ⭐ {avgRating}</div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Partner List */}
              <div className="glass p-4">
                <h3 className="text-sm font-heading font-semibold mb-3">{t('partner_network', lang)}</h3>
                <div className="space-y-1">
                  <div className="grid grid-cols-6 gap-2 text-xs text-muted-foreground px-2 pb-2 border-b border-border">
                    <span>{t('col_name', lang)}</span><span>{lang === 'vi' ? 'Loại' : 'Tier'}</span><span>⭐</span><span>{lang === 'vi' ? 'Dịch vụ' : 'Services'}</span><span>{lang === 'vi' ? 'Xe/ngày' : 'Cars/day'}</span><span>SmartScan</span>
                  </div>
                  {STATIONS.map((station, i) => {
                    const cfg = PARTNER_TIER_CONFIG[station.partnerTier];
                    return (
                      <motion.div
                        key={station.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="grid grid-cols-6 gap-2 text-xs px-2 py-2 rounded-lg hover:bg-muted/20 transition-colors items-center"
                      >
                        <span className="truncate font-medium">{station.name.replace('Tasco @ ', '').replace('Tasco ', '')}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold w-fit" style={{ background: `${cfg.color}22`, color: cfg.color }}>
                          {cfg.icon} {lang === 'vi' ? cfg.labelVi.split(' ').pop() : cfg.labelEn.split(' ').pop()}
                        </span>
                        <span>{station.rating}</span>
                        <span className="text-muted-foreground">{station.services.length}</span>
                        <span className="font-mono">{Math.round(station.reviewCount / 7)}</span>
                        <span>{station.partnerTier !== 'basic' ? <span className="text-ev-green">✓</span> : <span className="text-muted-foreground">—</span>}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Upgrade Benefits */}
              <div className="glass p-4">
                <h3 className="text-sm font-heading font-semibold mb-3">{t('partner_benefits', lang)}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: '📈', labelKey: 'partner_visibility' as const, stat: '3.2×' },
                    { icon: '📅', labelKey: 'partner_bookings' as const, stat: '+47%' },
                    { icon: '🛡️', labelKey: 'partner_trust' as const, stat: '98%' },
                    { icon: '🤖', labelKey: 'partner_smartscan' as const, stat: lang === 'vi' ? 'Miễn phí' : 'Free' },
                  ].map((benefit, i) => (
                    <motion.div
                      key={benefit.labelKey}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.06 }}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border"
                    >
                      <span className="text-2xl">{benefit.icon}</span>
                      <div className="flex-1">
                        <div className="text-xs font-medium">{t(benefit.labelKey, lang)}</div>
                      </div>
                      <span className="font-mono font-bold text-tasco-blue text-sm">{benefit.stat}</span>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-3 p-3 rounded-xl bg-tasco-blue/5 border border-tasco-blue/20 text-center">
                  <p className="text-xs text-muted-foreground mb-2">
                    {lang === 'vi'
                      ? 'Đối tác Basic có thể nâng cấp lên Verified để sử dụng SmartScan AI và tăng thứ hạng trên bản đồ.'
                      : 'Basic Partners can upgrade to Verified to access SmartScan AI and boost their map ranking.'}
                  </p>
                  <button className="px-4 py-2 rounded-lg bg-tasco-blue text-background text-xs font-semibold hover:brightness-110 transition-all active:scale-[0.97]">
                    {t('partner_upgrade', lang)}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* IMPACT */}
          {activeSection === 'impact' && <ImpactPanel key="impact" />}
        </AnimatePresence>
      </div>
    </div>
  );
}
