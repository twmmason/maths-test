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
  { id: "biconic-cone", part: "noseCone", name: "Biconic Re-entry Cap", emoji: "📐", unlockLevel: 2, description: "Twin-angle shield that shrugs off hypersonic heating.", stats: { noseAngle: 33, noseHeight: 2.4 } },
  { id: "starfire-cone", part: "noseCone", name: "Starfire Aeroshell", emoji: "📐", unlockLevel: 3, description: "Interstellar-grade shroud — razor-thin drag at relativistic dash speeds.", stats: { noseAngle: 14, noseHeight: 3.6 } },
  // Hulls
  { id: "scout-hull", part: "hull", name: "Scout Hull", emoji: "🛢️", unlockLevel: 1, description: "Short and light — great for test hops.", stats: { hullHeight: 4.5, hullRadius: 0.8, hullPanels: 30 } },
  { id: "voyager-hull", part: "hull", name: "Voyager Hull", emoji: "🛢️", unlockLevel: 1, description: "Roomy standard hull with space for everything.", stats: { hullHeight: 6, hullRadius: 0.9, hullPanels: 40 } },
  { id: "titan-hull", part: "hull", name: "Titan Hull", emoji: "🛢️", unlockLevel: 2, description: "Huge fuel volume; heavy on the pad.", stats: { hullHeight: 8, hullRadius: 1.1, hullPanels: 60 } },
  { id: "leviathan-hull", part: "hull", name: "Leviathan Hull", emoji: "🛢️", unlockLevel: 3, description: "The deep-space workhorse — enormous fuel volume for interstellar burns.", stats: { hullHeight: 14, hullRadius: 1.4, hullPanels: 90 } },
  { id: "colossus-hull", part: "hull", name: "Colossus Core", emoji: "🛢️", unlockLevel: 2, description: "Wide-body tank section with serious structural margin.", stats: { hullHeight: 10, hullRadius: 1.25, hullPanels: 74 } },
  { id: "starliner-hull", part: "hull", name: "Starliner Ark", emoji: "🛢️", unlockLevel: 3, description: "Colony-class hull — colossal tankage for a one-way trip to the stars.", stats: { hullHeight: 18, hullRadius: 1.7, hullPanels: 120 } },
  // Fuel tanks
  { id: "sprint-tank", part: "fuelTank", name: "Sprint Tank", emoji: "⛽", unlockLevel: 1, description: "Small, light, quick to fill.", stats: { tankFill: 0.6, fuelRatio: 2 } },
  { id: "endurance-tank", part: "fuelTank", name: "Endurance Tank", emoji: "⛽", unlockLevel: 1, description: "The long-burn workhorse.", stats: { tankFill: 0.75, fuelRatio: 2.5 } },
  { id: "hydrolox-tank", part: "fuelTank", name: "Hydrolox Tank", emoji: "⛽", unlockLevel: 2, description: "Hydrogen-oxygen mix — lighter fuel, cleaner burn.", stats: { tankFill: 0.82, fuelRatio: 2.65 } },
  { id: "cryo-tank", part: "fuelTank", name: "Cryo Tank Mk3", emoji: "⛽", unlockLevel: 3, description: "Super-chilled fuel packs more punch per litre.", stats: { tankFill: 0.9, fuelRatio: 2.8 } },
  { id: "antimatter-tank", part: "fuelTank", name: "Antimatter Cell", emoji: "⛽", unlockLevel: 3, description: "Magnetically-bottled antimatter — the ultimate energy density.", stats: { tankFill: 0.98, fuelRatio: 3.4 } },
  // Engines
  { id: "hound", part: "engine", name: "Hound", emoji: "🔧", unlockLevel: 1, description: "Low thrust but featherweight.", stats: { engineCount: 2, thrustPerEngine: 150 } },
  { id: "collie", part: "engine", name: "Collie Triple", emoji: "🔧", unlockLevel: 1, description: "Balanced thrust from a three-pack.", stats: { engineCount: 3, thrustPerEngine: 200 } },
  { id: "mastiff", part: "engine", name: "Mastiff", emoji: "🔧", unlockLevel: 2, description: "High thrust, heavy — mind your mass budget.", stats: { engineCount: 4, thrustPerEngine: 260 } },
  { id: "raptor", part: "engine", name: "Raptor Cluster", emoji: "🔧", unlockLevel: 3, description: "Seven high-efficiency engines for deep-space missions.", stats: { engineCount: 7, thrustPerEngine: 400 } },
  { id: "ion-drive", part: "engine", name: "Ion Drive Array", emoji: "🔧", unlockLevel: 2, description: "Gentle but tireless thrust — sips fuel on long cruises.", stats: { engineCount: 5, thrustPerEngine: 220 } },
  { id: "fusion-torch", part: "engine", name: "Fusion Torch", emoji: "🔧", unlockLevel: 3, description: "A miniature star in a bottle — nine engines of pure interstellar shove.", stats: { engineCount: 9, thrustPerEngine: 620 } },
  // Fins (higher levels are physically bigger — finSpan scales the mesh)
  { id: "dart-fins", part: "fins", name: "Dart Fins", emoji: "🪽", unlockLevel: 1, description: "Three light fins — just stable enough.", stats: { finCount: 3, finSymmetry: true, finSpan: 0.85 } },
  { id: "cross-fins", part: "fins", name: "Cross Fins", emoji: "🪽", unlockLevel: 1, description: "Four-fin classic for rock-steady flight.", stats: { finCount: 4, finSymmetry: true, finSpan: 1 } },
  { id: "swept-fins", part: "fins", name: "Swept Delta Fins", emoji: "🪽", unlockLevel: 2, description: "Five big swept fins tuned for high-speed stability.", stats: { finCount: 5, finSymmetry: true, finSpan: 1.25 } },
  { id: "grid-fins", part: "fins", name: "Grid Fins Mk2", emoji: "🪽", unlockLevel: 3, description: "Six large computer-shaped fins for maximum stability.", stats: { finCount: 6, finSymmetry: true, finSpan: 1.4 } },
  { id: "active-fins", part: "fins", name: "Active Canard Array", emoji: "🪽", unlockLevel: 3, description: "Eight huge gyro-steered vanes — the vehicle practically flies itself.", stats: { finCount: 8, finSymmetry: true, finSpan: 1.6 } },

  // Payload bays
  { id: "duo-bay", part: "payloadBay", name: "Duo Bay", emoji: "📦", unlockLevel: 1, description: "Two pods, light and simple.", stats: { payloadPods: 2, payloadPerPod: 50 } },
  { id: "quad-bay", part: "payloadBay", name: "Quad Bay", emoji: "📦", unlockLevel: 1, description: "Four balanced cargo pods.", stats: { payloadPods: 4, payloadPerPod: 60 } },
  { id: "hex-bay", part: "payloadBay", name: "Hex Cargo Ring", emoji: "📦", unlockLevel: 2, description: "Six pods for serious science hauls.", stats: { payloadPods: 6, payloadPerPod: 70 } },
  { id: "octo-bay", part: "payloadBay", name: "Octo Science Ring", emoji: "📦", unlockLevel: 3, description: "Eight instrument pods for a full deep-space laboratory.", stats: { payloadPods: 8, payloadPerPod: 85 } },
  { id: "probe-bay", part: "payloadBay", name: "Probe Dispenser", emoji: "📦", unlockLevel: 3, description: "Twelve micro-probe tubes to seed an entire system.", stats: { payloadPods: 12, payloadPerPod: 40 } },
  // Electronics
  { id: "basic-avionics", part: "electronics", name: "Basic Avionics", emoji: "🔌", unlockLevel: 1, description: "A trusty breadboard and status LEDs.", stats: { circuitsWired: 0, powerBalanced: false } },
  { id: "smart-avionics", part: "electronics", name: "Smart Avionics", emoji: "🔌", unlockLevel: 2, description: "Self-checking circuits with a bar-model display.", stats: { circuitsWired: 0, powerBalanced: false } },
  { id: "autopilot-avionics", part: "electronics", name: "Autopilot Core", emoji: "🔌", unlockLevel: 2, description: "Guidance computer that trims the ascent for you.", stats: { circuitsWired: 0, powerBalanced: false } },
  { id: "quantum-avionics", part: "electronics", name: "Quantum Flight Computer", emoji: "🔌", unlockLevel: 3, description: "Redundant quantum core — flawless nav across light-years.", stats: { circuitsWired: 0, powerBalanced: false } },
  // Boosters (higher levels are taller & fatter — boosterSize scales the mesh)
  { id: "sparrow-boosters", part: "booster", name: "Sparrow Boosters", emoji: "🧨", unlockLevel: 1, description: "A pair of solid kickers with a staging event.", stats: { boosterCount: 2, boosterSize: 1 } },
  { id: "falcon-boosters", part: "booster", name: "Falcon Boosters", emoji: "🧨", unlockLevel: 2, description: "Four bigger radial boosters for a mighty liftoff.", stats: { boosterCount: 4, boosterSize: 1.25 } },
  { id: "griffin-boosters", part: "booster", name: "Griffin Boosters", emoji: "🧨", unlockLevel: 3, description: "Six tall strap-on boosters — earth-shaking liftoff thrust.", stats: { boosterCount: 6, boosterSize: 1.5 } },
  { id: "nova-boosters", part: "booster", name: "Nova Booster Ring", emoji: "🧨", unlockLevel: 3, description: "Eight towering high-impulse boosters to fling the heaviest arks off the pad.", stats: { boosterCount: 8, boosterSize: 1.8 } },
];

/** Cosmetic hull material unlocked by overall hull mastery level. Attaching a
 *  hull variant sets the whole vehicle's finish (aluminium→titanium→carbon→gold). */
export const MATERIAL_BY_HULL: Record<string, RocketDesign["material"]> = {
  "scout-hull": "aluminium",
  "voyager-hull": "aluminium",
  "titan-hull": "titanium",
  "colossus-hull": "titanium",
  "leviathan-hull": "carbon",
  "starliner-hull": "gold",
};



export const VARIANT_BY_ID: Record<string, PartVariant> = Object.fromEntries(PARTS_CATALOG.map((v) => [v.id, v]));

export function variantsFor(part: RocketPart): PartVariant[] {
  return PARTS_CATALOG.filter((v) => v.part === part);
}