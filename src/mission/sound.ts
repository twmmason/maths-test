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
  /** Rocket launch rumble: low-frequency noise + rising tone. */
  launch: () => {
    const c = ensureCtx();
    if (!c || !enabled) return;
    // Deep rumble noise
    noise(8, 0.06, 180);
    // Rising roar
    const osc = c.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(60, c.currentTime);
    osc.frequency.linearRampToValueAtTime(200, c.currentTime + 4);
    const g = c.createGain();
    g.gain.setValueAtTime(0.04, c.currentTime);
    g.gain.linearRampToValueAtTime(0.08, c.currentTime + 2);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 7);
    osc.connect(g).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 8);
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