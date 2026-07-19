import type { KeyStage, RocketPart } from "../curriculum/types";
import type { Attempt } from "../db/db";
import { CRITERIA } from "../curriculum/criteria";
import { computeMastery } from "../engine/mastery";
import { criteriaForPart } from "./parts";
import { DESTINATION_BY_ID } from "./destinations";

export interface PartPlan {
  part: RocketPart;
  /** Which syllabus this fit-out certifies (never mixed within one part). */
  keyStage: KeyStage;
  criteria: { code: string; tier: 1 | 2 | 3 }[];
}

/**
 * Choose a part's fit-out key stage (PROMPT_KS3 §5): a part is EITHER a KS2
 * or a KS3 fit-out — never mixed. Academy (KS3) is chosen when the Academy is
 * open AND either a KS3 review is due, or the part's KS2 pool is largely
 * mastered with KS3 work still to do. Academy destinations always fly KS3.
 */
export function partKeyStage(
  part: RocketPart,
  destinationId: string,
  attempts: Attempt[],
  academyOpen: boolean,
  now = Date.now(),
): KeyStage {
  const destination = DESTINATION_BY_ID[destinationId];
  if (destination?.keyStage === "ks3") return academyOpen ? "ks3" : "ks2";
  if (!academyOpen) return "ks2";
  const mastery = computeMastery(attempts);
  const ks3Codes = criteriaForPart(part, "ks3");
  if (ks3Codes.length === 0) return "ks2";
  const ks3Due = ks3Codes.some((c) => {
    const m = mastery.get(c);
    return m?.mastered && m.dueAt !== null && m.dueAt <= now;
  });
  if (ks3Due) return "ks3";
  const ks2Codes = criteriaForPart(part, "ks2");
  const ks2Mastered = ks2Codes.filter((c) => mastery.get(c)?.mastered).length;
  const ks3Unmastered = ks3Codes.some((c) => !mastery.get(c)?.mastered);
  return ks2Codes.length > 0 && ks2Mastered / ks2Codes.length >= 0.6 && ks3Unmastered ? "ks3" : "ks2";
}

const YEAR_ORDER = (code: string) => {
  const c = CRITERIA.find((x) => x.code === code);
  return c ? c.year * 100 + code.charCodeAt(code.length - 1) : 999;
};

/**
 * Plan which criteria a part pulls for this mission (~2 per part so a full
 * mission fits a 15-20 minute session). Priority:
 *  1. due spaced-repetition reviews
 *  2. criteria with recent wrong answers
 *  3. new criteria in curriculum order (Year 1 → 6)
 */
export function planPart(
  part: RocketPart,
  destinationId: string,
  attempts: Attempt[],
  count = 2,
  now = Date.now(),
  academyOpen = false,
): PartPlan {
  const destination = DESTINATION_BY_ID[destinationId];
  const tiers = destination?.tiers ?? [1];
  const mastery = computeMastery(attempts);
  const keyStage = partKeyStage(part, destinationId, attempts, academyOpen, now);
  const codes = criteriaForPart(part, keyStage);

  const due = codes.filter((c) => {
    const m = mastery.get(c);
    return m?.mastered && m.dueAt !== null && m.dueAt <= now;
  });
  const wrongRecent = codes.filter((c) => mastery.get(c)?.lastWrong && !due.includes(c));
  const fresh = codes
    .filter((c) => !due.includes(c) && !wrongRecent.includes(c) && !(mastery.get(c)?.mastered))
    .sort((a, b) => YEAR_ORDER(a) - YEAR_ORDER(b));
  const rest = codes.filter((c) => !due.includes(c) && !wrongRecent.includes(c) && !fresh.includes(c));

  const ordered = [...due, ...wrongRecent, ...fresh, ...rest];
  const chosen = ordered.slice(0, count);

  return {
    part,
    keyStage,
    criteria: chosen.map((code) => {
      const m = mastery.get(code);
      // Start easy for brand-new criteria; use destination tiers otherwise.
      const base = m && m.correct > 0 ? tiers[tiers.length - 1] : tiers[0];
      return { code, tier: base };
    }),
  };
}