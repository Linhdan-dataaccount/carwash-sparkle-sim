import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import { VETC_USER, TIERS } from '@/data/vetcUser';
import { CAR_DATA, generateScanResult, WASH_STEPS_ICE, WASH_STEPS_EV } from '@/data/mockHelpers';
import { formatVND } from '@/utils/formatVND';
import { playSound } from '@/utils/sounds';
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
      {/* Body */}
      <mesh position={[0, bodySize[1] / 2, 0]}>
        <boxGeometry args={bodySize} />
        <meshStandardMaterial color={bodyColor} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Roof */}
      <mesh position={roofPos}>
        <boxGeometry args={roofSize} />
        <meshStandardMaterial color={bodyColor} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Windows */}
      <mesh position={[0, bodySize[1] * 0.85, 0]} scale={[0.98, 0.98, 0.98]}>
        <boxGeometry args={[roofSize[0] * 0.9, roofSize[1] * 0.8, roofSize[2] * 1.01]} />
        <meshStandardMaterial color="#88aacc" transparent opacity={0.5} />
      </mesh>
      {/* Wheels */}
      {[[-1.4, 0.15, 1.1], [1.4, 0.15, 1.1], [-1.4, 0.15, -1.1], [1.4, 0.15, -1.1]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 0.25, 16]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      ))}
      {/* EV underglow */}
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
      {/* Tunnel frame */}
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
      {/* Top bars */}
      {[-2.5, 0, 2.5].map((z) => (
        <mesh key={`t${z}`} position={[0, 3, z]}>
          <boxGeometry args={[6, 0.1, 0.1]} />
          <meshStandardMaterial color="#334155" metalness={0.8} />
        </mesh>
      ))}
      {/* Floor */}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
    </group>
  );
}

