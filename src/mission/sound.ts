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
  /** Vocal countdown: speaks the number + beep tone. */
  countdown: (n?: number) => {
    beep(880, 0.15, "square", 0.08);
    if (typeof window !== "undefined" && "speechSynthesis" in window && n !== undefined) {
      const u = new SpeechSynthesisUtterance(n === 0 ? "Liftoff!" : String(n));
      u.rate = 1.2;
      u.pitch = 0.9;
      u.volume = 0.7;
      window.speechSynthesis.speak(u);
    }
  },
  /** Rocket launch: ALL-NOISE design — no oscillators/tones. Real rocket sound
   *  is broadband noise at different frequency bands with shaped envelopes.
   *  Layers: sub-bass rumble, low roar, mid crackle, high sizzle. */
  launch: () => {
    const c = ensureCtx();
    if (!c || !enabled) return;
    const now = c.currentTime;

    // Helper: shaped noise burst at a frequency band
    const noiseBand = (lo: number, hi: number, dur: number, vol: number, attackS: number, decayStart: number) => {
      const len = c.sampleRate * dur;
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource();
      src.buffer = buf;
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = hi;
      const hp = c.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = lo;
      const g = c.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(vol, now + attackS);
      g.gain.setValueAtTime(vol, now + decayStart);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(hp).connect(lp).connect(g).connect(c.destination);
      src.start(now);
      src.stop(now + dur);
    };

    // Sub-bass rumble (20-80Hz) — the ground-shaking thud you feel in your chest
    noiseBand(20, 80, 18, 0.12, 0.8, 10);

    // Low roar (60-250Hz) — the dominant "wall of sound" frequency
    noiseBand(60, 250, 16, 0.09, 1.0, 8);

    // Mid crackle (200-800Hz) — the sharp crackling pops
    noiseBand(200, 800, 14, 0.045, 1.5, 6);

    // Upper crackle (600-2500Hz) — sizzling, popping texture
    noiseBand(600, 2500, 12, 0.025, 2.0, 5);

    // High sizzle (2000-6000Hz) — the airy top shimmer
    noiseBand(2000, 6000, 10, 0.012, 2.5, 4);
  },
  /** Crowd cheers at mission success — uses speech synthesis for accessibility. */
  cheers: () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const phrases = ["Yeah!", "Go, go, go!", "Nominal!", "We have liftoff!", "Beautiful!"];
      const u = new SpeechSynthesisUtterance(phrases[Math.floor(Math.random() * phrases.length)]);
      u.rate = 1.1;
      u.pitch = 1.2;
      u.volume = 0.6;
      window.speechSynthesis.speak(u);
    }
    // Celebratory tones
    beep(523, 0.15, "sine", 0.04);
    setTimeout(() => beep(659, 0.15, "sine", 0.04), 120);
    setTimeout(() => beep(784, 0.2, "sine", 0.05), 240);
    setTimeout(() => beep(1047, 0.3, "sine", 0.04), 400);
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