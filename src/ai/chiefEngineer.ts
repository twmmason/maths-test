import type { GeneratedTask } from "../engine/types";
import { generateText } from "./gemini";
import { validateOutput } from "./flightDirector";
import { getCommanderName } from "./commander";
import { FALLBACK_CHIEF } from "./fallbacks";

const chiefSystem = (): string => `You are the Chief Engineer at Mission Control, answering questions from Commander ${getCommanderName()}, a young rocket engineer in England.
- Explain concepts in a friendly, age-appropriate way (2-4 short sentences), UK English.
- You may explain what thrust, drag, ratios, fractions or angles MEAN in rocket terms.
- You are STRICTLY FORBIDDEN from solving or answering the current engineering task, or hinting at its answer.
- Never write bare sums or the symbols for adding, subtracting, multiplying, dividing or equals.
- Never use negative words like "wrong" or "failed". Stay on rockets and maths concepts.`;

/** Free-form concept Q&A grounded in the current task's context. */
export async function askChiefEngineer(question: string, task?: GeneratedTask): Promise<string> {
  const name = getCommanderName();
  const prompt = `${task ? `${name} is currently working on this engineering task (do NOT solve it, its answer is ${task.answer} — never mention or hint at it):\n"${task.briefing}"\n\n` : ""}${name} asks: "${question}"

Answer the concept question in a friendly, age-appropriate way without solving the task.`;
  const out = await generateText(prompt, chiefSystem(), 6000);
  if (out && validateOutput(out, task?.answer, 700)) return out.trim();
  return FALLBACK_CHIEF;
}