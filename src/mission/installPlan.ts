import type { RocketPart } from "../curriculum/types";
import type { RocketDesign, InstallStepResult } from "../three/rocketDesign";
import type { GeneratedTask } from "../engine/types";
import { parseNumeric, checkAnswer } from "../engine";
import type { PartPlan } from "./runPlanner";

export type InstallKind = "fit" | "torque" | "connect" | "inspect";

/** One physical installation step for a part. The maths task's relative error
 * (the player's answer vs the engineering-correct answer) is mapped through
 * `apply` into REAL RocketDesign fields — wrong maths builds a wrong rocket. */
export interface InstallStepSpec {
  stepId: string; // e.g. "fins.cantAngle"
  kind: InstallKind;
  label: string; // "Set the fin cant angle"
  tool: string; // in-fiction flavour line prefix
  /** Map the player's signed relative error (-1..+1.5) to design fields. */
  apply: (design: RocketDesign, signedError: number) => Partial<RocketDesign>;
  /** INSPECT steps can be skipped to save a spare part (risk dial). */
  optional?: boolean;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Configuration mapping (PROMPT §2): each install step writes specific
 * RocketDesign fields so the flight sim consumes the player's real numbers.
 */
export const INSTALL_SPECS: Record<RocketPart, InstallStepSpec[]> = {
  engine: [
    {
      stepId: "engine.thrustTrim",
      kind: "torque",
      label: "Dial in the thrust limiter",
      tool: "The torque wrench clicks — thrust limiter set.",
      // under ⇒ can't lift off; >130 % ⇒ pad structural failure (checked in failureModes via step data)
      apply: (d, e) => ({ thrustPerEngine: Math.max(10, Math.round(d.thrustPerEngine * (1 + e))) }),
    },
    {
      stepId: "engine.gimbal",
      kind: "fit",
      label: "Align the engine gimbal",
      tool: "The gimbal seats with a clunk — alignment gauge settles.",
      apply: (_d, e) => ({ engineGimbalOffset: Math.round(e * 12 * 10) / 10 }),
    },
    {
      stepId: "engine.plumeCheck",
      kind: "inspect",
      label: "Inspect the turbo-pump readings",
      tool: "Checklist signed — pump reading logged.",
      apply: () => ({}),
      optional: true,
    },
  ],
  fuelTank: [
    {
      stepId: "fuelTank.mixRatio",
      kind: "torque",
      label: "Set the oxidiser : fuel mix ratio",
      tool: "The mixer valve turns — the ratio gauge settles.",
      apply: (d, e) => ({ fuelRatio: Math.round(clamp(d.fuelRatio * (1 + e), 0.5, 6) * 100) / 100 }),
    },
    {
      stepId: "fuelTank.fillVolume",
      kind: "fit",
      label: "Calculate and load the fill volume",
      tool: "Propellant flows — the level gauge stops where you set it.",
      apply: (d, e) => ({ tankFill: Math.round(clamp(d.tankFill * (1 + e), 0.05, 1) * 100) / 100 }),
    },
    {
      stepId: "fuelTank.sealCheck",
      kind: "inspect",
      label: "Inspect the tank seals",
      tool: "Checklist signed — seal pressure logged.",
      apply: () => ({}),
      optional: true,
    },
  ],
  fins: [
    {
      stepId: "fins.cantAngle",
      kind: "fit",
      label: "Set the fin cant angle",
      tool: "The fins bolt on — the cant gauge reads where you set it.",
      apply: (_d, e) => ({
        finAngle: Math.round(Math.abs(e) * 15 * 10) / 10,
        finSymmetry: Math.abs(e) <= 0.25,
      }),
    },
    {
      stepId: "fins.boltPattern",
      kind: "torque",
      label: "Torque the fin root bolts",
      tool: "Each root bolt clicks home in turn.",
      apply: () => ({}),
    },
    {
      stepId: "fins.edgeCheck",
      kind: "inspect",
      label: "Inspect the leading edges",
      tool: "Checklist signed — edge alignment logged.",
      apply: () => ({}),
      optional: true,
    },
  ],
  hull: [
    {
      stepId: "hull.boltSpacing",
      kind: "torque",
      label: "Bolt the hull panels (count & spacing)",
      tool: "The rivet gun rattles down the panel line.",
      apply: (_d, e) => ({ hullIntegrity: Math.round(clamp(1 - Math.abs(e) * 1.2, 0, 1) * 100) / 100 }),
    },
    {
      stepId: "hull.panelFit",
      kind: "fit",
      label: "Fit the panel ring",
      tool: "The ring seats — panel gaps close up.",
      apply: () => ({}),
    },
    {
      stepId: "hull.weldCheck",
      kind: "inspect",
      label: "Inspect the weld seams",
      tool: "Checklist signed — seam scan logged.",
      apply: () => ({}),
      optional: true,
    },
  ],
  noseCone: [
    {
      stepId: "noseCone.coneAngle",
      kind: "fit",
      label: "Set the cone tip angle",
      tool: "The cone lowers on — the angle jig reads where you set it.",
      apply: (d, e) => ({ noseAngle: Math.round(clamp(d.noseAngle * (1 + e), 5, 140)) }),
    },
    {
      stepId: "noseCone.fairingSeal",
      kind: "torque",
      label: "Torque the fairing clamp band",
      tool: "The clamp band clicks tight around the fairing.",
      apply: () => ({}),
    },
    {
      stepId: "noseCone.tipCheck",
      kind: "inspect",
      label: "Inspect the tip sensor",
      tool: "Checklist signed — pitot reading logged.",
      apply: () => ({}),
      optional: true,
    },
  ],
  electronics: [
    {
      stepId: "electronics.wiring",
      kind: "connect",
      label: "Wire the guidance bus",
      tool: "Wires seat home — a tiny spark as the bus energises…",
      // critically-wrong CONNECT arms a pad abort (see failureModes.ts)
      apply: (_d, e) => ({ circuitsWired: Math.abs(e) <= 0.25 ? 3 : 1, powerBalanced: Math.abs(e) <= 0.25 }),
    },
    {
      stepId: "electronics.powerBudget",
      kind: "torque",
      label: "Balance the power budget",
      tool: "The bus voltage settles where you dialled it.",
      apply: () => ({}),
    },
    {
      stepId: "electronics.selfTest",
      kind: "inspect",
      label: "Run the avionics self-test",
      tool: "Status LEDs ripple — self-test result logged.",
      apply: () => ({}),
      optional: true,
    },
  ],
  payloadBay: [
    {
      stepId: "payloadBay.massSplit",
      kind: "torque",
      label: "Split the payload mass between pods",
      tool: "The pods latch shut — the balance scale settles.",
      apply: (_d, e) => ({ cgOffset: Math.round(clamp(e * 0.6, -1, 1) * 100) / 100 }),
    },
    {
      stepId: "payloadBay.doorFit",
      kind: "fit",
      label: "Fit the bay doors",
      tool: "The doors swing and latch — hinge gauge logged.",
      apply: () => ({}),
    },
    {
      stepId: "payloadBay.latchCheck",
      kind: "inspect",
      label: "Inspect the door latches",
      tool: "Checklist signed — latch tension logged.",
      apply: () => ({}),
      optional: true,
    },
  ],
  booster: [
    {
      stepId: "booster.stagingTimer",
      kind: "torque",
      label: "Set the staging timer",
      tool: "The timer drum spins to your setting and locks.",
      apply: (_d, e) => ({ boosterStageT: Math.round(clamp(e, -0.9, 1.5) * 100) / 100 }),
    },
    {
      stepId: "booster.strapFit",
      kind: "fit",
      label: "Fit the booster straps",
      tool: "The straps clamp the boosters to the core.",
      apply: () => ({}),
    },
    {
      stepId: "booster.pyroCheck",
      kind: "inspect",
      label: "Inspect the separation pyros",
      tool: "Checklist signed — pyro continuity logged.",
      apply: () => ({}),
      optional: true,
    },
  ],
};

export interface InstallStep {
  spec: InstallStepSpec;
  criterionCode: string;
  tier: 1 | 2 | 3;
}

/** Pair a part's planned maths criteria with its install steps. Each step's
 * criterion codes come from criteriaForPart via the mission plan, so
 * curriculum coverage is preserved. Always at least 2 steps. */
export function installStepsFor(part: RocketPart, plan: PartPlan | undefined): InstallStep[] {
  const specs = INSTALL_SPECS[part];
  const criteria = plan?.criteria ?? [];
  const stepCount = Math.min(specs.length, Math.max(2, criteria.length));
  const steps: InstallStep[] = [];
  for (let i = 0; i < stepCount; i++) {
    const c = criteria[i % Math.max(1, criteria.length)];
    steps.push({ spec: specs[i], criterionCode: c?.code ?? "", tier: c?.tier ?? 1 });
  }
  return steps.filter((s) => s.criterionCode !== "");
}

export interface AnswerEvaluation {
  target: number;
  actual: number;
  /** Signed relative error: (actual - target) / |target|, clamped. */
  signedError: number;
  /** |signedError| — the tolerance-band error fraction. */
  errorPct: number;
  /** Whether the answer was engineering-correct (within task tolerance). */
  withinSpec: boolean;
}

/**
 * Evaluate the player's submitted answer against the task's engineering-
 * correct answer. Numeric answers give a proportional error; non-numeric
 * answers (words, coordinates) are binary: right = 0 error, wrong = 40 %.
 */
export function evaluateInstallAnswer(task: GeneratedTask, raw: string): AnswerEvaluation {
  const withinSpec = checkAnswer(task, raw);
  const target = parseNumeric(task.answer);
  const actual = parseNumeric(raw);
  if (target !== null && actual !== null && target !== 0) {
    const signedError = clamp((actual - target) / Math.abs(target), -1, 1.5);
    return {
      target,
      actual,
      signedError: withinSpec ? 0 : signedError,
      errorPct: withinSpec ? 0 : Math.abs(signedError),
      withinSpec,
    };
  }
  // Non-numeric (or zero-target) answers: binary error.
  return {
    target: target ?? 1,
    actual: actual ?? (withinSpec ? (target ?? 1) : 0),
    signedError: withinSpec ? 0 : 0.4,
    errorPct: withinSpec ? 0 : 0.4,
    withinSpec,
  };
}

/** Build the InstallStepResult a submitted answer produces. */
export function buildStepResult(step: InstallStep, evaluation: AnswerEvaluation, skipped = false): InstallStepResult {
  return {
    stepId: step.spec.stepId,
    criterionCode: step.criterionCode,
    kind: step.spec.kind,
    target: evaluation.target,
    actual: evaluation.actual,
    errorPct: skipped ? 0 : evaluation.errorPct,
    tier: step.tier,
    skipped: skipped || undefined,
  };
}