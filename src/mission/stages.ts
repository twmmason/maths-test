import type { RocketPart } from "../curriculum/types";

export interface StageInfo {
  part: RocketPart;
  label: string;
  emoji: string;
  attachment: "stack" | "radial";
  /** Camera focus height fraction of the rocket (0 = base, 1 = tip). */
  focus: number;
}

/** Stage definitions in default stack order (assembly itself is free-order). */
export const STAGES: StageInfo[] = [
  { part: "engine", label: "Engine", emoji: "🔧", attachment: "stack", focus: 0.05 },
  { part: "fuelTank", label: "Fuel Tank", emoji: "⛽", attachment: "stack", focus: 0.3 },
  { part: "hull", label: "Hull", emoji: "🛢️", attachment: "stack", focus: 0.5 },
  { part: "payloadBay", label: "Payload Bay", emoji: "📦", attachment: "stack", focus: 0.7 },
  { part: "electronics", label: "Electronics", emoji: "🔌", attachment: "radial", focus: 0.6 },
  { part: "fins", label: "Fins", emoji: "🪽", attachment: "radial", focus: 0.15 },
  { part: "booster", label: "Boosters", emoji: "🧨", attachment: "radial", focus: 0.2 },
  { part: "noseCone", label: "Nose Cone", emoji: "📐", attachment: "stack", focus: 0.95 },
];

export const STAGE_BY_PART: Record<RocketPart, StageInfo> = Object.fromEntries(
  STAGES.map((s) => [s.part, s]),
) as Record<RocketPart, StageInfo>;

/** Parts required for a launch (boosters are optional extras). */
export const REQUIRED_PARTS: RocketPart[] = ["noseCone", "hull", "fuelTank", "engine", "fins", "payloadBay", "electronics"];