import type { GeneratedTask } from "../engine/types";
import { generateText } from "./gemini";
import { flightDirectorSystem, validateParaphrase } from "./flightDirector";

const cache = new Map<string, string>();

/**
 * Paraphrase a briefing for variety, preserving every number/unit and the
 * question. Ships the original template text if validation fails.
 */
export async function paraphraseBriefing(task: GeneratedTask): Promise<string> {
  const cached = cache.get(task.id);
  if (cached) return cached;

  const prompt = `Rewrite this rocket engineering briefing with fresh wording for variety. Rules:
- Keep EVERY number, unit and fraction exactly as written (same digits).
- Keep it a question about the same engineering situation.
- Never use the symbols for adding, subtracting, multiplying, dividing or equals.
- Same length or shorter. Reply with ONLY the rewritten briefing.

Briefing: "${task.briefing}"`;

  const out = await generateText(prompt, flightDirectorSystem());
  if (out && validateParaphrase(task.briefing, out.trim())) {
    cache.set(task.id, out.trim());
    return out.trim();
  }
  return task.briefing;
}