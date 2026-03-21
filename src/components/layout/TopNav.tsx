import { useAppStore, type ViewType } from '@/store/appStore';
import { motion } from 'framer-motion';

const TABS: { id: ViewType; label: string; icon: string }[] = [
  { id: 'map', label: 'Bản đồ', icon: '🗺️' },
  { id: 'simulation', label: 'Mô phỏng', icon: '🚗' },
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
];

export default function TopNav() {
  const activeView = useAppStore((s) => s.activeView);
  const setActiveView = useAppStore((s) => s.setActiveView);

  return (
    <nav className="h-14 flex items-center justify-between px-6 border-b border-border bg-card/80 backdrop-blur-md relative z-50">
      <div className="flex items-center gap-3">
        <span className="font-heading font-bold text-lg text-tasco-blue tracking-tight">TASCO</span>
        <span className="text-xs text-muted-foreground hidden sm:block">Smart Mobility. Clean Every Mile.</span>
      </div>
      <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`relative px-4 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
              activeView === tab.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/70'
            }`}
          >
            {activeView === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-card rounded-lg shadow-lg"
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="w-2 h-2 rounded-full bg-tasco-green animate-pulse" />
        <span className="hidden sm:block">Live</span>
      </div>
    </nav>
  );
}
