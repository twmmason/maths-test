/** Optional SFX via WebAudio beeps — OFF by default, toggle in the nav. */

let enabled = false;
let ctx: AudioContext | null = null;

export function soundEnabled(): boolean {
  return enabled;
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  if (on && !ctx && typeof window !== "undefined" && "AudioContext" in window) {
    ctx = new AudioContext();
  }
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

export const sfx = {
  click: () => beep(660, 0.06, "square"),
  snap: () => beep(440, 0.1, "triangle"),
  correct: () => {
    beep(523, 0.1);
    setTimeout(() => beep(784, 0.14), 90);
  },
  nudge: () => beep(330, 0.12, "sine"),
  countdown: () => beep(880, 0.1, "square"),
  launch: () => beep(120, 0.8, "sawtooth", 0.05),
};