import type { GeneratedTask, RocketEffect, VisualSpec } from "../types";
import type { RocketPart } from "../../curriculum/types";
import type { Rng } from "../rng";

let seq = 0;

export interface TaskDraft {
  criterionCode: string;
  rocketPart: RocketPart;
  tier: 1 | 2 | 3;
  briefing: string;
  engineeringContext: string;
  answer: string;
  choices?: string[];
  workedSteps: string[];
  hints: string[];
  visual: VisualSpec;
  rocketEffect: RocketEffect;
  tolerance?: number;
  acceptEquivalentFractions?: boolean;
}

export function makeTask(d: TaskDraft): GeneratedTask {
  seq += 1;
  return { id: `${d.criterionCode}-${d.tier}-${Date.now().toString(36)}-${seq}`, ...d };
}

/** Shuffle answer into distractors, dedupe, return choice list. */
export function mc(rng: Rng, answer: string, distractors: string[]): string[] {
  const set = new Set<string>([answer]);
  for (const dd of distractors) {
    if (set.size >= 4) break;
    if (dd !== answer) set.add(dd);
  }
  return rng.shuffle([...set]);
}

/** Numeric distractors near an answer. */
export function nearBy(rng: Rng, n: number, spread = 3): string[] {
  const out = new Set<number>();
  let guard = 0;
  while (out.size < 3 && guard < 50) {
    guard++;
    const cand = n + rng.int(-spread, spread);
    if (cand !== n && cand >= 0) out.add(cand);
  }
  return [...out].map(String);
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

export function simplifyFraction(num: number, den: number): [number, number] {
  const g = gcd(num, den);
  return [num / g, den / g];
}

export function frac(num: number, den: number): string {
  return `${num}/${den}`;
}

/** UK thousands-separated number formatting. */
export function fmt(n: number): string {
  return n.toLocaleString("en-GB");
}

const ONES = ["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen"];
const TENS = ["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"];

function belowThousand(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const r = n % 10;
    return TENS[t] + (r ? `-${ONES[r]}` : "");
  }
  const h = Math.floor(n / 100);
  const r = n % 100;
  return `${ONES[h]} hundred` + (r ? ` and ${belowThousand(r)}` : "");
}

/** Number to UK English words (up to 10 million). */
export function numberToWords(n: number): string {
  if (n === 0) return "zero";
  const parts: string[] = [];
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  if (millions) parts.push(`${belowThousand(millions)} million`);
  if (thousands) parts.push(`${belowThousand(thousands)} thousand`);
  if (rest) {
    if (parts.length && rest < 100) parts.push(`and ${belowThousand(rest)}`);
    else parts.push(belowThousand(rest));
  }
  return parts.join(", ").replace(", and", " and");
}

export function roundTo(n: number, nearest: number): number {
  return Math.round(n / nearest) * nearest;
}

export function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}

/** Prime factorisation in product notation, e.g. 24 → "2^3 × 3". */
export function primeFactorisation(n: number): string {
  const factors: Record<number, number> = {};
  let m = n;
  for (let p = 2; p * p <= m; p++) {
    while (m % p === 0) {
      factors[p] = (factors[p] ?? 0) + 1;
      m /= p;
    }
  }
  if (m > 1) factors[m] = (factors[m] ?? 0) + 1;
  return Object.entries(factors)
    .map(([p, e]) => (e === 1 ? p : `${p}^${e}`))
    .join(" × ");
}

/** Fixed-decimal string without trailing zeros beyond dp, e.g. dec(7.5, 2) → "7.5". */
export function dec(n: number, dp = 2): string {
  return String(Math.round(n * 10 ** dp) / 10 ** dp);
}

/** Round to a number of significant figures. */
export function roundSf(n: number, sf: number): number {
  if (n === 0) return 0;
  const mag = Math.floor(Math.log10(Math.abs(n)));
  const factor = 10 ** (sf - 1 - mag);
  return Math.round(n * factor) / factor;
}

export function mean(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function mode(xs: number[]): number {
  const counts = new Map<number, number>();
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);
  let best = xs[0], bestCount = 0;
  for (const [x, c] of counts) {
    if (c > bestCount) {
      best = x;
      bestCount = c;
    }
  }
  return best;
}

export function range(xs: number[]): number {
  return Math.max(...xs) - Math.min(...xs);
}

export function digitName(place: number): string {
  const names: Record<number, string> = { 1: "ones", 10: "tens", 100: "hundreds", 1000: "thousands" };
  return names[place] ?? "ones";
}
