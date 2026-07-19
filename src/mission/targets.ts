import { createRng } from "../engine/rng";
import type { FlightResult } from "../physics/types";
import type { RocketDesign } from "../three/rocketDesign";
import { computePerformance } from "../physics/computePerformance";
import { DESTINATION_BY_ID } from "./destinations";

/** A concrete, checkable engineering target for one mission. Deterministic:
 * seeded by (profileId, destinationId, missionIndex) — fresh every mission. */
export interface MissionTarget {
  id: string;
  label: string;
  metric: "apogee" | "twr" | "burnTime" | "deltaV" | "outcome";
  min?: number;
  max?: number;
  unit: string;
}

export interface TargetResult {
  target: MissionTarget;
  actual: number | string;
  met: boolean;
}

export type MissionMedal = "gold" | "silver" | "bronze" | "none";

function hashSeed(profileId: string, destinationId: string, missionIndex: number): number {
  let h = 2166136261;
  const s = `${profileId}|${destinationId}|${missionIndex}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Generate 3 fresh targets for a mission. Same inputs ⇒ same targets. */
export function targetsForMission(profileId: string, destinationId: string, missionIndex: number): MissionTarget[] {
  const rng = createRng(hashSeed(profileId, destinationId, missionIndex));
  const dest = DESTINATION_BY_ID[destinationId];
  const reqKm = dest?.requiredAltitudeKm ?? 150;
  const targets: MissionTarget[] = [];

  // 1. Always: reach the destination, but inside a band (no wild overshoot).
  const overshoot = 1.5 + rng.int(0, 20) / 10; // 1.5×–3.5× required
  targets.push({
    id: "apogee",
    metric: "apogee",
    min: reqKm,
    max: Math.round(reqKm * overshoot),
    unit: "km",
    label: `Apogee between ${reqKm.toLocaleString("en-GB")} and ${Math.round(reqKm * overshoot).toLocaleString("en-GB")} km`,
  });

  // 2. A liftoff TWR window — tune thrust vs mass.
  const twrLo = 1.2 + rng.int(0, 8) / 10; // 1.2–2.0
  const twrHi = twrLo + 1.2 + rng.int(0, 10) / 10;
  targets.push({
    id: "twr",
    metric: "twr",
    min: Math.round(twrLo * 10) / 10,
    max: Math.round(twrHi * 10) / 10,
    unit: "",
    label: `Liftoff TWR between ${twrLo.toFixed(1)} and ${twrHi.toFixed(1)}`,
  });

  // 3. Rotate a third metric so missions feel different.
  const pick = rng.int(0, 2);
  if (pick === 0) {
    const burnMin = 60 + rng.int(0, 12) * 10; // 60–180 s
    targets.push({ id: "burnTime", metric: "burnTime", min: burnMin, unit: "s", label: `Burn time at least ${burnMin} s` });
  } else if (pick === 1) {
    const dvMin = 800 + rng.int(0, 10) * 50; // 800–1300 m/s
    targets.push({ id: "deltaV", metric: "deltaV", min: dvMin, unit: "m/s", label: `Δv of at least ${dvMin.toLocaleString("en-GB")} m/s` });
  } else {
    targets.push({ id: "outcome", metric: "outcome", unit: "", label: "Bring the vehicle home nominal — no failures" });
  }
  return targets;
}

/** Evaluate targets against the deterministic sim + performance model. */
export function evaluateTargets(targets: MissionTarget[], design: RocketDesign, flight: FlightResult): TargetResult[] {
  const perf = computePerformance(design);
  return targets.map((t) => {
    let actual: number | string;
    switch (t.metric) {
      case "apogee":
        actual = Math.round(flight.maxAltitudeKm);
        break;
      case "twr":
        actual = Math.round(perf.twr * 10) / 10;
        break;
      case "burnTime":
        actual = Math.round(flight.burnoutT);
        break;
      case "deltaV":
        actual = Math.round(perf.deltaV);
        break;
      case "outcome":
        actual = flight.outcome;
        break;
    }
    let met: boolean;
    if (t.metric === "outcome") {
      met = flight.outcome === "nominal";
    } else {
      const v = actual as number;
      met = (t.min === undefined || v >= t.min) && (t.max === undefined || v <= t.max);
    }
    return { target: t, actual, met };
  });
}

export function medalFor(results: TargetResult[]): MissionMedal {
  const met = results.filter((r) => r.met).length;
  if (results.length === 0) return "none";
  if (met === results.length) return "gold";
  if (met >= results.length - 1 && met > 0) return "silver";
  if (met > 0) return "bronze";
  return "none";
}

export const MEDAL_EMOJI: Record<MissionMedal, string> = { gold: "🥇", silver: "🥈", bronze: "🥉", none: "—" };