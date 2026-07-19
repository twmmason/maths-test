import type { RocketPart } from "../curriculum/types";
import type { Attempt } from "../db/db";
import { CRITERIA } from "../curriculum/criteria";
import { computeMastery } from "../engine/mastery";
import { criteriaForPart } from "./parts";
import { DESTINATION_BY_ID } from "./destinations";

export interface PartPlan {
  part: RocketPart;
  criteria: { code: string; tier: 1 | 2 | 3 }[];
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
): PartPlan {
  const destination = DESTINATION_BY_ID[destinationId];
  const tiers = destination?.tiers ?? [1];
  const mastery = computeMastery(attempts);
  const codes = criteriaForPart(part);

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
    criteria: chosen.map((code) => {
      const m = mastery.get(code);
      // Start easy for brand-new criteria; use destination tiers otherwise.
      const base = m && m.correct > 0 ? tiers[tiers.length - 1] : tiers[0];
      return { code, tier: base };
    }),
  };
}