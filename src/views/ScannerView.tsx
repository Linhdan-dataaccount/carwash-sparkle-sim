import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import { t } from '@/i18n/translations';
import { formatVND } from '@/utils/formatVND';

/* ── Types ─────────────────────────────────────────────── */
type AngleId = 'north' | 'east' | 'south' | 'west' | 'top';
type AngleStatus = 'pending' | 'analyzing' | 'valid' | 'rejected';

interface AngleData {
  id: AngleId;
  icon: string;
  status: AngleStatus;
  imageUrl: string | null;
  dirtScore: number | null;
  damageScore: number | null;
  errorMsg: string | null;
}

interface AnalysisResult {
  dirtScore: number;
  damageScore: number;
  damageLevel: 'Low' | 'Medium' | 'High';
  washType: string;
  washTypeVi: string;
  estimatedPrice: number;
  confidence: number;
}

const ANGLES: { id: AngleId; icon: string; labelVi: string; labelEn: string }[] = [
  { id: 'north', icon: '⬆️', labelVi: 'Phía Bắc', labelEn: 'North' },
  { id: 'east',  icon: '➡️', labelVi: 'Phía Đông', labelEn: 'East' },
  { id: 'south', icon: '⬇️', labelVi: 'Phía Nam',  labelEn: 'South' },
  { id: 'west',  icon: '⬅️', labelVi: 'Phía Tây',  labelEn: 'West' },
  { id: 'top',   icon: '🔝', labelVi: 'Trên xuống', labelEn: 'Top' },
];

const BASE_PRICE = 50_000;

/* ── Canvas-based "AI" analysis ─────────────────────────── */
function analyzeImageOnCanvas(imageUrl: string): Promise<{ dirt: number; damage: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 128;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;

      let totalBrightness = 0;
      let brownPixels = 0;
      let darkPixels = 0;
      let edgeSum = 0;
      const len = data.length;

      for (let i = 0; i < len; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const brightness = (r + g + b) / 3;
        totalBrightness += brightness;

        // Brown/muddy detection
        if (r > 80 && g > 40 && b < 80 && r > g) brownPixels++;
        // Dark/dirty detection
        if (brightness < 60) darkPixels++;
      }

      const pixelCount = len / 4;
      const avgBrightness = totalBrightness / pixelCount;
      const brownRatio = brownPixels / pixelCount;
      const darkRatio = darkPixels / pixelCount;

      // Edge detection (simple Sobel-like)
      for (let y = 1; y < size - 1; y++) {
        for (let x = 1; x < size - 1; x++) {
          const idx = (y * size + x) * 4;
          const left = (data[idx - 4] + data[idx - 3] + data[idx - 2]) / 3;
          const right = (data[idx + 4] + data[idx + 5] + data[idx + 6]) / 3;
          const up = (data[((y - 1) * size + x) * 4] + data[((y - 1) * size + x) * 4 + 1] + data[((y - 1) * size + x) * 4 + 2]) / 3;
          const down = (data[((y + 1) * size + x) * 4] + data[((y + 1) * size + x) * 4 + 1] + data[((y + 1) * size + x) * 4 + 2]) / 3;
          edgeSum += Math.abs(right - left) + Math.abs(down - up);
        }
      }
      const edgeDensity = edgeSum / ((size - 2) * (size - 2) * 255);

      // Compute scores
      const dirtFromBrown = Math.min(brownRatio * 300, 40);
      const dirtFromDark = Math.min(darkRatio * 150, 30);
      const dirtFromBrightness = Math.max(0, (128 - avgBrightness) / 128) * 30;
      const dirt = Math.min(100, Math.round(dirtFromBrown + dirtFromDark + dirtFromBrightness + Math.random() * 10));

      const damageFromEdge = Math.min(edgeDensity * 200, 60);
      const damageFromDark = Math.min(darkRatio * 80, 20);
      const damage = Math.min(100, Math.round(damageFromEdge + damageFromDark + Math.random() * 15));

      resolve({ dirt, damage });
    };
    img.onerror = () => resolve({ dirt: Math.round(40 + Math.random() * 40), damage: Math.round(10 + Math.random() * 30) });
    img.src = imageUrl;
  });
}

