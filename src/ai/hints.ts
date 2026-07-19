import type { GeneratedTask } from "../engine/types";
import { generateText } from "./gemini";
import { FLIGHT_DIRECTOR_SYSTEM, validateOutput } from "./flightDirector";

const cache = new Map<string, string>();

/**
 * Adaptive hint: diagnoses Artie's actual wrong answer and gives ONE gentle
 * scaffolded nudge. Falls back to the template's static hint on any failure.
 */
export async function getAdaptiveHint(
  task: GeneratedTask,
  wrongAnswer: string,
  hintIndex: number,
): Promise<string> {
  const staticHint = task.hints[Math.min(hintIndex, task.hints.length - 1)] ?? "Check the readout carefully and try again.";
  const key = `${task.id}|${wrongAnswer}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const prompt = `Commander Artie is working on this engineering task:
"${task.briefing}"

The correct working (do NOT reveal any of this):
${task.workedSteps.join(" ")}
Correct answer (NEVER mention it): ${task.answer}

Artie just answered: "${wrongAnswer}"

Diagnose the likely slip in his thinking from that exact answer, then give ONE gentle, scaffolded nudge (1-2 sentences) that helps him find the method himself. Do not state the answer or any part of it.`;

  const out = await generateText(prompt, FLIGHT_DIRECTOR_SYSTEM);
  if (out && validateOutput(out, task.answer)) {
    cache.set(key, out.trim());
    return out.trim();
  }
  return staticHint;
}