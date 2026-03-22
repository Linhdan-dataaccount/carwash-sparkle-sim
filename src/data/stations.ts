export type PartnerTier = 'tasco_hub' | 'verified' | 'basic';

export interface Station {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  slots: number;
  queue: number;
  inProgress: number;
  avgMins: number;
  services: string[];
  rating: number;
  reviewCount: number;
  priceMin: number;
  priceMax: number;
  hasLounge: boolean;
  hasWifi: boolean;
  open24h: boolean;
  evCertified: boolean;
  mitsuiCert: boolean;
  chemStock: number;
  openHours: string;
  partnerTier: PartnerTier;
}

export const STATIONS: Station[] = [
  // ── TASCO Hubs ──
  { id: 'sta-001', name: 'Tasco @ Toyota Savico Long An', address: '1008 Nguyễn Văn Linh, Q.7', lat: 10.7321, lng: 106.7024, slots: 4, queue: 2, inProgress: 2, avgMins: 8, services: ['basic', 'premium', 'detailing', 'ev'], rating: 4.8, reviewCount: 127, priceMin: 50_000, priceMax: 300_000, hasLounge: true, hasWifi: true, open24h: false, evCertified: true, mitsuiCert: true, chemStock: 72, openHours: '07:00 – 21:00', partnerTier: 'tasco_hub' },
  { id: 'sta-002', name: 'Tasco @ Honda Ô Tô Bình Thạnh', address: '176 Bạch Đằng, Q. Bình Thạnh', lat: 10.8103, lng: 106.7143, slots: 3, queue: 5, inProgress: 3, avgMins: 10, services: ['basic', 'premium'], rating: 4.5, reviewCount: 89, priceMin: 50_000, priceMax: 200_000, hasLounge: false, hasWifi: true, open24h: false, evCertified: false, mitsuiCert: true, chemStock: 45, openHours: '07:00 – 21:00', partnerTier: 'tasco_hub' },
  { id: 'sta-003', name: 'Tasco @ VinFast Gò Vấp', address: '32 Quang Trung, Q. Gò Vấp', lat: 10.8490, lng: 106.6737, slots: 5, queue: 1, inProgress: 2, avgMins: 9, services: ['basic', 'premium', 'detailing', 'ev'], rating: 4.9, reviewCount: 214, priceMin: 50_000, priceMax: 350_000, hasLounge: true, hasWifi: true, open24h: true, evCertified: true, mitsuiCert: false, chemStock: 88, openHours: '24/7', partnerTier: 'tasco_hub' },
  { id: 'sta-004', name: 'Tasco @ Hyundai Thủ Đức', address: '63 Võ Văn Ngân, TP. Thủ Đức', lat: 10.8511, lng: 106.7609, slots: 4, queue: 0, inProgress: 1, avgMins: 7, services: ['basic', 'premium', 'ev'], rating: 4.6, reviewCount: 56, priceMin: 50_000, priceMax: 220_000, hasLounge: true, hasWifi: false, open24h: false, evCertified: true, mitsuiCert: true, chemStock: 91, openHours: '06:30 – 22:00', partnerTier: 'tasco_hub' },
  { id: 'sta-005', name: 'Tasco Detailing Centre — Q.1', address: '28 Lê Thánh Tôn, Q.1', lat: 10.7773, lng: 106.7028, slots: 2, queue: 3, inProgress: 2, avgMins: 25, services: ['premium', 'detailing'], rating: 4.9, reviewCount: 302, priceMin: 200_000, priceMax: 800_000, hasLounge: true, hasWifi: true, open24h: false, evCertified: false, mitsuiCert: true, chemStock: 60, openHours: '08:00 – 20:00', partnerTier: 'tasco_hub' },
  { id: 'sta-006', name: 'Tasco @ Kia Tân Bình', address: '514 Cộng Hòa, Q. Tân Bình', lat: 10.8024, lng: 106.6561, slots: 3, queue: 4, inProgress: 3, avgMins: 8, services: ['basic', 'premium'], rating: 4.3, reviewCount: 41, priceMin: 50_000, priceMax: 180_000, hasLounge: false, hasWifi: false, open24h: false, evCertified: false, mitsuiCert: false, chemStock: 23, openHours: '07:00 – 20:00', partnerTier: 'tasco_hub' },
  { id: 'sta-007', name: 'Tasco @ Suzuki Nhà Bè', address: '102 Huỳnh Tấn Phát, H. Nhà Bè', lat: 10.6929, lng: 106.7364, slots: 3, queue: 0, inProgress: 0, avgMins: 8, services: ['basic', 'premium', 'ev'], rating: 4.4, reviewCount: 33, priceMin: 50_000, priceMax: 200_000, hasLounge: true, hasWifi: true, open24h: false, evCertified: true, mitsuiCert: false, chemStock: 95, openHours: '07:30 – 21:00', partnerTier: 'tasco_hub' },
  { id: 'sta-008', name: 'Tasco Express — Cần Giờ', address: 'KM18 Đường Rừng Sác, H. Cần Giờ', lat: 10.5521, lng: 106.9146, slots: 2, queue: 1, inProgress: 1, avgMins: 6, services: ['basic'], rating: 4.1, reviewCount: 18, priceMin: 50_000, priceMax: 80_000, hasLounge: false, hasWifi: false, open24h: true, evCertified: false, mitsuiCert: false, chemStock: 55, openHours: '24/7', partnerTier: 'tasco_hub' },

  // ── Verified Partners (use SmartScan) ──
  { id: 'sta-009', name: 'Bình Minh Auto Spa', address: '45 Nguyễn Hữu Cảnh, Q. Bình Thạnh', lat: 10.7955, lng: 106.7220, slots: 3, queue: 2, inProgress: 1, avgMins: 12, services: ['basic', 'premium'], rating: 4.6, reviewCount: 78, priceMin: 45_000, priceMax: 180_000, hasLounge: false, hasWifi: true, open24h: false, evCertified: false, mitsuiCert: false, chemStock: 65, openHours: '07:00 – 20:00', partnerTier: 'verified' },
  { id: 'sta-010', name: 'Hoàng Gia Car Care', address: '210 Điện Biên Phủ, Q.3', lat: 10.7835, lng: 106.6890, slots: 2, queue: 1, inProgress: 1, avgMins: 15, services: ['basic', 'premium', 'detailing'], rating: 4.7, reviewCount: 156, priceMin: 60_000, priceMax: 350_000, hasLounge: true, hasWifi: true, open24h: false, evCertified: false, mitsuiCert: false, chemStock: 72, openHours: '08:00 – 21:00', partnerTier: 'verified' },

  // ── Basic Partners (listed only) ──
  { id: 'sta-011', name: 'Rửa Xe Anh Tú', address: '88 Phan Xích Long, Q. Phú Nhuận', lat: 10.7990, lng: 106.6810, slots: 2, queue: 3, inProgress: 2, avgMins: 18, services: ['basic'], rating: 3.9, reviewCount: 24, priceMin: 35_000, priceMax: 80_000, hasLounge: false, hasWifi: false, open24h: false, evCertified: false, mitsuiCert: false, chemStock: 40, openHours: '06:00 – 19:00', partnerTier: 'basic' },
  { id: 'sta-012', name: 'Tiệm Rửa Xe Phương Nam', address: '312 Lê Văn Sỹ, Q. Tân Bình', lat: 10.8120, lng: 106.6600, slots: 2, queue: 0, inProgress: 1, avgMins: 20, services: ['basic'], rating: 3.7, reviewCount: 12, priceMin: 30_000, priceMax: 60_000, hasLounge: false, hasWifi: false, open24h: false, evCertified: false, mitsuiCert: false, chemStock: 30, openHours: '07:00 – 18:00', partnerTier: 'basic' },
];

export const PARTNER_TIER_CONFIG = {
  tasco_hub: { color: '#3B82F6', icon: '🔵', labelVi: 'TASCO Hub', labelEn: 'TASCO Hub', markerColor: '#3B82F6' },
  verified:  { color: '#10B981', icon: '✅', labelVi: 'Đối tác xác minh', labelEn: 'Verified Partner', markerColor: '#10B981' },
  basic:     { color: '#6B7280', icon: '⚪', labelVi: 'Đối tác cơ bản', labelEn: 'Basic Partner', markerColor: '#6B7280' },
};

export const ENV_IMPACT = {
  co2SavedKg: 0.8,
  waterSavedLitres: 1_240,
  idleMinsSaved: 47,
  carsRouted: 31,
};
