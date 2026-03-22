import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import { formatVND } from '@/utils/formatVND';

/* ═══════════════════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════════════════ */
const MOCK_ANALYSIS = {
  dirtinessScore: 74,
  breakdown: { exteriorBody: 80, wheelWells: 95, windows: 52, undercarriage: 68 },
  damageLevel: 'minor' as const,
  damages: [
    { location: 'front-bumper', type: 'scratch', severity: 'light', size: '~3cm', x: 50, y: 15 },
    { location: 'rear-left-door', type: 'swirl', severity: 'light', size: '', x: 25, y: 55 },
  ],
  confidence: 91,
  confidenceAxes: { lighting: 88, coverage: 94, focus: 91, motion: 85, duration: 96 },
  recommendedPackage: 'heavy' as const,
  estimatedTime: '45–60 min',
  chemical: 'Eco-Foam Type B',
  priceRange: { min: 250_000, max: 350_000 },
  priceBreakdown: { base: 150_000, heavyAddon: 80_000, ecoSurcharge: 20_000 },
  reportId: 'RPT-20240315-0042',
  timestamp: '2024-03-15T14:32:00+07:00',
  location: 'Ho Chi Minh City',
  partnerId: 'PT-0091',
};

const SCAN_HISTORY = [
  { plate: '51B-123.45', level: 'Heavy', time: '14:12', icon: '🚗' },
  { plate: '30A-999.88', level: 'Moderate', time: '13:45', icon: '🚙' },
  { plate: '29C-456.12', level: 'Clean', time: '12:30', icon: '🚕' },
];

const SCAN_ANGLES = ['Front', 'Right', 'Rear', 'Left'] as const;
type ScanAngle = typeof SCAN_ANGLES[number];
type AngleStatus = 'pending' | 'scanning' | 'done';
type ScanMode = 'live' | 'upload' | null;

const LOADING_TEXTS = [
  'Scanning surface texture...',
  'Detecting contaminants...',
  'Analyzing vehicle condition...',
  'Running damage detection...',
  'Calculating wash recommendation...',
];

const GUIDANCE_STEPS = [
  { icon: '📸', text: 'Point camera at the FRONT of the vehicle' },
  { icon: '➡️', text: 'Slowly move to the RIGHT SIDE' },
  { icon: '📸', text: 'Capture the REAR of the vehicle' },
  { icon: '⬅️', text: 'Complete with the LEFT SIDE' },
];

