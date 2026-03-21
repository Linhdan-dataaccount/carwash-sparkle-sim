import { create } from 'zustand';
import type { Order } from '@/data/liveOrders';
import type { ScanResult } from '@/data/mockHelpers';
import { INITIAL_ORDERS } from '@/data/liveOrders';

export type ViewType = 'map' | 'simulation' | 'dashboard';
export type CarType = 'sedan' | 'suv' | 'sports' | 'vinfast_vf8' | 'vinfast_vf9';
export type SimPhase = 'idle' | 'ev_check' | 'entering' | 'scanning' | 'analyzing' | 'results' | 'washing' | 'complete';
export type MapFilter = 'balanced' | 'fastest' | 'nearest' | 'cheapest' | 'ev_only';
export type DashSection = 'overview' | 'orders' | 'inventory' | 'quality' | 'vetc';

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'vetc';
}

interface AppState {
  activeView: ViewType;
  setActiveView: (v: ViewType) => void;

  // Map
  selectedStationId: string | null;
  setSelectedStation: (id: string | null) => void;
  mapFilter: MapFilter;
  setMapFilter: (f: MapFilter) => void;
  rushHourActive: boolean;
  toggleRushHour: () => void;
  queueOverrides: Record<string, number>;
  setQueueOverride: (id: string, q: number) => void;
  vetcBarVisible: boolean;
  setVetcBarVisible: (v: boolean) => void;

  // Simulation
  selectedCar: CarType;
  setSelectedCar: (c: CarType) => void;
  simulationPhase: SimPhase;
  setSimulationPhase: (p: SimPhase) => void;
  washStep: number;
  setWashStep: (s: number) => void;
  scanResults: ScanResult | null;
  setScanResults: (r: ScanResult | null) => void;
  dirtLevel: number;
  setDirtLevel: (d: number) => void;

  // Dashboard
  dashboardSection: DashSection;
  setDashboardSection: (s: DashSection) => void;
  orders: Order[];
  setOrders: (fn: (prev: Order[]) => Order[]) => void;

  // Toasts
  toasts: Toast[];
  addToast: (t: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;

  // Loyalty (mutable for demo)
  totalWashes: number;
  vetcPoints: number;
  addWash: (points: number) => void;
}

let toastCounter = 0;

export const useAppStore = create<AppState>((set) => ({
  activeView: 'map',
  setActiveView: (v) => set({ activeView: v }),

  selectedStationId: null,
  setSelectedStation: (id) => set({ selectedStationId: id }),
  mapFilter: 'balanced',
  setMapFilter: (f) => set({ mapFilter: f }),
  rushHourActive: false,
  toggleRushHour: () => set((s) => ({ rushHourActive: !s.rushHourActive })),
  queueOverrides: {},
  setQueueOverride: (id, q) => set((s) => ({ queueOverrides: { ...s.queueOverrides, [id]: q } })),
  vetcBarVisible: true,
  setVetcBarVisible: (v) => set({ vetcBarVisible: v }),

  selectedCar: 'sedan',
  setSelectedCar: (c) => set({ selectedCar: c }),
  simulationPhase: 'idle',
  setSimulationPhase: (p) => set({ simulationPhase: p }),
  washStep: 0,
  setWashStep: (s) => set({ washStep: s }),
  scanResults: null,
  setScanResults: (r) => set({ scanResults: r }),
  dirtLevel: 65,
  setDirtLevel: (d) => set({ dirtLevel: d }),

  dashboardSection: 'overview',
  setDashboardSection: (s) => set({ dashboardSection: s }),
  orders: [...INITIAL_ORDERS],
  setOrders: (fn) => set((s) => ({ orders: fn(s.orders) })),

  toasts: [],
  addToast: (t) => {
    const id = `toast-${++toastCounter}`;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 5000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),

  totalWashes: 23,
  vetcPoints: 3400,
  addWash: (points) => set((s) => ({ totalWashes: s.totalWashes + 1, vetcPoints: s.vetcPoints + points })),
}));
