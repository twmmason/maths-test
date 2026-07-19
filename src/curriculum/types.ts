export type KeyStage = "ks2" | "ks3";

/** KS2 Ready-to-Progress strands. */
export type Ks2Strand = "NPV" | "NF" | "AS" | "MD" | "F" | "G";

/** KS3 programme-of-study domains (September 2013 PDF). */
export type Ks3Domain = "KS3N" | "KS3A" | "KS3R" | "KS3G" | "KS3P" | "KS3S";

export type Strand = Ks2Strand | Ks3Domain;

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
  code: string; // e.g. "3NPV-1" or "KS3A-7"
  strand: Strand;
  year: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  keyStage: KeyStage;
  description: string;
  /** The rocket part whose engineering tasks certify this criterion. */
  part: RocketPart;
}