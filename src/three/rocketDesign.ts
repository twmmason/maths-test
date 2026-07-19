import type { RocketPart } from "../curriculum/types";

/** One completed "Wrench Time" installation step. The player's maths answer
 * IS the configuration — we record what they computed vs the engineering
 * spec, and the design fields are written from it (never gated). */
export interface InstallStepResult {
  stepId: string; // e.g. "fins.cantAngle"
  criterionCode: string; // maths criterion exercised
  kind: "fit" | "torque" | "connect" | "inspect";
  target: number; // the engineering-correct value
  actual: number; // what the player computed/entered
  errorPct: number; // |actual - target| / tolerance band (0 = perfect)
  tier: 1 | 2 | 3; // task difficulty used
  /** INSPECT steps may be deliberately skipped (risk dial). */
  skipped?: boolean;
}

export interface PartInstall {
  steps: InstallStepResult[]; // one per install step
  integrity: number; // 0..1 aggregate
}

export interface InstalledPart {
  variantId: string;
  certified: boolean; // kept for compatibility: true = installation COMPLETED
  attachment: "stack" | "radial";
  radialCount?: 2 | 3 | 4;
  install?: PartInstall;
}

export interface RocketDesign {
  noseAngle: number; // degrees (tip angle)
  noseHeight: number; // metres
  hullHeight: number; // metres
  hullRadius: number; // metres
  hullPanels: number; // count
  tankFill: number; // 0..1
  fuelRatio: number; // fuel:oxidiser
  engineCount: number;
  thrustPerEngine: number; // kN
  finCount: number;
  finAngle: number; // degrees
  finSymmetry: boolean;
  finSpan: number; // relative fin size multiplier (1 = standard)
  payloadPods: number;
  payloadPerPod: number; // kg
  circuitsWired: number;
  powerBalanced: boolean;
  boosterCount: number;
  boosterSize: number; // relative booster size multiplier (1 = standard)
  /** Cosmetic hull/part material finish, unlocked by mastery level. */
  material: "aluminium" | "titanium" | "carbon" | "gold";
  // ── Wrench Time configuration fields (written by install-step maths) ──

  /** Engine gimbal misalignment in degrees. 0 = true. ≥3° = veer off course. */
  engineGimbalOffset: number;
  /** Hull structural integrity 0..1. <0.5 = breakup at max-Q. */
  hullIntegrity: number;
  /** Payload centre-of-gravity offset, -1..1. |>0.45| = pitch-over veer. */
  cgOffset: number;
  /** Booster staging-timer error as a signed fraction of nominal.
   *  0 = on time; |>0.25| = boosters collide with the core at staging. */
  boosterStageT: number;
  installedParts: Partial<Record<RocketPart, InstalledPart>>;
}

export const DEFAULT_DESIGN: RocketDesign = {
  noseAngle: 40,
  noseHeight: 1.6,
  hullHeight: 6,
  hullRadius: 0.9,
  hullPanels: 40,
  tankFill: 0.75,
  fuelRatio: 2.5,
  engineCount: 3,
  thrustPerEngine: 200,
  finCount: 4,
  finAngle: 0,
  finSymmetry: true,
  finSpan: 1,
  payloadPods: 4,
  payloadPerPod: 60,
  circuitsWired: 0,
  powerBalanced: false,
  boosterCount: 0,
  boosterSize: 1,
  material: "aluminium",
  engineGimbalOffset: 0,

  hullIntegrity: 1,
  cgOffset: 0,
  boosterStageT: 0,
  installedParts: {},
};

/** A fresh, empty VAB build (nothing attached). */
export function emptyDesign(): RocketDesign {
  return { ...DEFAULT_DESIGN, installedParts: {} };
}

/** A design with every core part fitted (plus boosters when boosterCount > 0).
 *  The sim flies EXACTLY what was built — missing parts cause failures — so
 *  tests / sandbox baselines start from a fully-assembled vehicle. */
export function withAllPartsInstalled(design: RocketDesign): RocketDesign {
  const parts: RocketPart[] = ["engine", "fuelTank", "hull", "fins", "noseCone", "electronics", "payloadBay"];
  if (design.boosterCount > 0) parts.push("booster");
  const installedParts: RocketDesign["installedParts"] = { ...design.installedParts };
  for (const p of parts) {
    if (!installedParts[p]) {
      installedParts[p] = { variantId: `${p}-default`, certified: true, attachment: p === "booster" ? "radial" : "stack" };
    }
  }
  return { ...design, installedParts };
}

/** Older saved designs may miss the Wrench Time fields — fill defaults. */
export function upgradeDesign(design: RocketDesign): RocketDesign {
  return {
    ...DEFAULT_DESIGN,
    ...design,
    engineGimbalOffset: design.engineGimbalOffset ?? 0,
    hullIntegrity: design.hullIntegrity ?? 1,
    cgOffset: design.cgOffset ?? 0,
    boosterStageT: design.boosterStageT ?? 0,
  };
}

/** Aggregate integrity from step errors: small errors are cosmetic, big ones
 * degrade the part. Critical CONNECT errors weigh double. */
export function integrityFromSteps(steps: InstallStepResult[]): number {
  if (steps.length === 0) return 1;
  let weightSum = 0;
  let errSum = 0;
  for (const s of steps) {
    const w = s.kind === "connect" ? 2 : 1;
    weightSum += w;
    errSum += Math.min(1, s.skipped ? 0.1 : s.errorPct) * w;
  }
  return Math.max(0, Math.min(1, 1 - errSum / weightSum));
}

/** Quality grade for an install step — shown only AFTER launch. */
export function gradeForError(errorPct: number): "A" | "B" | "C" | "D" {
  if (errorPct <= 0.05) return "A";
  if (errorPct <= 0.15) return "B";
  if (errorPct <= 0.25) return "C";
  return "D";
}