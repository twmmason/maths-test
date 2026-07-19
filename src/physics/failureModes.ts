import type { RocketDesign, InstallStepResult } from "../three/rocketDesign";
import type { RocketPart } from "../curriculum/types";
import type { EventSeverity } from "./types";

/** All distinct Wrench Time failure modes. Deterministic: derived from the
 * design's configuration values (which the player's maths wrote) — never RNG. */
export type FailureMode =
  | "padAbort" // critical electronics error — klaxons, no launch
  | "padExplosion" // thrust limiter dialled way over spec — pad structural failure
  | "cantLiftOff" // thrust limiter dialled way under — vehicle never leaves the pad
  | "gimbalVeer" // engine gimbal misaligned — continuous lateral veer
  | "finShatter" // fin cant far off spec — roll builds, fins separate at max-Q
  | "hullBreakup" // hull integrity low — mid-air breakup at max-Q
  | "fuelFireball" // oxidiser:fuel far too rich — mid-burn fireball
  | "flameOut" // mixture too lean — engines starve early
  | "tankDry" // fill volume miscalculated — runs dry before target apogee
  | "stagingCollision" // staging timer wrong — boosters collide with the core
  | "noseShatter" // cone angle wild — drag spike, cone shatters at high speed
  | "cgVeer"; // payload mass split off — pitch-over / veering arc

export type FailureTrigger = "pad" | "ascent" | "maxQ" | "midBurn" | "staging";

export interface PlannedFailure {
  mode: FailureMode;
  severity: EventSeverity;
  trigger: FailureTrigger;
  partAtFault: RocketPart;
  stepId: string;
  /** Big on-screen caption at the moment it happens. */
  caption: string;
  /** One-line physics explanation for the crash investigation. */
  explanation: string;
  /** Player's value vs engineering target (when install data exists). */
  playerValue?: number;
  targetValue?: number;
}

/** Which install step is responsible for each failure mode. */
const MODE_STEP: Record<FailureMode, { part: RocketPart; stepId: string }> = {
  padAbort: { part: "electronics", stepId: "electronics.wiring" },
  padExplosion: { part: "engine", stepId: "engine.thrustTrim" },
  cantLiftOff: { part: "engine", stepId: "engine.thrustTrim" },
  gimbalVeer: { part: "engine", stepId: "engine.gimbal" },
  finShatter: { part: "fins", stepId: "fins.cantAngle" },
  hullBreakup: { part: "hull", stepId: "hull.boltSpacing" },
  fuelFireball: { part: "fuelTank", stepId: "fuelTank.mixRatio" },
  flameOut: { part: "fuelTank", stepId: "fuelTank.mixRatio" },
  tankDry: { part: "fuelTank", stepId: "fuelTank.fillVolume" },
  stagingCollision: { part: "booster", stepId: "booster.stagingTimer" },
  noseShatter: { part: "noseCone", stepId: "noseCone.coneAngle" },
  cgVeer: { part: "payloadBay", stepId: "payloadBay.massSplit" },
};

function stepFor(design: RocketDesign, part: RocketPart, stepId: string): InstallStepResult | undefined {
  return design.installedParts[part]?.install?.steps.find((s) => s.stepId === stepId);
}

function planned(
  design: RocketDesign,
  mode: FailureMode,
  severity: EventSeverity,
  trigger: FailureTrigger,
  caption: string,
  explanation: string,
): PlannedFailure {
  const { part, stepId } = MODE_STEP[mode];
  const step = stepFor(design, part, stepId);
  return {
    mode,
    severity,
    trigger,
    partAtFault: part,
    stepId,
    caption,
    explanation,
    playerValue: step?.actual,
    targetValue: step?.target,
  };
}

const fmt = (n: number, dp = 1) => Number(n.toFixed(dp)).toString();

