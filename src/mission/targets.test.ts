import { describe, expect, it } from "vitest";
import { targetsForMission, evaluateTargets, medalFor } from "./targets";
import { DEFAULT_DESIGN } from "../three/rocketDesign";
import { simulateFlight } from "../physics/simulateFlight";

describe("mission targets", () => {
  it("is deterministic: same seed inputs ⇒ identical targets", () => {
    const a = targetsForMission("artie", "lowOrbit", 3);
    const b = targetsForMission("artie", "lowOrbit", 3);
    expect(a).toEqual(b);
  });

  it("regenerates fresh targets on the next mission", () => {
    const a = targetsForMission("artie", "lowOrbit", 3);
    const b = targetsForMission("artie", "lowOrbit", 4);
    expect(a).not.toEqual(b);
  });

  it("always includes an apogee band anchored to the destination", () => {
    const t = targetsForMission("artie", "moon", 1);
    const apogee = t.find((x) => x.metric === "apogee")!;
    expect(apogee.min).toBe(600);
    expect(apogee.max!).toBeGreaterThan(600);
  });

  it("evaluates against the deterministic sim and awards medals", () => {
    const targets = targetsForMission("artie", "lowOrbit", 1);
    const design = { ...DEFAULT_DESIGN, installedParts: {} };
    const flight = simulateFlight(design, 1);
    const results = evaluateTargets(targets, design, flight);
    expect(results).toHaveLength(targets.length);
    for (const r of results) expect(typeof r.met).toBe("boolean");
    const medal = medalFor(results);
    expect(["gold", "silver", "bronze", "none"]).toContain(medal);
    // Same design ⇒ same evaluation, every time.
    expect(evaluateTargets(targets, design, simulateFlight(design, 1))).toEqual(results);
  });

  it("marks the outcome target unmet for a lost vehicle", () => {
    const targets = [{ id: "outcome", metric: "outcome" as const, unit: "", label: "nominal" }];
    const design = { ...DEFAULT_DESIGN, finAngle: 12, installedParts: {} };
    const flight = simulateFlight(design, 1);
    expect(flight.outcome).not.toBe("nominal");
    const [r] = evaluateTargets(targets, design, flight);
    expect(r.met).toBe(false);
  });
});