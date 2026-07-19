/** Optional SFX via WebAudio beeps — OFF by default, toggle in the nav. */

let enabled = true; // ON by default per §8
let ctx: AudioContext | null = null;

export function soundEnabled(): boolean {
  return enabled;
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  if (on) ensureCtx();
}

function ensureCtx(): AudioContext | null {
  if (!ctx && typeof window !== "undefined" && "AudioContext" in window) {
    ctx = new AudioContext();
  }
  return ctx;
}

function beep(freq: number, duration = 0.12, type: OscillatorType = "sine", gain = 0.06) {
  if (!enabled || !ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g).connect(ctx.destination);
  osc.start();
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.stop(ctx.currentTime + duration);
}

/** Continuous noise source for wind/rumble (stops when returned fn is called). */
function noise(duration: number, gain = 0.03, filterHz = 400): (() => void) | null {
  const c = ensureCtx();
  if (!c || !enabled) return null;
  const buf = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const filt = c.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.value = filterHz;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(filt).connect(g).connect(c.destination);
  src.start();
  return () => { try { src.stop(); } catch {} };
}

let windStop: (() => void) | null = null;

export const sfx = {
  click: () => beep(660, 0.06, "square"),
  snap: () => beep(440, 0.1, "triangle"),
  correct: () => {
    beep(523, 0.1);
    setTimeout(() => beep(784, 0.14), 90);
  },
  nudge: () => beep(330, 0.12, "sine"),
  countdown: () => beep(880, 0.15, "square", 0.08),
  /** Rocket launch: layered rumble + crackle + rising roar (15 seconds). */
  launch: () => {
    const c = ensureCtx();
    if (!c || !enabled) return;
    const now = c.currentTime;

    // Layer 1: deep ground-shaking rumble (40-120Hz)
    noise(15, 0.1, 120);

    // Layer 2: mid-frequency crackle (200-600Hz, modulated)
    noise(12, 0.04, 500);

    // Layer 3: rising roar tone (sawtooth 50→300Hz over 8s)
    const osc1 = c.createOscillator();
    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(50, now);
    osc1.frequency.linearRampToValueAtTime(300, now + 8);
    const g1 = c.createGain();
    g1.gain.setValueAtTime(0.01, now);
    g1.gain.linearRampToValueAtTime(0.07, now + 1.5);
    g1.gain.setValueAtTime(0.07, now + 6);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 14);
    osc1.connect(g1).connect(c.destination);
    osc1.start(now);
    osc1.stop(now + 15);

    // Layer 4: high crackle shimmer (white noise 800-2000Hz)
    const buf = c.createBuffer(1, c.sampleRate * 10, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1200;
    bp.Q.value = 0.5;
    const g2 = c.createGain();
    g2.gain.setValueAtTime(0, now);
    g2.gain.linearRampToValueAtTime(0.025, now + 2);
    g2.gain.setValueAtTime(0.025, now + 5);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 12);
    src.connect(bp).connect(g2).connect(c.destination);
    src.start(now);
    src.stop(now + 12);
  },
  /** Ambient pad wind (call stopWind to end). */
  startWind: () => {
    if (windStop) windStop();
    windStop = noise(4, 0.015, 600);
  },
  stopWind: () => {
    if (windStop) { windStop(); windStop = null; }
  },
};