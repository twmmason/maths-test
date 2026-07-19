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

/** SpaceX Falcon-9-inspired palette: clean white body, dark interstage, silver nose. */
export const PART_MATERIALS: Record<RocketPart, { color: string; roughness: number; metalness: number; opacity?: number }> = {
  noseCone: { color: "#dce1ee", roughness: 0.12, metalness: 0.72 },   // polished silver fairing
  hull: { color: "#eaedf2", roughness: 0.18, metalness: 0.48 },       // brushed-white body
  fuelTank: { color: "#d0e8f0", roughness: 0.12, metalness: 0.2, opacity: 0.6 }, // pale translucent LOX tank
  engine: { color: "#1e2028", roughness: 0.2, metalness: 0.85 },      // dark polished engine bell
  fins: { color: "#2e3340", roughness: 0.22, metalness: 0.65 },       // titanium grid fins
  payloadBay: { color: "#c8cdd6", roughness: 0.2, metalness: 0.4 },   // light grey payload adapter
  electronics: { color: "#4b5563", roughness: 0.3, metalness: 0.65 }, // dark-grey avionics band
  booster: { color: "#e8eaed", roughness: 0.2, metalness: 0.4 },      // white side boosters
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

export type HullMaterial = "aluminium" | "titanium" | "carbon" | "gold";

/** Vehicle-wide material finish unlocked by hull mastery. Each finish tints the
 *  whole airframe and changes how metallic/rough it looks — a clear visual
 *  reward for reaching harder destinations. */
export const MATERIAL_FINISH: Record<HullMaterial, { tint: string; roughness: number; metalness: number; label: string }> = {
  aluminium: { tint: "#eaedf2", roughness: 0.0, metalness: 0.0, label: "Aluminium" },
  titanium: { tint: "#c7ccd6", roughness: -0.04, metalness: 0.18, label: "Titanium" },
  carbon: { tint: "#3a3f4a", roughness: 0.06, metalness: 0.3, label: "Carbon-fibre" },
  gold: { tint: "#e8b23a", roughness: -0.06, metalness: 0.45, label: "Gold foil" },
};

/** Blend a part's base colour toward the vehicle material tint (keeps each part
 *  distinct while giving the whole ship a coherent finish). */
export function applyMaterial(
  base: { color: string; roughness: number; metalness: number },
  material: HullMaterial,
): { color: string; roughness: number; metalness: number } {
  const f = MATERIAL_FINISH[material];
  const mix = (a: string, b: string, t: number) => {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ar = (pa >> 16) & 255, ag = (pa >> 8) & 255, ab = pa & 255;
    const br = (pb >> 16) & 255, bg = (pb >> 8) & 255, bb = pb & 255;
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
  };
  return {
    color: mix(base.color, f.tint, material === "aluminium" ? 0 : 0.45),
    roughness: Math.max(0.04, base.roughness + f.roughness),
    metalness: Math.min(1, base.metalness + f.metalness),
  };
}

