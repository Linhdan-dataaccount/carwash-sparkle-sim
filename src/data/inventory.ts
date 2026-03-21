export interface Chemical {
  name: string;
  unit: string;
  current: number;
  max: number;
  reorderAt: number;
  dailyUse: number;
}

export const CHEMICALS: Chemical[] = [
  { name: 'Foam Shampoo',         unit: 'L',  current: 34, max: 50,  reorderAt: 10, dailyUse: 8  },
  { name: 'EV-Safe Foam',         unit: 'L',  current: 12, max: 20,  reorderAt: 4,  dailyUse: 2  },
  { name: 'Wax Polish',           unit: 'L',  current: 8,  max: 20,  reorderAt: 5,  dailyUse: 3  },
  { name: 'Glass Cleaner',        unit: 'L',  current: 15, max: 30,  reorderAt: 8,  dailyUse: 4  },
  { name: 'Tyre Dressing',        unit: 'L',  current: 3,  max: 15,  reorderAt: 4,  dailyUse: 2  },
  { name: 'Microfibre Cloths',    unit: 'pc', current: 45, max: 100, reorderAt: 20, dailyUse: 12 },
  { name: 'Underbody Protectant', unit: 'L',  current: 6,  max: 12,  reorderAt: 3,  dailyUse: 1  },
];
