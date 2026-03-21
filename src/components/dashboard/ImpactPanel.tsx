import { motion } from 'framer-motion';
import { ENV_IMPACT } from '@/data/stations';
import { t, type Lang } from '@/i18n/translations';
import { useAppStore } from '@/store/appStore';

const IMPACT_DATA = [
  { icon: '🌱', color: 'hsl(var(--ev-green))', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)', valueKey: 'co2SavedKg' as const, unit: 'kg CO₂', labelKey: 'impact_co2' as const },
  { icon: '💧', color: '#38bdf8', bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.2)', valueKey: 'waterSavedLitres' as const, unit: 'L', labelKey: 'impact_water' as const },
  { icon: '⏱️', color: 'hsl(var(--tasco-yellow))', bg: 'rgba(255,214,0,0.08)', border: 'rgba(255,214,0,0.2)', valueKey: 'idleMinsSaved' as const, unitFn: (lang: Lang) => lang === 'vi' ? 'phút' : 'min', labelKey: 'impact_idle' as const },
  { icon: '🚗', color: 'hsl(var(--tasco-blue))', bg: 'rgba(0,212,255,0.08)', border: 'rgba(0,212,255,0.2)', valueKey: 'carsRouted' as const, unitFn: (lang: Lang) => lang === 'vi' ? 'xe' : 'cars', labelKey: 'impact_dist' as const },
];

const PHASES = [
  { num: 1, active: true, labelKey: 'phase1' as const },
  { num: 2, active: false, labelKey: 'phase2' as const },
  { num: 3, active: false, labelKey: 'phase3' as const },
];

export function ImpactPanel() {
  const lang = useAppStore((s) => s.lang);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      {/* Header */}
      <div className="glass p-6 text-center">
        <div className="text-4xl mb-3">🌏</div>
        <h3 className="font-heading text-lg font-semibold mb-1">{t('impact_title', lang)}</h3>
        <p className="text-sm text-muted-foreground">{t('impact_sub', lang)}</p>
      </div>

      {/* 4 impact cards */}
      <div className="grid grid-cols-2 gap-3">
        {IMPACT_DATA.map((item, i) => {
          const rawVal = ENV_IMPACT[item.valueKey];
          const unit = 'unitFn' in item ? (item as any).unitFn(lang) : item.unit;
          return (
            <motion.div
              key={item.labelKey}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl p-4"
              style={{ background: item.bg, border: `1px solid ${item.border}` }}
            >
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="font-heading text-xl font-bold" style={{ color: item.color }}>
                {typeof rawVal === 'number' && rawVal % 1 !== 0 ? rawVal.toFixed(1) : rawVal?.toLocaleString()}
                <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {t(item.labelKey, lang, { n: rawVal })}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Roadmap */}
      <div className="glass p-5">
        <h4 className="font-heading text-sm font-semibold mb-4">{t('roadmap_label', lang)}</h4>
        <div className="space-y-4">
          {PHASES.map((phase, i) => (
            <div key={phase.num} className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                phase.active ? 'bg-tasco-blue/20 text-tasco-blue' : 'bg-muted text-muted-foreground'
              }`}>
                {phase.num}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{t(phase.labelKey, lang)}</div>
                {phase.active && (
                  <span className="text-[10px] bg-tasco-green/20 text-tasco-green px-2 py-0.5 rounded-full mt-1 inline-block">
                    {t('roadmap_live', lang)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Scale stats */}
        <div className="flex justify-around mt-5 pt-4 border-t border-border">
          {[
            { n: '3.5M', l: lang === 'vi' ? 'người dùng VETC' : 'VETC users' },
            { n: '120', l: lang === 'vi' ? 'trạm thu phí' : 'toll stations' },
            { n: '86', l: lang === 'vi' ? 'điểm rửa xe' : 'wash locations' },
          ].map((stat) => (
            <div key={stat.n} className="text-center">
              <div className="font-heading text-lg font-bold text-tasco-blue">{stat.n}</div>
              <div className="text-[10px] text-muted-foreground">{stat.l}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
