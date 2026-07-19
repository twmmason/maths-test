import type { Attempt } from "../db/db";
import { CRITERIA, criteriaForKeyStage } from "../curriculum/criteria";
import type { KeyStage, RocketPart, Strand } from "../curriculum/types";

const DAY = 24 * 60 * 60 * 1000;
/** Spaced-repetition intervals in days: 1 → 3 → 7 → 14. */
export const REVIEW_INTERVALS = [1, 3, 7, 14];

export interface CriterionMastery {
  code: string;
  attempts: number;
  correct: number;
  /** Consecutive correct answers at tier >= 2. */
  streakT2: number;
  mastered: boolean;
  lastSeen: number | null;
  /** Number of successful reviews since mastery (caps interval index). */
  reviewLevel: number;
  /** When this mastered item is due for review (spaced repetition). */
  dueAt: number | null;
  /** Whether the most recent attempt was wrong. */
  lastWrong: boolean;
}

/** Derive all mastery state from the attempts log (single source of truth). */
export function computeMastery(attempts: Attempt[]): Map<string, CriterionMastery> {
  const map = new Map<string, CriterionMastery>();
  for (const c of CRITERIA) {
    map.set(c.code, {
      code: c.code,
      attempts: 0,
      correct: 0,
      streakT2: 0,
      mastered: false,
      lastSeen: null,
      reviewLevel: 0,
      dueAt: null,
      lastWrong: false,
    });
  }
  const sorted = [...attempts].sort((a, b) => a.createdAt - b.createdAt);
  for (const a of sorted) {
    const m = map.get(a.criterionCode);
    if (!m) continue;
    m.attempts += 1;
    m.lastSeen = a.createdAt;
    if (a.correct) {
      m.correct += 1;
      m.lastWrong = false;
      if (a.tier >= 2) m.streakT2 += 1;
      if (!m.mastered && m.streakT2 >= 3) {
        m.mastered = true;
        m.reviewLevel = 0;
      } else if (m.mastered) {
        m.reviewLevel = Math.min(m.reviewLevel + 1, REVIEW_INTERVALS.length - 1);
      }
    } else {
      m.streakT2 = 0;
      m.lastWrong = true;
      // A wrong answer resets the review interval (mastery kept, interval restarts).
      if (m.mastered) m.reviewLevel = 0;
    }
    if (m.mastered && m.lastSeen !== null) {
      m.dueAt = m.lastSeen + REVIEW_INTERVALS[m.reviewLevel] * DAY;
    }
  }
  return map;
}

/**
 * Fraction of criteria mastered (0..1) for a key stage — used for destination
 * unlocks. Defaults to KS2 (the original 81) so existing unlock thresholds
 * are unchanged by the Academy expansion.
 */
export function masteryPercent(mastery: Map<string, CriterionMastery>, keyStage: KeyStage | "all" = "ks2"): number {
  const pool = keyStage === "all" ? CRITERIA : criteriaForKeyStage(keyStage);
  let mastered = 0;
  for (const c of pool) if (mastery.get(c.code)?.mastered) mastered += 1;
  return mastered / pool.length;
}

/** Mastered criterion count per strand (KS2 strands + KS3 domains). */
export function strandMasteryCounts(mastery: Map<string, CriterionMastery>): Record<Strand, number> {
  const counts: Record<Strand, number> = {
    NPV: 0, NF: 0, AS: 0, MD: 0, F: 0, G: 0,
    KS3N: 0, KS3A: 0, KS3R: 0, KS3G: 0, KS3P: 0, KS3S: 0,
  };
  for (const c of CRITERIA) {
    if (mastery.get(c.code)?.mastered) counts[c.strand] += 1;
  }
  return counts;
}

/** Strand(s) that certify each rocket part (for part upgrade levels).
 * KS3 Academy domains upgrade the same physical parts (senior fit-outs). */
export const PART_STRANDS: Record<RocketPart, Strand[]> = {
  noseCone: ["G", "KS3G"],
  hull: ["NPV", "KS3P"],
  fuelTank: ["NPV", "F", "KS3N"],
  engine: ["NF", "MD", "KS3S"],
  fins: ["G", "AS", "KS3G"],
  payloadBay: ["F", "MD", "KS3R"],
  electronics: ["AS", "MD", "KS3A"],
  booster: ["NF", "MD"],
};

/** Part level from strand mastery: 3+ mastered → Lv3, 1+ → Lv2, else Lv1.
 *  Thresholds are low so a child sees upgrades after their first couple of missions. */
export function partLevel(part: RocketPart, mastery: Map<string, CriterionMastery>): 1 | 2 | 3 {
  const counts = strandMasteryCounts(mastery);
  const total = PART_STRANDS[part].reduce((s, strand) => s + counts[strand], 0);
  if (total >= 3) return 3;
  if (total >= 1) return 2;
  return 1;
}

export function allPartLevels(mastery: Map<string, CriterionMastery>): Record<RocketPart, 1 | 2 | 3> {
  const parts = Object.keys(PART_STRANDS) as RocketPart[];
  return Object.fromEntries(parts.map((p) => [p, partLevel(p, mastery)])) as Record<RocketPart, 1 | 2 | 3>;
}

/** XP for an attempt: higher tiers pay more; hints cost a little. */
export function xpForAttempt(tier: number, correct: boolean, hintsUsed: number): number {
  if (!correct) return 1;
  return Math.max(2, tier * 10 - hintsUsed * 3);
}
/**
 * Astronaut Academy access (PROMPT_KS3 §5): opens at 60% KS2 mastery OR via
 * the profile's explicit "I'm in Year 7+" toggle.
 */
export function isAcademyUnlocked(
  mastery: Map<string, CriterionMastery>,
  profileToggle?: boolean,
): boolean {
  return Boolean(profileToggle) || masteryPercent(mastery, "ks2") >= 0.6;
}
