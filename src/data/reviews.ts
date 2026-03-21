export interface Review {
  stars: number;
  comment: string;
  tag: 'Positive' | 'Neutral' | 'Negative';
  car: string;
  ago: string;
}

export const REVIEWS: Review[] = [
  { stars: 5, comment: 'Rất nhanh và sạch! Máy quét AI thật ấn tượng', tag: 'Positive', car: 'SUV', ago: '14 phút' },
  { stars: 4, comment: 'Dịch vụ tốt, chỉ hơi đông vào giờ cao điểm', tag: 'Neutral', car: 'Sedan', ago: '28 phút' },
  { stars: 5, comment: 'Rửa xe điện ở đây rất yên tâm, nhân viên chuyên nghiệp', tag: 'Positive', car: 'VinFast VF8', ago: '1 giờ' },
  { stars: 3, comment: 'Chờ hơi lâu nhưng kết quả ổn', tag: 'Neutral', car: 'Sports', ago: '1 giờ 20 phút' },
  { stars: 5, comment: 'Thanh toán VETC siêu tiện, không cần mang tiền mặt', tag: 'Positive', car: 'Sedan', ago: '2 giờ' },
  { stars: 2, comment: 'Cửa kính chưa được lau sạch hoàn toàn', tag: 'Negative', car: 'SUV', ago: '3 giờ' },
  { stars: 5, comment: 'Xe điện VF9 của tôi được rửa an toàn, port sạc được kiểm tra kỹ', tag: 'Positive', car: 'VinFast VF9', ago: '4 giờ' },
];
