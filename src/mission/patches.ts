import type { Profile, MissionRecord, Attempt } from "../db/db";
import { computeMastery, strandMasteryCounts } from "../engine/mastery";
import { STRANDS, KS3_STRANDS } from "../curriculum/criteria";

export interface MissionPatch {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

export const PATCHES: MissionPatch[] = [
  { id: "first-launch", name: "First Flight", emoji: "🚀", description: "Complete your first launch" },
  { id: "moon-mission", name: "Moonshot", emoji: "🌙", description: "Fly a mission to the Moon" },
  { id: "mars-mission", name: "Red Rover", emoji: "🔴", description: "Fly a mission to Mars" },
  { id: "deep-space", name: "Star Sailor", emoji: "✨", description: "Fly a mission to Deep Space" },
  { id: "perfect-mission", name: "Flawless Flight", emoji: "💯", description: "Complete a mission with every task certified first time" },
  { id: "streak-3", name: "Hat Trick", emoji: "🔥", description: "Launch on 3 days in a row" },
  { id: "streak-5", name: "Full Week Ahead", emoji: "🌟", description: "Launch on 5 days in a row" },
  { id: "strand-npv", name: "Place Value Pro", emoji: "🛢️", description: "Master an entire strand: Number & Place Value" },
  { id: "strand-nf", name: "Fact Finder", emoji: "🔩", description: "Master an entire strand: Number Facts" },
  { id: "strand-as", name: "Budget Balancer", emoji: "⚖️", description: "Master an entire strand: Addition & Subtraction" },
  { id: "strand-md", name: "Thrust Master", emoji: "🔧", description: "Master an entire strand: Multiplication & Division" },
  { id: "strand-f", name: "Fraction Fueller", emoji: "⛽", description: "Master an entire strand: Fractions" },
  { id: "strand-g", name: "Geometry Guru", emoji: "📐", description: "Master an entire strand: Geometry" },
  { id: "ten-missions", name: "Veteran Commander", emoji: "🎖️", description: "Complete 10 missions" },
  // ── Wrench Time patches ──
  { id: "failure-fix", name: "Failure Is Not An Option", emoji: "🧯", description: "Lose a vehicle, investigate the crash, fix the maths and fly a nominal mission" },
  { id: "green-board", name: "Green Board", emoji: "🟢", description: "Fly 3 nominal launches in a row — unlocks cosmetic liveries" },
  // ── Astronaut Academy patches (KS3) ──
  { id: "academy-first", name: "Academy Cadet", emoji: "🎓", description: "Fly your first Astronaut Academy mission" },
  { id: "jupiter-moons", name: "Moons of Jupiter", emoji: "🪐", description: "Fly a mission to Jupiter's Moons" },
  { id: "saturn-rings", name: "Ring Runner", emoji: "💫", description: "Fly a mission to Saturn's Rings" },
  { id: "interstellar", name: "Star Voyager", emoji: "🌌", description: "Fly the Interstellar Probe" },
  { id: "generation-ship", name: "Century Sailor", emoji: "🌠", description: "Launch the Generation Ship — the Academy capstone" },
  { id: "strand-ks3n", name: "Number Scientist", emoji: "⚗️", description: "Master the whole KS3 Number domain" },
  { id: "strand-ks3a", name: "Algebra Ace", emoji: "🖥️", description: "Master the whole KS3 Algebra domain" },
  { id: "strand-ks3r", name: "Proportion Planner", emoji: "🗺️", description: "Master the whole KS3 Ratio & Proportion domain" },
  { id: "strand-ks3g", name: "Pythagoras Prize", emoji: "📐", description: "Master the whole KS3 Geometry & Measures domain" },
  { id: "strand-ks3p", name: "Risk Analyst", emoji: "🎲", description: "Master the whole KS3 Probability domain" },
  { id: "strand-ks3s", name: "Data Scientist", emoji: "📊", description: "Master the whole KS3 Statistics domain" },
];

export const PATCH_BY_ID: Record<string, MissionPatch> = Object.fromEntries(PATCHES.map((p) => [p.id, p]));

const STRAND_TOTALS: Record<string, number> = { NPV: 21, NF: 11, AS: 9, MD: 16, F: 13, G: 11, KS3N: 16, KS3A: 16, KS3R: 10, KS3G: 16, KS3P: 4, KS3S: 3 };

/** Return newly earned patch ids given current state. */
export function evaluatePatches(
  profile: Profile,
  missions: MissionRecord[],
  attempts: Attempt[],
  latest?: { destinationId: string; perfect: boolean; outcome?: string },
): string[] {
  const earned = new Set(profile.patches);
  const fresh: string[] = [];
  const award = (id: string) => {
    if (!earned.has(id)) {
      earned.add(id);
      fresh.push(id);
    }
  };

  if (missions.length >= 1) award("first-launch");
  if (missions.length >= 10) award("ten-missions");
  if (latest?.destinationId === "moon" || missions.some((m) => m.destinationId === "moon")) award("moon-mission");
  if (latest?.destinationId === "mars" || missions.some((m) => m.destinationId === "mars")) award("mars-mission");
  if (latest?.destinationId === "deepSpace" || missions.some((m) => m.destinationId === "deepSpace")) award("deep-space");
  const ACADEMY_DESTS = ["jupiterMoons", "saturnRings", "interstellarProbe", "generationShip"];
  const flewAcademy = (id: string) => latest?.destinationId === id || missions.some((m) => m.destinationId === id);
  if (ACADEMY_DESTS.some(flewAcademy)) award("academy-first");
  if (flewAcademy("jupiterMoons")) award("jupiter-moons");
  if (flewAcademy("saturnRings")) award("saturn-rings");
  if (flewAcademy("interstellarProbe")) award("interstellar");
  if (flewAcademy("generationShip")) award("generation-ship");
  if (latest?.perfect) award("perfect-mission");
  if (profile.launchStreak >= 3) award("streak-3");
  if (profile.launchStreak >= 5) award("streak-5");

  // ── Wrench Time: crash-investigation learning loop ──
  // "Failure Is Not An Option": a nominal flight AFTER a lost vehicle / abort.
  const hadFailure = missions.some((m) => m.outcome === "lostVehicle" || m.outcome === "padAbort");
  if (latest?.outcome === "nominal" && hadFailure) award("failure-fix");
  // "Green Board": 3 consecutive nominal launches (including this one).
  if (latest?.outcome === "nominal") {
    // `missions` already includes the just-recorded flight.
    const recent = [...missions].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);
    if (recent.length === 3 && recent.every((m) => m.outcome === "nominal")) award("green-board");
  }

  const mastery = computeMastery(attempts);
  const counts = strandMasteryCounts(mastery);
  for (const s of [...STRANDS, ...KS3_STRANDS]) {
    if (counts[s.id] >= (STRAND_TOTALS[s.id] ?? Infinity)) award(`strand-${s.id.toLowerCase()}`);
  }
  return fresh;
}