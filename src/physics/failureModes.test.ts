import { describe, it, expect } from "vitest";
import { simulateFlight } from "./simulateFlight";
import { deriveFailurePlan } from "./failureModes";
import { DEFAULT_DESIGN, withAllPartsInstalled, type RocketDesign, type InstallStepResult } from "../three/rocketDesign";
import type { RocketPart } from "../curriculum/types";

const design = (patch: Partial<RocketDesign> = {}): RocketDesign => withAllPartsInstalled({ ...DEFAULT_DESIGN, ...patch });

/** Attach a part with one recorded install step (what the player's maths wrote). */
function withStep(
  d: RocketDesign,
  part: RocketPart,
  step: Partial<InstallStepResult> & { stepId: string; target: number; actual: number },
): RocketDesign {
  const result: InstallStepResult = {
    criterionCode: "M4.1",
    kind: "torque",
    errorPct: step.target !== 0 ? Math.abs(step.actual - step.target) / Math.abs(step.target) : 1,
    tier: 1,
    ...step,
  };
  return {
    ...d,
    installedParts: {
      ...d.installedParts,
      [part]: {
        variantId: "test",
        certified: true,
        attachment: "stack" as const,
        install: { steps: [result], integrity: 1 - Math.min(1, result.errorPct) },
      },
    },
  };
}

describe("deriveFailurePlan", () => {
  it("a correctly-built rocket has no armed failures", () => {
    expect(deriveFailurePlan(design())).toHaveLength(0);
  });

  it("critical electronics wiring error arms a pad abort and nothing else", () => {
    const d = withStep(design({ engineGimbalOffset: 5 }), "electronics", {
      stepId: "electronics.wiring",
      kind: "connect",
      target: 10,
      actual: 4,
    });
    const plan = deriveFailurePlan(d);
    expect(plan).toHaveLength(1);
    expect(plan[0].mode).toBe("padAbort");
    expect(plan[0].partAtFault).toBe("electronics");
    expect(plan[0].stepId).toBe("electronics.wiring");
  });

  it("thrust limiter >130% of spec arms a pad explosion", () => {
    const d = withStep(design(), "engine", { stepId: "engine.thrustTrim", target: 100, actual: 140 });
    const plan = deriveFailurePlan(d);
    expect(plan[0].mode).toBe("padExplosion");
    expect(plan[0].severity).toBe("catastrophic");
    expect(plan[0].playerValue).toBe(140);
    expect(plan[0].targetValue).toBe(100);
  });

  it("thrust limiter far under spec means the rocket cannot lift off", () => {
    const d = withStep(design(), "engine", { stepId: "engine.thrustTrim", target: 100, actual: 40 });
    expect(deriveFailurePlan(d).some((f) => f.mode === "cantLiftOff")).toBe(true);
  });

  it("large fin cant arms a catastrophic fin shatter at max-Q", () => {
    const plan = deriveFailurePlan(design({ finAngle: 12 }));
    const f = plan.find((p) => p.mode === "finShatter");
    expect(f?.severity).toBe("catastrophic");
    expect(f?.partAtFault).toBe("fins");
    expect(f?.stepId).toBe("fins.cantAngle");
  });

  it("fuel-rich mixture arms a fireball; lean mixture a flame-out", () => {
    expect(deriveFailurePlan(design({ fuelRatio: 4.2 }))[0].mode).toBe("fuelFireball");
    expect(deriveFailurePlan(design({ fuelRatio: 1.2 }))[0].mode).toBe("flameOut");
  });

  it("low hull integrity arms a max-Q breakup", () => {
    expect(deriveFailurePlan(design({ hullIntegrity: 0.3 }))[0].mode).toBe("hullBreakup");
  });

  it("wrong staging timer arms a staging collision", () => {
    const plan = deriveFailurePlan(design({ boosterCount: 2, boosterStageT: 0.5 }));
    expect(plan[0].mode).toBe("stagingCollision");
  });

  it("wild cone angle arms a nose shatter", () => {
    expect(deriveFailurePlan(design({ noseAngle: 8 }))[0].mode).toBe("noseShatter");
    expect(deriveFailurePlan(design({ noseAngle: 120 }))[0].mode).toBe("noseShatter");
  });

  it("large CG offset arms a pitch-over veer", () => {
    expect(deriveFailurePlan(design({ cgOffset: 0.6 }))[0].mode).toBe("cgVeer");
  });
});

