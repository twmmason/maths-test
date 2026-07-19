/** Static text used when Gemini is offline / no key / validation fails. */

export const FALLBACK_CORRECT = [
  "Locked in! ✅ Systems nominal, Commander.",
  "Spot on, Commander — that part is flight-ready.",
  "Beautiful engineering. Certified and locked in! ✅",
  "Mission Control confirms: readings are perfect.",
];

export const FALLBACK_NUDGE = [
  "Almost — check the readout and try again, Commander.",
  "Close! Take another look at the numbers on the panel.",
  "Not locked in yet — tweak it and have another go.",
];

export const FALLBACK_DEBRIEF = (destination: string, correct: number, total: number, altitude: number) =>
  `Commander, that was a real mission. You certified ${correct} of ${total} engineering tasks and the rocket reached ${altitude} km on its way toward ${destination}. Every reading you worked out flew with us today — see you in the VAB for the next one.`;

export const FALLBACK_CHIEF =
  "Good question, Commander. The Chief Engineer is down in the workshop right now — check the engineering manual on this task, or ask me again in a moment.";

export const FALLBACK_MILESTONE = [
  "Another milestone, Commander — the whole programme is proud of you.",
  "Mission Control is cheering down here. Keep building!",
  "That rocket of yours gets better every single day.",
];

export function pickFallback(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}