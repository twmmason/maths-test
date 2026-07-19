import { describe, it, expect } from "vitest";
import { INSTALL_SPECS, installStepsFor, evaluateInstallAnswer, buildStepResult } from "./installPlan";
import { DEFAULT_DESIGN } from "../three/rocketDesign";
import type { RocketPart } from "../curriculum/types";
import type { PartPlan } from "./runPlanner";
import type { GeneratedTask } from "../engine/types";

const ALL_PARTS = Object.keys(INSTALL_SPECS) as RocketPart[];

const fakePlan = (part: RocketPart): PartPlan => ({
  part,
  keyStage: "ks2",
  criteria: [
    { code: "M4.1", tier: 1 },
    { code: "M4.2", tier: 2 },
    { code: "M4.3", tier: 1 },
  ],
});

const numericTask = (answer: string): GeneratedTask =>
  ({
    id: "t1",
    criterionCode: "M4.1",
    tier: 1,
    briefing: "",
    engineeringContext: "",
    answer,
    tolerance: 0,
    hints: [],
    workedSteps: [],
    visual: { widget: "fuelGauge", config: {} },
    rocketEffect: { property: "thrustPerEngine", correctValue: 1, incorrectValue: 0 },
  }) as unknown as GeneratedTask;

describe("installStepsFor", () => {
  it("every part type has a 2–4 step Wrench Time sequence", () => {
    for (const part of ALL_PARTS) {
      const steps = installStepsFor(part, fakePlan(part));
      expect(steps.length).toBeGreaterThanOrEqual(2);
      expect(steps.length).toBeLessThanOrEqual(4);
      // Each step exercises a real criterion from the part's plan.
      for (const s of steps) {
        expect(["M4.1", "M4.2", "M4.3"]).toContain(s.criterionCode);
        expect(["fit", "torque", "connect", "inspect"]).toContain(s.spec.kind);
      }
    }
  });

  it("step ids are unique within a part", () => {
    for (const part of ALL_PARTS) {
      const ids = INSTALL_SPECS[part].map((s) => s.stepId);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe("install step → design field mapping", () => {
  const spec = (part: RocketPart, stepId: string) => {
    const s = INSTALL_SPECS[part].find((x) => x.stepId === stepId);
    expect(s).toBeDefined();
    return s!;
  };

  it("engine thrust trim scales thrustPerEngine by the player's error", () => {
    const over = spec("engine", "engine.thrustTrim").apply(DEFAULT_DESIGN, 0.4);
    expect(over.thrustPerEngine).toBe(Math.round(DEFAULT_DESIGN.thrustPerEngine * 1.4));
    const exact = spec("engine", "engine.thrustTrim").apply(DEFAULT_DESIGN, 0);
    expect(exact.thrustPerEngine).toBe(DEFAULT_DESIGN.thrustPerEngine);
  });

  it("engine gimbal step writes engineGimbalOffset (wrong angle ⇒ veer)", () => {
    expect(spec("engine", "engine.gimbal").apply(DEFAULT_DESIGN, 0).engineGimbalOffset).toBe(0);
    expect(spec("engine", "engine.gimbal").apply(DEFAULT_DESIGN, 0.5).engineGimbalOffset).toBe(6);
  });

  it("fuel mix step writes fuelRatio; fill step writes tankFill", () => {
    expect(spec("fuelTank", "fuelTank.mixRatio").apply(DEFAULT_DESIGN, 0.68).fuelRatio).toBeGreaterThan(3.5);
    expect(spec("fuelTank", "fuelTank.fillVolume").apply(DEFAULT_DESIGN, -0.5).tankFill).toBeLessThan(0.5);
  });

  it("fin cant step writes finAngle + finSymmetry (big error breaks symmetry)", () => {
    const good = spec("fins", "fins.cantAngle").apply(DEFAULT_DESIGN, 0);
    expect(good.finAngle).toBe(0);
    expect(good.finSymmetry).toBe(true);
    const bad = spec("fins", "fins.cantAngle").apply(DEFAULT_DESIGN, 0.8);
    expect(bad.finAngle).toBeGreaterThanOrEqual(4);
    expect(bad.finSymmetry).toBe(false);
  });

  it("hull bolt step writes hullIntegrity (big error ⇒ breakup territory)", () => {
    expect(spec("hull", "hull.boltSpacing").apply(DEFAULT_DESIGN, 0).hullIntegrity).toBe(1);
    expect(spec("hull", "hull.boltSpacing").apply(DEFAULT_DESIGN, 0.6).hullIntegrity!).toBeLessThan(0.5);
  });

  it("nose cone step writes noseAngle", () => {
    expect(spec("noseCone", "noseCone.coneAngle").apply(DEFAULT_DESIGN, 0).noseAngle).toBe(DEFAULT_DESIGN.noseAngle);
    // 40° × (1 + 1.5) = 100° — right at the shatter envelope edge.
    expect(spec("noseCone", "noseCone.coneAngle").apply(DEFAULT_DESIGN, 1.5).noseAngle).toBe(100);
    expect(spec("noseCone", "noseCone.coneAngle").apply(DEFAULT_DESIGN, -0.8).noseAngle).toBeLessThan(12);
  });

  it("electronics wiring writes circuitsWired/powerBalanced (critical error arms abort)", () => {
    const ok = spec("electronics", "electronics.wiring").apply(DEFAULT_DESIGN, 0);
    expect(ok.powerBalanced).toBe(true);
    const bad = spec("electronics", "electronics.wiring").apply(DEFAULT_DESIGN, 0.6);
    expect(bad.powerBalanced).toBe(false);
  });

  it("payload mass split writes cgOffset; booster timer writes boosterStageT", () => {
    expect(spec("payloadBay", "payloadBay.massSplit").apply(DEFAULT_DESIGN, 1).cgOffset).toBe(0.6);
    expect(spec("booster", "booster.stagingTimer").apply(DEFAULT_DESIGN, 0.5).boosterStageT).toBe(0.5);
  });
});

describe("evaluateInstallAnswer — the answer IS the configuration", () => {
  it("a correct answer has zero error and is within spec", () => {
    const e = evaluateInstallAnswer(numericTask("40"), "40");
    expect(e.withinSpec).toBe(true);
    expect(e.errorPct).toBe(0);
    expect(e.actual).toBe(40);
    expect(e.target).toBe(40);
  });

  it("a wrong answer is committed with its proportional signed error", () => {
    const e = evaluateInstallAnswer(numericTask("40"), "50");
    expect(e.withinSpec).toBe(false);
    expect(e.signedError).toBeCloseTo(0.25);
    expect(e.errorPct).toBeCloseTo(0.25);
    expect(e.actual).toBe(50); // the player's number is what gets installed
  });

  it("wildly wrong answers clamp rather than explode the maths", () => {
    const e = evaluateInstallAnswer(numericTask("40"), "4000");
    expect(e.signedError).toBe(1.5);
  });

  it("buildStepResult records the step for the crash investigation", () => {
    const steps = installStepsFor("fins", fakePlan("fins"));
    const e = evaluateInstallAnswer(numericTask("40"), "50");
    const r = buildStepResult(steps[0], e);
    expect(r.stepId).toBe("fins.cantAngle");
    expect(r.criterionCode).toBe("M4.1");
    expect(r.actual).toBe(50);
    expect(r.target).toBe(40);
    expect(r.skipped).toBeUndefined();
    const skipped = buildStepResult(steps[0], e, true);
    expect(skipped.skipped).toBe(true);
    expect(skipped.errorPct).toBe(0);
  });
});