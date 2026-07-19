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
  noseCone: { color: "#d4daf0", roughness: 0.18, metalness: 0.65 },
  hull: { color: "#8896cc", roughness: 0.28, metalness: 0.55 },
  fuelTank: { color: "#22d3ee", roughness: 0.12, metalness: 0.15, opacity: 0.55 },
  engine: { color: "#4a5580", roughness: 0.22, metalness: 0.78 },
  fins: { color: "#e0518a", roughness: 0.3, metalness: 0.35 },
  payloadBay: { color: "#9575d4", roughness: 0.25, metalness: 0.45 },
  electronics: { color: "#2bb880", roughness: 0.2, metalness: 0.6 },
  booster: { color: "#e5a818", roughness: 0.25, metalness: 0.55 },
};

/** Cosmetic upgrade tint per level (Lv2 shinier, Lv3 shiniest). */
/** Upgrade levels give shinier, more metallic materials — visible improvement over the summer. */
export function levelMaterial(base: { color: string; roughness: number; metalness: number }, level: 1 | 2 | 3) {
  return {
    ...base,
    roughness: Math.max(0.08, base.roughness - (level - 1) * 0.12),
    metalness: Math.min(1, base.metalness + (level - 1) * 0.2),
  };
}