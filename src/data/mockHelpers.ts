export function makePrediction(queue: number, slots: number, avgMins: number): number[] {
  let q = queue;
  return [0, 3, 6, 9, 12, 15].map(() => {
    q = Math.max(0, q + (Math.random() > 0.5 ? 1 : -1) * (Math.random() > 0.7 ? 1 : 0));
    return Math.ceil((q / Math.max(slots - 1, 1)) * avgMins);
  });
}

export function markerColor(queue: number, slots: number): string {
  const ratio = queue / slots;
  if (ratio === 0) return '#00ff88';
  if (ratio <= 0.75) return '#ffd600';
  return '#ff4444';
}

export interface WashTier {
  id: string;
  name: string;
  nameEn: string;
  priceRange: [number, number];
  mins: [number, number];
  description: string;
  descriptionEn: string;
  recommended: boolean;
  icon: string;
}

export interface ScanResult {
  dirtLevel: number;
  damage: { severity: 'none' | 'light' | 'medium'; label: string };
  chargingPort: 'closed' | 'open' | null;
  recommendation: { name: string; priceRange: [number, number]; mins: [number, number] };
  allTiers: WashTier[];
  detectedZones: { zone: string; zoneEn: string; severity: number; icon: string }[];
}

export function generateScanResult(carType: string, dirtLevel: number, isEV: boolean): ScanResult {
  const damages = [
    { severity: 'none' as const, label: 'Không phát hiện hư hại' },
    { severity: 'light' as const, label: 'Xước nhẹ mặt sơn' },
    { severity: 'medium' as const, label: 'Bụi bẩn nặng vùng gầm xe' },
  ];
  const dmg = damages[dirtLevel > 75 ? 2 : dirtLevel > 50 ? 1 : 0];

  // Detected dirt zones based on level
  const zones = [
    { zone: 'Thân xe', zoneEn: 'Body panels', severity: Math.min(100, dirtLevel + 5), icon: '🚗' },
    { zone: 'Gầm xe', zoneEn: 'Underbody', severity: Math.min(100, dirtLevel + 15), icon: '⬇️' },
    { zone: 'Bánh xe', zoneEn: 'Wheels', severity: Math.min(100, dirtLevel + 10), icon: '⭕' },
    { zone: 'Kính xe', zoneEn: 'Windshield', severity: Math.max(0, dirtLevel - 15), icon: '🪟' },
    { zone: 'Nội thất', zoneEn: 'Interior', severity: Math.max(0, dirtLevel - 25), icon: '💺' },
  ];

  // All wash tiers
  const tiers: WashTier[] = [
    {
      id: 'basic',
      name: 'Basic Wash',
      nameEn: 'Basic Wash',
      priceRange: [50_000, 80_000],
      mins: [8, 12],
      description: 'Rửa ngoài cơ bản, phù hợp xe ít bẩn',
      descriptionEn: 'Basic exterior wash, suitable for lightly dirty cars',
      recommended: dirtLevel <= 45,
      icon: '🫧',
    },
    {
      id: 'premium',
      name: 'Premium Wash',
      nameEn: 'Premium Wash',
      priceRange: [150_000, 200_000],
      mins: [12, 18],
      description: 'Rửa toàn diện + gầm xe + nội thất, xe bẩn trung bình',
      descriptionEn: 'Full wash + underbody + interior, for moderately dirty cars',
      recommended: dirtLevel > 45 && dirtLevel <= 75,
      icon: '✨',
    },
    {
      id: 'detailing',
      name: 'Full Detailing',
      nameEn: 'Full Detailing',
      priceRange: [350_000, 500_000],
      mins: [25, 40],
      description: 'Chi tiết từng cm², đánh bóng, phủ sáp, xe rất bẩn / cao cấp',
      descriptionEn: 'Detail every cm², polish, wax coating, for very dirty / premium cars',
      recommended: dirtLevel > 75,
      icon: '💎',
    },
  ];

  if (isEV) {
    tiers[1] = { ...tiers[1], id: 'premium_ev', name: 'Premium EV Wash', nameEn: 'Premium EV Wash', priceRange: [180_000, 250_000], icon: '⚡' };
    tiers[2] = { ...tiers[2], priceRange: [400_000, 550_000] };
  }

  const rec = tiers.find(t => t.recommended) || tiers[1];

  return {
    dirtLevel,
    damage: dmg,
    chargingPort: isEV ? 'closed' : null,
    recommendation: { name: rec.name, priceRange: rec.priceRange, mins: rec.mins },
    allTiers: tiers,
    detectedZones: zones,
  };
}