function isLikelyCarImage(imageUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, 64, 64);
      const data = ctx.getImageData(0, 0, 64, 64).data;

      // Check center mass has distinct object (non-uniform)
      let centerVariance = 0;
      const centerPixels: number[] = [];
      for (let y = 16; y < 48; y++) {
        for (let x = 16; x < 48; x++) {
          const idx = (y * 64 + x) * 4;
          centerPixels.push((data[idx] + data[idx + 1] + data[idx + 2]) / 3);
        }
      }
      const avg = centerPixels.reduce((a, b) => a + b, 0) / centerPixels.length;
      centerVariance = centerPixels.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / centerPixels.length;

      // Any real photo has variance > 100; pure blank/solid < 50
      resolve(centerVariance > 80);
    };
    img.onerror = () => resolve(true); // benefit of the doubt
    img.src = imageUrl;
  });
}

function computeFinalResult(angles: AngleData[]): AnalysisResult {
  const valid = angles.filter((a) => a.status === 'valid');
  const avgDirt = valid.reduce((s, a) => s + (a.dirtScore ?? 0), 0) / valid.length;
  const avgDamage = valid.reduce((s, a) => s + (a.damageScore ?? 0), 0) / valid.length;
  const dirt = Math.round(avgDirt);
  const damage = Math.round(avgDamage);

  const damageLevel: 'Low' | 'Medium' | 'High' = damage < 30 ? 'Low' : damage < 65 ? 'Medium' : 'High';

  let washType: string, washTypeVi: string, priceMult: number;
  if (dirt < 30) {
    washType = 'Basic Wash';
    washTypeVi = 'Rửa cơ bản';
    priceMult = 1;
  } else if (dirt < 70) {
    washType = 'Standard Wash';
    washTypeVi = 'Rửa toàn diện';
    priceMult = 2.5;
  } else {
    washType = 'Deep Cleaning';
    washTypeVi = 'Rửa sâu toàn diện';
    priceMult = 5;
  }

  const damageSurcharge = damage < 30 ? 0 : damage < 65 ? 30_000 : 80_000;
  const estimatedPrice = Math.round(BASE_PRICE * priceMult + damageSurcharge);
  const confidence = Math.min(99, Math.round(78 + Math.random() * 18));

  return { dirtScore: dirt, damageScore: damage, damageLevel, washType, washTypeVi, estimatedPrice, confidence };
}

