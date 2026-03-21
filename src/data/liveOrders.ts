export interface Order {
  id: string;
  plate: string;
  car: string;
  service: string;
  price: number;
  method: 'VETC' | 'Cash' | 'Card';
  status: 'queued' | 'in_progress' | 'complete';
  staff: string;
  station: string;
  startedAgo: number;
}

export const INITIAL_ORDERS: Order[] = [
  { id: 'o-001', plate: '51A-123.45', car: 'VinFast VF8 ⚡', service: 'Premium EV Wash', price: 180_000, method: 'VETC', status: 'in_progress', staff: 'Nguyễn Thị Lan', station: 'Savico Q.7', startedAgo: 4 },
  { id: 'o-002', plate: '59B-456.78', car: 'Toyota Camry', service: 'Basic Wash', price: 65_000, method: 'VETC', status: 'complete', staff: 'Trần Văn Minh', station: 'Gò Vấp', startedAgo: 12 },
  { id: 'o-003', plate: '43C-789.01', car: 'Hyundai Tucson', service: 'Full Detailing', price: 420_000, method: 'Cash', status: 'in_progress', staff: 'Lê Thị Hoa', station: 'Q.1 Centre', startedAgo: 8 },
  { id: 'o-004', plate: '72D-234.56', car: 'Honda CR-V', service: 'Premium Wash', price: 150_000, method: 'Card', status: 'queued', staff: '—', station: 'Tân Bình', startedAgo: 0 },
  { id: 'o-005', plate: '51E-567.89', car: 'VinFast VF9 ⚡', service: 'Premium EV Wash', price: 200_000, method: 'VETC', status: 'complete', staff: 'Phạm Quốc Hùng', station: 'Gò Vấp', startedAgo: 22 },
  { id: 'o-006', plate: '30F-890.12', car: 'Mazda CX-5', service: 'Basic Wash', price: 60_000, method: 'VETC', status: 'queued', staff: '—', station: 'Thủ Đức', startedAgo: 0 },
];

const RANDOM_PLATES = ['51G-111.22', '59H-333.44', '43K-555.66', '72L-777.88', '30M-999.00', '51N-222.33'];
const RANDOM_CARS = ['Toyota Vios', 'Mazda 3', 'Honda City', 'VinFast VF5 ⚡', 'Kia Seltos', 'Hyundai Accent'];
const RANDOM_SERVICES = ['Basic Wash', 'Premium Wash', 'Premium EV Wash', 'Full Detailing'];
const RANDOM_STATIONS = ['Savico Q.7', 'Gò Vấp', 'Q.1 Centre', 'Tân Bình', 'Thủ Đức', 'Nhà Bè'];
const RANDOM_STAFF = ['Trần Thị Mai', 'Lê Văn Đức', 'Nguyễn Hoàng', 'Phạm Thị Nga'];

let orderCounter = 7;
export function generateOrder(): Order {
  const i = orderCounter++;
  const car = RANDOM_CARS[Math.floor(Math.random() * RANDOM_CARS.length)];
  const isEV = car.includes('⚡');
  return {
    id: `o-${String(i).padStart(3, '0')}`,
    plate: RANDOM_PLATES[Math.floor(Math.random() * RANDOM_PLATES.length)],
    car,
    service: isEV ? 'Premium EV Wash' : RANDOM_SERVICES[Math.floor(Math.random() * RANDOM_SERVICES.length)],
    price: [60_000, 65_000, 150_000, 180_000, 200_000, 420_000][Math.floor(Math.random() * 6)],
    method: (['VETC', 'VETC', 'VETC', 'Cash', 'Card'] as const)[Math.floor(Math.random() * 5)],
    status: 'queued',
    staff: '—',
    station: RANDOM_STATIONS[Math.floor(Math.random() * RANDOM_STATIONS.length)],
    startedAgo: 0,
  };
}
