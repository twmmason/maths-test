import type { KeyStage, RocketPart } from "../curriculum/types";
import { PART_STRANDS } from "../engine/mastery";
import { CRITERIA } from "../curriculum/criteria";

export { PART_STRANDS };

/** All criterion codes certified through a given rocket part for one key
 * stage (default KS2, so pre-Academy behaviour is unchanged).
 * Boosters reuse the engine's NF+MD templates (booster context). */
export function criteriaForPart(part: RocketPart, keyStage: KeyStage = "ks2"): string[] {
  const effective = part === "booster" ? "engine" : part;
  return CRITERIA.filter((c) => c.part === effective && c.keyStage === keyStage).map((c) => c.code);
}

export const PART_MATERIALS: Record<RocketPart, { color: string; roughness: number; metalness: number; opacity?: number }> = {
  noseCone: { color: "#e8ecff", roughness: 0.3, metalness: 0.4 },
  hull: { color: "#aab7f0", roughness: 0.5, metalness: 0.3 },
  fuelTank: { color: "#22d3ee", roughness: 0.2, metalness: 0.1, opacity: 0.55 },
  engine: { color: "#5b6690", roughness: 0.4, metalness: 0.6 },
  fins: { color: "#f472b6", roughness: 0.5, metalness: 0.2 },
  payloadBay: { color: "#a78bfa", roughness: 0.4, metalness: 0.3 },
  electronics: { color: "#34d399", roughness: 0.35, metalness: 0.5 },
  booster: { color: "#fbbf24", roughness: 0.45, metalness: 0.4 },
};

/** Cosmetic upgrade tint per level (Lv2 shinier, Lv3 shiniest). */
export function levelMaterial(base: { color: string; roughness: number; metalness: number }, level: 1 | 2 | 3) {
  return {
    ...base,
    roughness: Math.max(0.08, base.roughness - (level - 1) * 0.12),
    metalness: Math.min(1, base.metalness + (level - 1) * 0.2),
  };
}