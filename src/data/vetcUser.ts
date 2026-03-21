export const VETC_USER = {
  name: 'Nguyễn Văn An',
  plate: '51A-123.45',
  walletBalance: 2_350_000,
  tier: 'Silver' as const,
  totalWashes: 23,
  streak: 4,
  vetcPoints: 3_400,
  lastTrip: {
    route: 'QL1A · Hà Nội → TP.HCM',
    distanceKm: 1247,
    tollPasses: 14,
    hoursAgo: 2,
    dirtPrediction: 82,
  },
};

export type TierName = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export const TIERS: Record<TierName, { min: number; discount: number; color: string; next: TierName | null; washes: number | null }> = {
  Bronze:   { min: 0,  discount: 0,  color: '#cd7f32', next: 'Silver',   washes: 10 },
  Silver:   { min: 10, discount: 5,  color: '#c0c0c0', next: 'Gold',     washes: 25 },
  Gold:     { min: 25, discount: 10, color: '#ffd700', next: 'Platinum', washes: 50 },
  Platinum: { min: 50, discount: 15, color: '#e5e4e2', next: null,       washes: null },
};
