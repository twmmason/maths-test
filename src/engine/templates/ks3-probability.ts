import type { GeneratedTask } from "../types";
import type { Rng } from "../rng";
import { makeTask, mc, frac, simplifyFraction, dec } from "./helpers";

type Gen = (rng: Rng, tier: 1 | 2 | 3) => GeneratedTask;

/** Mission Risk Console — KS3 Probability lives in the hull's pre-flight
 *  risk-analysis facility. */

const hullEffect = () => ({
  property: "hullPanels",
  correctValue: 40,
  incorrectValue: 30,
  unit: "panels",
});

export const ks3ProbabilityTemplates: Record<string, Gen> = {
  // Frequency of outcomes, fairness, the 0–1 probability scale
  "KS3P-1": (rng, tier) => {
    const total = rng.pick(tier === 1 ? [10, 20] : [20, 25, 40, 50]);
    const clear = rng.int(Math.round(total * 0.5), Math.round(total * 0.9));
    const [n, d] = simplifyFraction(clear, total);
    const ans = tier === 3 ? dec(clear / total, 2) : frac(n, d);
    return makeTask({
      criterionCode: "KS3P-1",
      rocketPart: "hull",
      tier,
      briefing: `The weather team flew ${total} test balloons this month and ${clear} of them reported clear launch skies. Set the launch-weather dial to the experimental probability of clear skies${tier === 3 ? ", as a decimal" : ", as a fraction"}.`,
      engineeringContext: "The go/no-go board reads this dial at every launch rehearsal.",
      answer: ans,
      workedSteps: [`${clear} clear results out of ${total} flights.`, `That probability is ${frac(clear, total)}, which is ${ans}.`],
      hints: ["Compare clear flights with total flights.", "Probability runs from 0 (never) to 1 (certain)."],
      visual: { widget: "numberLine", config: { min: 0, max: 1, step: 0.05, pointer: Math.round((clear / total) * 20) / 20, readOnly: true, unit: "P" } },
      rocketEffect: hullEffect(),
      acceptEquivalentFractions: true,
      tolerance: tier === 3 ? 0.01 : undefined,
    });
  },

  // Probabilities of all outcomes sum to 1
  "KS3P-2": (rng, tier) => {
    const perfect = rng.int(60, 85) / 100;
    const wobble = rng.int(5, Math.round((0.95 - perfect) * 100)) / 100;
    const ans = Math.round((1 - perfect - wobble) * 100) / 100;
    return makeTask({
      criterionCode: "KS3P-2",
      rocketPart: "hull",
      tier,
      briefing: `The flight-review board lists every possible ascent outcome: perfect ascent at ${dec(perfect, 2)}, minor wobble at ${dec(wobble, 2)}, and abort. The board insists all outcomes are covered. What probability must go in the abort box?`,
      engineeringContext: "If the three boxes fail to cover every outcome, the review is rejected.",
      answer: dec(ans, 2),
      choices: tier === 1 ? mc(rng, dec(ans, 2), [dec(ans + 0.1, 2), dec(Math.max(0, ans - 0.05), 2), dec(1 - perfect, 2)]) : undefined,
      workedSteps: [`All outcomes together must total 1.`, `1 take away ${dec(perfect, 2)} and ${dec(wobble, 2)} leaves ${dec(ans, 2)}.`],
      hints: ["Every possible outcome shares the total of 1.", "Subtract the known probabilities from 1."],
      visual: { widget: "numberLine", config: { min: 0, max: 1, step: 0.05, pointer: perfect, readOnly: true, unit: "P" } },
      rocketEffect: hullEffect(),
      tolerance: 0.001,
    });
  },

  // Sets, unions/intersections: tables, grids, Venn diagrams
  "KS3P-3": (rng, tier) => {
    const total = rng.pick(tier === 1 ? [30, 40] : [40, 50, 60]);
    const pressure = rng.int(Math.round(total * 0.55), Math.round(total * 0.75));
    const cold = rng.int(Math.round(total * 0.5), Math.round(total * 0.7));
    const both = rng.int(Math.max(1, pressure + cold - total + 2), Math.min(pressure, cold) - 2);
    const neither = total - (pressure + cold - both);
    return makeTask({
      criterionCode: "KS3P-3",
      rocketPart: "hull",
      tier,
      briefing: `${total} hull valves went through testing: ${pressure} passed the pressure test, ${cold} passed the cold-soak, and ${both} passed both. Sort them on the Venn board — how many valves failed both tests?`,
      engineeringContext: "Valves outside both circles get pulled from the flight batch tonight.",
      answer: String(neither),
      workedSteps: [`Passed at least one test: ${pressure} plus ${cold} minus the ${both} counted twice gives ${pressure + cold - both}.`, `Out of ${total}, that leaves ${neither} outside both circles.`],
      hints: ["Valves that passed both were counted in each circle.", "Take the at-least-one group away from the total."],
      visual: { widget: "venn", config: { leftLabel: "pressure", rightLabel: "cold-soak", leftOnly: pressure - both, rightOnly: cold - both, both, neither: NaN, unknown: "neither" } },
      rocketEffect: hullEffect(),
    });
  },

  // Theoretical sample spaces & probabilities
  "KS3P-4": (rng, tier) => {
    if (tier === 1) {
      return makeTask({
        criterionCode: "KS3P-4",
        rocketPart: "hull",
        tier,
        briefing: `After re-entry shake, each of the capsule's two parachute switches is equally likely to sit ON or OFF. The sample-space grid shows every combination. How many equally likely combinations are there?`,
        engineeringContext: "The recovery team plans for every switch combination before splashdown.",
        answer: "4",
        choices: mc(rng, "4", ["2", "3", "8"]),
        workedSteps: ["Switch A has 2 states and switch B has 2 states.", "The grid shows 2 rows of 2: four combinations."],
        hints: ["Count the cells of the grid.", "Each cell is one equally likely outcome."],
        visual: { widget: "sampleSpace", config: { rows: "ON,OFF", cols: "ON,OFF", rowName: "switch A", colName: "switch B" } },
        rocketEffect: hullEffect(),
      });
    }
    const ans = frac(3, 4);
    return makeTask({
      criterionCode: "KS3P-4",
      rocketPart: "hull",
      tier,
      briefing: `The capsule's two independent parachute switches each land ON or OFF with equal chance after re-entry shake. Using the sample-space grid, what is the probability that at least one switch is ON? Give a fraction.`,
      engineeringContext: "The chute fires if either switch is ON — the board wants that probability on record.",
      answer: ans,
      workedSteps: ["The grid has 4 equally likely cells.", "Only OFF-OFF has no switch ON, so 3 of 4 cells qualify: 3/4."],
      hints: ["Count the grid cells with at least one ON.", "Compare with the total number of cells."],
      visual: { widget: "sampleSpace", config: { rows: "ON,OFF", cols: "ON,OFF", rowName: "switch A", colName: "switch B", highlight: "ON" } },
      rocketEffect: hullEffect(),
      acceptEquivalentFractions: true,
    });
  },
};
