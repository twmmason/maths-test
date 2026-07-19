import type { RocketPart } from "../curriculum/types";

export type WidgetKind =
  | "protractor"
  | "ruler"
  | "fuelGauge"
  | "numberLine"
  | "ratioMixer"
  | "payloadSplit"
  | "grid"
  | "circuit"
  | "barModel"
  | "checklist"
  // KS3 Astronaut Academy widgets
  | "equation"
  | "graphPlot"
  | "sequence"
  | "standardForm"
  | "construction"
  | "triangle"
  | "venn"
  | "sampleSpace"
  | "chart"
  | "scaleMap";

export interface VisualSpec {
  widget: WidgetKind;
  config: Record<string, number | string | boolean>;
}

export interface RocketEffect {
  property: string; // e.g. "noseAngle", "tankFill", "thrustPerEngine"
  correctValue: number;
  incorrectValue: number;
  unit: string;
}

/** An engineering task (never a "question"). */
export interface GeneratedTask {
  id: string;
  criterionCode: string;
  rocketPart: RocketPart;
  tier: 1 | 2 | 3;
  briefing: string;
  engineeringContext: string;
  answer: string;
  choices?: string[];
  workedSteps: string[];
  hints: string[];
  visual: VisualSpec;
  rocketEffect: RocketEffect;
  /** Numeric tolerance for measurement widgets (absolute). */
  tolerance?: number;
  /** For fraction tasks: whether equivalent fractions are accepted. */
  acceptEquivalentFractions?: boolean;
}