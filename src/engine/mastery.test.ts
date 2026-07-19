import { describe, it, expect } from "vitest";
import { computeMastery, masteryPercent, xpForAttempt, partLevel, REVIEW_INTERVALS } from "./mastery";
import type { Attempt } from "../db/db";

const DAY = 24 * 60 * 60 * 1000;
let t = 1000000;
const attempt = (code: string, tier: number, correct: boolean): Attempt => ({
  criterionCode: code,
  tier,
  correct,
  hintsUsed: 0,
  createdAt: (t += 60000),
});

describe("mastery engine", () => {
  it("marks mastered after 3 correct in a row at tier >= 2", () => {
    const attempts = [attempt("4NF-1", 2, true), attempt("4NF-1", 2, true), attempt("4NF-1", 2, true)];
    const m = computeMastery(attempts).get("4NF-1")!;
    expect(m.mastered).toBe(true);
    expect(m.streakT2).toBe(3);
  });

  it("does not master on tier 1 answers", () => {
    const attempts = [attempt("4NF-1", 1, true), attempt("4NF-1", 1, true), attempt("4NF-1", 1, true)];
    expect(computeMastery(attempts).get("4NF-1")!.mastered).toBe(false);
  });

  it("a wrong answer resets the streak", () => {
    const attempts = [
      attempt("4NF-1", 2, true),
      attempt("4NF-1", 2, true),
      attempt("4NF-1", 2, false),
      attempt("4NF-1", 2, true),
    ];
    const m = computeMastery(attempts).get("4NF-1")!;
    expect(m.mastered).toBe(false);
    expect(m.streakT2).toBe(1);
  });

  it("schedules spaced repetition: 1 day after mastery, growing on reviews", () => {
    const a = [attempt("4NF-1", 2, true), attempt("4NF-1", 2, true), attempt("4NF-1", 2, true)];
    const m1 = computeMastery(a).get("4NF-1")!;
    expect(m1.dueAt).toBe(m1.lastSeen! + REVIEW_INTERVALS[0] * DAY);

    a.push(attempt("4NF-1", 2, true)); // first successful review → 3 days
    const m2 = computeMastery(a).get("4NF-1")!;
    expect(m2.dueAt).toBe(m2.lastSeen! + REVIEW_INTERVALS[1] * DAY);

    a.push(attempt("4NF-1", 2, false)); // wrong answer resets the interval
    const m3 = computeMastery(a).get("4NF-1")!;
    expect(m3.dueAt).toBe(m3.lastSeen! + REVIEW_INTERVALS[0] * DAY);
  });

  it("masteryPercent counts mastered criteria out of 81", () => {
    const attempts = [attempt("4NF-1", 2, true), attempt("4NF-1", 2, true), attempt("4NF-1", 2, true)];
    expect(masteryPercent(computeMastery(attempts))).toBeCloseTo(1 / 81);
  });

  it("part level rises with strand mastery", () => {
    const attempts: Attempt[] = [];
    // Master two G criteria → nose cone level 2
    for (const code of ["1G-1", "2G-1"]) {
      attempts.push(attempt(code, 2, true), attempt(code, 2, true), attempt(code, 2, true));
    }
    const mastery = computeMastery(attempts);
    expect(partLevel("noseCone", mastery)).toBe(2);
    expect(partLevel("hull", mastery)).toBe(1);
  });

  it("XP pays more for higher tiers and less for hints", () => {
    expect(xpForAttempt(3, true, 0)).toBeGreaterThan(xpForAttempt(1, true, 0));
    expect(xpForAttempt(2, true, 2)).toBeLessThan(xpForAttempt(2, true, 0));
    expect(xpForAttempt(2, false, 0)).toBe(1);
  });
});