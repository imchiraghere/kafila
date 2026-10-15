// Web Audio API procedural sound engine - 100% mathematical zero-asset synthesis
let AC: AudioContext | null = null;
let muted = false;
let NBUF: AudioBuffer | null = null;
let murm: { g: GainNode } | null = null;
let ladI = 0;
let ladT = 0;
let popT = 0;

const LADDER = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093];

export function setMuted(m: boolean) {
  muted = m;
  if (muted && murm) {
    try { murm.g.gain.value = 0; } catch {}
  }
}

export function isMuted(): boolean {
  return muted;
}

export function initAudio() {
  if (typeof window === 'undefined') return;
  if (!AC) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      AC = new AudioCtx();
    } catch {}
  }
  if (AC && AC.state === 'suspended') {
    AC.resume().catch(() => {});
  }
}

export function tone(f: number, d: number, type: OscillatorType = 'sine', v = 0.05, f2?: number) {
  if (!AC || muted) return;
  const t = AC.currentTime;
  const o = AC.createOscillator();
  const g = AC.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(AC.destination);
  o.start(t);
  o.stop(t + d + 0.03);
}

export function noise(d: number, v = 0.1, f = 1000, q = 1) {
  if (!AC || muted) return;
  if (!NBUF) {
    NBUF = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
    const ch = NBUF.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  }
  const s = AC.createBufferSource();
  s.buffer = NBUF;
  const fl = AC.createBiquadFilter();
  fl.type = 'bandpass';
  fl.frequency.value = f;
  fl.Q.value = q;
  const g = AC.createGain();
  const t = AC.currentTime;
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(fl).connect(g).connect(AC.destination);
  s.start(t);
  s.stop(t + d);
}

export function vox(f0: number, f1: number, d: number, vow: ('a' | 'e' | 'i' | 'o' | 'u')[], v = 0.09) {
  if (!AC || muted) return;
  const t = AC.currentTime;
  const o = AC.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + d);

  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + 0.03);
  g.gain.setValueAtTime(v, t + d * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);

  const F: Record<string, [number, number]> = {
    a: [800, 1200],
    e: [500, 1800],
    i: [320, 2300],
    o: [500, 900],
    u: [350, 800]
  };

  for (let k = 0; k < 2; k++) {
    const f = AC.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 7;
    vow.forEach((ch, i) => {
      const at = t + (d * i) / Math.max(1, vow.length - 1) * 0.85;
      if (i === 0) f.frequency.setValueAtTime(F[ch][k], t);
      else f.frequency.linearRampToValueAtTime(F[ch][k], at);
    });
    o.connect(f).connect(g);
  }
  g.connect(AC.destination);
  o.start(t);
  o.stop(t + d + 0.05);
}

export function crowd(d: number, v = 0.12, f = 1100) {
  if (!AC || muted) return;
  if (!NBUF) noise(0.01, 0.0001);
  const s = AC.createBufferSource();
  s.buffer = NBUF!;
  s.loop = true;
  const fl = AC.createBiquadFilter();
  fl.type = 'bandpass';
  fl.frequency.value = f;
  fl.Q.value = 0.7;
  const g = AC.createGain();
  const t = AC.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + d * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(fl).connect(g).connect(AC.destination);
  s.start(t);
  s.stop(t + d);
}

export function murmur(level: number) {
  if (!AC || muted) {
    if (murm) murm.g.gain.value = 0;
    return;
  }
  if (!murm) {
    if (!NBUF) noise(0.01, 0.0001);
    const s = AC.createBufferSource();
    s.buffer = NBUF!;
    s.loop = true;
    const fl = AC.createBiquadFilter();
    fl.type = 'bandpass';
    fl.frequency.value = 650;
    fl.Q.value = 0.6;
    const g = AC.createGain();
    g.gain.value = 0;
    s.connect(fl).connect(g).connect(AC.destination);
    s.start();
    murm = { g };
  }
  murm.g.gain.setTargetAtTime(level, AC.currentTime, 0.4);
}

export const SFX = {
  whistle() {
    tone(3000, 0.12, 'square', 0.022);
    setTimeout(() => tone(2800, 0.35, 'square', 0.022, 2500), 160);
  },
  horn() {
    tone(185, 0.3, 'sawtooth', 0.03);
    setTimeout(() => tone(160, 0.45, 'sawtooth', 0.03), 330);
  },
  ding() {
    tone(660, 0.15, 'triangle', 0.07);
    setTimeout(() => tone(990, 0.35, 'triangle', 0.07), 130);
  },
  metro() {
    tone(880, 0.25, 'sine', 0.06);
    setTimeout(() => tone(660, 0.45, 'sine', 0.06), 260);
  },
  chant() {
    noise(0.35, 0.14, 500, 0.8);
    tone(330, 0.14, 'sawtooth', 0.025);
    setTimeout(() => {
      noise(0.35, 0.14, 560, 0.8);
      tone(392, 0.14, 'sawtooth', 0.025);
    }, 180);
    setTimeout(() => {
      noise(0.5, 0.16, 620, 0.8);
      tone(440, 0.3, 'sawtooth', 0.025);
    }, 360);
  },
  alert() {
    tone(700, 0.15, 'square', 0.03);
    setTimeout(() => tone(500, 0.25, 'square', 0.03), 170);
  },
  thump() {
    tone(150, 0.18, 'triangle', 0.08, 55);
    noise(0.25, 0.06, 300);
  },
  crash() {
    noise(0.6, 0.25, 900, 0.6);
    tone(220, 0.3, 'sawtooth', 0.05, 60);
    setTimeout(() => noise(0.4, 0.15, 2500, 1), 120);
  },
  pop() {
    const n = performance.now();
    if (n - popT < 50) return;
    popT = n;
    tone(600 + Math.random() * 300, 0.08, 'sine', 0.045, 1200);
  },
  join() {
    const n = performance.now();
    if (n - popT < 70) return;
    popT = n;
    if (n - ladT > 1600) ladI = 0;
    ladT = n;
    const f = LADDER[Math.min(LADDER.length - 1, ladI++)];
    tone(f, 0.12, 'triangle', 0.06);
    tone(f * 2, 0.08, 'sine', 0.02);
  },
  ouch() {
    const r = Math.random();
    if (r < 0.4) vox(420, 190, 0.42, ['a', 'i', 'o'], 0.1);
    else if (r < 0.7) vox(260, 150, 0.22, ['u', 'o'], 0.11);
    else vox(380, 230, 0.36, ['a', 'u', 'e'], 0.1);
  },
  cheer(big = false) {
    crowd(big ? 1.6 : 1.1, big ? 0.16 : 0.11, 1200);
    tone(196, 0.12, 'triangle', 0.08, 90);
    setTimeout(() => tone(196, 0.12, 'triangle', 0.08, 90), 160);
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.05), 120 + i * 90));
  },
  whoosh() {
    noise(0.18, 0.08, 1800, 0.7);
  },
  thwack() {
    tone(180, 0.08, 'square', 0.05, 90);
    noise(0.1, 0.1, 900, 1);
  },
  mega() {
    tone(520, 0.12, 'square', 0.03);
    setTimeout(() => tone(390, 0.25, 'square', 0.03), 130);
    noise(0.4, 0.05, 2200, 0.5);
  }
};
