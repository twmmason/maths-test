/**
 * pnpm verify gate: exits non-zero if any of the 146 criteria (81 KS2 RTP +
 * 65 KS3 Astronaut Academy) lacks a working template, if any generated
 * briefing contains an operation symbol (§10 rule 4 — KS3 notation lives in
 * widgets, never briefings), or if any part category has no tasks.
 */
import { CRITERIA, KS2_CRITERIA, KS3_CRITERIA } from "../src/curriculum/criteria";
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

// 2. Every part category has certification tasks in BOTH key stages
// (boosters reuse engine templates and Academy fit-outs are optional there).
const parts: RocketPart[] = ["noseCone", "hull", "fuelTank", "engine", "fins", "payloadBay", "electronics", "booster"];
for (const part of parts) {
  if (criteriaForPart(part, "ks2").length === 0) errors.push(`PART WITHOUT KS2 TASKS: ${part}`);
  if (criteriaForPart(part, "ks3").length === 0) errors.push(`PART WITHOUT KS3 TASKS: ${part}`);
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
const ks2Covered = KS2_CRITERIA.filter((c) => TEMPLATES[c.code]).length;
const ks3Covered = KS3_CRITERIA.filter((c) => TEMPLATES[c.code]).length;
console.log(`KS2 ${ks2Covered}/81 ${ks2Covered === 81 ? "✅" : "❌"}  KS3 ${ks3Covered}/65 ${ks3Covered === 65 ? "✅" : "❌"}`);
console.log(`✅ Coverage check passed: ${CRITERIA.length}/146 criteria covered, all briefings clean, all ${parts.length} part categories have tasks.`);