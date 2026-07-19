import { describe, it, expect } from "vitest";
import { DESTINATIONS } from "./destinations";
import { variantsFor } from "./partsCatalog";
import { DEFAULT_DESIGN, withAllPartsInstalled, type RocketDesign } from "../three/rocketDesign";
import { simulateFlight } from "../physics/simulateFlight";

/**
 * Mission reachability audit: every destination must be achievable with a
 * clean (nominal) flight using ONLY parts from the catalogue, tuned to their
 * factory stats (no off-spec dials, no failure-mode territory).
 *
 * Also checks progression fairness: destinations must be reachable with the
 * parts unlocked by the time the destination itself unlocks.
 */

/** Build every combination of catalogue variants at or below `maxLevel`. */
function buildCandidates(maxLevel: 1 | 2 | 3): { label: string; design: RocketDesign }[] {
  const pick = (part: Parameters<typeof variantsFor>[0]) =>
    variantsFor(part).filter((v) => v.unlockLevel <= maxLevel);
  const noses = pick("noseCone");
  const hulls = pick("hull");
  const tanks = pick("fuelTank");
  const engines = pick("engine");
  const fins = pick("fins");
  const bays = pick("payloadBay");
  const boosters: { id: string; stats: Partial<RocketDesign> }[] = [
    { id: "no-boosters", stats: { boosterCount: 0 } },
    ...pick("booster"),
  ];
  const out: { label: string; design: RocketDesign }[] = [];
  for (const n of noses)
    for (const h of hulls)
      for (const t of tanks)
        for (const e of engines)
          for (const f of fins)
            for (const b of bays)
              for (const bo of boosters) {
                const design = withAllPartsInstalled({
                  ...DEFAULT_DESIGN,
                  ...n.stats,
                  ...h.stats,
                  ...t.stats,
                  ...e.stats,
                  ...f.stats,
                  ...b.stats,
                  ...bo.stats,
                });
                out.push({ label: [n.id, h.id, t.id, e.id, f.id, b.id, bo.id].join(" + "), design });
              }
  return out;
}

function bestNominal(candidates: { label: string; design: RocketDesign }[]) {
  let best = { label: "", altKm: -1 };
  for (const c of candidates) {
    const f = simulateFlight(c.design, 1);
    if (f.outcome !== "nominal") continue;
    if (f.maxAltitudeKm > best.altKm) best = { label: c.label, altKm: f.maxAltitudeKm };
  }
  return best;
}

const ALL = buildCandidates(3);
const LEVEL1 = buildCandidates(1);
const LEVEL2 = buildCandidates(2);
const BEST_ALL = bestNominal(ALL);
const BEST_L1 = bestNominal(LEVEL1);
const BEST_L2 = bestNominal(LEVEL2);

describe("mission reachability", () => {
  it("has at least one nominal-flight design in the catalogue", () => {
    expect(BEST_ALL.altKm).toBeGreaterThan(0);
  });

  for (const dest of DESTINATIONS) {
    it(`${dest.name} (${dest.requiredAltitudeKm.toLocaleString("en-GB")} km) is reachable with the full catalogue`, () => {
      expect(
        BEST_ALL.altKm,
        `best nominal design "${BEST_ALL.label}" peaks at ${BEST_ALL.altKm} km — short of ${dest.name}`,
      ).toBeGreaterThanOrEqual(dest.requiredAltitudeKm);
    });
  }

  // Progression fairness: early destinations must not need late-game parts.
  it("Suborbital, LEO and High Orbit are reachable with starter (level-1) parts", () => {
    expect(BEST_L1.altKm, `best level-1 design "${BEST_L1.label}"`).toBeGreaterThanOrEqual(400);
  });

  it("The Moon and Mars are reachable with level-2 parts", () => {
    expect(BEST_L2.altKm, `best level-2 design "${BEST_L2.label}"`).toBeGreaterThanOrEqual(1000);
  });

  it("prints the reachability envelope", () => {
    // eslint-disable-next-line no-console
    console.log(
      `Reachability envelope:\n` +
        `  level-1 parts: ${BEST_L1.altKm.toLocaleString("en-GB")} km (${BEST_L1.label})\n` +
        `  level-2 parts: ${BEST_L2.altKm.toLocaleString("en-GB")} km (${BEST_L2.label})\n` +
        `  full catalogue: ${BEST_ALL.altKm.toLocaleString("en-GB")} km (${BEST_ALL.label})`,
    );
    expect(true).toBe(true);
  });
});