/**
 * Pre-launch checks — derive the flight's FailurePlan from the design values
 * the player's install-step maths wrote. Same design ⇒ same plan. Thresholds
 * follow the Wrench Time rule of thumb: ≤5 % error cosmetic, 5–25 % degraded,
 * >25 % armed failure.
 */
export function deriveFailurePlan(design: RocketDesign): PlannedFailure[] {
  const plan: PlannedFailure[] = [];
  const missing = (part: RocketPart) => !design.installedParts[part];

  // 0. Missing parts — the rocket flies EXACTLY as built. A part that was
  // never fitted in the VAB produces its own disaster (or stops the count).
  if (missing("electronics")) {
    plan.push({
      mode: "padAbort", severity: "failure", trigger: "pad",
      partAtFault: "electronics", stepId: "electronics.wiring",
      caption: "HOLD HOLD HOLD — NO GUIDANCE COMPUTER FITTED",
      explanation: "There is no electronics bay on this vehicle — nothing to steer it. The pad computer refused to start the count.",
    });
    return plan;
  }
  if (missing("engine")) {
    plan.push({
      mode: "cantLiftOff", severity: "failure", trigger: "pad",
      partAtFault: "engine", stepId: "engine.thrustTrim",
      caption: "IGNITION COMMAND… SILENCE — NO ENGINE FITTED",
      explanation: "The ignition command went out, but there was no engine on the vehicle to answer it. Zero thrust, zero liftoff.",
    });
    return plan;
  }
  if (missing("fuelTank")) {
    plan.push({
      mode: "cantLiftOff", severity: "failure", trigger: "pad",
      partAtFault: "fuelTank", stepId: "fuelTank.fillVolume",
      caption: "ENGINES SPUTTER AND DIE — NO FUEL TANK FITTED",
      explanation: "The engines lit on residual line pressure for half a second — there was no fuel tank to feed them.",
    });
    return plan;
  }
  if (missing("hull")) {
    plan.push({
      mode: "hullBreakup", severity: "catastrophic", trigger: "maxQ",
      partAtFault: "hull", stepId: "hull.boltSpacing",
      caption: "MAX-Q — VEHICLE BREAKUP (NO HULL PANELS FITTED)",
      explanation: "With no hull panels fitted, the airframe had nothing holding it together — it came apart the moment aerodynamic pressure built.",
    });
  }
  if (missing("fins")) {
    plan.push({
      mode: "finShatter", severity: "catastrophic", trigger: "maxQ",
      partAtFault: "fins", stepId: "fins.cantAngle",
      caption: "MAX-Q — VEHICLE TUMBLE (NO FINS FITTED)",
      explanation: "No fins were ever fitted, so there was nothing keeping the vehicle pointed the right way — it tumbled end over end as the air got thick.",
    });
  }
  if (missing("noseCone")) {
    plan.push({
      mode: "noseShatter", severity: "failure", trigger: "maxQ",
      partAtFault: "noseCone", stepId: "noseCone.coneAngle",
      caption: "MAX-Q — DRAG SPIKE (NO NOSE CONE FITTED)",
      explanation: "The vehicle flew with a flat open top — a blunt face into the airflow. Drag spiked at max-Q and ate the climb.",
    });
  }

  // 1. Critical electronics error ⇒ pad abort (checked FIRST — no launch at all).
  const wiring = stepFor(design, "electronics", "electronics.wiring");
  if (wiring && !wiring.skipped && wiring.errorPct > 0.25) {
    plan.push(
      planned(
        design,
        "padAbort",
        "failure",
        "pad",
        "HOLD HOLD HOLD — GUIDANCE BUS FAULT",
        "The guidance wiring failed its power-up self-test, so the range safety officer stopped the count. An inspection would have caught it — aborts save rockets.",
      ),
    );
    return plan; // nothing else matters — the vehicle never lights.
  }

  // 2. Thrust limiter dialled >130 % of the structural limit ⇒ pad explosion.
  const thrustStep = stepFor(design, "engine", "engine.thrustTrim");
  if (thrustStep && thrustStep.target > 0 && thrustStep.actual / thrustStep.target > 1.3) {
    plan.push(
      planned(
        design,
        "padExplosion",
        "catastrophic",
        "pad",
        `PAD STRUCTURAL FAILURE — THRUST ${fmt((thrustStep.actual / thrustStep.target) * 100, 0)}% OF LIMIT`,
        `Your thrust limiter setting of ${fmt(thrustStep.actual)} vs spec ${fmt(thrustStep.target)} pushed the engines past 130 % of what the thrust structure can take.`,
      ),
    );
    return plan;
  }
  // …or dialled way under ⇒ the vehicle can't lift off at all.
  if (thrustStep && thrustStep.target > 0 && thrustStep.actual / thrustStep.target < 0.6) {
    plan.push(
      planned(
        design,
        "cantLiftOff",
        "failure",
        "pad",
        "IGNITION… BUT NO LIFTOFF — THRUST BELOW WEIGHT",
        `The thrust limiter was set to ${fmt(thrustStep.actual)} against a spec of ${fmt(thrustStep.target)} — the engines never made enough thrust to beat gravity.`,
      ),
    );
  }

  // 3. Engine gimbal misalignment ⇒ continuous lateral veer.
  const gimbal = Math.abs(design.engineGimbalOffset);
  if (gimbal >= 3) {
    plan.push(
      planned(
        design,
        "gimbalVeer",
        "failure",
        "ascent",
        `RANGE ALERT — VEHICLE VEERING (gimbal ${fmt(design.engineGimbalOffset)}° off true)`,
        `An engine gimbal ${fmt(design.engineGimbalOffset)}° off vertical steers thrust sideways every second of the burn — the trajectory arcs away from the target.`,
      ),
    );
  } else if (gimbal >= 0.75) {
    plan.push(
      planned(
        design,
        "gimbalVeer",
        "warning",
        "ascent",
        `Slight drift — gimbal ${fmt(design.engineGimbalOffset)}° off true`,
        "A small gimbal misalignment nudged the trajectory sideways — noticeable, but the guidance coped.",
      ),
    );
  }

  // 4. Fin cant far off spec ⇒ roll builds ⇒ fin separation + tumble at max-Q.
  if (Math.abs(design.finAngle) >= 4) {
    plan.push(
      planned(
        design,
        "finShatter",
        "catastrophic",
        "maxQ",
        `MAX-Q — FIN SEPARATION (cant ${fmt(design.finAngle)}° vs spec ≤4°)`,
        `A fin cant of ${fmt(design.finAngle)}° produced several times the roll torque the airframe can take — the fins tore away at maximum dynamic pressure.`,
      ),
    );
  } else if (Math.abs(design.finAngle) >= 1.5) {
    plan.push(
      planned(
        design,
        "finShatter",
        "warning",
        "maxQ",
        `Roll oscillation — fin cant ${fmt(design.finAngle)}°`,
        "The canted fins spun the vehicle up slowly; it held together, but drag rose.",
      ),
    );
  }

  // 5. Hull integrity low ⇒ mid-air breakup at max-Q.
  if (design.hullIntegrity < 0.5) {
    plan.push(
      planned(
        design,
        "hullBreakup",
        "catastrophic",
        "maxQ",
        `MAX-Q — VEHICLE BREAKUP (hull integrity ${fmt(design.hullIntegrity * 100, 0)}%)`,
        "Too few panel bolts (or bolts too widely spaced) left the hull weaker than the aerodynamic load at max-Q — it came apart mid-air.",
      ),
    );
  } else if (design.hullIntegrity < 0.85) {
    plan.push(
      planned(
        design,
        "hullBreakup",
        "warning",
        "maxQ",
        "Structural groan through max-Q",
        "The hull flexed audibly through peak aerodynamic pressure — bolt spacing was on the loose side.",
      ),
    );
  }

  // 6. Wrong oxidiser:fuel ratio ⇒ fireball (rich) or flame-out (lean).
  if (design.fuelRatio > 3.5) {
    plan.push(
      planned(
        design,
        "fuelFireball",
        "catastrophic",
        "midBurn",
        `MID-BURN FIREBALL — MIXTURE ${fmt(design.fuelRatio)}:1 (FUEL-RICH)`,
        `A mixture of ${fmt(design.fuelRatio)}:1 dumped unburnt fuel into a hot engine bell — it lit all at once, in the wrong place.`,
      ),
    );
  } else if (design.fuelRatio < 1.6 && design.fuelRatio > 0) {
    plan.push(
      planned(
        design,
        "flameOut",
        "failure",
        "midBurn",
        `FLAME-OUT — MIXTURE ${fmt(design.fuelRatio)}:1 (TOO LEAN)`,
        `At ${fmt(design.fuelRatio)}:1 the engines ran oxidiser-starved and shut down early — thrust ended long before the tanks were dry.`,
      ),
    );
  }

  // 6b. Fill volume miscalculated ⇒ runs dry early.
  const fill = stepFor(design, "fuelTank", "fuelTank.fillVolume");
  if (fill && !fill.skipped && fill.errorPct > 0.25 && design.tankFill < 0.5) {
    plan.push(
      planned(
        design,
        "tankDry",
        "failure",
        "midBurn",
        `PROPELLANT DEPLETION — TANK ONLY ${fmt(design.tankFill * 100, 0)}% FULL`,
        `The fill-volume calculation loaded just ${fmt(design.tankFill * 100, 0)}% of the tank — the engines ran dry well before the target apogee.`,
      ),
    );
  }

  // 7. Booster staging timer wrong ⇒ boosters collide with the core.
  if (design.boosterCount > 0 && Math.abs(design.boosterStageT) > 0.25) {
    plan.push(
      planned(
        design,
        "stagingCollision",
        "catastrophic",
        "staging",
        `STAGING COLLISION — TIMER ${design.boosterStageT > 0 ? "LATE" : "EARLY"} BY ${fmt(Math.abs(design.boosterStageT) * 100, 0)}%`,
        "The staging timer arithmetic was off, so the boosters separated while still thrusting — straight into the core stage.",
      ),
    );
  }

  // 8. Cone angle wild ⇒ drag spike and shatter at high speed.
  if (design.noseAngle < 12 || design.noseAngle > 100) {
    plan.push(
      planned(
        design,
        "noseShatter",
        "catastrophic",
        "maxQ",
        `NOSE CONE SHATTER — CONE ANGLE ${fmt(design.noseAngle, 0)}°`,
        `A cone angle of ${fmt(design.noseAngle, 0)}° is outside the survivable envelope — the pressure spike at high speed shattered the fairing.`,
      ),
    );
  }

  // 9. Payload mass split off ⇒ centre of gravity offset ⇒ pitch-over veer.
  const cg = Math.abs(design.cgOffset);
  if (cg >= 0.45) {
    plan.push(
      planned(
        design,
        "cgVeer",
        "failure",
        "ascent",
        `PITCH-OVER — CG ${fmt(design.cgOffset * 100, 0)}% OFF CENTRE`,
        "The payload mass split loaded one side of the bay far heavier — the vehicle pitched over and flew a curving arc instead of straight up.",
      ),
    );
  } else if (cg >= 0.15) {
    plan.push(
      planned(
        design,
        "cgVeer",
        "warning",
        "ascent",
        `Slight lean — CG ${fmt(design.cgOffset * 100, 0)}% off centre`,
        "An uneven payload split made the vehicle lean gently during ascent.",
      ),
    );
  }

  return plan;
}

/** Tiny deterministic hash of a design (seed for COSMETIC variation only —
 * failures themselves are decided purely by the numbers above). */
export function designHash(design: RocketDesign): number {
  const s = JSON.stringify(design);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}