export const WASH_STEPS_ICE = [
  { label: 'Phun bọt xà phòng', icon: '🫧', durationMs: 2000 },
  { label: 'Rửa áp lực cao', icon: '💦', durationMs: 3000 },
  { label: 'Rửa khoang máy', icon: '🔧', durationMs: 2500 },
  { label: 'Sấy khô', icon: '💨', durationMs: 2000 },
  { label: 'Hút bụi nội thất', icon: '🌀', durationMs: 2000 },
  { label: 'Kiểm tra chất lượng', icon: '✅', durationMs: 1000 },
];

export const WASH_STEPS_EV = [
  { label: 'Phun bọt EV-Safe', icon: '🫧', durationMs: 2000 },
  { label: 'Rửa áp lực thấp', icon: '💦', durationMs: 3000 },
  { label: 'Kiểm tra cổng sạc', icon: '⚡', durationMs: 2000 },
  { label: 'Sấy khô', icon: '💨', durationMs: 2000 },
  { label: 'Hút bụi nội thất', icon: '🌀', durationMs: 2000 },
  { label: 'Kiểm tra an toàn EV', icon: '✅', durationMs: 1500 },
];

export const CAR_DATA: Record<string, { label: string; icon: string; isEV: boolean; dirtBoost: number }> = {
  sedan: { label: 'Sedan', icon: '🚗', isEV: false, dirtBoost: 0 },
  suv: { label: 'SUV', icon: '🚙', isEV: false, dirtBoost: 5 },
  sports: { label: 'Sports', icon: '🏎️', isEV: false, dirtBoost: 0 },
  vinfast_vf8: { label: 'VinFast VF8', icon: '⚡', isEV: true, dirtBoost: 8 },
  vinfast_vf9: { label: 'VinFast VF9', icon: '⚡', isEV: true, dirtBoost: 8 },
};

export const KPI_DATA = [
  { label: 'Doanh thu hôm nay', value: 12_350_000, format: 'vnd', delta: '+18%', deltaDir: 'up' as const },
  { label: 'Xe đã rửa', value: 89, format: 'number', delta: '+23', deltaDir: 'up' as const },
  { label: 'Đánh giá TB', value: 4.7, format: 'rating', delta: '+0.2', deltaDir: 'up' as const },
  { label: 'Hàng chờ hiện tại', value: 14, format: 'cars', delta: null, deltaDir: null },
  { label: 'Doanh thu VETC', value: 8_200_000, format: 'vnd', delta: '66%', deltaDir: null, accent: true },
];