const WASH_STEPS = [
  { num: 1, title: 'PRE-RINSE', icon: '💧', desc: 'Low-pressure rinse (40 bar). Top-to-bottom. Remove loose debris. Duration: ~5 min.', badge: 'Standard Protocol', badgeColor: 'blue' },
  { num: 2, title: 'PRE-SOAK', icon: '🧪', desc: 'Apply TASCO Eco-Foam Type B (pH neutral). Let sit 3–5 minutes for heavy soiling.', badge: 'Heavy Soil Adjusted', badgeColor: 'amber', extra: 'Dilution 1:12 | Usage: ~250ml' },
  { num: 3, title: 'HAND WASH', icon: '🧤', desc: 'Microfiber mitt, panel-by-panel. Start roof → hood → sides → lower panels. Bucket 2-bucket method.', checklist: ['Separate mitt for wheels', 'No circular motion'] },
  { num: 4, title: 'WHEEL CLEANING', icon: '🔧', desc: 'TASCO Wheel Brightener. Brush each wheel well. Rinse immediately. Duration: ~8 min.', badge: '⚠ Extra Care Required', badgeColor: 'amber' },
  { num: 5, title: 'FINAL RINSE', icon: '💦', desc: 'High-pressure rinse 60 bar. All soap residue must be removed.' },
  { num: 6, title: 'DRYING', icon: '💨', desc: 'Air blower first (wheel wells, mirrors, door jambs). Then premium microfiber drying cloth — no dragging.' },
  { num: 7, title: 'QUALITY CHECK', icon: '✅', desc: 'Visual inspection under light. Re-check damage report hotspots. Confirm condition matches report.' },
];

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function ScannerView() {
  const { lang, addToast } = useAppStore();

  const [scanMode, setScanMode] = useState<ScanMode>(null);
  const [scanStage, setScanStage] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [scanAngles, setScanAngles] = useState<Record<ScanAngle, AngleStatus>>({ Front: 'pending', Right: 'pending', Rear: 'pending', Left: 'pending' });
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [reportSaved, setReportSaved] = useState(false);
  const [loadingTextIdx, setLoadingTextIdx] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [guidanceIdx, setGuidanceIdx] = useState(0);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [currentWashStep, setCurrentWashStep] = useState(0);
  const [selectedDamage, setSelectedDamage] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Session timer
  useEffect(() => {
    const iv = setInterval(() => setSessionTimer(s => s + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  // Guidance text cycle during scanning
  useEffect(() => {
    if (!isScanning) return;
    const iv = setInterval(() => setGuidanceIdx(i => (i + 1) % GUIDANCE_STEPS.length), 4000);
    return () => clearInterval(iv);
  }, [isScanning]);

  // Auto-scan simulation
  const startScan = useCallback(() => {
    setIsScanning(true);
    setScanStage(1);
    const angles: ScanAngle[] = ['Front', 'Right', 'Rear', 'Left'];
    angles.forEach((angle, i) => {
      setTimeout(() => setScanAngles(prev => ({ ...prev, [angle]: 'scanning' })), i * 3000);
      setTimeout(() => setScanAngles(prev => ({ ...prev, [angle]: 'done' })), i * 3000 + 2500);
    });
    // After all done, go to analysis
    setTimeout(() => {
      setIsScanning(false);
      startAnalysis();
    }, 12500);
  }, []);

  const startAnalysis = useCallback(() => {
    setScanStage(2);
    setLoadingProgress(0);
    setLoadingTextIdx(0);
    const duration = 2500;
    const start = Date.now();
    const textInterval = setInterval(() => setLoadingTextIdx(i => (i + 1) % LOADING_TEXTS.length), 500);
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - start;
      setLoadingProgress(Math.min(100, (elapsed / duration) * 100));
      if (elapsed >= duration) {
        clearInterval(progressInterval);
        clearInterval(textInterval);
        setAnalysisComplete(true);
        setScanStage(3);
      }
    }, 50);
  }, []);

  const handleUploadAnalyze = useCallback(() => {
    startAnalysis();
  }, [startAnalysis]);

  const handleSaveReport = useCallback(() => {
    setReportSaved(true);
    setScanStage(4);
    addToast({ message: '✅ Report saved successfully!', type: 'success' });
  }, [addToast]);

  const handleProceedToWash = useCallback(() => {
    setScanStage(5);
  }, []);

  const handleReset = useCallback(() => {
    setScanMode(null);
    setScanStage(0);
    setIsScanning(false);
    setScanAngles({ Front: 'pending', Right: 'pending', Rear: 'pending', Left: 'pending' });
    setUploadedFile(null);
    setAnalysisComplete(false);
    setReportSaved(false);
    setLoadingProgress(0);
    setCurrentWashStep(0);
    setSelectedDamage(null);
  }, []);

  const doneAngles = Object.values(scanAngles).filter(s => s === 'done').length;
  const scanningAngle = Object.entries(scanAngles).find(([, s]) => s === 'scanning')?.[0];
  const sessionStr = `${Math.floor(sessionTimer / 60).toString().padStart(2, '0')}:${(sessionTimer % 60).toString().padStart(2, '0')}`;

  const statusLabel = scanStage === 0 ? 'Idle' : isScanning ? 'Scanning' : scanStage === 2 ? 'Analyzing' : analysisComplete ? 'Completed' : 'Idle';
  const statusDot = scanStage === 0 ? 'bg-gray-500' : isScanning ? 'bg-blue-500' : scanStage === 2 ? 'bg-amber-500' : analysisComplete ? 'bg-emerald-500' : 'bg-gray-500';

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: '#0A0F1E' }}>
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent font-heading">TASCO</span>
          <span className="w-px h-5 bg-gray-700" />
          <span className="text-sm font-semibold text-gray-200 font-heading">VeriScan</span>
        </div>

        {/* Step progress */}
        <div className="hidden sm:flex items-center gap-1">
          {[0, 1, 2, 3, 4, 5].map(step => (
            <div key={step} className="flex items-center">
              <div className={`w-3 h-3 rounded-full flex items-center justify-center text-[8px] transition-all duration-300 ${
                step < scanStage ? 'bg-emerald-500 text-white' : step === scanStage ? 'bg-blue-500 text-white ring-2 ring-blue-500/30' : 'bg-gray-700 text-gray-500'
              }`}>
                {step < scanStage ? '✓' : ''}
              </div>
              {step < 5 && <div className={`w-6 h-0.5 ${step < scanStage ? 'bg-emerald-500' : 'bg-gray-700'}`} />}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700">
            <span className="text-xs text-gray-400">PT. Bình Minh Auto</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold">✦ TASCO Partner</span>
          </div>
          <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs">🔔</div>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs text-white font-bold">BM</div>
        </div>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT — Workflow area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence mode="wait">
            {/* ─── STAGE 0: Mode Select ─── */}
            {scanStage === 0 && (
              <motion.div key="s0" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <h2 className="text-lg font-bold text-gray-100 font-heading mb-1">Select Scan Mode</h2>
                <p className="text-sm text-gray-500 mb-4">Choose how you'll capture the vehicle condition</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Live Scan */}
                  <button
                    onClick={() => { setScanMode('live'); }}
                    className={`relative h-48 rounded-2xl border-2 p-6 flex flex-col items-center justify-center gap-3 transition-all duration-200 hover:scale-[1.02] ${
                      scanMode === 'live'
                        ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.3)] ring-2 ring-blue-500'
                        : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                    }`}
                  >
                    <div className="relative">
                      <span className="text-4xl">📸</span>
                      {scanMode === 'live' && <div className="absolute inset-0 rounded-full animate-ping bg-blue-500/20" />}
                    </div>
                    <span className="text-base font-bold text-gray-100 font-heading">Live Scan</span>
                    <span className="text-xs text-gray-400 text-center">Real-time guided capture with AI overlay</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold">Recommended · Fastest</span>
                    {scanMode === 'live' && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-3 right-3 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">✓</motion.div>
                    )}
                  </button>

                  {/* Upload Video */}
                  <button
                    onClick={() => { setScanMode('upload'); }}
                    className={`relative h-48 rounded-2xl border-2 p-6 flex flex-col items-center justify-center gap-3 transition-all duration-200 hover:scale-[1.02] ${
                      scanMode === 'upload'
                        ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.3)] ring-2 ring-blue-500'
                        : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                    }`}
                  >
                    <span className="text-4xl">☁️</span>
                    <span className="text-base font-bold text-gray-100 font-heading">Video Upload</span>
                    <span className="text-xs text-gray-400 text-center">Upload a pre-recorded 360° walkaround</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700 text-gray-400 font-semibold">Supports MP4, MOV</span>
                    {scanMode === 'upload' && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-3 right-3 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">✓</motion.div>
                    )}
                  </button>
                </div>

                {/* Continue button */}
                {scanMode && (
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => scanMode === 'live' ? startScan() : setScanStage(1)}
                    className="mt-4 w-full py-3 rounded-xl bg-blue-500 text-white font-semibold text-sm hover:bg-blue-600 transition-all active:scale-[0.98]"
                  >
                    {scanMode === 'live' ? '◉ Start Live Scan' : '↑ Continue to Upload'}
                  </motion.button>
                )}
              </motion.div>
            )}

            {/* ─── STAGE 1A: Live Scan ─── */}
            {scanStage === 1 && scanMode === 'live' && (
              <motion.div key="s1a" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                {/* Camera viewport */}
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800">
                  {/* Simulated noise bg */}
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.4\'/%3E%3C/svg%3E")' }} />

                  {/* [A] Bounding box corners */}
                  <motion.div
                    className="absolute inset-[15%] pointer-events-none"
                    animate={{ scale: [1, 1.01, 1] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                  >
                    {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                      <div key={i} className={`absolute ${pos} w-8 h-8`}>
                        <div className={`absolute ${pos.includes('top') ? 'top-0' : 'bottom-0'} ${pos.includes('left') ? 'left-0' : 'right-0'} ${pos.includes('left') ? 'border-l-2' : 'border-r-2'} ${pos.includes('top') ? 'border-t-2' : 'border-b-2'} border-white/60 w-full h-full`} style={{ boxShadow: '0 0 8px rgba(59,130,246,0.5)' }} />
                      </div>
                    ))}
                  </motion.div>

                  {/* [B] Guidance banner */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={guidanceIdx}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10"
                      >
                        <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                        <span className="text-sm text-gray-200">{GUIDANCE_STEPS[guidanceIdx].icon} {GUIDANCE_STEPS[guidanceIdx].text}</span>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* [C] Quality indicators */}
                  <div className="absolute top-4 right-4 space-y-1.5">
                    {[
                      { icon: '💡', label: 'Lighting', status: 'Good', color: 'text-emerald-400' },
                      { icon: '📐', label: 'Distance', status: '~1.5m', color: doneAngles > 1 ? 'text-emerald-400' : 'text-yellow-400' },
                      { icon: '🎥', label: 'Stability', status: 'Steady', color: 'text-emerald-400' },
                      { icon: '🔍', label: 'Focus', status: 'Sharp', color: 'text-emerald-400' },
                    ].map((q, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded bg-black/40 backdrop-blur-sm">
                        <span>{q.icon}</span>
                        <span className="text-gray-400">{q.label}:</span>
                        <span className={q.color}>{q.status}</span>
                      </div>
                    ))}
                  </div>

                  {/* [D] Progress tracker */}
                  <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md rounded-xl p-3 border border-white/10 w-40">
                    <div className="h-1 w-full rounded-full bg-gray-700 mb-2.5 overflow-hidden">
                      <motion.div className="h-full bg-blue-500 rounded-full" animate={{ width: `${(doneAngles / 4) * 100}%` }} />
                    </div>
                    {SCAN_ANGLES.map(angle => {
                      const s = scanAngles[angle];
                      return (
                        <div key={angle} className="flex items-center justify-between text-xs py-0.5">
                          <span className="text-gray-300">{angle}</span>
                          {s === 'done' ? <span className="text-emerald-400">✔</span>
                           : s === 'scanning' ? <div className="w-3 h-3 border border-yellow-400 border-t-transparent rounded-full animate-spin" />
                           : <span className="text-gray-600">—</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* [E] Live stats bar */}
                  <div className="absolute bottom-0 inset-x-0 bg-black/40 backdrop-blur-sm px-4 py-2 flex items-center gap-4 text-[10px] text-gray-400">
                    <span>Frame Rate: 30fps</span>
                    <span>Resolution: 1080p</span>
                    <span>AI Detection: Active <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" /></span>
                    <span>Session: {sessionStr}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex gap-3">
                  {isScanning ? (
                    <button onClick={() => { setIsScanning(false); startAnalysis(); }} className="flex-1 py-3 rounded-xl border-2 border-red-500 text-red-400 font-semibold text-sm hover:bg-red-500/10 transition-all active:scale-[0.98]">
                      ■ Stop Scan
                    </button>
                  ) : (
                    <button onClick={handleReset} className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 font-semibold text-sm hover:bg-gray-800 transition-all active:scale-[0.98]">
                      ↺ Retake
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* ─── STAGE 1B: Upload ─── */}
            {scanStage === 1 && scanMode === 'upload' && (
              <motion.div key="s1b" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                {!uploadedFile ? (
                  <label
                    className="flex flex-col items-center justify-center h-64 rounded-2xl border-2 border-dashed border-gray-600 hover:border-blue-500 hover:bg-blue-500/5 transition-all cursor-pointer"
                  >
                    <motion.span animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="text-5xl text-indigo-400 mb-3">☁️</motion.span>
                    <span className="text-sm text-gray-300 font-medium">Drag & drop your 360° walkaround video</span>
                    <span className="text-xs text-gray-500 mt-1">Supports MP4 and MOV · Max size 500MB</span>
                    <div className="flex items-center gap-3 my-3">
                      <div className="h-px w-12 bg-gray-700" />
                      <span className="text-xs text-gray-500">OR</span>
                      <div className="h-px w-12 bg-gray-700" />
                    </div>
                    <span className="px-4 py-2 rounded-xl border border-gray-600 text-sm text-gray-300 hover:bg-gray-800 transition-all">Browse Files</span>
                    <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={() => setUploadedFile('walkaround_video.mp4')} />
                  </label>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-gray-700 bg-gray-900 p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-32 h-20 rounded-xl bg-gray-800 flex items-center justify-center text-3xl">▶️</div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-200">{uploadedFile}</p>
                          <p className="text-xs text-gray-500 mt-0.5">42.3 MB · Duration: 1m 24s</p>
                          <div className="flex items-center gap-1.5 mt-2 text-emerald-400 text-xs font-medium">
                            <span>✓</span> Video ready for analysis
                          </div>
                        </div>
                        <button onClick={() => setUploadedFile(null)} className="text-xs text-red-400 hover:text-red-300">✕ Remove</button>
                      </div>
                      <div className="mt-4 space-y-1.5">
                        <div className="flex items-center gap-2 text-xs"><span className="text-emerald-400">✔</span><span className="text-gray-300">360° walkaround detected</span></div>
                        <div className="flex items-center gap-2 text-xs"><span className="text-emerald-400">✔</span><span className="text-gray-300">Duration: 1m 24s (sufficient)</span></div>
                        <div className="flex items-center gap-2 text-xs"><span className="text-amber-400">⚠</span><span className="text-gray-400">Lighting: Slightly low in rear angle</span></div>
                      </div>
                    </div>
                    <button onClick={handleUploadAnalyze} className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold text-sm hover:brightness-110 transition-all active:scale-[0.98]">
                      Analyze Video →
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* ─── STAGE 2: AI Analysis Loading ─── */}
            {scanStage === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 rounded-2xl bg-gray-800 animate-pulse" />
                  ))}
                </div>
                <div className="flex flex-col items-center py-8">
                  <AnimatePresence mode="wait">
                    <motion.p key={loadingTextIdx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="text-sm text-gray-400">
                      {LOADING_TEXTS[loadingTextIdx]}
                    </motion.p>
                  </AnimatePresence>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-800 overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" style={{ width: `${loadingProgress}%` }} />
                </div>
              </motion.div>
            )}

            {/* ─── STAGE 3: Analysis Result ─── */}
            {scanStage === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Dirtiness Score */}
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }} className="rounded-2xl border border-gray-800 bg-[#111827] p-5 shadow-[0_0_40px_rgba(59,130,246,0.07)]">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Dirtiness Score</h3>
                    <div className="flex flex-col items-center mb-4">
                      {/* Radial ring */}
                      <div className="relative w-28 h-28">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                          <circle cx="50" cy="50" r="42" fill="none" stroke="#1F2937" strokeWidth="8" />
                          <motion.circle
                            cx="50" cy="50" r="42" fill="none" stroke="url(#dirtGrad)" strokeWidth="8"
                            strokeLinecap="round" strokeDasharray={264}
                            initial={{ strokeDashoffset: 264 }}
                            animate={{ strokeDashoffset: 264 - (264 * MOCK_ANALYSIS.dirtinessScore / 100) }}
                            transition={{ duration: 1.2, ease: 'easeOut' }}
                          />
                          <defs><linearGradient id="dirtGrad"><stop offset="0%" stopColor="#F59E0B" /><stop offset="100%" stopColor="#EF4444" /></linearGradient></defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-bold text-amber-400 font-heading">{MOCK_ANALYSIS.dirtinessScore}</span>
                        </div>
                      </div>
                      <span className="text-sm text-amber-400 font-semibold mt-2">Heavy Soiling</span>
                    </div>
                    {/* Scale */}
                    <div className="flex h-2 rounded-full overflow-hidden mb-2">
                      <div className="flex-1 bg-emerald-500/30" />
                      <div className="flex-1 bg-amber-500/30" />
                      <div className="flex-1 bg-red-500/30" />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 mb-4">
                      <span>Clean 0-30</span><span>Moderate 31-65</span><span>Heavy 66-100</span>
                    </div>
                    {/* Breakdown */}
                    <div className="space-y-2.5">
                      {Object.entries(MOCK_ANALYSIS.breakdown).map(([key, val]) => (
                        <div key={key} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                            <span className="text-gray-300 font-mono">{val}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                            <motion.div className="h-full rounded-full" style={{ background: val > 80 ? '#EF4444' : val > 60 ? '#F59E0B' : '#10B981' }} initial={{ width: 0 }} animate={{ width: `${val}%` }} transition={{ duration: 0.8, delay: 0.2 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Damage Detection */}
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-gray-800 bg-[#111827] p-5 shadow-[0_0_40px_rgba(59,130,246,0.07)]">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Damage Detection</h3>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold mb-4">⚠ Minor Detected</span>
                    {/* Car silhouette */}
                    <div className="relative w-full aspect-[3/4] bg-gray-900 rounded-xl mb-4 overflow-hidden">
                      <svg viewBox="0 0 200 280" className="w-full h-full">
                        {/* Simplified top-down car */}
                        <rect x="40" y="30" width="120" height="220" rx="40" fill="#1F2937" stroke="#374151" strokeWidth="2" />
                        <rect x="55" y="60" width="90" height="60" rx="10" fill="#111827" stroke="#374151" strokeWidth="1" />
                        <rect x="55" y="160" width="90" height="50" rx="10" fill="#111827" stroke="#374151" strokeWidth="1" />
                        {/* Wheels */}
                        <rect x="30" y="80" width="16" height="35" rx="5" fill="#374151" />
                        <rect x="154" y="80" width="16" height="35" rx="5" fill="#374151" />
                        <rect x="30" y="170" width="16" height="35" rx="5" fill="#374151" />
                        <rect x="154" y="170" width="16" height="35" rx="5" fill="#374151" />
                      </svg>
                      {/* Damage hotspots */}
                      {MOCK_ANALYSIS.damages.map((d, i) => (
                        <motion.button
                          key={i}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: [1, 1.2, 1], opacity: 1 }}
                          transition={{ delay: 0.5 + i * 0.2, duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                          onClick={() => setSelectedDamage(selectedDamage === i ? null : i)}
                          className={`absolute w-5 h-5 rounded-full flex items-center justify-center text-[8px] cursor-pointer ${
                            d.severity === 'light' ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ left: `${d.x}%`, top: `${d.y}%`, transform: 'translate(-50%, -50%)' }}
                        >!</motion.button>
                      ))}
                      {/* Tooltip */}
                      <AnimatePresence>
                        {selectedDamage !== null && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="absolute bottom-3 left-3 right-3 bg-black/80 backdrop-blur-md rounded-xl p-3 text-xs border border-gray-700"
                          >
                            <p className="text-gray-200 font-semibold capitalize">{MOCK_ANALYSIS.damages[selectedDamage].location.replace(/-/g, ' ')}</p>
                            <p className="text-gray-400 mt-0.5">
                              {MOCK_ANALYSIS.damages[selectedDamage].type} · {MOCK_ANALYSIS.damages[selectedDamage].severity}
                              {MOCK_ANALYSIS.damages[selectedDamage].size && ` · ${MOCK_ANALYSIS.damages[selectedDamage].size}`}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="space-y-2">
                      {MOCK_ANALYSIS.damages.map((d, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-gray-900">
                          <span className={`w-2 h-2 rounded-full ${d.severity === 'light' ? 'bg-amber-500' : 'bg-red-500'}`} />
                          <span className="text-gray-300 capitalize">{d.location.replace(/-/g, ' ')}</span>
                          <span className="ml-auto px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">{d.severity}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* AI Confidence */}
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl border border-gray-800 bg-[#111827] p-5 shadow-[0_0_40px_rgba(59,130,246,0.07)]">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">AI Confidence</h3>
                    <div className="flex flex-col items-center mb-4">
                      <span className="text-5xl font-bold text-emerald-400 font-heading">{MOCK_ANALYSIS.confidence}%</span>
                      <span className="text-sm text-emerald-400 font-semibold mt-1">High Confidence</span>
                    </div>
                    {/* Spider chart simplified as bars */}
                    <div className="space-y-3">
                      {Object.entries(MOCK_ANALYSIS.confidenceAxes).map(([axis, val], i) => (
                        <div key={axis} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400 capitalize">{axis}</span>
                            <span className="text-gray-300 font-mono">{val}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                            <motion.div className="h-full bg-emerald-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${val}%` }} transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </div>

                {/* AI Recommendation */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="rounded-2xl border-l-4 border-l-blue-500 border border-gray-800 bg-[#111827] p-5 flex items-start gap-4">
                  <span className="text-2xl mt-0.5">🤖</span>
                  <div>
                    <p className="text-sm text-gray-200 font-medium">Based on the scan, this vehicle requires a <strong className="text-blue-400">Heavy Wash</strong> package.</p>
                    <p className="text-xs text-gray-500 mt-1">Estimated time: {MOCK_ANALYSIS.estimatedTime}. Recommend eco-foam Type B with extended pre-soak.</p>
                  </div>
                </motion.div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button onClick={handleReset} className="px-6 py-3 rounded-xl border border-gray-700 text-gray-400 text-sm font-medium hover:bg-gray-800 transition-all active:scale-[0.98]">↺ Re-scan</button>
                  <button onClick={handleSaveReport} className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-semibold text-sm hover:bg-blue-600 transition-all active:scale-[0.98]">
                    💾 Save & Generate Report →
                  </button>
                </div>
              </motion.div>
            )}

            {/* ─── STAGE 4: Condition Report ─── */}
            {scanStage === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-gray-100 font-heading">Vehicle Condition Report</h2>
                    <p className="text-xs text-gray-500 mt-0.5">15 Mar 2024, 14:32 · <span className="font-mono text-blue-400">{MOCK_ANALYSIS.reportId}</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Snapshots */}
                  <div className="grid grid-cols-2 gap-2">
                    {SCAN_ANGLES.map(angle => (
                      <div key={angle} className="aspect-video rounded-xl bg-gray-800 relative overflow-hidden flex items-center justify-center">
                        <span className="text-3xl opacity-20">🚗</span>
                        <span className="absolute bottom-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-black/60 text-gray-300 font-medium">{angle}</span>
                        <span className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full ${MOCK_ANALYSIS.dirtinessScore > 65 ? 'bg-red-500' : 'bg-amber-500'}`} />
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="rounded-2xl border border-gray-800 bg-[#111827] p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">License Plate</label>
                        <div className="mt-1 px-3 py-2 rounded-xl bg-gray-900 border border-gray-700 text-sm text-gray-200 font-mono">51B-123.45</div>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Make / Model</label>
                        <div className="mt-1 px-3 py-2 rounded-xl bg-gray-900 border border-gray-700 text-sm text-gray-200">Toyota Camry</div>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Condition Summary</label>
                      <p className="mt-1.5 text-xs text-gray-400 leading-relaxed">
                        Vehicle presents heavy soiling across all panels, concentrated at wheel wells and lower body.
                        Minor surface scratches detected on front bumper. No structural damage found.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {['#heavy-soiling', '#scratches', '#exterior-only'].map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Protection notice */}
                <div className="rounded-2xl border border-gray-800 bg-[#111827] p-4 flex items-start gap-3">
                  <span className="text-lg">🔒</span>
                  <div>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      This report is timestamped and GPS-verified. It is securely stored on TASCO's servers to protect both the customer and your business from post-wash disputes.
                    </p>
                    <p className="text-[10px] text-gray-600 mt-1.5">Captured: 14:32 · Ho Chi Minh City · Partner ID: #{MOCK_ANALYSIS.partnerId}</p>
                  </div>
                </div>

                {/* QR Code */}
                <div className="rounded-2xl border border-gray-800 bg-[#111827] p-5 flex items-center gap-5">
                  <div className="w-24 h-24 rounded-xl bg-white p-2 shrink-0">
                    <div className="w-full h-full" style={{ backgroundImage: 'repeating-conic-gradient(#000 0% 25%, #fff 0% 50%)', backgroundSize: '20% 20%' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-200">Share with Customer</p>
                    <p className="text-xs text-gray-500 mt-0.5">Customer can scan to view their vehicle report</p>
                    <button className="mt-2 px-3 py-1.5 rounded-lg border border-gray-700 text-xs text-gray-300 hover:bg-gray-800 transition-all">Copy Link</button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-semibold text-sm hover:bg-blue-600 transition-all active:scale-[0.98]" onClick={handleProceedToWash}>
                    💾 Proceed to Wash Protocol →
                  </button>
                  <button className="px-6 py-3 rounded-xl border border-gray-700 text-gray-400 text-sm font-medium hover:bg-gray-800 transition-all active:scale-[0.98]">
                    📄 Export PDF
                  </button>
                </div>
              </motion.div>
            )}

            {/* ─── STAGE 5: TASCO Wash Process ─── */}
            {scanStage === 5 && (
              <motion.div key="s5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-lg font-bold text-gray-100 font-heading">Recommended Wash Protocol</h2>
                  <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">🌱 TASCO Eco Standard · Heavy Package</span>
                </div>

                {/* Vertical stepper */}
                <div className="space-y-0">
                  {WASH_STEPS.map((step, i) => (
                    <motion.div
                      key={step.num}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex gap-4"
                    >
                      {/* Line + circle */}
                      <div className="flex flex-col items-center">
                        <button
                          onClick={() => setCurrentWashStep(i)}
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all ${
                            i <= currentWashStep ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-500'
                          }`}
                        >
                          {i < currentWashStep ? '✓' : step.num}
                        </button>
                        {i < WASH_STEPS.length - 1 && (
                          <div className={`w-0.5 flex-1 min-h-[24px] ${i < currentWashStep ? 'bg-blue-500' : 'bg-gray-800'}`} />
                        )}
                      </div>

                      {/* Content */}
                      <div className={`pb-5 flex-1 rounded-2xl mb-2 p-4 border transition-all ${
                        i === currentWashStep ? 'border-blue-500/30 bg-blue-500/5' : 'border-gray-800 bg-[#111827]'
                      }`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-lg">{step.icon}</span>
                          <span className="text-sm font-bold text-gray-100 font-heading">{step.title}</span>
                          {step.badge && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              step.badgeColor === 'amber' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                            }`}>{step.badge}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">{step.desc}</p>
                        {step.extra && <p className="text-[10px] mt-1.5 px-2 py-1 rounded bg-gray-900 text-gray-500 inline-block font-mono">{step.extra}</p>}
                        {step.checklist && (
                          <div className="mt-2 space-y-1">
                            {step.checklist.map(c => (
                              <div key={c} className="flex items-center gap-1.5 text-xs text-gray-400"><span className="text-emerald-400">✔</span>{c}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Sustainability card */}
                <div className="rounded-2xl border border-gray-800 bg-[#111827] p-5">
                  <h3 className="text-sm font-bold text-gray-200 font-heading mb-3">🌍 Environmental Impact</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-lg font-bold text-blue-400 font-heading">45L</p>
                      <p className="text-[10px] text-gray-500">Water usage 💧</p>
                      <p className="text-[10px] text-emerald-400">15% below avg</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-emerald-400 font-heading">Minimal</p>
                      <p className="text-[10px] text-gray-500">Chemical waste 🌿</p>
                      <p className="text-[10px] text-gray-500">Eco-formula</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-indigo-400 font-heading">Yes</p>
                      <p className="text-[10px] text-gray-500">Carbon offset ♻️</p>
                      <p className="text-[10px] text-gray-500">Participating</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-3 text-center">This session follows TASCO Sustainable Wash Standard v2.1</p>
                </div>

                {/* Finish */}
                <button
                  onClick={() => {
                    useAppStore.getState().setActiveView('simulation');
                    addToast({ message: '🚗 Proceeding to wash simulation', type: 'info' });
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold text-sm hover:brightness-110 transition-all active:scale-[0.98]"
                >
                  ✅ Start Wash Process →
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ═══ RIGHT SIDEBAR ═══ */}
        <div className="hidden lg:flex flex-col w-80 shrink-0 border-l border-gray-800 overflow-y-auto p-4 space-y-4">
          {/* Session Status */}
          <div className="rounded-2xl border border-gray-800 bg-[#111827] p-4 shadow-[0_0_40px_rgba(59,130,246,0.07)]">
            <div className="flex items-center gap-2.5 mb-3">
              <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className={`w-3 h-3 rounded-full ${statusDot}`} />
              <span className="text-sm font-semibold text-gray-200">{statusLabel}</span>
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex justify-between"><span>Session</span><span className="font-mono text-gray-300">{sessionStr}</span></div>
              <div className="flex justify-between"><span>Partner</span><span className="text-gray-300">#{MOCK_ANALYSIS.partnerId} · Bình Minh Auto</span></div>
            </div>
          </div>

          {/* Price Suggestion */}
          <div className="rounded-2xl border border-gray-800 bg-[#111827] p-4 shadow-[0_0_40px_rgba(59,130,246,0.07)]">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Suggested Pricing</h3>
            {analysisComplete ? (
              <>
                <p className="text-xl font-bold text-blue-400 font-heading mb-3">
                  {formatVND(MOCK_ANALYSIS.priceRange.min)} – {formatVND(MOCK_ANALYSIS.priceRange.max)}
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-400"><span>Base</span><span className="font-mono text-gray-300">{formatVND(MOCK_ANALYSIS.priceBreakdown.base)}</span></div>
                  <div className="flex justify-between text-gray-400"><span>Heavy add-on</span><span className="font-mono text-gray-300">+{formatVND(MOCK_ANALYSIS.priceBreakdown.heavyAddon)}</span></div>
                  <div className="flex justify-between text-gray-400"><span>Eco surcharge</span><span className="font-mono text-gray-300">+{formatVND(MOCK_ANALYSIS.priceBreakdown.ecoSurcharge)}</span></div>
                  <div className="pt-2 border-t border-gray-800">
                    <p className="text-[10px] text-gray-600">Customer-facing price. Partner keeps 78%.</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-600 italic">Complete scan to see pricing</p>
            )}
          </div>

          {/* TASCO Compliance */}
          <div className="rounded-2xl border border-gray-800 bg-[#111827] p-4 shadow-[0_0_40px_rgba(59,130,246,0.07)]">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-emerald-400 text-lg">🛡️</span>
              <span className="text-sm font-bold text-emerald-400">TASCO Verified</span>
            </div>
            <div className="space-y-1.5 text-xs text-gray-400">
              <div className="flex items-center gap-2"><span className="text-gray-600">Protocol:</span><span className="text-gray-300">{analysisComplete ? 'Heavy Eco Wash' : '—'}</span></div>
              <div className="flex items-center gap-2"><span className="text-gray-600">Chemicals:</span><span className="text-emerald-400">{analysisComplete ? '✔ Approved' : '—'}</span></div>
              <div className="flex items-center gap-2"><span className="text-gray-600">Process:</span><span className="text-emerald-400">{analysisComplete ? '✔ Standardized' : '—'}</span></div>
              {scanStage === 5 && (
                <div className="flex items-center gap-2"><span className="text-gray-600">Progress:</span><span className="text-blue-400">Step {currentWashStep + 1} of 7</span></div>
              )}
            </div>
          </div>

          {/* Quick History */}
          <div className="rounded-2xl border border-gray-800 bg-[#111827] p-4 shadow-[0_0_40px_rgba(59,130,246,0.07)]">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Scans</h3>
            <div className="space-y-2">
              {SCAN_HISTORY.map((h, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs py-1.5">
                  <span>{h.icon}</span>
                  <span className="font-mono text-gray-300">{h.plate}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    h.level === 'Heavy' ? 'bg-red-500/20 text-red-400' : h.level === 'Moderate' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>{h.level}</span>
                  <span className="ml-auto text-gray-600">{h.time}</span>
                </div>
              ))}
            </div>
            <button className="mt-3 text-xs text-blue-400 hover:text-blue-300 transition-colors">View All History →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
