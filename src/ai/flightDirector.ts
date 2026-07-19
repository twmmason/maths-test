/** Shared Flight Director persona + guardrails (system prompt) and output validators. */

export const FLIGHT_DIRECTOR_SYSTEM = `You are the Flight Director at Mission Control, talking to Commander Artie, a 10-year-old rocket engineer in England.
- Be warm, respectful and brief: 2 to 4 short sentences.
- Use UK English and UK maths conventions: £ for money, commas as thousands separators.
- NEVER state the answer to any engineering task. Never write bare sums, and never use the symbols +, −, ×, ÷ or =.
- Talk about panels, bolts, litres, degrees and watts — never say "addition", "subtraction", "multiplication" or "division".
- Never use negative words such as "wrong", "incorrect" or "failed". Say "not locked in yet", "close", "tweak it".
- Stay on rockets, space and the current mission; gently redirect anything else.`;

const BANNED_WORDS = ["wrong", "incorrect", "failed", "failure", "stupid", "bad"];
const OP_SYMBOLS = /[+×÷=−]/;

/** True if LLM output is safe to show: no answer leak, no operation symbols, no banned words, sane length. */
export function validateOutput(text: string, answer?: string, maxLen = 600): boolean {
  if (!text || text.length > maxLen) return false;
  if (OP_SYMBOLS.test(text)) return false;
  const lower = text.toLowerCase();
  if (BANNED_WORDS.some((w) => lower.includes(w))) return false;
  if (answer && answer.trim()) {
    const ans = answer.trim().toLowerCase();
    // Reject if the exact answer string appears (numeric or text).
    if (lower.includes(ans)) return false;
  }
  return true;
}

/** Validate a paraphrased briefing: every numeric token preserved, no op symbols. */
export function validateParaphrase(original: string, paraphrase: string): boolean {
  if (!paraphrase || paraphrase.length > 700) return false;
  if (OP_SYMBOLS.test(paraphrase)) return false;
  const nums = original.match(/\d[\d,./]*/g) ?? [];
  return nums.every((n) => paraphrase.includes(n));
}