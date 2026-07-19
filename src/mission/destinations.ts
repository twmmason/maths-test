export interface Destination {
  id: string;
  name: string;
  emoji: string;
  /** Difficulty tiers this destination pulls tasks from. */
  tiers: (1 | 2 | 3)[];
  /** Mastery fraction (0..1) required to unlock. */
  unlockMastery: number;
  /** Altitude in km the flight must reach to count as arrival. */
  requiredAltitudeKm: number;
  blurb: string;
  skyColor: string;
}

export const DESTINATIONS: Destination[] = [
  { id: "lowOrbit", name: "Low Orbit", emoji: "🛸", tiers: [1], unlockMastery: 0, requiredAltitudeKm: 150, blurb: "Skim the top of the sky and see the Earth curve below.", skyColor: "#1b2a5e" },
  { id: "moon", name: "The Moon", emoji: "🌙", tiers: [1, 2], unlockMastery: 0.1, requiredAltitudeKm: 400, blurb: "Grey seas, stark shadows, and Earth hanging in the black.", skyColor: "#3a3a4a" },
  { id: "mars", name: "Mars", emoji: "🔴", tiers: [2, 3], unlockMastery: 0.3, requiredAltitudeKm: 800, blurb: "The rusty planet. Thin pink skies and a small, far sun.", skyColor: "#7a3a2a" },
  { id: "deepSpace", name: "Deep Space", emoji: "✨", tiers: [3], unlockMastery: 0.5, requiredAltitudeKm: 1500, blurb: "Beyond every map. Pure starlight and nebula colours.", skyColor: "#120a2a" },
];

export const DESTINATION_BY_ID: Record<string, Destination> = Object.fromEntries(DESTINATIONS.map((d) => [d.id, d]));