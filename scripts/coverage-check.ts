/**
 * pnpm verify gate: exits non-zero if any of the 81 criteria lacks a working
 * template, if any generated briefing contains an operation symbol (§10 rule 4),
 * or if any part category has no certification tasks.
 */
import { CRITERIA } from "../src/curriculum/criteria";
import { TEMPLATES, generateTask } from "../src/engine/index";
import { generateChecklist } from "../src/engine/templates/checklist";
import { createRng } from "../src/engine/rng";
import { criteriaForPart } from "../src/mission/parts";
import type { RocketPart } from "../src/curriculum/types";

const OP_SYMBOLS = /[+×÷=−]/;
const errors: string[] = [];

// 1. Every criterion has a template that generates a valid task at every tier.
for (const c of CRITERIA) {
  if (!TEMPLATES[c.code]) {
    errors.push(`MISSING TEMPLATE: ${c.code} (${c.description})`);
    continue;
  }
  for (const tier of [1, 2, 3] as const) {
    for (const seed of [1, 99, 2024]) {
      try {
        const task = generateTask(c.code, tier, seed);
        if (OP_SYMBOLS.test(task.briefing)) {
          errors.push(`OPERATION SYMBOL in briefing: ${c.code} tier ${tier} seed ${seed}: "${task.briefing}"`);
        }
        if (!task.answer) errors.push(`EMPTY ANSWER: ${c.code} tier ${tier}`);
        if (!task.rocketEffect?.property) errors.push(`MISSING rocketEffect: ${c.code} tier ${tier}`);
        if (!task.visual?.widget) errors.push(`MISSING visual: ${c.code} tier ${tier}`);
      } catch (err) {
        errors.push(`GENERATION ERROR: ${c.code} tier ${tier}: ${(err as Error).message}`);
      }
    }
  }
}

// 2. Every part category has certification tasks.
const parts: RocketPart[] = ["noseCone", "hull", "fuelTank", "engine", "fins", "payloadBay", "electronics", "booster"];
for (const part of parts) {
  const codes = criteriaForPart(part);
  if (codes.length === 0) errors.push(`PART WITHOUT TASKS: ${part}`);
}

// 3. Pre-flight checklist generates clean items.
try {
  const items = generateChecklist(createRng(1), 5);
  if (items.length !== 5) errors.push("CHECKLIST: did not generate 5 items");
  for (const item of items) {
    if (OP_SYMBOLS.test(item.briefing)) errors.push(`CHECKLIST OPERATION SYMBOL: "${item.briefing}"`);
  }
} catch (err) {
  errors.push(`CHECKLIST ERROR: ${(err as Error).message}`);
}

if (errors.length) {
  console.error(`❌ Coverage check FAILED with ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(" - " + e);
  process.exit(1);
}
console.log(`✅ Coverage check passed: ${CRITERIA.length}/81 criteria covered, all briefings clean, all ${parts.length} part categories have tasks.`);