describe("simulateFlight failure outcomes (deterministic)", () => {
  it("correct maths flies nominal", () => {
    const flight = simulateFlight(design(), 1);
    expect(flight.outcome).toBe("nominal");
    expect(flight.failures).toHaveLength(0);
    expect(flight.maxAltitudeKm).toBeGreaterThan(10);
  });

  it("critical electronics ⇒ padAbort: klaxons, no launch, no explosion", () => {
    const d = withStep(design(), "electronics", { stepId: "electronics.wiring", kind: "connect", target: 10, actual: 4 });
    const flight = simulateFlight(d, 1);
    expect(flight.outcome).toBe("padAbort");
    expect(flight.maxAltitudeKm).toBe(0);
    expect(flight.failures[0].partAtFault).toBe("electronics");
  });

  it("thrust 140% of spec ⇒ pad explosion at t≈0.5s", () => {
    const d = withStep(design(), "engine", { stepId: "engine.thrustTrim", target: 100, actual: 140 });
    const flight = simulateFlight(d, 1);
    expect(flight.outcome).toBe("lostVehicle");
    const boom = flight.failures.find((f) => f.severity === "catastrophic");
    expect(boom?.t).toBe(0.5);
    expect(boom?.stepId).toBe("engine.thrustTrim");
  });

  it("wrong fin cant ⇒ fin separation + tumble, vehicle lost", () => {
    const flight = simulateFlight(design({ finAngle: 12 }), 1);
    expect(flight.outcome).toBe("lostVehicle");
    expect(flight.tumbled).toBe(true);
    expect(flight.failures.some((f) => f.stepId === "fins.cantAngle")).toBe(true);
    const good = simulateFlight(design(), 1);
    expect(flight.maxAltitudeKm).toBeLessThan(good.maxAltitudeKm);
  });

  it("fuel-rich mixture ⇒ mid-burn fireball, vehicle lost", () => {
    const flight = simulateFlight(design({ fuelRatio: 4.2 }), 1);
    expect(flight.outcome).toBe("lostVehicle");
    const boom = flight.failures.find((f) => f.severity === "catastrophic");
    expect(boom?.stepId).toBe("fuelTank.mixRatio");
    expect(boom!.t).toBeGreaterThan(0);
  });

  it("lean mixture ⇒ flame-out: degraded flight, lower apogee", () => {
    const flight = simulateFlight(design({ fuelRatio: 1.2 }), 1);
    expect(flight.outcome).toBe("degraded");
    expect(flight.failures.some((f) => f.label.toLowerCase().includes("flame"))).toBe(true);
    expect(flight.maxAltitudeKm).toBeLessThan(simulateFlight(design(), 1).maxAltitudeKm);
  });

  it("gimbal offset ⇒ continuous lateral veer (driftX grows) and degraded outcome", () => {
    const flight = simulateFlight(design({ engineGimbalOffset: 5 }), 1);
    expect(flight.outcome).toBe("degraded");
    const lastDrift = Math.abs(flight.samples[flight.samples.length - 1].driftX ?? 0);
    expect(lastDrift).toBeGreaterThan(0);
    expect(flight.maxAltitudeKm).toBeLessThan(simulateFlight(design(), 1).maxAltitudeKm);
  });

  it("low hull integrity ⇒ breakup at max-Q, vehicle lost", () => {
    const flight = simulateFlight(design({ hullIntegrity: 0.3 }), 1);
    expect(flight.outcome).toBe("lostVehicle");
    expect(flight.failures.some((f) => f.stepId === "hull.boltSpacing")).toBe(true);
  });

  it("wrong staging timer ⇒ boosters collide with the core at staging", () => {
    const flight = simulateFlight(design({ boosterCount: 2, boosterStageT: 0.5 }), 1);
    expect(flight.outcome).toBe("lostVehicle");
    expect(flight.failures.some((f) => f.stepId === "booster.stagingTimer")).toBe(true);
  });

  it("determinism: the same design produces the same flight, every time", () => {
    const d = design({ finAngle: 12, fuelRatio: 4.2 });
    expect(simulateFlight(d, 1)).toEqual(simulateFlight(d, 1));
    expect(simulateFlight(design(), 1)).toEqual(simulateFlight(design(), 1));
  });

  it("at least 8 distinct failure modes are reachable", () => {
    const outcomes = [
      withStep(design(), "electronics", { stepId: "electronics.wiring", kind: "connect", target: 10, actual: 4 }),
      withStep(design(), "engine", { stepId: "engine.thrustTrim", target: 100, actual: 140 }),
      withStep(design(), "engine", { stepId: "engine.thrustTrim", target: 100, actual: 40 }),
      design({ engineGimbalOffset: 5 }),
      design({ finAngle: 12 }),
      design({ hullIntegrity: 0.3 }),
      design({ fuelRatio: 4.2 }),
      design({ fuelRatio: 1.2 }),
      design({ boosterCount: 2, boosterStageT: 0.5 }),
      design({ noseAngle: 120 }),
      design({ cgOffset: 0.6 }),
    ].map((d) => deriveFailurePlan(d).map((f) => f.mode));
    const modes = new Set(outcomes.flat());
    expect(modes.size).toBeGreaterThanOrEqual(8);
  });
});