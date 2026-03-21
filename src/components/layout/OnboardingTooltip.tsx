import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';

const STEPS_VI = [
  { text: '🛣️ Đây là dữ liệu VETC thực — hệ thống đọc lịch sử thu phí của bạn để dự đoán xe cần rửa.' },
  { text: '🗺️ Chọn "Nhanh nhất" hoặc "EV" để lọc trạm theo nhu cầu thực tế.' },
  { text: '⚡ Bật Giờ cao điểm để xem hệ thống phân phối xe và tính lượng CO₂ tiết kiệm.' },
  { text: '🚗 Sang Mô phỏng để xem AI quét xe và quy trình rửa EV riêng biệt.' },
  { text: '📊 Bảng Quản trị dành cho chủ trạm và nhà đầu tư — chất lượng, doanh thu, tác động môi trường.' },
];

const STEPS_EN = [
  { text: '🛣️ This is real VETC data — the system reads your toll history to predict when your car needs washing.' },
  { text: '🗺️ Switch to "Fastest" or "EV" to filter stations by what matters most to you right now.' },
  { text: '⚡ Toggle Rush Hour to see smart vehicle distribution — and watch CO₂ savings update in real time.' },
  { text: '🚗 Go to Simulation to see the AI scan and EV-specific wash protocol in action.' },
  { text: '📊 The Dashboard is for station owners and investors — quality scores, revenue, environmental impact.' },
];

export function OnboardingTooltip() {
  const lang = useAppStore((s) => s.lang);
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);
  const steps = lang === 'vi' ? STEPS_VI : STEPS_EN;

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      if (step < steps.length - 1) setStep((s) => s + 1);
      else setVisible(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, [step, visible, steps.length]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-lg"
      >
        <div className="glass p-4" style={{ borderColor: 'hsl(var(--tasco-blue) / 0.3)' }}>
          <motion.p
            key={step}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm text-foreground mb-3"
          >
            {steps[step].text}
          </motion.p>
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full transition-all duration-300"
                  style={{
                    background: i === step ? 'hsl(var(--tasco-blue))' : 'hsl(var(--muted))',
                    transform: i === step ? 'scale(1.3)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setVisible(false)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
              >
                {lang === 'vi' ? 'Bỏ qua' : 'Skip'}
              </button>
              <button
                onClick={() => (step < steps.length - 1 ? setStep((s) => s + 1) : setVisible(false))}
                className="text-xs font-medium bg-tasco-blue/20 text-tasco-blue px-3 py-1.5 rounded-lg hover:bg-tasco-blue/30 transition-colors active:scale-[0.97]"
              >
                {step < steps.length - 1
                  ? lang === 'vi' ? 'Tiếp →' : 'Next →'
                  : lang === 'vi' ? 'Bắt đầu!' : "Let's go!"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
