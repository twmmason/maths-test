import type { GeneratedTask } from "../types";
import type { Rng } from "../rng";
import { makeTask, mc, nearBy, mean, median, fmt } from "./helpers";

type Gen = (rng: Rng, tier: 1 | 2 | 3) => GeneratedTask;

/** Telemetry Science Deck — KS3 Statistics lives in the engine bay's
 *  flight-data facility (the commander's own missions are the dataset). */

const thrustEffect = (v: number) => ({
  property: "thrustPerEngine",
  correctValue: v,
  incorrectValue: Math.round(v * 0.8),
  unit: "kN",
});

export const ks3StatisticsTemplates: Record<string, Gen> = {
  // Mean, median, mode, range, outliers
  "KS3S-1": (rng, tier) => {
    const base = rng.int(110, 150);
    const flights = Array.from({ length: 5 }, () => base + rng.int(-12, 12));
    if (tier >= 2) flights.push(base + rng.int(140, 180)); // outlier flight
    const ask = tier === 1 ? "median" : rng.pick(["mean", "median"]);
    const sorted = [...flights].sort((a, b) => a - b);
    const ans = ask === "mean" ? Math.round(mean(flights)) : median(flights);
    return makeTask({
      criterionCode: "KS3S-1",
      rocketPart: "engine",
      tier,
      briefing: `Your last ${flights.length} flights reached ${sorted.map((f) => `${f} km`).join(", ")}. The review board wants the ${ask} apogee for the season report${tier >= 2 ? " — and note the odd one out is dragging the numbers" : ""}. What is the ${ask}, in kilometres?`,
      engineeringContext: "The board compares each commander's season by the same average.",
      answer: String(ans),
      choices: tier === 1 ? mc(rng, String(ans), nearBy(rng, ans, 10)) : undefined,
      workedSteps:
        ask === "mean"
          ? [`Combine all the apogees: ${fmt(flights.reduce((s, x) => s + x, 0))} km.`, `Share equally over ${flights.length} flights: about ${ans} km.`]
          : [`Line the apogees up in order.`, `The middle value is ${ans} km.`],
      hints: ask === "mean" ? ["Combine every flight, then share equally.", "The odd flight pulls the mean up."] : ["Sort the flights first.", "Pick the middle value (or halfway between the middle two)."],
      visual: { widget: "chart", config: { type: "bar", data: sorted.map((f, i) => `F${i + 1}:${f}`).join(";"), yLabel: "apogee km" } },
      rocketEffect: thrustEffect(160),
      tolerance: ask === "mean" ? 1 : 0.5,
    });
  },

  // Tables, bar charts, pie charts
  "KS3S-2": (rng, tier) => {
    const engines = rng.pick([35, 40, 45]);
    const fuel = rng.pick([30, 35]);
    const payload = rng.pick([10, 15]);
    const avionics = 100 - engines - fuel - payload;
    if (tier === 1) {
      return makeTask({
        criterionCode: "KS3S-2",
        rocketPart: "engine",
        tier,
        briefing: `The mass-budget pie chart for the readiness review shows engines ${engines}%, fuel ${fuel}%, payload ${payload}% and avionics filling the rest. What percentage slice does avionics get?`,
        engineeringContext: "The whole pie must account for every kilogram on board.",
        answer: String(avionics),
        choices: mc(rng, String(avionics), nearBy(rng, avionics, 6)),
        workedSteps: ["The whole pie is 100%.", `Take away ${engines}, ${fuel} and ${payload}: ${avionics}% remains.`],
        hints: ["All slices total 100 percent.", "Subtract the three known slices."],
        visual: { widget: "chart", config: { type: "pie", data: `engines:${engines};fuel:${fuel};payload:${payload};avionics:${avionics}` } },
        rocketEffect: thrustEffect(150),
      });
    }
    const totalMass = rng.pick([2000, 2400, 3000]);
    const ans = (engines / 100) * totalMass;
    return makeTask({
      criterionCode: "KS3S-2",
      rocketPart: "engine",
      tier,
      briefing: `The readiness pie chart gives engines a ${engines}% slice of the rocket's ${fmt(totalMass)} kg total mass. The crane team need the engines' actual mass to set their lifting limit. What is it, in kilograms?`,
      engineeringContext: "Chart percentages become real kilograms the moment the crane takes the load.",
      answer: String(ans),
      workedSteps: [`${engines}% means ${engines} in every 100.`, `${engines}% of ${fmt(totalMass)} kg is ${fmt(ans)} kg.`],
      hints: ["Find one percent of the total first.", "Then scale up to the slice's percentage."],
      visual: { widget: "chart", config: { type: "pie", data: `engines:${engines};fuel:${fuel};payload:${payload};avionics:${avionics}` } },
      rocketEffect: thrustEffect(165),
    });
  },

  // Bivariate data & scatter graphs
  "KS3S-3": (rng, tier) => {
    const n = tier === 1 ? 6 : 8;
    const pts = Array.from({ length: n }, (_, i) => {
      const x = i + 2;
      return { x, y: Math.round(x * rng.int(9, 11) + rng.int(-4, 4)) };
    });
    return makeTask({
      criterionCode: "KS3S-3",
      rocketPart: "engine",
      tier,
      briefing: `The scatter board plots fin area against stability margin for your last ${n} designs. Looking at the pattern of the points, what should the aerodynamics memo report: a positive relationship, a negative relationship, or no relationship?`,
      engineeringContext: "The memo decides whether bigger fins go on the next build.",
      answer: "positive",
      choices: ["positive", "negative", "no relationship"],
      workedSteps: ["The points rise from bottom-left to top-right.", "Bigger fin areas go with bigger stability margins: a positive relationship."],
      hints: ["Follow the points from left to right.", "Rising together means positive."],
      visual: { widget: "chart", config: { type: "scatter", data: pts.map((p) => `${p.x}:${p.y}`).join(";"), xLabel: "fin area", yLabel: "stability" } },
      rocketEffect: thrustEffect(158),
    });
  },
};
