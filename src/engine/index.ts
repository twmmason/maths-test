import type { GeneratedTask } from "./types";
import type { Rng } from "./rng";
import { createRng, randomSeed } from "./rng";
import { noseconeTemplates } from "./templates/nosecone";
import { hullTemplates } from "./templates/hull";
import { fuelTemplates } from "./templates/fuel";
import { engineTemplates } from "./templates/engine";
import { finsTemplates } from "./templates/fins";
import { payloadTemplates } from "./templates/payload";
import { electronicsTemplates } from "./templates/electronics";
import { ks3NumberTemplates } from "./templates/ks3-number";
import { ks3AlgebraTemplates } from "./templates/ks3-algebra";
import { ks3RatioTemplates } from "./templates/ks3-ratio";
import { ks3GeometryTemplates } from "./templates/ks3-geometry";
import { ks3ProbabilityTemplates } from "./templates/ks3-probability";
import { ks3StatisticsTemplates } from "./templates/ks3-statistics";

export type TaskGenerator = (rng: Rng, tier: 1 | 2 | 3) => GeneratedTask;

/** All task template generators keyed by criterion code. */
export const TEMPLATES: Record<string, TaskGenerator> = {
  ...noseconeTemplates,
  ...hullTemplates,
  ...fuelTemplates,
  ...engineTemplates,
  ...finsTemplates,
  ...payloadTemplates,
  ...electronicsTemplates,
  // KS3 Astronaut Academy domains
  ...ks3NumberTemplates,
  ...ks3AlgebraTemplates,
  ...ks3RatioTemplates,
  ...ks3GeometryTemplates,
  ...ks3ProbabilityTemplates,
  ...ks3StatisticsTemplates,
};

/** Generate an engineering task for a criterion at a tier (deterministic when seeded). */
export function generateTask(criterionCode: string, tier: 1 | 2 | 3, seed?: number): GeneratedTask {
  const gen = TEMPLATES[criterionCode];
  if (!gen) throw new Error(`No template for criterion ${criterionCode}`);
  return gen(createRng(seed ?? randomSeed()), tier);
}

// ── Answer checking ───────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[()]/g, "");
}

/** Parse "3/4", "1 3/4", "0.75", "56 kg", "£2,450", "45°" etc. to a number, or null. */
export function parseNumeric(raw: string): number | null {
  let s = raw.trim().toLowerCase();
  s = s.replace(/£|°|,/g, "");
  s = s.replace(/(kg|km|kn|cm|mm|m\/s|l\/s|litres|litre|watts|watt|ohms|ohm|degrees|degree|seconds|second|tonnes|tonne|bar|panels|bolts|crates|grams|gram|secs|sec|deg|kml|ml|w|g|t|l|m|s)\b/g, "");
  s = s.trim();
  // mixed number "1 3/4"
  const mixed = s.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const whole = parseInt(mixed[1], 10);
    const num = parseInt(mixed[2], 10);
    const den = parseInt(mixed[3], 10);
    if (den === 0) return null;
    return whole + (whole < 0 ? -1 : 1) * (num / den);
  }
  // simple fraction "3/4"
  const fracM = s.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (fracM) {
    const den = parseInt(fracM[2], 10);
    if (den === 0) return null;
    return parseInt(fracM[1], 10) / den;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function isFractionForm(s: string): boolean {
  return /^\s*-?\d+\s+\d+\s*\/\s*\d+\s*$|^\s*-?\d+\s*\/\s*\d+\s*$/.test(s.trim());
}

/** Check an answer against a task, honouring tolerances and fraction rules. */
export function checkAnswer(task: GeneratedTask, raw: string): boolean {
  if (!raw || !raw.trim()) return false;
  const input = normalize(raw);
  const expected = normalize(task.answer);

  // Exact (case/space-insensitive) match always wins.
  if (input === expected) return true;

  // Coordinate answers like "3,5" vs "(3, 5)".
  const coordExp = expected.match(/^(-?\d+)\s*,\s*(-?\d+)$/);
  if (coordExp) {
    const coordIn = input.match(/^(-?\d+)\s*,\s*(-?\d+)$/);
    return !!coordIn && coordIn[1] === coordExp[1] && coordIn[2] === coordExp[2];
  }

  // Fraction answers.
  if (isFractionForm(task.answer)) {
    if (task.acceptEquivalentFractions === false) {
      // Must match the exact simplest form (allow spacing differences only).
      return input.replace(/\s*\/\s*/g, "/") === expected.replace(/\s*\/\s*/g, "/");
    }
    const iv = parseNumeric(raw);
    const ev = parseNumeric(task.answer);
    return iv !== null && ev !== null && Math.abs(iv - ev) < 1e-9;
  }

  // Numeric answers (with units/commas stripped and optional tolerance).
  const ev = parseNumeric(task.answer);
  if (ev !== null) {
    const iv = parseNumeric(raw);
    if (iv === null) return false;
    const tol = task.tolerance ?? 1e-9;
    return Math.abs(iv - ev) <= tol + 1e-12;
  }

  // Text answers: relaxed comparison (strip punctuation).
  const strip = (s: string) => s.replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  return strip(input) === strip(expected);
}