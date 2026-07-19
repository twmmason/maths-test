import type { RocketPart } from "../curriculum/types";

export interface InstalledPart {
  variantId: string;
  certified: boolean;
  attachment: "stack" | "radial";
  radialCount?: 2 | 3 | 4;
}

export interface RocketDesign {
  noseAngle: number; // degrees (tip angle)
  noseHeight: number; // metres
  hullHeight: number; // metres
  hullRadius: number; // metres
  hullPanels: number; // count
  tankFill: number; // 0..1
  fuelRatio: number; // fuel:oxidiser
  engineCount: number;
  thrustPerEngine: number; // kN
  finCount: number;
  finAngle: number; // degrees
  finSymmetry: boolean;
  payloadPods: number;
  payloadPerPod: number; // kg
  circuitsWired: number;
  powerBalanced: boolean;
  boosterCount: number;
  installedParts: Partial<Record<RocketPart, InstalledPart>>;
}

export const DEFAULT_DESIGN: RocketDesign = {
  noseAngle: 40,
  noseHeight: 1.6,
  hullHeight: 6,
  hullRadius: 0.9,
  hullPanels: 40,
  tankFill: 0.75,
  fuelRatio: 2.5,
  engineCount: 3,
  thrustPerEngine: 200,
  finCount: 4,
  finAngle: 0,
  finSymmetry: true,
  payloadPods: 4,
  payloadPerPod: 60,
  circuitsWired: 0,
  powerBalanced: false,
  boosterCount: 0,
  installedParts: {},
};

/** A fresh, empty VAB build (nothing attached). */
export function emptyDesign(): RocketDesign {
  return { ...DEFAULT_DESIGN, installedParts: {} };
}