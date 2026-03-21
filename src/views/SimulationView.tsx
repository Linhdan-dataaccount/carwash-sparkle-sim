import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import { VETC_USER, TIERS } from '@/data/vetcUser';
import { CAR_DATA, generateScanResult, WASH_STEPS_ICE, WASH_STEPS_EV } from '@/data/mockHelpers';
import { formatVND } from '@/utils/formatVND';
import { playSound } from '@/utils/sounds';
import { t } from '@/i18n/translations';
import { JourneyBar } from '@/components/layout/JourneyBar';
import { AutoPayWidget } from '@/components/simulation/AutoPayWidget';
import * as THREE from 'three';

// 3D Car
function CarModel({ carType, phase }: { carType: string; phase: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const data = CAR_DATA[carType];
  const isEV = data?.isEV || false;

  const bodySize: [number, number, number] =
    carType === 'sports' ? [4.2, 0.8, 2] :
    carType.includes('vf') || carType === 'suv' ? [4, 1.3, 2.2] : [4, 1, 2];
  const roofSize: [number, number, number] =
    carType === 'sports' ? [1.8, 0.6, 1.6] :
    carType.includes('vf') || carType === 'suv' ? [3.5, 0.9, 2] : [2.5, 0.8, 1.8];
  const roofPos: [number, number, number] =
    carType === 'sports' ? [-0.5, 0.7, 0] : [0, bodySize[1] * 0.85, 0];
  const bodyColor = carType.includes('vf8') ? '#2563eb' : carType.includes('vf9') ? '#1e293b' :
    carType === 'sports' ? '#dc2626' : carType === 'suv' ? '#334155' : '#475569';

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (phase === 'entering') {
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, 0, delta * 2);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, phase === 'entering' ? 8 : 0]}>
      <mesh position={[0, bodySize[1] / 2, 0]}>
        <boxGeometry args={bodySize} />
        <meshStandardMaterial color={bodyColor} metalness={0.85} roughness={0.15} envMapIntensity={1.5} />
      </mesh>
      <mesh position={roofPos}>
        <boxGeometry args={roofSize} />
        <meshStandardMaterial color={bodyColor} metalness={0.85} roughness={0.15} envMapIntensity={1.5} />
      </mesh>
      <mesh position={[0, bodySize[1] * 0.85, 0]} scale={[0.98, 0.98, 0.98]}>
        <boxGeometry args={[roofSize[0] * 0.9, roofSize[1] * 0.8, roofSize[2] * 1.01]} />
        <meshStandardMaterial color="#aaccee" transparent opacity={0.45} metalness={0.3} roughness={0.05} envMapIntensity={2} />
      </mesh>
      {[[-1.4, 0.15, 1.1], [1.4, 0.15, 1.1], [-1.4, 0.15, -1.1], [1.4, 0.15, -1.1]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 0.25, 16]} />
          <meshStandardMaterial color="#333" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {isEV && <pointLight color="#22c55e" intensity={0.5} position={[0, -0.3, 0]} distance={3} />}
    </group>
  );
}

