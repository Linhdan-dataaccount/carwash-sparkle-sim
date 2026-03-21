import { motion } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import { t } from '@/i18n/translations';

type JourneyStep = {
  id: string;
  icon: string;
  labelKey: keyof typeof import('@/i18n/translations').T;
  phases: string[];
};

const JOURNEY_STEPS: JourneyStep[] = [
  { id: 'highway', icon: '🛣️', labelKey: 'journey_highway', phases: ['idle'] },
  { id: 'detect', icon: '📡', labelKey: 'journey_detect', phases: ['idle', 'ev_check'] },
  { id: 'scan', icon: '🤖', labelKey: 'journey_scan', phases: ['entering', 'scanning', 'analyzing', 'results'] },
  { id: 'wash', icon: '🚿', labelKey: 'journey_wash', phases: ['washing'] },
  { id: 'pay', icon: '💳', labelKey: 'journey_pay', phases: ['complete'] },
];

export function JourneyBar() {
  const { simulationPhase, lang } = useAppStore();

  let activeIdx = 0;
  for (let i = JOURNEY_STEPS.length - 1; i >= 0; i--) {
    if (JOURNEY_STEPS[i].phases.includes(simulationPhase)) {
      activeIdx = i;
      break;
    }
  }

  return (
    <div className="mx-4 mt-3 px-4 py-2.5 glass rounded-xl">
      <div className="flex items-center justify-between">
        {JOURNEY_STEPS.map((step, i) => {
          const isDone = i < activeIdx;
          const isActive = i === activeIdx;

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              {/* Step node */}
              <div className="flex flex-col items-center gap-1">
                <motion.div
                  animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                  transition={isActive ? { repeat: Infinity, duration: 2 } : {}}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                  style={{
                    background: isDone
                      ? 'rgba(34,197,94,0.2)'
                      : isActive
                        ? 'rgba(0,212,255,0.15)'
                        : 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${isDone ? 'rgba(34,197,94,0.5)' : isActive ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  }}
                >
                  {isDone ? <span className="text-ev-green text-xs">✓</span> : step.icon}
                </motion.div>
                <span
                  className="text-[10px] font-medium whitespace-nowrap"
                  style={{
                    color: isDone
                      ? 'hsl(var(--ev-green))'
                      : isActive
                        ? 'hsl(var(--tasco-blue))'
                        : 'hsl(var(--muted-foreground))',
                  }}
                >
                  {t(step.labelKey, lang)}
                </span>
              </div>

              {/* Connector line */}
              {i < JOURNEY_STEPS.length - 1 && (
                <div className="flex-1 h-[2px] mx-1.5 rounded-full relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  {isDone && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 0.4, delay: i * 0.1 }}
                      className="absolute inset-y-0 left-0 bg-ev-green rounded-full"
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
