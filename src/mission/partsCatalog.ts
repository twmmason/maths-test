import type { RocketPart } from "../curriculum/types";
import type { RocketDesign } from "../three/rocketDesign";

export interface PartVariant {
  id: string;
  part: RocketPart;
  name: string;
  description: string;
  stats: Partial<RocketDesign>;
  unlockLevel: 1 | 2 | 3;
  emoji: string;
}

export const PART_LABELS: Record<RocketPart, { label: string; emoji: string }> = {
  noseCone: { label: "Nose Cones", emoji: "📐" },
  hull: { label: "Hulls", emoji: "🛢️" },
  fuelTank: { label: "Fuel Tanks", emoji: "⛽" },
  engine: { label: "Engines", emoji: "🔧" },
  fins: { label: "Fins", emoji: "🪽" },
  payloadBay: { label: "Payload Bays", emoji: "📦" },
  electronics: { label: "Electronics", emoji: "🔌" },
  booster: { label: "Boosters", emoji: "🧨" },
};

export const PARTS_CATALOG: PartVariant[] = [
  // Nose cones
  { id: "stubby-cone", part: "noseCone", name: "Stubby Cone", emoji: "📐", unlockLevel: 1, description: "Forgiving and tough, but drags a little more.", stats: { noseAngle: 60, noseHeight: 1.2 } },
  { id: "standard-cone", part: "noseCone", name: "Pathfinder Cone", emoji: "📐", unlockLevel: 1, description: "The all-rounder every mission trusts.", stats: { noseAngle: 45, noseHeight: 1.6 } },
  { id: "needle-cone-mk2", part: "noseCone", name: "Needle Cone Mk2", emoji: "📐", unlockLevel: 2, description: "Low drag, but needs precise angle work.", stats: { noseAngle: 28, noseHeight: 2.2 } },
  { id: "ogive-cone", part: "noseCone", name: "Ogive Fairing", emoji: "📐", unlockLevel: 3, description: "Aerodynamic perfection — minimum drag at any speed.", stats: { noseAngle: 20, noseHeight: 2.8 } },
  // Hulls
  { id: "scout-hull", part: "hull", name: "Scout Hull", emoji: "🛢️", unlockLevel: 1, description: "Short and light — great for test hops.", stats: { hullHeight: 4.5, hullRadius: 0.8, hullPanels: 30 } },
  { id: "voyager-hull", part: "hull", name: "Voyager Hull", emoji: "🛢️", unlockLevel: 1, description: "Roomy standard hull with space for everything.", stats: { hullHeight: 6, hullRadius: 0.9, hullPanels: 40 } },
  { id: "titan-hull", part: "hull", name: "Titan Hull", emoji: "🛢️", unlockLevel: 2, description: "Huge fuel volume; heavy on the pad.", stats: { hullHeight: 8, hullRadius: 1.1, hullPanels: 60 } },
  { id: "leviathan-hull", part: "hull", name: "Leviathan Hull", emoji: "🛢️", unlockLevel: 3, description: "The deep-space workhorse — enormous fuel volume for interstellar burns.", stats: { hullHeight: 14, hullRadius: 1.4, hullPanels: 90 } },
  // Fuel tanks
  { id: "sprint-tank", part: "fuelTank", name: "Sprint Tank", emoji: "⛽", unlockLevel: 1, description: "Small, light, quick to fill.", stats: { tankFill: 0.6, fuelRatio: 2 } },
  { id: "endurance-tank", part: "fuelTank", name: "Endurance Tank", emoji: "⛽", unlockLevel: 1, description: "The long-burn workhorse.", stats: { tankFill: 0.75, fuelRatio: 2.5 } },
  { id: "cryo-tank", part: "fuelTank", name: "Cryo Tank Mk3", emoji: "⛽", unlockLevel: 3, description: "Super-chilled fuel packs more punch per litre.", stats: { tankFill: 0.9, fuelRatio: 2.8 } },
  // Engines
  { id: "hound", part: "engine", name: "Hound", emoji: "🔧", unlockLevel: 1, description: "Low thrust but featherweight.", stats: { engineCount: 2, thrustPerEngine: 150 } },
  { id: "collie", part: "engine", name: "Collie Triple", emoji: "🔧", unlockLevel: 1, description: "Balanced thrust from a three-pack.", stats: { engineCount: 3, thrustPerEngine: 200 } },
  { id: "mastiff", part: "engine", name: "Mastiff", emoji: "🔧", unlockLevel: 2, description: "High thrust, heavy — mind your mass budget.", stats: { engineCount: 4, thrustPerEngine: 260 } },
  { id: "raptor", part: "engine", name: "Raptor Cluster", emoji: "🔧", unlockLevel: 3, description: "Seven high-efficiency engines for deep-space missions.", stats: { engineCount: 7, thrustPerEngine: 400 } },
  // Fins
  { id: "dart-fins", part: "fins", name: "Dart Fins", emoji: "🪽", unlockLevel: 1, description: "Three light fins — just stable enough.", stats: { finCount: 3, finSymmetry: true } },
  { id: "cross-fins", part: "fins", name: "Cross Fins", emoji: "🪽", unlockLevel: 1, description: "Four-fin classic for rock-steady flight.", stats: { finCount: 4, finSymmetry: true } },
  { id: "grid-fins", part: "fins", name: "Grid Fins Mk2", emoji: "🪽", unlockLevel: 3, description: "Six computer-shaped fins for maximum stability.", stats: { finCount: 6, finSymmetry: true } },
  // Payload bays
  { id: "duo-bay", part: "payloadBay", name: "Duo Bay", emoji: "📦", unlockLevel: 1, description: "Two pods, light and simple.", stats: { payloadPods: 2, payloadPerPod: 50 } },
  { id: "quad-bay", part: "payloadBay", name: "Quad Bay", emoji: "📦", unlockLevel: 1, description: "Four balanced cargo pods.", stats: { payloadPods: 4, payloadPerPod: 60 } },
  { id: "hex-bay", part: "payloadBay", name: "Hex Cargo Ring", emoji: "📦", unlockLevel: 2, description: "Six pods for serious science hauls.", stats: { payloadPods: 6, payloadPerPod: 70 } },
  // Electronics
  { id: "basic-avionics", part: "electronics", name: "Basic Avionics", emoji: "🔌", unlockLevel: 1, description: "A trusty breadboard and status LEDs.", stats: { circuitsWired: 0, powerBalanced: false } },
  { id: "smart-avionics", part: "electronics", name: "Smart Avionics", emoji: "🔌", unlockLevel: 2, description: "Self-checking circuits with a bar-model display.", stats: { circuitsWired: 0, powerBalanced: false } },
  // Boosters
  { id: "sparrow-boosters", part: "booster", name: "Sparrow Boosters", emoji: "🧨", unlockLevel: 1, description: "A pair of solid kickers with a staging event.", stats: { boosterCount: 2 } },
  { id: "falcon-boosters", part: "booster", name: "Falcon Boosters", emoji: "🧨", unlockLevel: 2, description: "Four radial boosters for a mighty liftoff.", stats: { boosterCount: 4 } },
];

export const VARIANT_BY_ID: Record<string, PartVariant> = Object.fromEntries(PARTS_CATALOG.map((v) => [v.id, v]));

export function variantsFor(part: RocketPart): PartVariant[] {
  return PARTS_CATALOG.filter((v) => v.part === part);
}