function ScanBeam({ active }: { active: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const startTime = useRef(0);

  useFrame(({ clock }) => {
    if (!meshRef.current || !active) return;
    if (startTime.current === 0) startTime.current = clock.elapsedTime;
    const elapsed = clock.elapsedTime - startTime.current;
    const progress = Math.min(elapsed / 2.5, 1);
    meshRef.current.position.y = 1.5 - progress * 2;
    meshRef.current.visible = true;
  });

  useEffect(() => {
    if (!active) startTime.current = 0;
  }, [active]);

  if (!active) return null;

  return (
    <mesh ref={meshRef} position={[0, 1.5, 0]}>
      <planeGeometry args={[5, 0.05]} />
      <meshBasicMaterial color="#00d4ff" transparent opacity={0.8} side={THREE.DoubleSide} />
    </mesh>
  );
}

function WashTunnel() {
  return (
    <group>
      {[-2.5, 2.5].map((x) => (
        <mesh key={x} position={[0, 1.5, x]}>
          <boxGeometry args={[6, 0.1, 0.1]} />
          <meshStandardMaterial color="#334155" metalness={0.8} />
        </mesh>
      ))}
      {[-3, 0, 3].map((z) => (
        <mesh key={z} position={[-3, 1.5, z]}>
          <boxGeometry args={[0.1, 3, 0.1]} />
          <meshStandardMaterial color="#334155" metalness={0.8} />
        </mesh>
      ))}
      {[-3, 0, 3].map((z) => (
        <mesh key={`r${z}`} position={[3, 1.5, z]}>
          <boxGeometry args={[0.1, 3, 0.1]} />
          <meshStandardMaterial color="#334155" metalness={0.8} />
        </mesh>
      ))}
      {[-2.5, 0, 2.5].map((z) => (
        <mesh key={`t${z}`} position={[0, 3, z]}>
          <boxGeometry args={[6, 0.1, 0.1]} />
          <meshStandardMaterial color="#334155" metalness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.3} roughness={0.6} />
      </mesh>
    </group>
  );
}

function WashProgressBar({ steps, currentStep, lang }: { steps: typeof WASH_STEPS_ICE; currentStep: number; lang: 'vi' | 'en' }) {
  // Bilingual step labels
  const stepKeys: Record<string, 'step_soap' | 'step_rinse' | 'step_engine' | 'step_dry' | 'step_vacuum' | 'step_inspect' | 'step_ev_soap' | 'step_ev_rinse' | 'step_ev_port' | 'step_ev_inspect'> = {
    'Phun bọt xà phòng': 'step_soap', 'Rửa áp lực cao': 'step_rinse', 'Rửa khoang máy': 'step_engine',
    'Sấy khô': 'step_dry', 'Hút bụi nội thất': 'step_vacuum', 'Kiểm tra chất lượng': 'step_inspect',
    'Phun bọt EV-Safe': 'step_ev_soap', 'Rửa áp lực thấp': 'step_ev_rinse',
    'Kiểm tra cổng sạc': 'step_ev_port', 'Kiểm tra an toàn EV': 'step_ev_inspect',
  };

  return (
    <div className="space-y-2">
      {steps.map((step, i) => {
        const isActive = i === currentStep;
        const isDone = i < currentStep;
        const key = stepKeys[step.label];
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`flex items-center gap-3 p-2.5 rounded-lg transition-all duration-300 ${
              isActive ? 'bg-tasco-blue/10 border border-tasco-blue/30' :
              isDone ? 'opacity-60' : 'opacity-30'
            }`}
          >
            <span className="text-lg">{step.icon}</span>
            <span className="text-sm flex-1">{key ? t(key as any, lang) : step.label}</span>
            {isDone && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-tasco-green text-xs"
              >
                ✓
              </motion.span>
            )}
            {isActive && (
              <div className="w-4 h-4 border-2 border-tasco-blue border-t-transparent rounded-full animate-spin" />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

export default function SimulationView() {
  const {
    selectedCar, setSelectedCar, simulationPhase, setSimulationPhase,
    washStep, setWashStep, scanResults, setScanResults,
    dirtLevel, setDirtLevel, addToast, totalWashes, vetcPoints, addWash, lang,
  } = useAppStore();

  const carData = CAR_DATA[selectedCar];
  const isEV = carData?.isEV || false;
  const steps = isEV ? WASH_STEPS_EV : WASH_STEPS_ICE;

  const [sceneLoaded, setSceneLoaded] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Scene loading skeleton
  useEffect(() => {
    const timer = setTimeout(() => setSceneLoaded(true), 800);
    return () => clearTimeout(timer);
  }, []);

  // Phase machine
  useEffect(() => {
    if (simulationPhase === 'entering') {
      playSound('move');
      const timer = setTimeout(() => setSimulationPhase('scanning'), 2000);
      return () => clearTimeout(timer);
    }
    if (simulationPhase === 'scanning') {
      playSound('scan');
      const timer = setTimeout(() => setSimulationPhase('analyzing'), 2500);
      return () => clearTimeout(timer);
    }
    if (simulationPhase === 'analyzing') {
      const result = generateScanResult(selectedCar, dirtLevel, isEV);
      const timer = setTimeout(() => {
        setScanResults(result);
        setSimulationPhase('results');
      }, 1500);
      return () => clearTimeout(timer);
    }
    if (simulationPhase === 'washing') {
      setWashStep(0);
      let cumulative = 0;
      const timeouts: NodeJS.Timeout[] = [];
      steps.forEach((step, i) => {
        cumulative += step.durationMs;
        timeouts.push(setTimeout(() => {
          if (i < steps.length - 1) setWashStep(i + 1);
        }, cumulative));
      });
      const total = steps.reduce((s, st) => s + st.durationMs, 0);
      timeouts.push(setTimeout(() => {
        playSound('complete');
        setShowCelebration(true);
        setTimeout(() => {
          setShowCelebration(false);
          setSimulationPhase('complete');
        }, 800);
        const price = scanResults?.recommendation.priceRange[0] || 150_000;
        const pts = Math.floor(price / 1000);
        addWash(pts);
        addToast({ message: t('toast_complete', lang, { pts }), type: 'success' });
      }, total + 1000));
      return () => timeouts.forEach(clearTimeout);
    }
  }, [simulationPhase]);

  const handleStart = () => {
    if (isEV) {
      setSimulationPhase('ev_check');
      playSound('ev');
    } else {
      setSimulationPhase('entering');
    }
  };

  const handleSelectCar = (c: string) => {
    setSelectedCar(c as any);
    setDirtLevel(Math.floor(Math.random() * 55) + 40);
    setSimulationPhase('idle');
    setScanResults(null);
  };

  const handleReset = () => {
    setSimulationPhase('idle');
    setScanResults(null);
    setWashStep(0);
  };

  const afterDirt = useMemo(() => Math.round(dirtLevel * 0.12 + Math.random() * 5), [dirtLevel, simulationPhase === 'complete']);
  const discount = TIERS[VETC_USER.tier].discount;
  const price = scanResults ? scanResults.recommendation.priceRange[0] + Math.floor(Math.random() * (scanResults.recommendation.priceRange[1] - scanResults.recommendation.priceRange[0])) : 150_000;
  const discountAmt = Math.round(price * discount / 100);
  const total = price - discountAmt;
  const pointsEarned = Math.floor(total / 1000);

  const [showReport, setShowReport] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (simulationPhase === 'complete') {
      setShowReport(false);
      const newTotal = totalWashes + 1;
      const nextTier = TIERS[VETC_USER.tier].next;
      const nextWashes = TIERS[VETC_USER.tier].washes;
      if (nextTier && nextWashes && newTotal >= nextWashes) {
        setShowConfetti(true);
        playSound('tier_up');
        setTimeout(() => setShowConfetti(false), 4000);
      }
    }
  }, [simulationPhase]);

  const newBalance = VETC_USER.walletBalance - total;

  return (
    <div className="h-full flex flex-col">
      {/* Journey Bar */}
      <JourneyBar />

      {/* VETC Banner — causal language */}
      <div className="vetc-bar mx-4 mt-2 px-4 py-2">
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <span>🛣️</span>
          <span className="text-foreground text-xs">
            {t('vetc_cause', lang, { dist: VETC_USER.lastTrip.distanceKm.toLocaleString(), pct: VETC_USER.lastTrip.dirtPrediction })}
          </span>
          {isEV && <span className="text-ev-green text-xs">⚡ EV-Safe Mode</span>}
          <span className="text-xs text-vetc-orange ml-auto flex items-center gap-1">
            ⭐ {t('vetc_cause_rec', lang)}
          </span>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 p-3 gap-3">
        {/* 3D Canvas */}
        <div className="flex-1 relative rounded-2xl overflow-hidden bg-card">
          {/* Loading skeleton */}
          <AnimatePresence>
            {!sceneLoaded && (
              <motion.div
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-card"
              >
                <div className="w-16 h-16 rounded-full bg-muted animate-pulse mb-4" />
                <div className="text-sm text-muted-foreground">{t('loading_3d', lang)}</div>
              </motion.div>
            )}
          </AnimatePresence>

          <Canvas camera={{ position: [6, 4, 6], fov: 50 }}>
            <ambientLight intensity={1.2} />
            <directionalLight position={[5, 8, 5]} intensity={1.5} castShadow />
            <directionalLight position={[-4, 6, -3]} intensity={0.6} color="#e2e8f0" />
            <pointLight position={[-3, 2, 0]} intensity={0.6} color="#00d4ff" />
            <pointLight position={[3, 3, -2]} intensity={0.4} color="#f0f0f0" />
            <hemisphereLight args={['#cbd5e1', '#1e293b', 0.8]} />
            <Suspense fallback={null}>
              <WashTunnel />
              <CarModel carType={selectedCar} phase={simulationPhase} />
              <ScanBeam active={simulationPhase === 'scanning'} />
            </Suspense>
            <OrbitControls enablePan={false} maxDistance={12} minDistance={4} />
          </Canvas>

          {/* Dirt overlay */}
          {simulationPhase !== 'complete' && simulationPhase !== 'idle' && (
            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
              style={{
                background: `radial-gradient(ellipse at 50% 50%, rgba(139,90,43,${dirtLevel * 0.003}) 0%, transparent 70%)`,
                opacity: simulationPhase === 'washing' ? Math.max(0, 1 - washStep / steps.length) : 1,
              }}
            />
          )}

          {/* Scan grid */}
          <div className={`scan-grid ${simulationPhase === 'scanning' ? 'active' : ''}`} />

          {/* Queue widget */}
          <div className="absolute top-3 left-3 glass px-3 py-2 text-xs">
            <div className="text-muted-foreground">{t('sim_queue', lang)}</div>
            <div className="font-mono text-foreground">{t('sim_queue_info', lang)}</div>
          </div>

          {/* Celebration flash */}
          <AnimatePresence>
            {showCelebration && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 10 }}
                  className="text-6xl mb-4"
                >
                  ✨
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="font-heading text-xl font-bold"
                >
                  {t('sim_complete', lang)}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* EV check overlay */}
          <AnimatePresence>
            {simulationPhase === 'ev_check' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 flex items-center justify-center bg-black/60 z-10"
              >
                <div className="glass p-6 max-w-md mx-4">
                  <h3 className="font-heading text-lg font-semibold mb-3">⚡ {t('sim_ev_title', lang)}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{t('rc_vehicle', lang)}: {carData.label}</p>

                  <div className="space-y-1.5 mb-4">
                    <div className="text-xs text-tasco-red flex items-center gap-2">✗ {t('sim_ev_no_engine', lang)}</div>
                    <div className="text-xs text-tasco-red flex items-center gap-2">✗ {t('sim_ev_no_pressure', lang)}</div>
                    <div className="text-xs text-tasco-green flex items-center gap-2">✓ {t('sim_ev_seal', lang)}</div>
                    <div className="text-xs text-tasco-green flex items-center gap-2">✓ {t('sim_ev_foam', lang)}</div>
                    <div className="text-xs text-tasco-green flex items-center gap-2">✓ {t('sim_ev_dry', lang)}</div>
                  </div>

                  <div className="vetc-bar p-2 text-xs text-vetc-orange mb-4">
                    ⚠️ {t('sim_ev_warn', lang)}
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setSimulationPhase('idle')} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {t('sim_ev_cancel', lang)}
                    </button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSimulationPhase('entering')}
                      className="px-4 py-2 text-sm bg-ev-green/20 text-ev-green rounded-lg hover:bg-ev-green/30 transition-colors flex-1"
                    >
                      {t('sim_ev_confirm', lang)}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Panel */}
        <div className="w-[340px] shrink-0 glass rounded-2xl overflow-y-auto flex flex-col">
          <div className="p-4 flex-1">
            <AnimatePresence mode="wait">
              {/* IDLE — Car Selector */}
              {simulationPhase === 'idle' && (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="font-heading font-semibold mb-3">{t('sim_select_car', lang)}</h3>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {Object.entries(CAR_DATA).map(([key, data]) => (
                      <motion.button
                        key={key}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleSelectCar(key)}
                        className={`p-3 rounded-xl text-center transition-all border ${
                          selectedCar === key
                            ? data.isEV
                              ? 'border-ev-green/50 bg-ev-green/10 shadow-[0_0_20px_rgba(34,197,94,0.15)]'
                              : 'border-tasco-blue/50 bg-tasco-blue/10 shadow-[0_0_20px_rgba(0,212,255,0.15)]'
                            : 'border-border hover:border-border/70'
                        }`}
                      >
                        <div className="text-2xl mb-1">{data.icon}</div>
                        <div className="text-xs font-medium">{data.label}</div>
                        {data.isEV && <span className="text-[10px] text-ev-green">EV</span>}
                      </motion.button>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">
                    {t('sim_dirt_level', lang)}: <span className="font-mono text-foreground">{dirtLevel}%</span>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleStart}
                    className="w-full py-3 rounded-xl bg-tasco-blue/20 text-tasco-blue font-medium hover:bg-tasco-blue/30 transition-all"
                  >
                    {isEV ? `⚡ ${t('sim_start_ev', lang)}` : `🚗 ${t('sim_start', lang)}`}
                  </motion.button>
                </motion.div>
              )}

              {/* ENTERING / SCANNING / ANALYZING */}
              {['entering', 'scanning', 'analyzing'].includes(simulationPhase) && (
                <motion.div key="progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full">
                  <div className="w-12 h-12 border-2 border-tasco-blue border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm text-muted-foreground">
                    {simulationPhase === 'entering' ? t('sim_entering', lang) :
                     simulationPhase === 'scanning' ? t('sim_scanning', lang) : t('sim_analyzing', lang)}
                  </p>
                </motion.div>
              )}

              {/* RESULTS */}
              {simulationPhase === 'results' && scanResults && (
                <motion.div key="results" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                  <h3 className="font-heading font-semibold mb-3">{t('sim_results', lang)}</h3>

                  {/* Causal VETC context */}
                  <div className="vetc-bar p-2.5 text-xs mb-3">
                    <span className="font-semibold text-vetc-orange">📡 {lang === 'vi' ? 'Dữ liệu VETC:' : 'VETC data:'}</span>
                    {' '}{t('vetc_cause_scan', lang, { km: VETC_USER.lastTrip.distanceKm.toLocaleString(), toll: VETC_USER.lastTrip.tollPasses })}
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span>{t('sim_dirt', lang)}</span>
                      <span className="font-mono">{scanResults.dirtLevel}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${scanResults.dirtLevel}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full bg-tasco-red"
                      />
                    </div>
                  </div>

                  <div className="text-xs flex items-center gap-2 mb-2">
                    <span>{scanResults.damage.severity === 'none' ? '✅' : '⚠️'}</span>
                    <span>{scanResults.damage.severity === 'none' ? t('no_damage', lang) :
                           scanResults.damage.severity === 'light' ? t('light_scratch', lang) : t('heavy_dirt', lang)}</span>
                  </div>

                  {isEV && scanResults.chargingPort && (
                    <div className="text-xs flex items-center gap-2 mb-2 text-ev-green">
                      ✅ {t('sim_port_closed', lang)}
                    </div>
                  )}

                  <div className="glass p-3 mb-3">
                    <div className="text-sm font-medium mb-1">{t('sim_recommend', lang)}: {scanResults.recommendation.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatVND(scanResults.recommendation.priceRange[0])} – {formatVND(scanResults.recommendation.priceRange[1])}
                      {' · '}{scanResults.recommendation.mins[0]}–{scanResults.recommendation.mins[1]} {t('mins_unit', lang)}
                    </div>
                  </div>

                  {/* Auto-pay widget */}
                  <AutoPayWidget estimatedPrice={price} discountPct={discount} />

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSimulationPhase('washing')}
                    className="w-full py-3 rounded-xl bg-tasco-blue/20 text-tasco-blue font-medium hover:bg-tasco-blue/30 transition-all"
                  >
                    {t('sim_proceed', lang)}
                  </motion.button>
                </motion.div>
              )}

              {/* WASHING */}
              {simulationPhase === 'washing' && (
                <motion.div key="washing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="font-heading font-semibold mb-3">{t('sim_washing', lang)}</h3>

                  <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-4">
                    <motion.div
                      className="h-full rounded-full bg-tasco-blue"
                      animate={{ width: `${((washStep + 1) / steps.length) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>

                  <WashProgressBar steps={steps} currentStep={washStep} lang={lang} />
                </motion.div>
              )}

              {/* COMPLETE */}
              {simulationPhase === 'complete' && (
                <motion.div key="complete" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {!showReport ? (
                    <>
                      <h3 className="font-heading font-semibold mb-3">✅ {t('tr_title', lang)}</h3>

                      <div className="space-y-3 mb-4">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">{t('tr_before', lang)}</div>
                          <div className="h-3 bg-muted rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${dirtLevel}%` }} transition={{ duration: 0.8 }} className="h-full bg-tasco-red rounded-full" />
                          </div>
                          <div className="text-xs font-mono text-right mt-0.5">{dirtLevel}%</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">{t('tr_after', lang)}</div>
                          <div className="h-3 bg-muted rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${afterDirt}%` }} transition={{ duration: 1, delay: 0.5 }} className="h-full bg-tasco-green rounded-full" />
                          </div>
                          <div className="text-xs font-mono text-right mt-0.5">{afterDirt}%</div>
                        </div>
                      </div>

                      <div className="glass p-3 space-y-1.5 mb-4 text-xs">
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('tr_staff', lang)}</span><span>Nguyễn Thị Lan (T-0042) ⭐ 4.9</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('tr_duration', lang)}</span><span className="font-mono">11 {t('mins_unit', lang)} 32s</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('tr_products', lang)}</span><span>EcoFoam Pro™, Tasco Wax Shield</span></div>
                        {/* Water usage with eco framing */}
                        <div className="flex justify-between items-start">
                          <span className="text-muted-foreground">{t('tr_water', lang)}</span>
                          <div className="text-right">
                            <span className="font-mono">48L</span>
                            <div className="text-[10px] text-ev-green flex items-center gap-1 justify-end mt-0.5">
                              🌱 {t('tr_water_eco', lang)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-center text-xs text-tasco-green mb-4">✅ {t('tr_seal', lang)}</div>

                      <div className="flex gap-2 mb-3">
                        <motion.button whileTap={{ scale: 0.97 }} className="flex-1 py-2 rounded-lg bg-tasco-green/10 text-tasco-green text-sm hover:bg-tasco-green/20 transition-colors">👍 {t('tr_happy', lang)}</motion.button>
                        <motion.button whileTap={{ scale: 0.97 }} className="flex-1 py-2 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors">👎 {t('tr_issue', lang)}</motion.button>
                      </div>

                      <button onClick={() => setShowReport(true)} className="w-full text-xs text-tasco-blue hover:text-tasco-blue/80 transition-colors">
                        {t('rc_view', lang)}
                      </button>
                    </>
                  ) : (
                    <>
                      <h3 className="font-heading font-semibold mb-3">🧾 {t('rc_title', lang)}</h3>

                      {/* Payment Complete Banner */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center p-4 rounded-xl mb-4"
                        style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.03))', border: '1px solid rgba(34,197,94,0.2)' }}
                      >
                        <div className="text-3xl mb-1">✅</div>
                        <div className="text-sm font-heading font-bold text-ev-green">{t('pay_done', lang)}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{t('pay_no_action', lang)}</div>
                      </motion.div>

                      {/* Wallet Deduction */}
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="glass p-3 mb-3"
                      >
                        <div className="text-xs text-muted-foreground">{t('pay_deducted', lang)}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{VETC_USER.plate} · {VETC_USER.tier}</div>
                        <div className="text-lg font-heading font-bold text-vetc-orange mt-1 font-mono">-{formatVND(total)}</div>
                        <div className="text-xs text-muted-foreground mt-1">{t('pay_new_balance', lang)}: <span className="font-mono">{formatVND(newBalance)}</span></div>
                      </motion.div>

                      {/* Time Saved */}
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="flex items-start gap-2.5 p-3 rounded-xl mb-3"
                        style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.12)' }}
                      >
                        <span className="text-lg">⏱</span>
                        <div className="flex-1">
                          <div className="text-xs font-medium">{t('time_saved', lang)}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{t('time_vs', lang)}</div>
                          <span className="inline-block mt-1 text-[10px] font-bold text-tasco-blue bg-tasco-blue/10 px-2 py-0.5 rounded-full">
                            {t('faster_badge', lang)}
                          </span>
                        </div>
                      </motion.div>

                      {/* Points earned */}
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="flex items-center justify-between p-3 rounded-xl mb-4"
                        style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)' }}
                      >
                        <span className="text-xs">{t('rc_points', lang)}</span>
                        <span className="font-mono font-bold text-vetc-orange">+{pointsEarned} pts</span>
                      </motion.div>

                      {/* Receipt detail */}
                      <div className="glass p-3 space-y-2 text-xs mb-4">
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('rc_service', lang)}</span><span>{scanResults?.recommendation.name}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('rc_vehicle', lang)}</span><span>{carData.label} · {VETC_USER.plate}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('rc_price', lang)}</span><span className="font-mono">{formatVND(price)}</span></div>
                        <div className="flex justify-between text-vetc-orange"><span>{t('rc_discount', lang, { tier: VETC_USER.tier, pct: discount })}</span><span className="font-mono">-{formatVND(discountAmt)}</span></div>
                      </div>

                      <div className="flex gap-2 mb-3">
                        <motion.button whileTap={{ scale: 0.97 }} onClick={() => addToast({ message: t('toast_pdf', lang), type: 'info' })} className="flex-1 py-2 rounded-lg bg-muted text-xs hover:bg-muted/80 transition-colors">📥 {t('rc_download', lang)}</motion.button>
                        <motion.button whileTap={{ scale: 0.97 }} onClick={() => addToast({ message: t('toast_copied', lang), type: 'success' })} className="flex-1 py-2 rounded-lg bg-muted text-xs hover:bg-muted/80 transition-colors">↗ {t('rc_share', lang)}</motion.button>
                      </div>
                      <motion.button whileTap={{ scale: 0.97 }} onClick={handleReset} className="w-full py-2.5 rounded-xl bg-tasco-blue/20 text-tasco-blue text-sm font-medium hover:bg-tasco-blue/30 transition-all">
                        🔁 {t('rc_again', lang)}
                      </motion.button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Loyalty Widget */}
          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shimmer"
                style={{ background: TIERS[VETC_USER.tier].color + '33', color: TIERS[VETC_USER.tier].color }}
              >
                {VETC_USER.tier[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium">{VETC_USER.tier} · <span className="font-mono">{vetcPoints.toLocaleString()} {t('loyalty_points', lang)}</span></div>
                <div className="text-[10px] text-muted-foreground">🔥 {VETC_USER.streak} {t('loyalty_streak', lang)}</div>
              </div>
            </div>
            {TIERS[VETC_USER.tier].next && TIERS[VETC_USER.tier].washes && (
              <div className="mt-2">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(totalWashes / (TIERS[VETC_USER.tier].washes || 1)) * 100}%`,
                      background: TIERS[VETC_USER.tier].color,
                    }}
                  />
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {t('loyalty_to_next', lang, { n: (TIERS[VETC_USER.tier].washes || 0) - totalWashes, tier: TIERS[VETC_USER.tier].next || '' })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                background: ['#00d4ff', '#00ff88', '#ffd600', '#ff4444', '#7c3aed'][i % 5],
                animation: `confetti-fall ${1.5 + Math.random() * 2}s linear forwards`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
