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
  /** Altitude in km the launch must reach. For orbital destinations this IS
   * the destination; for beyond-Earth destinations it's the departure burn —
   * the speed/height needed for the injection that starts the real journey. */
  requiredAltitudeKm: number;
  /** Beyond-Earth destinations: the honest journey the injection buys you.
   * The launch game gets you OFF Earth; the cruise takes real distance+time. */
  journey?: { burnName: string; distance: string; cruise: string };
  blurb: string;
  skyColor: string;
}

export const DESTINATIONS: Destination[] = [
  // ── KS2 progression: realistic orbital milestones ──
  { id: "suborbital", name: "Suborbital Hop", emoji: "🚀", tiers: [1], unlockMastery: 0, requiredAltitudeKm: 100, blurb: "Punch through the atmosphere and see the sky turn black — your first taste of space.", skyColor: "#162040" },
  { id: "lowOrbit", name: "Low Earth Orbit", emoji: "🛸", tiers: [1], unlockMastery: 0, requiredAltitudeKm: 200, blurb: "Circle the Earth at 200 km — the International Space Station flies here.", skyColor: "#1b2a5e" },
  { id: "highOrbit", name: "High Earth Orbit", emoji: "🌍", tiers: [1, 2], unlockMastery: 0.05, requiredAltitudeKm: 400, blurb: "Rise above the satellites and see whole continents below.", skyColor: "#152050" },
  { id: "moon", name: "The Moon", emoji: "🌙", tiers: [1, 2], unlockMastery: 0.1, requiredAltitudeKm: 600, journey: { burnName: "trans-lunar injection", distance: "384,400 km", cruise: "3 days" }, blurb: "Grey seas, stark shadows, and Earth hanging in the black.", skyColor: "#3a3a4a" },
  { id: "mars", name: "Mars", emoji: "🔴", tiers: [2, 3], unlockMastery: 0.2, requiredAltitudeKm: 1000, journey: { burnName: "trans-Mars injection", distance: "225 million km", cruise: "7 months" }, blurb: "The rusty planet. Thin pink skies and a small, far sun.", skyColor: "#7a3a2a" },
  { id: "deepSpace", name: "Deep Space", emoji: "✨", tiers: [3], unlockMastery: 0.35, requiredAltitudeKm: 2000, journey: { burnName: "solar escape burn", distance: "6 billion km", cruise: "over a decade" }, blurb: "Beyond every map. Pure starlight and nebula colours.", skyColor: "#120a2a" },

  // ── KS3 Astronaut Academy destinations (gated on KS3 mastery) ──
  { id: "jupiterMoons", name: "Jupiter's Moons", emoji: "🪐", tiers: [1, 2], unlockMastery: 0, requiredAltitudeKm: 4000, keyStage: "ks3", journey: { burnName: "Jupiter transfer burn", distance: "778 million km", cruise: "5 years" }, blurb: "Io's volcanoes and Europa's ice — the Academy's first tour.", skyColor: "#5a4630" },
  { id: "saturnRings", name: "Saturn's Rings", emoji: "💫", tiers: [2], unlockMastery: 0.15, requiredAltitudeKm: 6000, keyStage: "ks3", journey: { burnName: "Saturn transfer burn", distance: "1.4 billion km", cruise: "7 years" }, blurb: "Thread the gap between a billion tumbling snowballs.", skyColor: "#6b5a3e" },
  { id: "interstellarProbe", name: "Interstellar Probe", emoji: "🌌", tiers: [2, 3], unlockMastery: 0.3, requiredAltitudeKm: 9000, keyStage: "ks3", journey: { burnName: "solar-system escape burn", distance: "18 billion km to the heliopause", cruise: "35 years" }, blurb: "Past the heliopause, into the space between the stars.", skyColor: "#0a0620" },
  { id: "generationShip", name: "Generation Ship", emoji: "🌠", tiers: [3], unlockMastery: 0.5, requiredAltitudeKm: 11000, keyStage: "ks3", journey: { burnName: "interstellar departure burn", distance: "4.2 light-years", cruise: "centuries" }, blurb: "The Academy capstone: a city that sails for centuries.", skyColor: "#050313" },
];

export const DESTINATION_BY_ID: Record<string, Destination> = Object.fromEntries(DESTINATIONS.map((d) => [d.id, d]));