// Wash Progress Bar component
function WashProgressBar({ steps, currentStep }: { steps: typeof WASH_STEPS_ICE; currentStep: number }) {
  return (
    <div className="space-y-2">
      {steps.map((step, i) => {
        const isActive = i === currentStep;
        const isDone = i < currentStep;
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
            <span className="text-sm flex-1">{step.label}</span>
            {isDone && <span className="text-tasco-green text-xs">✓</span>}
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
    dirtLevel, setDirtLevel, addToast, totalWashes, vetcPoints, addWash,
  } = useAppStore();

  const carData = CAR_DATA[selectedCar];
  const isEV = carData?.isEV || false;
  const steps = isEV ? WASH_STEPS_EV : WASH_STEPS_ICE;

  // Phase machine
  useEffect(() => {
    if (simulationPhase === 'entering') {
      playSound('move');
      const t = setTimeout(() => setSimulationPhase('scanning'), 2000);
      return () => clearTimeout(t);
    }
    if (simulationPhase === 'scanning') {
      playSound('scan');
      const t = setTimeout(() => setSimulationPhase('analyzing'), 2500);
      return () => clearTimeout(t);
    }
    if (simulationPhase === 'analyzing') {
      const result = generateScanResult(selectedCar, dirtLevel, isEV);
      const t = setTimeout(() => {
        setScanResults(result);
        setSimulationPhase('results');
      }, 1500);
      return () => clearTimeout(t);
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
        setSimulationPhase('complete');
        const price = scanResults?.recommendation.priceRange[0] || 150_000;
        const pts = Math.floor(price / 1000);
        addWash(pts);
        addToast({ message: `✅ Rửa xe hoàn tất! +${pts} điểm VETC`, type: 'success' });
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
      // Check tier up
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

  return (
    <div className="h-full flex flex-col">
      {/* VETC Banner */}
      <div className="vetc-bar mx-4 mt-3 px-4 py-2">
        <div className="flex items-center gap-3 text-sm">
          <span>🛣️</span>
          <span className="text-foreground">
            {VETC_USER.lastTrip.route} · {VETC_USER.lastTrip.distanceKm.toLocaleString()}km · {VETC_USER.lastTrip.hoursAgo}h trước
          </span>
          {isEV && <span className="text-ev-green text-xs">⚡ EV-Safe Mode</span>}
          <span className="font-mono text-vetc-orange ml-auto">Dự đoán bẩn: {dirtLevel}%</span>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 p-3 gap-3">
        {/* 3D Canvas */}
        <div className="flex-1 relative rounded-2xl overflow-hidden bg-card">
          <Canvas camera={{ position: [6, 4, 6], fov: 50 }}>
            <ambientLight intensity={0.4} />
            <directionalLight position={[5, 8, 5]} intensity={0.8} />
            <pointLight position={[-3, 2, 0]} intensity={0.3} color="#00d4ff" />
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
            <div className="text-muted-foreground">Hàng chờ</div>
            <div className="font-mono text-foreground">3 xe · ~12 phút</div>
          </div>

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
                  <h3 className="font-heading text-lg font-semibold mb-3">⚡ EV Safe Wash Protocol</h3>
                  <p className="text-sm text-muted-foreground mb-3">Vehicle: {carData.label}</p>

                  <div className="space-y-1.5 mb-4">
                    <div className="text-xs text-tasco-red flex items-center gap-2">✗ Rửa khoang máy</div>
                    <div className="text-xs text-tasco-red flex items-center gap-2">✗ Vòi áp lực cao gầm xe</div>
                    <div className="text-xs text-tasco-green flex items-center gap-2">✓ Kiểm tra seal cổng sạc</div>
                    <div className="text-xs text-tasco-green flex items-center gap-2">✓ Bọt xà phòng thân thiện EV</div>
                    <div className="text-xs text-tasco-green flex items-center gap-2">✓ Kiểm tra độ khô sau rửa</div>
                  </div>

                  <div className="vetc-bar p-2 text-xs text-vetc-orange mb-4">
                    ⚠️ Vui lòng đảm bảo cổng sạc đã đóng trước khi vào trạm
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setSimulationPhase('idle')} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Hủy</button>
                    <button onClick={() => setSimulationPhase('entering')} className="px-4 py-2 text-sm bg-ev-green/20 text-ev-green rounded-lg hover:bg-ev-green/30 transition-colors flex-1">
                      Xác nhận — Bắt đầu EV Wash →
                    </button>
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
                  <h3 className="font-heading font-semibold mb-3">Chọn loại xe</h3>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {Object.entries(CAR_DATA).map(([key, data]) => (
                      <button
                        key={key}
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
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">
                    Mức bẩn: <span className="font-mono text-foreground">{dirtLevel}%</span>
                  </div>
                  <button
                    onClick={handleStart}
                    className="w-full py-3 rounded-xl bg-tasco-blue/20 text-tasco-blue font-medium hover:bg-tasco-blue/30 transition-all active:scale-[0.97]"
                  >
                    {isEV ? '⚡ Bắt đầu EV Wash' : '🚗 Bắt đầu rửa xe'}
                  </button>
                </motion.div>
              )}

              {/* ENTERING / SCANNING / ANALYZING */}
              {['entering', 'scanning', 'analyzing'].includes(simulationPhase) && (
                <motion.div key="progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full">
                  <div className="w-12 h-12 border-2 border-tasco-blue border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm text-muted-foreground">
                    {simulationPhase === 'entering' ? 'Xe đang vào trạm...' :
                     simulationPhase === 'scanning' ? 'Đang quét AI...' : 'Đang phân tích...'}
                  </p>
                </motion.div>
              )}

              {/* RESULTS */}
              {simulationPhase === 'results' && scanResults && (
                <motion.div key="results" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                  <h3 className="font-heading font-semibold mb-3">Kết quả quét AI</h3>

                  <div className="vetc-bar p-2.5 text-xs mb-3">
                    🛣️ Phát hiện hành trình cao tốc ({VETC_USER.lastTrip.distanceKm.toLocaleString()}km) qua VETC → Khả năng cao bụi bẩn nặng
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Mức bẩn</span>
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
                    <span>{scanResults.damage.label}</span>
                  </div>

                  {isEV && scanResults.chargingPort && (
                    <div className="text-xs flex items-center gap-2 mb-2 text-ev-green">
                      ✅ Cổng sạc: Đã đóng
                    </div>
                  )}

                  <div className="glass p-3 mb-4">
                    <div className="text-sm font-medium mb-1">Đề xuất: {scanResults.recommendation.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatVND(scanResults.recommendation.priceRange[0])} – {formatVND(scanResults.recommendation.priceRange[1])}
                      {' · '}{scanResults.recommendation.mins[0]}–{scanResults.recommendation.mins[1]} phút
                    </div>
                  </div>

                  <button
                    onClick={() => setSimulationPhase('washing')}
                    className="w-full py-3 rounded-xl bg-tasco-blue/20 text-tasco-blue font-medium hover:bg-tasco-blue/30 transition-all active:scale-[0.97]"
                  >
                    Tiến hành rửa xe →
                  </button>
                </motion.div>
              )}

              {/* WASHING */}
              {simulationPhase === 'washing' && (
                <motion.div key="washing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="font-heading font-semibold mb-3">Đang rửa xe...</h3>

                  {/* Overall progress */}
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-4">
                    <motion.div
                      className="h-full rounded-full bg-tasco-blue"
                      animate={{ width: `${((washStep + 1) / steps.length) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>

                  <WashProgressBar steps={steps} currentStep={washStep} />
                </motion.div>
              )}

              {/* COMPLETE */}
              {simulationPhase === 'complete' && (
                <motion.div key="complete" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {!showReport ? (
                    <>
                      <h3 className="font-heading font-semibold mb-3">✅ Báo cáo minh bạch</h3>

                      <div className="space-y-3 mb-4">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Trước rửa</div>
                          <div className="h-3 bg-muted rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${dirtLevel}%` }} transition={{ duration: 0.8 }} className="h-full bg-tasco-red rounded-full" />
                          </div>
                          <div className="text-xs font-mono text-right mt-0.5">{dirtLevel}%</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Sau rửa</div>
                          <div className="h-3 bg-muted rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${afterDirt}%` }} transition={{ duration: 1, delay: 0.5 }} className="h-full bg-tasco-green rounded-full" />
                          </div>
                          <div className="text-xs font-mono text-right mt-0.5">{afterDirt}%</div>
                        </div>
                      </div>

                      <div className="glass p-3 space-y-1.5 mb-4 text-xs">
                        <div className="flex justify-between"><span className="text-muted-foreground">Nhân viên</span><span>Nguyễn Thị Lan (T-0042) ⭐ 4.9</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Thời gian</span><span className="font-mono">11 phút 32 giây</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Sản phẩm</span><span>EcoFoam Pro™, Tasco Wax Shield</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Nước sử dụng</span><span className="font-mono">48 lít</span></div>
                      </div>

                      <div className="text-center text-xs text-tasco-green mb-4">✅ Đạt kiểm tra 12 điểm</div>

                      <div className="flex gap-2 mb-3">
                        <button className="flex-1 py-2 rounded-lg bg-tasco-green/10 text-tasco-green text-sm hover:bg-tasco-green/20 transition-colors active:scale-[0.97]">👍 Hài lòng</button>
                        <button className="flex-1 py-2 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors active:scale-[0.97]">👎 Phản hồi</button>
                      </div>

                      <button onClick={() => setShowReport(true)} className="w-full text-xs text-tasco-blue hover:text-tasco-blue/80 transition-colors">
                        Xem hóa đơn →
                      </button>
                    </>
                  ) : (
                    <>
                      <h3 className="font-heading font-semibold mb-3">🧾 Hóa đơn</h3>
                      <div className="glass p-3 space-y-2 text-xs mb-4">
                        <div className="flex justify-between"><span className="text-muted-foreground">Dịch vụ</span><span>{scanResults?.recommendation.name}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Xe</span><span>{carData.label} · {VETC_USER.plate}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Giá gốc</span><span className="font-mono">{formatVND(price)}</span></div>
                        <div className="flex justify-between text-vetc-orange"><span>Giảm {VETC_USER.tier} ({discount}%)</span><span className="font-mono">-{formatVND(discountAmt)}</span></div>
                        <div className="border-t border-border pt-2 flex justify-between font-medium text-sm">
                          <span>Tổng cộng</span><span className="font-mono">{formatVND(total)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground"><span>Thanh toán</span><span>VETC Wallet</span></div>
                        <div className="flex justify-between text-muted-foreground"><span>Số dư sau</span><span className="font-mono">{formatVND(VETC_USER.walletBalance - total)}</span></div>
                        <div className="flex justify-between text-tasco-green"><span>Điểm tích lũy</span><span className="font-mono">+{pointsEarned}</span></div>
                      </div>

                      <div className="flex gap-2 mb-3">
                        <button onClick={() => addToast({ message: 'Đang tải PDF...', type: 'info' })} className="flex-1 py-2 rounded-lg bg-muted text-xs hover:bg-muted/80 transition-colors active:scale-[0.97]">📥 Tải PDF</button>
                        <button onClick={() => addToast({ message: 'Đã sao chép link!', type: 'success' })} className="flex-1 py-2 rounded-lg bg-muted text-xs hover:bg-muted/80 transition-colors active:scale-[0.97]">↗ Chia sẻ</button>
                      </div>
                      <button onClick={handleReset} className="w-full py-2.5 rounded-xl bg-tasco-blue/20 text-tasco-blue text-sm font-medium hover:bg-tasco-blue/30 transition-all active:scale-[0.97]">
                        🔁 Rửa lại
                      </button>
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
                <div className="text-xs font-medium">{VETC_USER.tier} · <span className="font-mono">{vetcPoints.toLocaleString()} điểm</span></div>
                <div className="text-[10px] text-muted-foreground">🔥 {VETC_USER.streak} tháng liên tiếp</div>
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
                  Còn {(TIERS[VETC_USER.tier].washes || 0) - totalWashes} lần đến {TIERS[VETC_USER.tier].next}
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
