import type { GeneratedTask } from "../types";
import type { Rng } from "../rng";
import { makeTask, mc, nearBy, fmt, frac, simplifyFraction } from "./helpers";

type Gen = (rng: Rng, tier: 1 | 2 | 3) => GeneratedTask;

const fillEffect = (correct: number, incorrect: number) => ({
  property: "tankFill",
  correctValue: correct,
  incorrectValue: incorrect,
  unit: "fill",
});
const ratioEffect = (correct: number) => ({
  property: "fuelRatio",
  correctValue: correct,
  incorrectValue: Math.max(1, correct - 1),
  unit: ":1",
});

export const fuelTemplates: Record<string, Gen> = {
  "1NPV-2": (rng, tier) => {
    const n = rng.int(2, tier === 1 ? 10 : 19);
    return makeTask({
      criterionCode: "1NPV-2",
      rocketPart: "fuelTank",
      tier,
      briefing: `The little test tank has been filled with ${n} litres. Slide the marker on the gauge line, which runs from 0 to 20 litres, to show where ${n} sits.`,
      engineeringContext: "The gauge marker tells the fuelling crew when to stop the pump.",
      answer: String(n),
      workedSteps: [
        `The line runs from 0 to 20, so 10 is exactly halfway.`,
        `${n} sits ${n < 10 ? "before" : n > 10 ? "past" : "right on"} the halfway mark.`,
      ],
      hints: ["Find 10, the halfway point, first.", `Count along one litre at a time to ${n}.`],
      visual: { widget: "numberLine", config: { min: 0, max: 20, step: 1, target: n, interactive: true, unit: "L" } },
      rocketEffect: fillEffect(0.6, 0.4),
      tolerance: 1,
    });
  },

  "2NPV-2": (rng, tier) => {
    const n = rng.int(21, 89);
    const nonMultiple = n % 10 === 0 ? n + rng.int(1, 9) : n;
    const next = Math.ceil(nonMultiple / 10) * 10;
    const prev = Math.floor(nonMultiple / 10) * 10;
    const askNext = tier === 1 ? true : rng.next() < 0.5;
    const ans = askNext ? next : prev;
    return makeTask({
      criterionCode: "2NPV-2",
      rocketPart: "fuelTank",
      tier,
      briefing: askNext
        ? `The fuel gauge reads ${nonMultiple} litres and the pump is still running. The safety valve clicks at every multiple of 10. What is the next multiple of 10 the needle will reach?`
        : `The fuel gauge reads ${nonMultiple} litres. The last safety click happened at the multiple of 10 just below the needle. What number was that?`,
      engineeringContext: "The safety valve checks the seals at every ten-litre click.",
      answer: String(ans),
      choices: tier === 1 ? mc(rng, String(ans), [String(prev), String(next + 10), String(nonMultiple)]) : undefined,
      workedSteps: [
        `${nonMultiple} sits between the multiples of 10: ${prev} and ${next}.`,
        `So the answer is ${ans}.`,
      ],
      hints: ["Multiples of 10 end in a zero.", `Which two multiples of 10 is ${nonMultiple} between?`],
      visual: { widget: "fuelGauge", config: { capacity: 100, level: nonMultiple, readOnly: true, unit: "L" } },
      rocketEffect: fillEffect(0.7, 0.5),
    });
  },

  "2NPV-3": (rng, tier) => {
    const tens = rng.int(2, 9);
    const ones = tier === 1 ? 0 : rng.int(1, 9);
    const n = tens * 10 + ones;
    return makeTask({
      criterionCode: "2NPV-3",
      rocketPart: "fuelTank",
      tier,
      briefing: `The tank holds ${n} litres and the pump delivers fuel in full ten-litre drums. How many complete drums of 10 fit into the tank's ${n} litres?`,
      engineeringContext: "The fuelling crew orders whole drums, so they need the count of tens.",
      answer: String(tens),
      choices: tier === 1 ? mc(rng, String(tens), nearBy(rng, tens, 2)) : undefined,
      workedSteps: [
        `${n} is made of ${tens} tens${ones ? ` and ${ones} ones` : ""}.`,
        `So ${tens} full drums of 10 fit.`,
      ],
      hints: ["Count up in tens until you would go past the total.", "The tens digit tells you how many complete tens."],
      visual: { widget: "fuelGauge", config: { capacity: 100, level: n, readOnly: true, unit: "L" } },
      rocketEffect: fillEffect(0.65, 0.45),
    });
  },

  "4NPV-3": (rng, tier) => {
    const mark = rng.int(1, 9);
    const per = tier === 3 ? 500 : 1000;
    const ans = mark * per;
    return makeTask({
      criterionCode: "4NPV-3",
      rocketPart: "fuelTank",
      tier,
      briefing: `The main tank gauge runs from 0 to ${fmt(per * 10)} litres, with a bold mark every ${fmt(per)} litres. The needle has stopped on mark number ${mark}. How many litres are on board?`,
      engineeringContext: "This reading goes straight into the burn-time calculation.",
      answer: String(ans),
      choices: tier === 1 ? mc(rng, String(ans), [String(mark), String(ans + per), String(ans - per)]) : undefined,
      workedSteps: [`Each bold mark is worth ${fmt(per)} litres.`, `Mark ${mark} means ${fmt(ans)} litres.`],
      hints: [`Count up in ${fmt(per)}s, one for each mark.`, "Multiply the mark number by the value of one mark."],
      visual: { widget: "numberLine", config: { min: 0, max: per * 10, step: per, pointer: ans, readOnly: true, unit: "L" } },
      rocketEffect: fillEffect(0.75, 0.5),
    });
  },

  "5NPV-3": (rng, tier) => {
    const max = tier === 1 ? 100 : tier === 2 ? 500 : 1000;
    const step = max / 10;
    const value = rng.int(1, 9) * step + (tier === 3 ? rng.pick([0, step / 2]) : 0);
    return makeTask({
      criterionCode: "5NPV-3",
      rocketPart: "fuelTank",
      tier,
      briefing: `Read the fuel gauge. The scale runs from 0 to ${fmt(max)} litres with a mark every ${fmt(step)} litres, and the needle is pointing between the labels. How many litres does it show?`,
      engineeringContext: "An exact reading stops us loading too little fuel for the burn.",
      answer: String(value),
      workedSteps: [
        `Each mark on this gauge is worth ${fmt(step)} litres.`,
        `The needle sits at ${fmt(value)} litres.`,
      ],
      hints: ["Work out what one small step on the scale is worth first.", "Count the marks from zero to the needle."],
      visual: { widget: "numberLine", config: { min: 0, max, step: step / 2, pointer: value, readOnly: true, unit: "L" } },
      rocketEffect: fillEffect(0.8, 0.55),
      tolerance: step / 4,
    });
  },

  "6NPV-3": (rng, tier) => {
    const options = [
      { dec: "0.5", mixed: "1/2", wrongs: ["1/4", "2/5", "1/5"] },
      { dec: "0.25", mixed: "1/4", wrongs: ["1/2", "2/5", "1/3"] },
      { dec: "0.75", mixed: "3/4", wrongs: ["1/4", "7/5", "3/5"] },
      { dec: "2.75", mixed: "2 3/4", wrongs: ["2 1/4", "2 4/5", "3 1/4"] },
      { dec: "1.5", mixed: "1 1/2", wrongs: ["1 1/5", "1 2/3", "5/2 5"] },
      { dec: "0.125", mixed: "1/8", wrongs: ["1/4", "1/12", "1/125"] },
    ];
    const pool = tier === 1 ? options.slice(0, 3) : tier === 2 ? options.slice(0, 5) : options;
    const pickIt = rng.pick(pool);
    return makeTask({
      criterionCode: "6NPV-3",
      rocketPart: "fuelTank",
      tier,
      briefing: `The mixing computer shows the fuel-to-oxidiser mix as ${pickIt.dec} to 1. The older analogue mixer only takes fractions. What is ${pickIt.dec} written as a fraction?`,
      engineeringContext: "Both mixers must agree or the engines get the wrong blend.",
      answer: pickIt.mixed,
      choices: mc(rng, pickIt.mixed, pickIt.wrongs),
      workedSteps: [
        `Read ${pickIt.dec} by place value: tenths, hundredths, thousandths.`,
        `That value written as a fraction is ${pickIt.mixed}.`,
      ],
      hints: ["Think what the decimal digits are worth: tenths and hundredths.", "0.25 is twenty-five hundredths — can you simplify that?"],
      visual: { widget: "ratioMixer", config: { left: Number(pickIt.dec), right: 1, readOnly: true } },
      rocketEffect: ratioEffect(2.75),
      acceptEquivalentFractions: true,
    });
  },

  "3F-1": (rng, tier) => {
    const den = tier === 1 ? rng.pick([2, 4]) : rng.pick([2, 3, 4, 5, 8]);
    const value = 1 / den;
    const names: Record<number, string> = { 2: "one half", 3: "one third", 4: "one quarter", 5: "one fifth", 8: "one eighth" };
    return makeTask({
      criterionCode: "3F-1",
      rocketPart: "fuelTank",
      tier,
      briefing: `This is a short hop test flight, so we only need a small load. Drag the fuel slider to fill the tank to exactly ${names[den]} full.`,
      engineeringContext: "Loading only the fuel we need keeps the test rocket light and safe.",
      answer: String(Math.round(value * 100) / 100),
      workedSteps: [
        `${names[den]} means the tank is split into ${den} equal parts and 1 part is filled.`,
        `On the gauge that is ${Math.round(value * 100)} out of 100.`,
      ],
      hints: [`Imagine the tank cut into ${den} equal slices.`, "Fill exactly one of those slices."],
      visual: { widget: "fuelGauge", config: { capacity: 1, level: 0, interactive: true, targetLabel: names[den], asFraction: true } },
      rocketEffect: fillEffect(value, Math.min(1, value + 0.25)),
      tolerance: 0.03,
    });
  },

  "4F-1": (rng, tier) => {
    const pairs = [
      { a: [2, 8], b: [1, 4], same: true },
      { a: [2, 4], b: [1, 2], same: true },
      { a: [3, 6], b: [1, 2], same: true },
      { a: [2, 6], b: [1, 3], same: true },
      { a: [3, 8], b: [1, 2], same: false },
      { a: [2, 5], b: [1, 4], same: false },
      { a: [4, 6], b: [3, 4], same: false },
      { a: [6, 8], b: [3, 4], same: true },
    ];
    const p = rng.pick(tier === 1 ? pairs.slice(0, 5) : pairs);
    const ans = p.same ? "yes" : "no";
    return makeTask({
      criterionCode: "4F-1",
      rocketPart: "fuelTank",
      tier,
      briefing: `The port gauge shows the tank ${frac(p.a[0], p.a[1])} full. The starboard gauge shows ${frac(p.b[0], p.b[1])} full. The tanks are identical. Are the two gauges showing the same fill level?`,
      engineeringContext: "Uneven fuel between tanks would tip the rocket sideways at liftoff.",
      answer: ans,
      choices: mc(rng, ans, ["yes", "no"].filter((c) => c !== ans)),
      workedSteps: [
        `Simplify ${frac(p.a[0], p.a[1])}: it is ${frac(...simplifyFraction(p.a[0], p.a[1]))}.`,
        `Compare with ${frac(p.b[0], p.b[1])}: they are ${p.same ? "the same level" : "different levels"}.`,
      ],
      hints: ["Try simplifying the first fraction.", "Picture both tanks split into equal slices — do the filled parts match?"],
      visual: { widget: "fuelGauge", config: { capacity: 1, level: p.a[0] / p.a[1], compareLevel: p.b[0] / p.b[1], readOnly: true } },
      rocketEffect: fillEffect(0.5, 0.35),
    });
  },

  "5F-1": (rng, tier) => {
    const den = tier === 1 ? rng.pick([2, 4]) : rng.pick([3, 4, 5, 8]);
    const num = tier === 1 ? 1 : rng.int(1, den - 1);
    const capacity = den * rng.int(tier === 3 ? 40 : 10, tier === 3 ? 120 : 50);
    const ans = (capacity * num) / den;
    return makeTask({
      criterionCode: "5F-1",
      rocketPart: "fuelTank",
      tier,
      briefing: `The main tank holds ${fmt(capacity)} litres when full. The flight plan calls for a ${frac(num, den)} fill. How many litres should the pump deliver?`,
      engineeringContext: "The pump computer needs the exact litre count, not the fraction.",
      answer: String(ans),
      workedSteps: [
        `Split ${fmt(capacity)} litres into ${den} equal parts: each part is ${capacity / den} litres.`,
        `Take ${num} part${num > 1 ? "s" : ""}: ${fmt(ans)} litres.`,
      ],
      hints: [`Find one ${den === 2 ? "half" : `1/${den} share`} of the tank first.`, "Divide by the bottom number, then multiply by the top."],
      visual: { widget: "fuelGauge", config: { capacity, level: 0, interactive: true, unit: "L" } },
      rocketEffect: fillEffect(num / den, Math.max(0.2, num / den - 0.25)),
      tolerance: capacity * 0.02,
    });
  },

  "6F-1": (rng, tier) => {
    const options = [
      [6, 8], [4, 8], [2, 4], [3, 6], [4, 6], [6, 9], [8, 12], [9, 12], [10, 15], [12, 16],
    ];
    const pool = tier === 1 ? options.slice(0, 4) : tier === 2 ? options.slice(0, 7) : options;
    const [num, den] = rng.pick(pool);
    const [sn, sd] = simplifyFraction(num, den);
    return makeTask({
      criterionCode: "6F-1",
      rocketPart: "fuelTank",
      tier,
      briefing: `The gauge reads ${frac(num, den)} full, but Mission Control's display only accepts fractions in their simplest form. What should we type in?`,
      engineeringContext: "Simplest-form readings stop copy errors between the pad and Mission Control.",
      answer: frac(sn, sd),
      workedSteps: [
        `Find the biggest number that divides into both ${num} and ${den}.`,
        `Divide top and bottom by it: ${frac(num, den)} becomes ${frac(sn, sd)}.`,
      ],
      hints: [`What number divides into both ${num} and ${den}?`, "Keep dividing top and bottom until nothing fits."],
      visual: { widget: "fuelGauge", config: { capacity: 1, level: num / den, readOnly: true, asFraction: true } },
      rocketEffect: fillEffect(num / den, Math.max(0.2, num / den - 0.2)),
      acceptEquivalentFractions: false,
    });
  },

  "6AS/MD-3": (rng, tier) => {
    const ratio = tier === 1 ? rng.pick([2, 5]) : rng.pick([3, 4, 5, 6, 8]);
    const oxidiser = rng.int(tier === 3 ? 40 : 10, tier === 3 ? 150 : 60);
    const fuel = oxidiser * ratio;
    return makeTask({
      criterionCode: "6AS/MD-3",
      rocketPart: "fuelTank",
      tier,
      briefing: `The engines burn fuel and oxidiser in a strict ${ratio} to 1 ratio. The pad crew has already loaded ${fmt(fuel)} litres of fuel. How many litres of oxidiser must they load to match?`,
      engineeringContext: "The wrong mix ratio makes the engines burn too hot or splutter out.",
      answer: String(oxidiser),
      workedSteps: [
        `A ratio of ${ratio} to 1 means every ${ratio} litres of fuel needs 1 litre of oxidiser.`,
        `Split ${fmt(fuel)} into groups of ${ratio}: that gives ${fmt(oxidiser)} litres of oxidiser.`,
      ],
      hints: [`For every ${ratio} litres of fuel, how much oxidiser?`, `How many groups of ${ratio} fit into ${fmt(fuel)}?`],
      visual: { widget: "ratioMixer", config: { left: fuel, right: 0, ratio, interactive: true, unit: "L" } },
      rocketEffect: ratioEffect(ratio),
    });
  },
};