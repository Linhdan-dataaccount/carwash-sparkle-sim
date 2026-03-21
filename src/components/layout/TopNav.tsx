import { useAppStore, type ViewType } from '@/store/appStore';
import { t } from '@/i18n/translations';
import { motion } from 'framer-motion';

const TABS: { id: ViewType; labelKey: 'nav_map' | 'nav_sim' | 'nav_dash' | 'nav_scanner'; icon: string }[] = [
  { id: 'map', labelKey: 'nav_map', icon: '🗺️' },
  { id: 'simulation', labelKey: 'nav_sim', icon: '🚗' },
  { id: 'scanner', labelKey: 'nav_scanner', icon: '🤖' },
  { id: 'dashboard', labelKey: 'nav_dash', icon: '📊' },
];

export default function TopNav() {
  const activeView = useAppStore((s) => s.activeView);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const lang = useAppStore((s) => s.lang);
  const setLang = useAppStore((s) => s.setLang);

  return (
    <nav className="h-14 flex items-center justify-between px-6 border-b border-border bg-card/80 backdrop-blur-md relative z-50">
      <div className="flex items-center gap-3">
        <span className="font-heading font-bold text-lg text-tasco-blue tracking-tight">TASCO</span>
        <span className="text-xs text-muted-foreground hidden sm:block">{t('tagline', lang)}</span>
      </div>
      <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            id={`nav-${tab.id === 'simulation' ? 'sim' : tab.id === 'dashboard' ? 'dash' : tab.id}`}
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
              <span className="hidden sm:inline">{t(tab.labelKey, lang)}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
          className="px-3 py-1 rounded-full text-xs font-medium border border-border bg-muted/30 hover:bg-muted/50 transition-all flex items-center gap-1.5 backdrop-blur-sm"
          aria-label="Switch language"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          {t('nav_lang', lang)}
        </button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-tasco-green animate-pulse" />
          <span className="hidden sm:block">Live</span>
        </div>
      </div>
    </nav>
  );
}
