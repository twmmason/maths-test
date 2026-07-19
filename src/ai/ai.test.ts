import { describe, it, expect } from "vitest";
import { validateOutput, validateParaphrase } from "./flightDirector";
import { FALLBACK_CORRECT, FALLBACK_NUDGE, FALLBACK_DEBRIEF, pickFallback } from "./fallbacks";

describe("LLM output validators", () => {
  it("rejects text containing the answer", () => {
    expect(validateOutput("The total you need is 56 bolts, Commander.", "56")).toBe(false);
    expect(validateOutput("Count the bolts on each side carefully.", "56")).toBe(true);
  });

  it("rejects operation symbols", () => {
    expect(validateOutput("Try 7 × 8 to find it")).toBe(false);
    expect(validateOutput("Remember that 7 + 8 helps")).toBe(false);
    expect(validateOutput("Think about equal groups of injectors")).toBe(true);
  });

  it("rejects banned negative words", () => {
    expect(validateOutput("That answer is wrong, try again")).toBe(false);
    expect(validateOutput("Not locked in yet — tweak it and retry")).toBe(true);
  });

  it("rejects empty or overlong output", () => {
    expect(validateOutput("")).toBe(false);
    expect(validateOutput("x".repeat(1000))).toBe(false);
  });

  it("paraphrase must preserve every numeric token", () => {
    const original = "The hull is 347 cm long and needs 12 panels.";
    expect(validateParaphrase(original, "Our 347 cm hull is waiting for its 12 panels — how many rings?")).toBe(true);
    expect(validateParaphrase(original, "Our hull is waiting for its 12 panels.")).toBe(false);
    expect(validateParaphrase(original, "347 cm and 12 panels: 347 + 12")).toBe(false);
  });
});

describe("static fallbacks", () => {
  it("fallback strings are clean of operation symbols and banned words", () => {
    const all = [...FALLBACK_CORRECT, ...FALLBACK_NUDGE, FALLBACK_DEBRIEF("the Moon", 12, 14, 400)];
    for (const s of all) {
      expect(s).not.toMatch(/[+×÷−]/);
      expect(s.toLowerCase()).not.toContain("wrong");
      expect(s.toLowerCase()).not.toContain("incorrect");
      expect(s.toLowerCase()).not.toContain("failed");
    }
  });

  it("pickFallback returns a member of the list", () => {
    expect(FALLBACK_NUDGE).toContain(pickFallback(FALLBACK_NUDGE));
  });
});