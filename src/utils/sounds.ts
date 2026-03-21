export function playSound(type: 'scan' | 'move' | 'complete' | 'ev' | 'tier_up' | 'chime') {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const play = (freq: number, dur: number, wave: OscillatorType = 'sine', vol = 0.15) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = wave;
      o.frequency.value = freq;
      g.gain.value = vol;
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur / 1000);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      setTimeout(() => { try { o.stop(); } catch {} }, dur);
    };
    const sounds: Record<string, () => void> = {
      scan: () => { play(880, 200); setTimeout(() => play(1100, 200), 250); },
      move: () => play(220, 800, 'sawtooth', 0.08),
      complete: () => { play(523, 300); setTimeout(() => play(659, 300), 320); setTimeout(() => play(784, 500), 650); },
      ev: () => { play(1046, 150); setTimeout(() => play(1318, 150), 180); },
      tier_up: () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => play(f, 300), i * 200)); },
      chime: () => play(660, 400),
    };
    sounds[type]?.();
  } catch {}
}