export const REVENUE_DATA = [
  { hour: '00:00', basic: 0, premium: 0, detailing: 0 },
  { hour: '01:00', basic: 0, premium: 0, detailing: 0 },
  { hour: '02:00', basic: 0, premium: 0, detailing: 0 },
  { hour: '03:00', basic: 0, premium: 0, detailing: 0 },
  { hour: '04:00', basic: 0, premium: 0, detailing: 0 },
  { hour: '05:00', basic: 0, premium: 0, detailing: 0 },
  { hour: '06:00', basic: 120_000, premium: 0, detailing: 0 },
  { hour: '07:00', basic: 480_000, premium: 200_000, detailing: 0 },
  { hour: '08:00', basic: 900_000, premium: 600_000, detailing: 350_000 },
  { hour: '09:00', basic: 750_000, premium: 450_000, detailing: 200_000 },
  { hour: '10:00', basic: 600_000, premium: 400_000, detailing: 420_000 },
  { hour: '11:00', basic: 700_000, premium: 500_000, detailing: 350_000 },
  { hour: '12:00', basic: 850_000, premium: 700_000, detailing: 200_000 },
  { hour: '13:00', basic: 600_000, premium: 350_000, detailing: 150_000 },
  { hour: '14:00', basic: 550_000, premium: 300_000, detailing: 280_000 },
  { hour: '15:00', basic: 700_000, premium: 450_000, detailing: 320_000 },
  { hour: '16:00', basic: 800_000, premium: 550_000, detailing: 400_000 },
  { hour: '17:00', basic: 1_100_000, premium: 800_000, detailing: 500_000 },
  { hour: '18:00', basic: 1_200_000, premium: 900_000, detailing: 600_000 },
  { hour: '19:00', basic: 1_000_000, premium: 750_000, detailing: 450_000 },
  { hour: '20:00', basic: 600_000, premium: 400_000, detailing: 200_000 },
  { hour: '21:00', basic: 300_000, premium: 200_000, detailing: 100_000 },
  { hour: '22:00', basic: 100_000, premium: 50_000, detailing: 0 },
  { hour: '23:00', basic: 0, premium: 0, detailing: 0 },
];

export const QUALITY_DATA = [
  { rank: 1, name: 'Thủ Đức', score: 96, rating: 4.9, sla: 98, chemEff: 'Cao', issues: 0, mitsui: true },
  { rank: 2, name: 'Savico Q.7', score: 91, rating: 4.8, sla: 94, chemEff: 'Trung', issues: 1, mitsui: true },
  { rank: 3, name: 'Gò Vấp', score: 89, rating: 4.9, sla: 92, chemEff: 'Cao', issues: 0, mitsui: false },
  { rank: 4, name: 'Q.1 Centre', score: 84, rating: 4.9, sla: 88, chemEff: 'Trung', issues: 2, mitsui: true },
  { rank: 5, name: 'Nhà Bè', score: 79, rating: 4.4, sla: 82, chemEff: 'Cao', issues: 1, mitsui: false },
  { rank: 6, name: 'Bình Thạnh', score: 72, rating: 4.5, sla: 79, chemEff: 'Trung', issues: 2, mitsui: true },
  { rank: 7, name: 'Tân Bình', score: 61, rating: 4.3, sla: 71, chemEff: 'Thấp', issues: 3, mitsui: false },
  { rank: 8, name: 'Cần Giờ', score: 58, rating: 4.1, sla: 68, chemEff: 'Thấp', issues: 4, mitsui: false },
];

export const VETC_TRANSACTIONS = [
  { plate: '51A-123.45', service: 'Premium EV Wash', amount: -180_000, time: '10:14' },
  { plate: '59B-456.78', service: 'Basic Wash', amount: -65_000, time: '10:02' },
  { plate: '43C-789.01', service: 'Full Detailing', amount: -420_000, time: '09:51' },
  { plate: '51E-567.89', service: 'Premium EV Wash', amount: -200_000, time: '09:33' },
  { plate: '30F-890.12', service: 'Basic Wash', amount: -60_000, time: '09:21' },
  { plate: '72D-234.56', service: 'Premium Wash', amount: -150_000, time: '09:08' },
  { plate: '51G-111.22', service: 'Basic Wash', amount: -55_000, time: '08:55' },
  { plate: '59H-333.44', service: 'Premium EV Wash', amount: -195_000, time: '08:41' },
  { plate: '43K-555.66', service: 'Full Detailing', amount: -380_000, time: '08:28' },
  { plate: '72L-777.88', service: 'Basic Wash', amount: -60_000, time: '08:14' },
];
