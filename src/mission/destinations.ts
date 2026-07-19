export interface Destination {
  id: string;
  name: string;
  emoji: string;
  /** Difficulty tiers this destination pulls tasks from. */
  tiers: (1 | 2 | 3)[];
  /** Mastery fraction (0..1) required to unlock — measured against this
   * destination's key stage pool (KS2 for the core four, KS3 for Academy). */
  unlockMastery: number;
  /** Academy destinations pull KS3 fit-outs and gate on KS3 mastery. */
  keyStage?: "ks2" | "ks3";
  /** Altitude in km the flight must reach to count as arrival. */
  requiredAltitudeKm: number;
  blurb: string;
  skyColor: string;
}

export const DESTINATIONS: Destination[] = [
  { id: "lowOrbit", name: "Low Orbit", emoji: "🛸", tiers: [1], unlockMastery: 0, requiredAltitudeKm: 150, blurb: "Skim the top of the sky and see the Earth curve below.", skyColor: "#1b2a5e" },
  { id: "moon", name: "The Moon", emoji: "🌙", tiers: [1, 2], unlockMastery: 0, requiredAltitudeKm: 400, blurb: "Grey seas, stark shadows, and Earth hanging in the black.", skyColor: "#3a3a4a" },
  { id: "mars", name: "Mars", emoji: "🔴", tiers: [2, 3], unlockMastery: 0.1, requiredAltitudeKm: 800, blurb: "The rusty planet. Thin pink skies and a small, far sun.", skyColor: "#7a3a2a" },
  { id: "deepSpace", name: "Deep Space", emoji: "✨", tiers: [3], unlockMastery: 0.25, requiredAltitudeKm: 1500, blurb: "Beyond every map. Pure starlight and nebula colours.", skyColor: "#120a2a" },
  // ── Astronaut Academy destinations (KS3 fit-outs, gated on KS3 mastery) ──
  { id: "jupiterMoons", name: "Jupiter's Moons", emoji: "🪐", tiers: [1, 2], unlockMastery: 0, requiredAltitudeKm: 3000, keyStage: "ks3", blurb: "Io's volcanoes and Europa's ice — the Academy's first tour.", skyColor: "#5a4630" },
  { id: "saturnRings", name: "Saturn's Rings", emoji: "💫", tiers: [2], unlockMastery: 0.15, requiredAltitudeKm: 5000, keyStage: "ks3", blurb: "Thread the gap between a billion tumbling snowballs.", skyColor: "#6b5a3e" },
  { id: "interstellarProbe", name: "Interstellar Probe", emoji: "🌌", tiers: [2, 3], unlockMastery: 0.3, requiredAltitudeKm: 9000, keyStage: "ks3", blurb: "Past the heliopause, into the space between the stars.", skyColor: "#0a0620" },
  { id: "generationShip", name: "Generation Ship", emoji: "🌠", tiers: [3], unlockMastery: 0.5, requiredAltitudeKm: 15000, keyStage: "ks3", blurb: "The Academy capstone: a city that sails for centuries.", skyColor: "#050313" },
];

export const DESTINATION_BY_ID: Record<string, Destination> = Object.fromEntries(DESTINATIONS.map((d) => [d.id, d]));