/* ── Main Component ─────────────────────────────────────── */
export default function ScannerView() {
  const { lang, addToast } = useAppStore();
  const [angles, setAngles] = useState<AngleData[]>(
    ANGLES.map((a) => ({ id: a.id, icon: a.icon, status: 'pending', imageUrl: null, dirtScore: null, damageScore: null, errorMsg: null }))
  );
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [reportSaved, setReportSaved] = useState(false);
  const [scanHistory, setScanHistory] = useState<{ plate: string; time: string; result: AnalysisResult }[]>([]);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const validCount = angles.filter((a) => a.status === 'valid').length;
  const allValid = validCount === 5;

  // Generate result when all 5 valid
  useEffect(() => {
    if (allValid && !result) {
      setResult(computeFinalResult(angles));
    }
  }, [allValid, angles, result]);

  const handleUpload = useCallback(async (angleId: AngleId, file: File) => {
    const imageUrl = URL.createObjectURL(file);

    // Set analyzing
    setAngles((prev) => prev.map((a) => a.id === angleId ? { ...a, status: 'analyzing' as AngleStatus, imageUrl, errorMsg: null } : a));

    // Simulate processing delay
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));

    // Step 1: vehicle detection
    const isCar = await isLikelyCarImage(imageUrl);
    if (!isCar) {
      setAngles((prev) =>
        prev.map((a) =>
          a.id === angleId
            ? { ...a, status: 'rejected' as AngleStatus, errorMsg: lang === 'vi' ? 'Ảnh không hợp lệ. Vui lòng tải ảnh xe rõ ràng.' : 'Invalid image. Please upload a clear car image.' }
            : a
        )
      );
      return;
    }

    // Step 2: analyze
    const { dirt, damage } = await analyzeImageOnCanvas(imageUrl);

    setAngles((prev) =>
      prev.map((a) =>
        a.id === angleId ? { ...a, status: 'valid' as AngleStatus, dirtScore: dirt, damageScore: damage, errorMsg: null } : a
      )
    );
    // Reset result when a new valid image comes in
    setResult(null);
    setReportSaved(false);
  }, [lang]);

  const handleSaveReport = () => {
    if (!result) return;
    const plates = ['51A-123.45', '59B-456.78', '43C-789.01', '72D-234.56', '30F-890.12'];
    const plate = plates[Math.floor(Math.random() * plates.length)];
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    setScanHistory((prev) => [{ plate, time, result }, ...prev].slice(0, 10));
    setReportSaved(true);
    addToast({ message: lang === 'vi' ? '✅ Báo cáo đã lưu thành công!' : '✅ Report saved successfully!', type: 'success' });
  };

  const handleReset = () => {
    setAngles(ANGLES.map((a) => ({ id: a.id, icon: a.icon, status: 'pending', imageUrl: null, dirtScore: null, damageScore: null, errorMsg: null })));
    setResult(null);
    setReportSaved(false);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {/* ── Header ─────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
                🤖 CarWash AI — {lang === 'vi' ? 'Máy quét' : 'Scanner'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {lang === 'vi' ? 'Hệ thống quét và kiểm tra xe bằng AI' : 'AI-powered vehicle scanning & inspection'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-tasco-green animate-pulse" />
              <span className="text-xs text-muted-foreground">
                AI: {lang === 'vi' ? 'Sẵn sàng nhận việc mới' : 'Ready for new jobs'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── Progress ────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="glass p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-foreground">
                  {lang === 'vi' ? 'Tiến trình chụp ảnh' : 'Capture progress'}
                </span>
                <span className="font-mono-data text-tasco-blue font-semibold">{validCount}/5</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, hsl(var(--tasco-blue)), hsl(var(--tasco-green)))` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(validCount / 5) * 100}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>
            {allValid && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-2xl">
                ✅
              </motion.span>
            )}
          </div>
        </motion.div>

        {/* ── Capture Cards ───────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {ANGLES.map((angle, i) => {
            const data = angles.find((a) => a.id === angle.id)!;
            const statusColor =
              data.status === 'valid' ? 'border-tasco-green/50 shadow-[0_0_12px_hsl(var(--tasco-green)/0.15)]'
              : data.status === 'rejected' ? 'border-tasco-red/50 shadow-[0_0_12px_hsl(var(--tasco-red)/0.15)]'
              : data.status === 'analyzing' ? 'border-tasco-yellow/50'
              : 'border-border';

            return (
              <motion.div
                key={angle.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i }}
                className={`glass p-4 flex flex-col items-center gap-3 border ${statusColor} transition-all duration-300`}
              >
                {/* Angle label */}
                <div className="flex items-center gap-2">
                  <span className="text-lg">{angle.icon}</span>
                  <span className="font-heading font-semibold text-sm text-foreground">
                    {lang === 'vi' ? angle.labelVi : angle.labelEn}
                  </span>
                </div>

                {/* Image preview */}
                <div className="w-full aspect-[4/3] rounded-lg bg-muted/50 overflow-hidden relative flex items-center justify-center">
                  {data.imageUrl ? (
                    <img src={data.imageUrl} alt={angle.id} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl opacity-30">📷</span>
                  )}
                  {data.status === 'analyzing' && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-tasco-blue border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Status badge */}
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  {data.status === 'pending' && (
                    <><span className="w-2 h-2 rounded-full bg-muted-foreground" /><span className="text-muted-foreground">{lang === 'vi' ? 'Chờ' : 'Pending'}</span></>
                  )}
                  {data.status === 'analyzing' && (
                    <><span className="w-2 h-2 rounded-full bg-tasco-yellow animate-pulse" /><span className="text-tasco-yellow">{lang === 'vi' ? 'Đang phân tích...' : 'Analyzing...'}</span></>
                  )}
                  {data.status === 'valid' && (
                    <><span className="text-tasco-green">✓</span><span className="text-tasco-green">{lang === 'vi' ? 'Hợp lệ' : 'Valid'}</span></>
                  )}
                  {data.status === 'rejected' && (
                    <><span className="text-tasco-red">✗</span><span className="text-tasco-red">{lang === 'vi' ? 'Từ chối' : 'Rejected'}</span></>
                  )}
                </div>

                {/* Scores for valid */}
                {data.status === 'valid' && data.dirtScore !== null && (
                  <div className="flex gap-3 text-xs font-mono-data">
                    <span>🧹 {data.dirtScore}%</span>
                    <span>⚠️ {data.damageScore}%</span>
                  </div>
                )}

                {/* Error message */}
                {data.errorMsg && (
                  <p className="text-xs text-tasco-red text-center leading-tight">{data.errorMsg}</p>
                )}

                {/* Upload button */}
                <input
                  ref={(el) => { fileInputRefs.current[angle.id] = el; }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(angle.id, file);
                    e.target.value = '';
                  }}
                />
                <button
                  onClick={() => fileInputRefs.current[angle.id]?.click()}
                  disabled={data.status === 'analyzing'}
                  className="w-full py-2 px-3 rounded-lg text-xs font-medium transition-all
                    bg-muted/50 hover:bg-muted text-foreground
                    disabled:opacity-40 disabled:cursor-not-allowed
                    active:scale-[0.97]"
                  aria-label={`Upload ${angle.labelEn} angle`}
                >
                  {data.status === 'valid' || data.status === 'rejected'
                    ? (lang === 'vi' ? '🔄 Tải lại' : '🔄 Re-upload')
                    : (lang === 'vi' ? `📤 Tải ảnh ${angle.labelVi}` : `📤 Upload ${angle.labelEn}`)}
                </button>

                <p className="text-[10px] text-muted-foreground text-center leading-tight">
                  {lang === 'vi' ? 'Bắt buộc cho báo cáo' : 'Required for report'}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* ── Report Section ──────────────────────────────── */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass p-6 space-y-5"
            >
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="font-heading text-lg font-bold text-foreground">
                  📊 {lang === 'vi' ? 'Báo cáo giá và tình trạng' : 'Pricing & Condition Summary'}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 rounded-lg text-xs font-medium bg-muted/50 hover:bg-muted text-foreground transition-all active:scale-[0.97]"
                  >
                    🔄 {lang === 'vi' ? 'Quét xe mới' : 'New scan'}
                  </button>
                  <button
                    onClick={handleSaveReport}
                    disabled={reportSaved}
                    className="px-4 py-2 rounded-lg text-xs font-medium transition-all active:scale-[0.97]
                      bg-tasco-blue text-background font-semibold
                      hover:brightness-110
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {reportSaved
                      ? (lang === 'vi' ? '✅ Đã lưu' : '✅ Saved')
                      : (lang === 'vi' ? '💾 Lưu báo cáo' : '💾 Save Report')}
                  </button>
                </div>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Dirtiness */}
                <MetricCard
                  icon="🧹"
                  label={lang === 'vi' ? 'Mức bẩn' : 'Dirtiness'}
                  value={`${result.dirtScore}%`}
                  color={result.dirtScore < 30 ? '--tasco-green' : result.dirtScore < 70 ? '--tasco-yellow' : '--tasco-red'}
                  barPct={result.dirtScore}
                />
                {/* Damage */}
                <MetricCard
                  icon="⚠️"
                  label={lang === 'vi' ? 'Hư hỏng' : 'Damage'}
                  value={result.damageLevel === 'Low' ? (lang === 'vi' ? 'Thấp' : 'Low') : result.damageLevel === 'Medium' ? (lang === 'vi' ? 'Trung bình' : 'Medium') : (lang === 'vi' ? 'Cao' : 'High')}
                  color={result.damageLevel === 'Low' ? '--tasco-green' : result.damageLevel === 'Medium' ? '--tasco-yellow' : '--tasco-red'}
                  barPct={result.damageScore}
                />
                {/* Price */}
                <MetricCard
                  icon="💰"
                  label={lang === 'vi' ? 'Giá ước tính' : 'Est. price'}
                  value={formatVND(result.estimatedPrice)}
                  color="--tasco-blue"
                />
                {/* Confidence */}
                <MetricCard
                  icon="🎯"
                  label={lang === 'vi' ? 'Độ tin cậy' : 'Confidence'}
                  value={`${result.confidence}%`}
                  color="--tasco-green"
                  barPct={result.confidence}
                />
              </div>

              {/* Wash recommendation */}
              <div className="p-4 rounded-xl border border-tasco-blue/20 bg-tasco-blue/5">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🚿</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {lang === 'vi' ? 'Gói đề xuất' : 'Recommended package'}: {lang === 'vi' ? result.washTypeVi : result.washType}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {result.dirtScore >= 70
                        ? (lang === 'vi' ? 'Xe rất bẩn — cần rửa sâu toàn diện' : 'Very dirty — needs deep cleaning')
                        : result.dirtScore >= 30
                        ? (lang === 'vi' ? 'Xe bẩn vừa — rửa toàn diện đủ sạch' : 'Moderately dirty — standard wash sufficient')
                        : (lang === 'vi' ? 'Xe ít bẩn — rửa cơ bản, tiết kiệm' : 'Lightly dirty — basic wash saves cost')}
                    </p>
                  </div>
                  <span className="ml-auto font-mono-data text-lg font-bold text-tasco-blue">
                    {formatVND(result.estimatedPrice)}
                  </span>
                </div>
              </div>

              {/* Proceed button */}
              {reportSaved && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => {
                    useAppStore.getState().setActiveView('simulation');
                    addToast({ message: lang === 'vi' ? '🚗 Chuyển sang quy trình rửa xe' : '🚗 Proceeding to wash', type: 'info' });
                  }}
                  className="w-full py-3 rounded-xl font-heading font-semibold text-sm
                    bg-tasco-green text-background
                    hover:brightness-110 transition-all active:scale-[0.97]"
                >
                  {lang === 'vi' ? '🚗 Tiến hành rửa xe →' : '🚗 Proceed to washing →'}
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Not ready prompt */}
        {!allValid && !result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-6 text-center space-y-2">
            <span className="text-4xl block">📸</span>
            <p className="text-sm text-muted-foreground">
              {lang === 'vi'
                ? `Tải lên ${5 - validCount} ảnh còn lại để tạo báo cáo`
                : `Upload ${5 - validCount} more image${5 - validCount > 1 ? 's' : ''} to generate report`}
            </p>
          </motion.div>
        )}

        {/* ── Scan History ────────────────────────────────── */}
        {scanHistory.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass p-5 space-y-3">
            <h3 className="font-heading text-sm font-semibold text-foreground">
              📋 {lang === 'vi' ? 'Lịch sử quét' : 'Scan History'}
            </h3>
            <div className="space-y-2">
              {scanHistory.map((h, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono-data font-semibold text-foreground">{h.plate}</span>
                    <span className="text-muted-foreground">{h.time}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span>🧹 {h.result.dirtScore}%</span>
                    <span className="text-tasco-blue font-mono-data font-semibold">{formatVND(h.result.estimatedPrice)}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* ── Metric Card ──────────────────────────────────────── */
function MetricCard({ icon, label, value, color, barPct }: {
  icon: string; label: string; value: string; color: string; barPct?: number;
}) {
  return (
    <div className="p-3 rounded-xl bg-muted/30 space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <p className="font-mono-data text-lg font-bold" style={{ color: `hsl(var(${color}))` }}>
        {value}
      </p>
      {barPct !== undefined && (
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `hsl(var(${color}))` }}
            initial={{ width: 0 }}
            animate={{ width: `${barPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      )}
    </div>
  );
}
