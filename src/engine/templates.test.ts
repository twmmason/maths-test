import { describe, it, expect } from "vitest";
import { CRITERIA } from "../curriculum/criteria";
import { TEMPLATES, generateTask, checkAnswer } from "./index";
import { generateChecklist } from "./templates/checklist";
import { createRng } from "./rng";

const OP_SYMBOLS = /[+×÷=−]/; // §10 rule 4: no bare operation symbols in briefings
const TIERS = [1, 2, 3] as const;
const SEEDS = [1, 42, 999, 31337];

describe("task templates", () => {
  it("covers every one of the 81 criteria", () => {
    const missing = CRITERIA.filter((c) => !TEMPLATES[c.code]).map((c) => c.code);
    expect(missing).toEqual([]);
    expect(CRITERIA.length).toBe(81);
  });

  for (const c of CRITERIA) {
    describe(c.code, () => {
      for (const tier of TIERS) {
        it(`tier ${tier} generates valid tasks`, () => {
          for (const seed of SEEDS) {
            const task = generateTask(c.code, tier, seed);
            expect(task.criterionCode).toBe(c.code);
            expect(task.tier).toBe(tier);
            expect(task.briefing.length).toBeGreaterThan(20);
            expect(task.answer.length).toBeGreaterThan(0);
            expect(task.workedSteps.length).toBeGreaterThan(0);
            expect(task.hints.length).toBeGreaterThan(0);
            expect(task.visual).toBeDefined();
            expect(task.visual.widget).toBeTruthy();
            expect(task.rocketEffect).toBeDefined();
            expect(task.rocketEffect.property.length).toBeGreaterThan(0);
            // §10 rule 4: never show operation symbols in the briefing
            expect(task.briefing).not.toMatch(OP_SYMBOLS);
            expect(task.engineeringContext).not.toMatch(OP_SYMBOLS);
            // Choices, when present, must include the answer
            if (task.choices) {
              expect(task.choices).toContain(task.answer);
              expect(task.choices.length).toBeGreaterThanOrEqual(2);
            }
            // The stated answer must check as correct
            expect(checkAnswer(task, task.answer)).toBe(true);
          }
        });
      }
    });
  }

  it("pre-flight checklist items are clean and self-consistent", () => {
    const items = generateChecklist(createRng(7), 5);
    expect(items.length).toBe(5);
    for (const item of items) {
      expect(item.briefing).not.toMatch(OP_SYMBOLS);
      expect(checkAnswer(item, item.answer)).toBe(true);
    }
  });

  it("is deterministic for the same seed", () => {
    const a = generateTask("4NF-1", 2, 123);
    const b = generateTask("4NF-1", 2, 123);
    expect(a.briefing).toBe(b.briefing);
    expect(a.answer).toBe(b.answer);
  });
});

describe("answer checking", () => {
  it("accepts equivalent numeric forms", () => {
    const task = generateTask("4NF-1", 2, 5);
    expect(checkAnswer(task, `${task.answer}.0`)).toBe(true);
    expect(checkAnswer(task, `${task.answer} kg`)).toBe(true);
    expect(checkAnswer(task, ` ${task.answer} `)).toBe(true);
  });

  it("strips thousands separators", () => {
    const task = generateTask("5MD-1", 3, 9);
    const withCommas = Number(task.answer).toLocaleString("en-GB");
    expect(checkAnswer(task, withCommas)).toBe(true);
  });

  it("accepts equivalent fractions when allowed, rejects for simplify tasks", () => {
    const add = generateTask("3F-4", 2, 3); // acceptEquivalentFractions: true
    const [n, d] = add.answer.split("/").map(Number);
    expect(checkAnswer(add, `${n * 2}/${d * 2}`)).toBe(true);

    const simplify = generateTask("6F-1", 2, 3); // must be exact simplest form
    const [sn, sd] = simplify.answer.split("/").map(Number);
    expect(checkAnswer(simplify, `${sn * 2}/${sd * 2}`)).toBe(false);
    expect(checkAnswer(simplify, simplify.answer)).toBe(true);
  });

  it("applies tolerance on measurement tasks", () => {
    const task = generateTask("5G-1", 2, 11); // protractor ±3°
    const val = Number(task.answer);
    expect(checkAnswer(task, String(val + 2))).toBe(true);
    expect(checkAnswer(task, String(val + 10))).toBe(false);
  });

  it("rejects empty and wrong answers", () => {
    const task = generateTask("1NF-1", 1, 2);
    expect(checkAnswer(task, "")).toBe(false);
    expect(checkAnswer(task, String(Number(task.answer) + 1))).toBe(false);
  });
});