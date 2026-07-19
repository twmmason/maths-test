export type Strand = "NPV" | "NF" | "AS" | "MD" | "F" | "G";

export type RocketPart =
  | "noseCone"
  | "hull"
  | "fuelTank"
  | "engine"
  | "fins"
  | "payloadBay"
  | "electronics"
  | "booster";

export interface Criterion {
  code: string; // e.g. "3NPV-1"
  strand: Strand;
  year: 1 | 2 | 3 | 4 | 5 | 6;
  description: string;
  /** The rocket part whose engineering tasks certify this criterion. */
  part: RocketPart;
}