import { generateText } from "./gemini";
import { flightDirectorSystem, validateOutput } from "./flightDirector";
import { getCommanderName } from "./commander";
import { FALLBACK_DEBRIEF } from "./fallbacks";

export interface DebriefStats {
  destinationName: string;
  siteName?: string;
  tasksCorrect: number;
  tasksTotal: number;
  maxAltitudeKm: number;
  reachedDestination: boolean;
  events: string[];
  struggledOffPad: boolean;
  tumbled: boolean;
}

/** After-action Flight Director narration (3-4 sentences, personal, specific). */
export async function narrateDebrief(stats: DebriefStats): Promise<string> {
  const fallback = FALLBACK_DEBRIEF(stats.destinationName, stats.tasksCorrect, stats.tasksTotal, stats.maxAltitudeKm);
  const prompt = `Write the Flight Director's after-action debrief for Commander ${getCommanderName()}. Mission facts (all already computed — do not invent numbers):
- Destination: ${stats.destinationName}${stats.siteName ? `, launched from ${stats.siteName}` : ""}
- Engineering tasks certified: ${stats.tasksCorrect} of ${stats.tasksTotal}
- Peak altitude: ${stats.maxAltitudeKm} km
- Reached destination: ${stats.reachedDestination ? "yes" : "not this time"}
- Flight notes: ${stats.events.slice(0, 4).join("; ")}
${stats.struggledOffPad ? "- The rocket climbed slowly off the pad (low thrust-to-weight)." : ""}
${stats.tumbled ? "- The rocket tumbled from too few fins." : ""}

3-4 sentences max. Reference at least one specific thing from the flight notes. Warm and encouraging, and end looking forward to the next mission.`;

  const out = await generateText(prompt, flightDirectorSystem(), 6000);
  if (out && validateOutput(out, undefined, 800)) return out.trim();
  return fallback;
}

/** One-line milestone flavour (patch / streak / upgrade). */
export async function milestoneLine(kind: string, detail: string): Promise<string | null> {
  const prompt = `Commander ${getCommanderName()} just earned a milestone: ${kind} — ${detail}. Write ONE short celebratory line from the Flight Director (max 20 words).`;
  const out = await generateText(prompt, flightDirectorSystem(), 3500);
  if (out && validateOutput(out, undefined, 200)) return out.trim();
  return null;
}