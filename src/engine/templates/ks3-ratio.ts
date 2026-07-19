import type { GeneratedTask } from "../types";
import type { Rng } from "../rng";
import { makeTask, mc, nearBy, fmt, frac, dec, simplifyFraction, gcd } from "./helpers";

type Gen = (rng: Rng, tier: 1 | 2 | 3) => GeneratedTask;

/** Mission Planning Office — KS3 Ratio, proportion and rates of change. */

const podEffect = (pods: number) => ({ property: "payloadPods", correctValue: pods, incorrectValue: Math.max(1, pods - 1), unit: "pods" });
const massEffect = (perPod: number) => ({ property: "payloadPerPod", correctValue: perPod, incorrectValue: perPod * 1.5, unit: "kg" });

const readout = (text: string) => ({ widget: "equation" as const, config: { readout: text } });

export const ks3RatioTemplates: Record<string, Gen> = {
  // Convert between related standard units
  "KS3R-1": (rng, tier) => {
    if (tier === 3) {
      const m2 = rng.int(2, 8);
      const ans = m2 * 10_000;
      return makeTask({
        criterionCode: "KS3R-1",
        rocketPart: "payloadBay",
        tier,
        briefing: `The pad plan shows a landing zone of ${m2} square metres for the drone. The groundsheet supplier sells by the square centimetre. How many square centimetres do we need?`,
        engineeringContext: "Area units square the length conversion — a classic planning trap.",
        answer: String(ans),
        workedSteps: ["One metre is 100 centimetres, so one square metre is 100 × 100 square centimetres.", `${m2} × 10,000 = ${fmt(ans)} square centimetres.`],
        hints: ["Area converts with the SQUARE of the length factor.", "One square metre holds 10,000 square centimetres."],
        visual: readout(`landing zone: ${m2} m²`),
        rocketEffect: podEffect(2),
      });
    }
    const variants = tier === 1
      ? [
          { make: () => { const v = rng.int(2, 9); return { q: `${v} kilometres to the tracking dish`, ask: "metres", ans: v * 1000 }; } },
          { make: () => { const v = rng.int(2, 9) * 500; return { q: `${fmt(v)} grams of instruments`, ask: "kilograms", ans: v / 1000 }; } },
        ]
      : [
          { make: () => { const v = rng.pick([2.5, 3.25, 4.75, 1.5]); return { q: `${dec(v, 2)} hours of pad time booked`, ask: "minutes", ans: v * 60 }; } },
          { make: () => { const v = rng.int(1500, 8500); return { q: `${fmt(v)} millilitres of coolant`, ask: "litres", ans: v / 1000 }; } },
        ];
    const v = rng.pick(variants).make();
    return makeTask({
      criterionCode: "KS3R-1",
      rocketPart: "payloadBay",
      tier,
      briefing: `The mission plan lists ${v.q}. The supplier's order form wants the quantity in ${v.ask}. What number goes on the form?`,
      engineeringContext: "Plans and order forms use different units — the planner converts between them.",
      answer: dec(v.ans, 3),
      choices: tier === 1 ? mc(rng, dec(v.ans, 3), [dec(v.ans * 10, 3), dec(v.ans / 10, 3), dec(v.ans + 10, 3)]) : undefined,
      workedSteps: ["Find the conversion factor between the units.", `Apply it: ${dec(v.ans, 3)} ${v.ask}.`],
      hints: ["Bigger unit to smaller unit means multiply.", "Metric conversions use 10, 100 or 1000."],
      visual: readout(v.q),
      rocketEffect: massEffect(40),
      tolerance: 0.001,
    });
  },

  // Scale factors, scale diagrams and maps
  "KS3R-2": (rng, tier) => {
    const scale = tier === 1 ? rng.pick([10, 50, 100]) : tier === 2 ? rng.pick([200, 250, 500]) : rng.pick([1000, 2500, 5000]);
    const mapCm = rng.int(2, 9);
    const realM = (mapCm * scale) / 100;
    return makeTask({
      criterionCode: "KS3R-2",
      rocketPart: "payloadBay",
      tier,
      briefing: `The pad map uses a scale where 1 centimetre stands for ${fmt(scale / 100)} metres. On the map, the walkway from the assembly building to the pad measures ${mapCm} centimetres. How long is the real walkway, in metres?`,
      engineeringContext: "Crews order walkway cable by the real distance, not the map distance.",
      answer: dec(realM, 2),
      choices: tier === 1 ? mc(rng, dec(realM, 2), [dec(realM * 10, 2), dec(realM / 10, 2), dec(realM + scale / 100, 2)]) : undefined,
      workedSteps: [`Each map centimetre is ${fmt(scale / 100)} real metres.`, `${mapCm} centimetres means ${mapCm} × ${fmt(scale / 100)} = ${dec(realM, 2)} metres.`],
      hints: ["Multiply the map length by the scale.", `One centimetre stands for ${fmt(scale / 100)} metres here.`],
      visual: { widget: "scaleMap", config: { scaleMetresPerCm: scale / 100, mapCm, label: "assembly building → pad" } },
      rocketEffect: podEffect(3),
      tolerance: 0.01,
    });
  },

  // One quantity as a fraction of another (< 1 and > 1)
  "KS3R-3": (rng, tier) => {
    const over = tier === 3 && rng.next() < 0.5;
    const den = rng.pick(tier === 1 ? [4, 5, 8] : [6, 8, 10, 12]);
    const num = over ? den + rng.int(1, den - 1) : rng.int(1, den - 1);
    const unit = rng.pick([20, 30, 40]);
    const part = num * unit;
    const whole = den * unit;
    const [sn, sd] = simplifyFraction(num, den);
    const ans = frac(sn, sd);
    return makeTask({
      criterionCode: "KS3R-3",
      rocketPart: "payloadBay",
      tier,
      briefing: over
        ? `The science payload weighs ${fmt(part)} kilograms while the standard bay allowance is ${fmt(whole)} kilograms. Express the payload as a fraction of the allowance, in simplest form — it will be greater than one whole.`
        : `Of the ${fmt(whole)} kilogram launch allowance, the science payload takes ${fmt(part)} kilograms. What fraction of the allowance is the science payload, in simplest form?`,
      engineeringContext: "Fractions of the allowance drive the go or no-go payload review.",
      answer: ans,
      workedSteps: [`Write the fraction: ${fmt(part)} over ${fmt(whole)}.`, `Divide top and bottom by ${gcd(part, whole)}: ${ans}.`],
      hints: ["Put the payload on top and the allowance underneath.", "Simplify by dividing top and bottom by the same number."],
      visual: { widget: "barModel", config: { total: whole, part, unit: "kg" } },
      rocketEffect: massEffect(part / 10),
      acceptEquivalentFractions: false,
    });
  },

  // Ratio notation and simplest form
  "KS3R-4": (rng, tier) => {
    const base = tier === 1 ? rng.pick([[2, 3], [1, 2], [3, 4]]) : rng.pick([[2, 5], [3, 5], [4, 7], [5, 6]]);
    const k = rng.int(2, tier === 3 ? 12 : 6);
    const a = base[0] * k;
    const b = base[1] * k;
    const ans = `${base[0]}:${base[1]}`;
    return makeTask({
      criterionCode: "KS3R-4",
      rocketPart: "payloadBay",
      tier,
      briefing: `This mission carries ${a} science crates and ${b} supply crates. Mission Control files cargo ratios in simplest form. What should the science to supply ratio say in the file?`,
      engineeringContext: "Simplest-form ratios let planners compare missions of any size at a glance.",
      answer: ans,
      choices: tier === 1 ? mc(rng, ans, [`${a}:${b}`, `${base[1]}:${base[0]}`, `${base[0] + 1}:${base[1]}`]) : undefined,
      workedSteps: [`Both numbers divide by ${k}.`, `${a}:${b} simplifies to ${ans}.`],
      hints: ["Divide both sides of the ratio by the same number.", `What divides into both ${a} and ${b}?`],
      visual: { widget: "ratioMixer", config: { left: a, right: b, readOnly: true, unit: "crates" } },
      rocketEffect: podEffect(base[0] + base[1]),
    });
  },

  // Divide a quantity in a part:part or part:whole ratio
  "KS3R-5": (rng, tier) => {
    const p = rng.int(1, 4);
    let q = rng.int(1, 5);
    if (q === p) q += 1;
    const unit = rng.int(tier === 1 ? 5 : 20, tier === 3 ? 90 : 40);
    const total = (p + q) * unit;
    const askLarger = rng.next() < 0.5;
    const share = (askLarger ? Math.max(p, q) : Math.min(p, q)) * unit;
    return makeTask({
      criterionCode: "KS3R-5",
      rocketPart: "payloadBay",
      tier,
      briefing: `The ${fmt(total)} kilogram cargo allowance is split between science and supplies in the ratio ${p} to ${q}. How many kilograms go to the ${askLarger ? "larger" : "smaller"} share?`,
      engineeringContext: "Each share is packed into its own pod, so the split must be exact.",
      answer: String(share),
      choices: tier === 1 ? mc(rng, String(share), [String(total - share), String(unit), String(share + unit)]) : undefined,
      workedSteps: [`The ratio has ${p + q} parts in total, so one part is ${fmt(total)} split ${p + q} ways: ${fmt(unit)} kilograms.`, `The ${askLarger ? "larger" : "smaller"} share is ${askLarger ? Math.max(p, q) : Math.min(p, q)} parts: ${fmt(share)} kilograms.`],
      hints: [`Count the total parts: ${p} and ${q} make ${p + q}.`, "Find the size of one part first."],
      visual: { widget: "payloadSplit", config: { total, ratioLeft: p, ratioRight: q, unit: "kg" } },
      rocketEffect: massEffect(share / 10),
    });
  },

  // Multiplicative relationships as ratio or fraction
  "KS3R-6": (rng, tier) => {
    const per = rng.int(2, 5);
    const other = rng.int(per + 1, 9);
    const batches = rng.int(tier === 1 ? 3 : 6, tier === 3 ? 20 : 12);
    const have = per * batches;
    const ans = other * batches;
    return makeTask({
      criterionCode: "KS3R-6",
      rocketPart: "payloadBay",
      tier,
      briefing: `Mission rules pack ${per} fuel pods for every ${other} supply pods. This flight manifests ${fmt(have)} fuel pods. How many supply pods must the plan include?`,
      engineeringContext: "The pod ratio holds for any mission size — it scales multiplicatively.",
      answer: String(ans),
      choices: tier === 1 ? mc(rng, String(ans), [String(ans + other), String(have + (other - per)), String(other * per)]) : undefined,
      workedSteps: [`${fmt(have)} fuel pods is ${batches} groups of ${per}.`, `Each group needs ${other} supply pods: ${batches} × ${other} = ${fmt(ans)}.`],
      hints: [`How many groups of ${per} are in ${fmt(have)}?`, `Each group brings ${other} supply pods with it.`],
      visual: { widget: "ratioMixer", config: { left: have, right: 0, ratio: other / per, interactive: true, unit: "pods" } },
      rocketEffect: podEffect(4),
    });
  },

  // Ratios ↔ fractions ↔ linear functions
  "KS3R-7": (rng, tier) => {
    const p = rng.int(1, 4);
    let q = rng.int(2, 5);
    if (q === p) q += 1;
    if (tier === 3) {
      const ans = `s = ${q}f/${p}`;
      return makeTask({
        criterionCode: "KS3R-7",
        rocketPart: "payloadBay",
        tier,
        briefing: `Fuel pods and supply pods load in the ratio ${p} to ${q}. The software team wants this as a formula giving supply pods s from fuel pods f. Which formula captures the ratio?`,
        engineeringContext: "Ratios ARE linear functions — the loader software runs this formula live.",
        answer: ans,
        choices: mc(rng, ans, [`s = ${p}f/${q}`, `s = f + ${q - p}`, `s = ${q}f`]),
        workedSteps: [`For every ${p} fuel pods there are ${q} supply pods, so s is ${q} over ${p} times f.`, `As a formula: ${ans}.`],
        hints: ["A ratio scales one quantity into the other by a fixed multiplier.", `The multiplier is ${q} divided by ${p}.`],
        visual: { widget: "graphPlot", config: { mode: "readLine", m: q / p, c: 0, min: 0, max: 10, yLabel: "supply", xLabel: "fuel", readOnly: true } },
        rocketEffect: podEffect(p + q),
      });
    }
    const [sn, sd] = simplifyFraction(p, p + q);
    const ans = frac(sn, sd);
    return makeTask({
      criterionCode: "KS3R-7",
      rocketPart: "payloadBay",
      tier,
      briefing: `The cargo loads in the ratio ${p} fuel pods to ${q} supply pods. What fraction of ALL the pods are fuel pods, in simplest form?`,
      engineeringContext: "Switching between ratio talk and fraction talk is daily planner work.",
      answer: ans,
      choices: tier === 1 ? mc(rng, ans, [frac(p, q), frac(q, p + q), frac(p + 1, p + q)]) : undefined,
      workedSteps: [`The ratio ${p} to ${q} makes ${p + q} parts in total.`, `Fuel is ${p} of those parts: ${ans} of the whole.`],
      hints: ["The fraction's bottom is the TOTAL number of parts.", `Total parts: ${p} and ${q} together.`],
      visual: { widget: "ratioMixer", config: { left: p, right: q, readOnly: true, unit: "pods" } },
      rocketEffect: podEffect(p + q),
      acceptEquivalentFractions: false,
    });
  },

  // Percentage change: increase, decrease, original value, simple interest
  "KS3R-8": (rng, tier) => {
    if (tier === 1) {
      const start = rng.pick([2000, 4000, 5000, 8000]);
      const pct = rng.pick([10, 20, 25, 50]);
      const up = rng.next() < 0.5;
      const ans = up ? start + (start * pct) / 100 : start - (start * pct) / 100;
      return makeTask({
        criterionCode: "KS3R-8",
        rocketPart: "payloadBay",
        tier,
        briefing: `The mission budget of £${fmt(start)} has been ${up ? "increased" : "cut"} by ${pct}%. What is the new budget, in pounds?`,
        engineeringContext: "Every budget change lands on the planning office desk as a percentage.",
        answer: String(ans),
        choices: mc(rng, String(ans), [String(up ? start - (start * pct) / 100 : start + (start * pct) / 100), String(start), String((start * pct) / 100)]),
        workedSteps: [`${pct}% of £${fmt(start)} is £${fmt((start * pct) / 100)}.`, `${up ? "Add it on" : "Take it off"}: £${fmt(ans)}.`],
        hints: [`Find ${pct}% of the budget first.`, up ? "Then add it to the original." : "Then subtract it from the original."],
        visual: readout(`budget £${fmt(start)} · ${up ? "up" : "down"} ${pct}%`),
        rocketEffect: massEffect(50),
      });
    }
    if (tier === 2) {
      const principal = rng.pick([500, 800, 1200, 2000]);
      const rate = rng.pick([2, 3, 4, 5]);
      const years = rng.int(2, 5);
      const ans = (principal * rate * years) / 100;
      return makeTask({
        criterionCode: "KS3R-8",
        rocketPart: "payloadBay",
        tier,
        briefing: `The programme parks £${fmt(principal)} of spare budget in a simple-interest account paying ${rate}% each year. How much interest builds up over ${years} years?`,
        engineeringContext: "Simple interest funds next season's spare parts.",
        answer: String(ans),
        workedSteps: [`One year's interest is ${rate}% of £${fmt(principal)}: £${fmt((principal * rate) / 100)}.`, `Over ${years} years: £${fmt(ans)}.`],
        hints: ["Simple interest pays the SAME amount every year.", "Work out one year first, then multiply."],
        visual: readout(`£${fmt(principal)} at ${rate}% for ${years} years`),
        rocketEffect: massEffect(60),
      });
    }
    const original = rng.pick([1500, 2000, 2400, 3200]);
    const pct = rng.pick([20, 25, 40]);
    const now = original - (original * pct) / 100;
    return makeTask({
      criterionCode: "KS3R-8",
      rocketPart: "payloadBay",
      tier,
      briefing: `After a ${pct}% cut, the payload budget now stands at £${fmt(now)}. What was the original budget before the cut, in pounds?`,
      engineeringContext: "Original-value sums recover the pre-cut plan for the appeal meeting.",
      answer: String(original),
      workedSteps: [`After the cut, £${fmt(now)} is ${100 - pct}% of the original.`, `One percent is £${fmt(now / (100 - pct))}, so the original was £${fmt(original)}.`],
      hints: [`£${fmt(now)} is NOT ${pct}% — it is what is LEFT.`, `Divide by ${100 - pct}, then multiply by 100.`],
      visual: readout(`now £${fmt(now)} after a ${pct}% cut`),
      rocketEffect: massEffect(70),
    });
  },

  // Direct and inverse proportion
  "KS3R-9": (rng, tier) => {
    const inverse = tier === 3 || (tier === 2 && rng.next() < 0.5);
    if (inverse) {
      const pumps = rng.int(2, 4);
      const minutes = rng.pick([24, 36, 40, 60]);
      const newPumps = pumps * rng.int(2, 3);
      const ans = (pumps * minutes) / newPumps;
      return makeTask({
        criterionCode: "KS3R-9",
        rocketPart: "payloadBay",
        tier,
        briefing: `With ${pumps} pumps running, loading the cargo water takes ${minutes} minutes. The plan adds more pumps, making ${newPumps} in total, all working at the same rate. How long will loading take now, in minutes?`,
        engineeringContext: "More pumps, less time — the product of pumps and minutes stays fixed.",
        answer: String(ans),
        workedSteps: [`The total work is ${pumps} × ${minutes} = ${pumps * minutes} pump-minutes.`, `Split across ${newPumps} pumps: ${ans} minutes.`],
        hints: ["Double the pumps means HALF the time — this is inverse proportion.", "Multiply pumps by minutes: that product never changes."],
        visual: { widget: "graphPlot", config: { mode: "reciprocal", k: pumps * minutes, min: 0, max: Math.max(12, newPumps + 2), yLabel: "minutes", xLabel: "pumps", markX: newPumps, readOnly: true } },
        rocketEffect: podEffect(3),
      });
    }
    const metres = rng.int(3, 8);
    const cost = metres * rng.int(2, 6);
    const newMetres = rng.int(metres + 2, 15);
    const ans = (cost / metres) * newMetres;
    return makeTask({
      criterionCode: "KS3R-9",
      rocketPart: "payloadBay",
      tier,
      briefing: `${metres} metres of payload strapping costs £${fmt(cost)}. The manifest needs ${newMetres} metres. At the same rate, what will that cost, in pounds?`,
      engineeringContext: "Strapping is priced in direct proportion — double the length, double the cost.",
      answer: dec(ans, 2),
      choices: tier === 1 ? mc(rng, dec(ans, 2), [dec(ans + cost / metres, 2), dec(cost, 2), dec(ans - cost / metres, 2)]) : undefined,
      workedSteps: [`One metre costs £${dec(cost / metres, 2)}.`, `${newMetres} metres cost £${dec(ans, 2)}.`],
      hints: ["Find the cost of ONE metre first.", "Then scale up to the metres you need."],
      visual: { widget: "graphPlot", config: { mode: "readLine", m: cost / metres, c: 0, min: 0, max: 16, yLabel: "cost £", xLabel: "metres", readOnly: true } },
      rocketEffect: massEffect(45),
      tolerance: 0.01,
    });
  },

  // Compound units: speed, unit pricing, density
  "KS3R-10": (rng, tier) => {
    if (tier === 1) {
      const secs = rng.pick([20, 30, 40, 60]);
      const km = secs * rng.int(2, 8);
      const ans = km / secs;
      return makeTask({
        criterionCode: "KS3R-10",
        rocketPart: "payloadBay",
        tier,
        briefing: `During the boost phase, the rocket covered ${fmt(km)} kilometres in ${secs} seconds. What was its average speed, in kilometres per second?`,
        engineeringContext: "Average speed is the planner's first sanity check on any trajectory.",
        answer: String(ans),
        choices: mc(rng, String(ans), nearBy(rng, ans, 3)),
        workedSteps: ["Speed is distance shared over time.", `${fmt(km)} split over ${secs} seconds is ${ans} kilometres per second.`],
        hints: ["Speed: distance divided by time.", `Split ${fmt(km)} into ${secs} equal parts.`],
        visual: readout(`${fmt(km)} km in ${secs} s`),
        rocketEffect: podEffect(2),
      });
    }
    if (tier === 2) {
      const smallL = rng.pick([2, 4, 5]);
      const smallCost = smallL * rng.pick([3, 4, 5]);
      const ans = smallCost / smallL;
      return makeTask({
        criterionCode: "KS3R-10",
        rocketPart: "payloadBay",
        tier,
        briefing: `The coolant supplier quotes £${fmt(smallCost)} for a ${smallL} litre drum. The planning office compares suppliers by unit price. What is the price per litre, in pounds?`,
        engineeringContext: "Unit pricing is how the office picks the best supplier every quarter.",
        answer: dec(ans, 2),
        workedSteps: ["Unit price is total cost shared over the litres.", `£${fmt(smallCost)} over ${smallL} litres is £${dec(ans, 2)} per litre.`],
        hints: ["Divide the cost by the number of litres.", "The answer is pounds for ONE litre."],
        visual: readout(`£${fmt(smallCost)} per ${smallL} L drum`),
        rocketEffect: massEffect(35),
        tolerance: 0.01,
      });
    }
    const volume = rng.pick([4, 5, 8, 10]);
    const density = rng.pick([2, 3, 7, 11]);
    const mass = volume * density;
    return makeTask({
      criterionCode: "KS3R-10",
      rocketPart: "payloadBay",
      tier,
      briefing: `A ballast block of volume ${volume} cubic decimetres has mass ${fmt(mass)} kilograms. The materials database files its density. What is the density, in kilograms per cubic decimetre?`,
      engineeringContext: "Density decides whether the ballast sits within the bay's floor rating.",
      answer: String(density),
      workedSteps: ["Density is mass shared over volume.", `${fmt(mass)} over ${volume} gives ${density} kilograms per cubic decimetre.`],
      hints: ["Density: mass divided by volume.", `Split ${fmt(mass)} into ${volume} equal parts.`],
      visual: readout(`mass ${fmt(mass)} kg · volume ${volume} dm³`),
      rocketEffect: massEffect(density * 10),
    });
  },
};