import TopNav from '@/components/layout/TopNav';
import ToastContainer from '@/components/layout/ToastContainer';
import MapView from '@/views/MapView';
import SimulationView from '@/views/SimulationView';
import DashboardView from '@/views/DashboardView';
import { useAppStore } from '@/store/appStore';

const Index = () => {
  const activeView = useAppStore((s) => s.activeView);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <TopNav />
      <main className="flex-1 min-h-0">
        {activeView === 'map' && <MapView />}
        {activeView === 'simulation' && <SimulationView />}
        {activeView === 'dashboard' && <DashboardView />}
      </main>
      <ToastContainer />
    </div>
  );
};

export default Index;
