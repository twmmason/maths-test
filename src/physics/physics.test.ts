import { describe, it, expect } from "vitest";
import { computePerformance } from "./computePerformance";
import { simulateFlight } from "./simulateFlight";
import { DEFAULT_DESIGN, type RocketDesign } from "../three/rocketDesign";

const design = (patch: Partial<RocketDesign> = {}): RocketDesign => ({ ...DEFAULT_DESIGN, ...patch });

describe("computePerformance", () => {
  it("default design is flight-ready with sensible TWR", () => {
    const p = computePerformance(design());
    expect(p.twr).toBeGreaterThan(1.2);
    expect(p.twr).toBeLessThan(100);
    expect(p.flightReady).toBe(true);
    expect(p.deltaV).toBeGreaterThan(500);
    expect(p.maxAltitude).toBeGreaterThan(0);
  });

  it("more engines means more thrust and higher TWR", () => {
    const base = computePerformance(design({ engineCount: 2 }));
    const more = computePerformance(design({ engineCount: 5 }));
    expect(more.totalThrust).toBeGreaterThan(base.totalThrust);
    expect(more.twr).toBeGreaterThan(base.twr);
  });

  it("sharper nose reduces drag", () => {
    const sharp = computePerformance(design({ noseAngle: 25 }));
    const blunt = computePerformance(design({ noseAngle: 80 }));
    expect(sharp.dragCoeff).toBeLessThan(blunt.dragCoeff);
  });

  it("too few fins or broken symmetry makes it unstable", () => {
    expect(computePerformance(design({ finCount: 2 })).stability).toBeLessThan(0.8);
    expect(computePerformance(design({ finSymmetry: false })).stability).toBeLessThan(0.8);
    expect(computePerformance(design({ finCount: 4, finSymmetry: true })).stability).toBeGreaterThan(0.8);
  });

  it("empty tank is not flight-ready", () => {
    expect(computePerformance(design({ tankFill: 0.1 })).flightReady).toBe(false);
  });

  it("more fuel increases mass and burn time", () => {
    const low = computePerformance(design({ tankFill: 0.3 }));
    const high = computePerformance(design({ tankFill: 0.9 }));
    expect(high.totalMass).toBeGreaterThan(low.totalMass);
    expect(high.burnTime).toBeGreaterThan(low.burnTime);
    expect(high.twr).toBeLessThan(low.twr);
  });
});

describe("simulateFlight", () => {
  it("a good rocket flies and produces samples + events", () => {
    const flight = simulateFlight(design(), 1);
    expect(flight.samples.length).toBeGreaterThan(10);
    expect(flight.maxAltitudeKm).toBeGreaterThan(10);
    expect(flight.events.some((e) => e.label === "Liftoff")).toBe(true);
    expect(flight.events.some((e) => e.label.includes("Apogee"))).toBe(true);
  });

  it("higher engineering quality flies higher", () => {
    const poor = simulateFlight(design(), 0.3);
    const great = simulateFlight(design(), 1);
    expect(great.maxAltitudeKm).toBeGreaterThanOrEqual(poor.maxAltitudeKm);
  });

  it("unstable rockets tumble and are capped low", () => {
    const flight = simulateFlight(design({ finCount: 1 }), 1);
    expect(flight.tumbled).toBe(true);
    expect(flight.maxAltitudeKm).toBeLessThanOrEqual(30);
  });

  it("boosters create a staging event", () => {
    const flight = simulateFlight(design({ boosterCount: 2 }), 1);
    expect(flight.events.some((e) => e.label.toLowerCase().includes("staging"))).toBe(true);
  });

  it("altitude is monotonically increasing until apogee", () => {
    const flight = simulateFlight(design(), 1);
    const peakIndex = flight.samples.findIndex((s) => s.altitude === Math.max(...flight.samples.map((x) => x.altitude)));
    for (let i = 1; i <= peakIndex; i++) {
      expect(flight.samples[i].altitude).toBeGreaterThanOrEqual(flight.samples[i - 1].altitude - 0.001);
    }
  });
});