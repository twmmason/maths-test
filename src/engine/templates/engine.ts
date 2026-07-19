import type { GeneratedTask } from "../types";
import type { Rng } from "../rng";
import { makeTask, mc, nearBy, fmt } from "./helpers";

type Gen = (rng: Rng, tier: 1 | 2 | 3) => GeneratedTask;

const thrustEffect = (correct: number) => ({
  property: "thrustPerEngine",
  correctValue: correct,
  incorrectValue: Math.round(correct * 0.7),
  unit: "kN",
});
const countEffect = (correct: number) => ({
  property: "engineCount",
  correctValue: correct,
  incorrectValue: Math.max(1, correct - 1),
  unit: "engines",
});

export const engineTemplates: Record<string, Gen> = {
  "1NF-1": (rng, tier) => {
    const fitted = rng.int(1, 9);
    const ans = 10 - fitted;
    return makeTask({
      criterionCode: "1NF-1",
      rocketPart: "engine",
      tier,
      briefing: `The engine mount needs 10 bolts before it can hold the engine. The fitters have put in ${fitted} so far. How many more bolts do they need from the parts bin?`,
      engineeringContext: "Every bolt shares the engine's shaking force — one missing bolt overloads the rest.",
      answer: String(ans),
      choices: tier === 1 ? mc(rng, String(ans), nearBy(rng, ans, 2)) : undefined,
      workedSteps: [`${fitted} bolts are in. Count on from ${fitted} up to 10.`, `That is ${ans} more bolts.`],
      hints: [`Count up from ${fitted} to 10 on your fingers.`, `${fitted} and how many more make 10?`],
      visual: { widget: "circuit", config: { mode: "bolts", total: 10, done: fitted } },
      rocketEffect: countEffect(3),
    });
  },

  "1NF-2": (rng, tier) => {
    const step = tier === 1 ? 10 : rng.pick([2, 5, 10]);
    const k = rng.int(2, 8);
    const current = step * k;
    const back = tier === 3 && rng.next() < 0.4;
    const ans = back ? current - step : current + step;
    return makeTask({
      criterionCode: "1NF-2",
      rocketPart: "engine",
      tier,
      briefing: back
        ? `The turbo pump counter ticks down in ${step}s as it spins down. It shows ${current} right now. What will it show after the next tick?`
        : `The turbo pump counter clicks up in ${step}s as it spins faster. It shows ${current} right now. What will it show after the next click?`,
      engineeringContext: "The pump must reach full speed in even steps or the fuel flow surges.",
      answer: String(ans),
      choices: tier === 1 ? mc(rng, String(ans), [String(current + 1), String(ans + step), String(current)]) : undefined,
      workedSteps: [`The counter moves in steps of ${step}.`, `${back ? "Count back" : "Count on"} one step from ${current}: ${ans}.`],
      hints: [`Count in ${step}s out loud.`, `What comes ${back ? "before" : "after"} ${current} when counting in ${step}s?`],
      visual: { widget: "numberLine", config: { min: 0, max: step * 12, step, pointer: current, readOnly: true, unit: "" } },
      rocketEffect: thrustEffect(180),
    });
  },

  "2NF-1": (rng, tier) => {
    const done = rng.int(5, 19);
    const ans = 20 - done;
    return makeTask({
      criterionCode: "2NF-1",
      rocketPart: "engine",
      tier,
      briefing: `The engine bell needs 20 cooling channels cut into it. The machine shop has finished ${done}. How many channels are still left to cut?`,
      engineeringContext: "Every channel carries cool fuel around the bell so it never melts.",
      answer: String(ans),
      choices: tier === 1 ? mc(rng, String(ans), nearBy(rng, ans, 3)) : undefined,
      workedSteps: [`Count on from ${done} up to 20.`, `That is ${ans} channels still to cut.`],
      hints: [`${done} and how many more make 20?`, "Use what you know about pairs that make 10, then add the extra 10."],
      visual: { widget: "circuit", config: { mode: "channels", total: 20, done } },
      rocketEffect: thrustEffect(200),
    });
  },

  "3NF-1": (rng, tier) => {
    const a = rng.int(4, 9);
    const b = rng.int(11 - a, 9);
    const ans = a + b;
    return makeTask({
      criterionCode: "3NF-1",
      rocketPart: "engine",
      tier,
      briefing: `The combustion chamber has ${a} bolts on its left mounting plate and ${b} on its right. The safety inspector needs the full bolt count before signing the engine off. How many bolts hold the chamber on?`,
      engineeringContext: "The inspector's certificate lists every single bolt on the chamber.",
      answer: String(ans),
      choices: tier === 1 ? mc(rng, String(ans), nearBy(rng, ans, 3)) : undefined,
      workedSteps: [`Start at ${a}, then count on ${b} more.`, `Together the plates hold ${ans} bolts.`],
      hints: [`Make ten first: ${a} needs ${10 - a} more to reach 10.`, "Then add on whatever is left."],
      visual: { widget: "circuit", config: { mode: "bolts", total: a + b, done: a, split: a } },
      rocketEffect: thrustEffect(190),
    });
  },

  "3NF-2": (rng, tier) => {
    const table = rng.pick(tier === 1 ? [2, 5, 10] : [2, 4, 5, 8, 10]);
    const rings = rng.int(2, tier === 3 ? 12 : 9);
    const ans = table * rings;
    return makeTask({
      criterionCode: "3NF-2",
      rocketPart: "engine",
      tier,
      briefing: `Each injector ring holds ${table} fuel injectors, and this engine stacks ${rings} rings. The workshop packs injectors one ring at a time. How many injectors should they pack in total?`,
      engineeringContext: "Every injector sprays a fine mist of fuel — the exact count sets the burn rate.",
      answer: String(ans),
      choices: tier === 1 ? mc(rng, String(ans), [String(ans + table), String(Math.max(0, ans - table)), String(table + rings)]) : undefined,
      workedSteps: [`Count ${rings} groups of ${table}.`, `That makes ${ans} injectors.`],
      hints: [`Count in ${table}s, once for each ring.`, `Use the ${table} times table.`],
      visual: { widget: "circuit", config: { mode: "injectors", groups: rings, perGroup: table } },
      rocketEffect: thrustEffect(210),
    });
  },

  "3NF-3": (rng, tier) => {
    const base = rng.int(2, 9);
    const ans = base * 10;
    return makeTask({
      criterionCode: "3NF-3",
      rocketPart: "engine",
      tier,
      briefing: `The little test valve lets through ${base} litres of fuel each second. The main valve is 10 times as wide and lets through 10 times as much. How many litres a second pass through the main valve?`,
      engineeringContext: "The main valve feeds all engines at once, so it scales up the little valve's flow.",
      answer: String(ans),
      choices: tier === 1 ? mc(rng, String(ans), [String(base + 10), String(ans + 10), String(base)]) : undefined,
      workedSteps: [`10 times as much as ${base} moves the digit one place left.`, `That is ${ans} litres each second.`],
      hints: ["Ten times bigger moves the digit up one place-value column.", `Think: ${base} tens.`],
      visual: { widget: "ratioMixer", config: { left: base, right: ans, readOnly: true, unit: "L/s" } },
      rocketEffect: thrustEffect(220),
    });
  },

  "4NF-1": (rng, tier) => {
    const a = rng.int(tier === 1 ? 2 : 6, 12);
    const b = rng.int(tier === 1 ? 2 : 6, 12);
    const ans = a * b;
    return makeTask({
      criterionCode: "4NF-1",
      rocketPart: "engine",
      tier,
      briefing: `Each engine carries ${a} fuel injectors arranged in a ring, and we are fitting ${b} engines to this rocket. The workshop needs the total injector count for the parts order. How many injectors?`,
      engineeringContext: "Ordering exactly the right number keeps spare parts cost down.",
      answer: String(ans),
      choices: tier === 1 ? mc(rng, String(ans), [String(ans + a), String(ans - b), String(a + b)]) : undefined,
      workedSteps: [`${b} engines each need ${a} injectors.`, `${b} groups of ${a} makes ${ans}.`],
      hints: [`Use the ${Math.min(a, b)} times table.`, `Swap them round if it helps: ${b} lots of ${a} equals ${a} lots of ${b}.`],
      visual: { widget: "circuit", config: { mode: "injectors", groups: b, perGroup: a } },
      rocketEffect: countEffect(Math.min(b, 5)),
    });
  },

  "4NF-2": (rng, tier) => {
    const d = rng.pick(tier === 1 ? [2, 5] : [3, 4, 6, 7, 8]);
    const q = rng.int(3, 12);
    const r = rng.int(1, d - 1);
    const n = d * q + r;
    return makeTask({
      criterionCode: "4NF-2",
      rocketPart: "engine",
      tier,
      briefing: `${n} igniter cartridges arrived at the pad. They are packed into cases that each hold exactly ${d}. After the crew fills every complete case, how many cartridges are left over, loose on the bench?`,
      engineeringContext: "Loose cartridges must be logged separately for the safety audit.",
      answer: String(r),
      choices: tier === 1 ? mc(rng, String(r), nearBy(rng, r, 2)) : undefined,
      workedSteps: [
        `Fill cases of ${d}: ${q} full cases use ${d * q} cartridges.`,
        `${n} take away ${d * q} leaves ${r} loose.`,
      ],
      hints: [`How many whole groups of ${d} fit inside ${n}?`, "Whatever does not fit a full case is the remainder."],
      visual: { widget: "payloadSplit", config: { total: n, groups: d, mode: "remainder" } },
      rocketEffect: thrustEffect(230),
    });
  },

  "4NF-3": (rng, tier) => {
    const base = rng.int(2, 9);
    const ans = base * 100;
    return makeTask({
      criterionCode: "4NF-3",
      rocketPart: "engine",
      tier,
      briefing: `One turbo pump blade weighs ${base} grams. The full crate from the factory holds 100 blades. The courier needs the crate's blade weight in grams for the shipping label. What is it?`,
      engineeringContext: "The courier's van has a strict weight limit per crate.",
      answer: String(ans),
      choices: tier === 1 ? mc(rng, String(ans), [String(base * 10), String(base + 100), String(ans * 10)]) : undefined,
      workedSteps: [`100 times as much as ${base} moves the digit two places left.`, `That is ${fmt(ans)} grams.`],
      hints: ["Scaling by 100 moves digits two place-value columns.", `First try ${base} scaled by 10, then by 10 again.`],
      visual: { widget: "ratioMixer", config: { left: base, right: ans, readOnly: true, unit: "g" } },
      rocketEffect: thrustEffect(240),
    });
  },

  "5NF-1": (rng, tier) => {
    const primes = [7, 11, 13, 17, 19, 23, 29, 31, 37];
    const composites = [9, 15, 21, 25, 27, 33, 35, 39, 49];
    const isPrime = rng.next() < 0.5;
    const n = rng.pick(isPrime ? primes : composites);
    const ans = isPrime ? "prime" : "composite";
    return makeTask({
      criterionCode: "5NF-1",
      rocketPart: "engine",
      tier,
      briefing: `The thrust computer wants to split its ${n} kilonewtons across several equal-power channels, each carrying more than 1 kN. Check whether ${n} can be split into equal groups like that. Is ${n} prime or composite?`,
      engineeringContext: "Prime outputs cannot be shared into equal channels, so the computer needs a different setting.",
      answer: ans,
      choices: mc(rng, ans, ["prime", "composite"].filter((c) => c !== ans)),
      workedSteps: [
        `Try dividing ${n} by small numbers: 2, 3, 5, 7...`,
        isPrime ? `Nothing divides ${n} exactly, so it is prime.` : `${n} splits into equal groups, so it is composite.`,
      ],
      hints: ["A prime number only splits into a group of 1 or the whole lot.", `Does anything in your times tables make ${n}?`],
      visual: { widget: "payloadSplit", config: { total: n, groups: 0, mode: "primeCheck" } },
      rocketEffect: thrustEffect(250),
    });
  },

  "5NF-2": (rng, tier) => {
    const base = rng.pick([4, 6, 8, 12, 16, 24]) * (tier === 3 ? 10 : 1);
    const ans = base / 10;
    return makeTask({
      criterionCode: "5NF-2",
      rocketPart: "engine",
      tier,
      briefing: `The main fuel line carries ${base} litres each second at full power. For a gentle landing burn the engine throttles down to one tenth of that flow. How many litres a second is the landing flow?`,
      engineeringContext: "The landing burn must sip fuel — a tenth of full flow keeps it hovering.",
      answer: String(ans),
      choices: tier === 1 ? mc(rng, String(ans), [String(base / 2), String(base - 10), String(ans * 10)]) : undefined,
      workedSteps: [`One tenth of ${base} moves the digits one place right.`, `That gives ${ans} litres each second.`],
      hints: ["Finding one tenth moves each digit down one place-value column.", `Share ${base} into 10 equal parts.`],
      visual: { widget: "ratioMixer", config: { left: base, right: ans, readOnly: true, unit: "L/s" } },
      rocketEffect: thrustEffect(160),
    });
  },

  "2MD-1": (rng, tier) => {
    const per = rng.int(2, 5);
    const engines = rng.int(2, tier === 1 ? 4 : 5);
    const ans = per * engines;
    return makeTask({
      criterionCode: "2MD-1",
      rocketPart: "engine",
      tier,
      briefing: `Every engine needs ${per} fuel lines running into it, and this rocket carries ${engines} engines. The plumber lays the lines one engine at a time. How many fuel lines will be laid altogether?`,
      engineeringContext: "Each line feeds one part of the engine — none can be shared.",
      answer: String(ans),
      choices: tier === 1 ? mc(rng, String(ans), [String(per + engines), String(ans + per), String(ans - per)]) : undefined,
      workedSteps: [`${engines} engines, ${per} lines each.`, `${engines} equal groups of ${per} makes ${ans} lines.`],
      hints: [`Count ${per} for each engine: ${Array.from({ length: engines }, (_, i) => per * (i + 1)).join(", ")}.`, "Equal groups can be counted with a times table."],
      visual: { widget: "circuit", config: { mode: "injectors", groups: engines, perGroup: per } },
      rocketEffect: countEffect(engines),
    });
  },

  "2MD-2": (rng, tier) => {
    const engines = rng.int(2, 5);
    const each = rng.int(2, tier === 1 ? 5 : 10);
    const total = engines * each;
    return makeTask({
      criterionCode: "2MD-2",
      rocketPart: "engine",
      tier,
      briefing: `A box of ${total} spark plugs has arrived, to be shared out equally between the rocket's ${engines} engines. How many spark plugs does each engine get?`,
      engineeringContext: "Every engine must fire evenly, so the plugs are shared exactly.",
      answer: String(each),
      choices: tier === 1 ? mc(rng, String(each), nearBy(rng, each, 2)) : undefined,
      workedSteps: [`Share ${total} into ${engines} equal groups.`, `Each engine gets ${each} plugs.`],
      hints: [`Deal them out one at a time to the ${engines} engines.`, `What number, taken ${engines} times, makes ${total}?`],
      visual: { widget: "payloadSplit", config: { total, groups: engines, mode: "share" } },
      rocketEffect: countEffect(engines),
    });
  },

  "3MD-2": (rng, tier) => {
    const thrust = rng.pick(tier === 1 ? [100, 150, 200] : [125, 150, 175, 225, 250]);
    const engines = rng.int(2, tier === 3 ? 8 : 5);
    const ans = thrust * engines;
    return makeTask({
      criterionCode: "3MD-2",
      rocketPart: "engine",
      tier,
      briefing: `Each engine on this rocket pushes with ${fmt(thrust)} kilonewtons of thrust. The rocket lights ${engines} engines at liftoff. Mission Control needs the total push to check the rocket can leave the pad. What is the total thrust?`,
      engineeringContext: "The total thrust must beat the rocket's weight or it never lifts off.",
      answer: String(ans),
      workedSteps: [`${engines} engines each pushing ${fmt(thrust)} kN.`, `${engines} groups of ${fmt(thrust)} makes ${fmt(ans)} kN.`],
      hints: [`Start with ${fmt(thrust)} doubled, then keep going.`, `Break ${fmt(thrust)} into hundreds and tens to multiply.`],
      visual: { widget: "circuit", config: { mode: "thrust", groups: engines, perGroup: thrust } },
      rocketEffect: thrustEffect(thrust),
    });
  },

  "4MD-1": (rng, tier) => {
    const rate = rng.int(115, tier === 3 ? 385 : 265);
    const engines = rng.int(2, 4);
    const ans = rate * engines;
    return makeTask({
      criterionCode: "4MD-1",
      rocketPart: "engine",
      tier,
      briefing: `Each engine drinks ${fmt(rate)} kilograms of fuel every second at full power. With ${engines} engines running, the tank team needs the combined fuel flow each second. What is it, in kilograms?`,
      engineeringContext: "The pumps must be sized to deliver this flow or the engines starve.",
      answer: String(ans),
      workedSteps: [
        `Break ${fmt(rate)} into hundreds, tens and ones, and take each ${engines} times.`,
        `Together that is ${fmt(ans)} kg each second.`,
      ],
      hints: [`Multiply the hundreds first, then the tens, then the ones.`, `${fmt(rate)} taken ${engines} times.`],
      visual: { widget: "circuit", config: { mode: "thrust", groups: engines, perGroup: rate } },
      rocketEffect: countEffect(engines),
    });
  },

  "4MD-2": (rng, tier) => {
    const per = rng.pick([6, 7, 8, 9, 12]);
    const rows = rng.int(4, tier === 3 ? 12 : 9);
    const total = per * rows;
    return makeTask({
      criterionCode: "4MD-2",
      rocketPart: "engine",
      tier,
      briefing: `The injector plate holds ${total} injectors arranged in neat rows of ${per}. The cleaning robot works row by row and needs to know how many rows to clean. How many rows are there?`,
      engineeringContext: "The robot's programme runs once per row — the count must be exact.",
      answer: String(rows),
      choices: tier === 1 ? mc(rng, String(rows), nearBy(rng, rows, 2)) : undefined,
      workedSteps: [`Some rows of ${per} make ${total} altogether.`, `Count up in ${per}s to ${total}: that takes ${rows} rows.`],
      hints: [`What number of rows, each holding ${per}, gives ${total}?`, `Use the ${per} times table backwards.`],
      visual: { widget: "payloadSplit", config: { total, groups: per, mode: "rows" } },
      rocketEffect: thrustEffect(235),
    });
  },

  "5MD-1": (rng, tier) => {
    const secs = rng.int(tier === 3 ? 1250 : 120, tier === 3 ? 2950 : 850);
    const perSec = rng.int(3, 12);
    const ans = secs * perSec;
    return makeTask({
      criterionCode: "5MD-1",
      rocketPart: "engine",
      tier,
      briefing: `The main burn is planned to last ${fmt(secs)} seconds, and the engine uses ${perSec} kilograms of fuel every second. The loading crew must know the total fuel for the whole burn. How many kilograms should they load?`,
      engineeringContext: "Loading too little cuts the burn short; too much wastes lifting power.",
      answer: String(ans),
      workedSteps: [
        `Take ${fmt(secs)} once for every kilogram per second.`,
        `${fmt(secs)} taken ${perSec} times is ${fmt(ans)} kg.`,
      ],
      hints: ["Break the seconds into thousands, hundreds, tens and ones.", "Multiply each part, then combine."],
      visual: { widget: "fuelGauge", config: { capacity: ans * 1.2, level: ans, readOnly: true, unit: "kg" } },
      rocketEffect: thrustEffect(260),
    });
  },

  "5MD-2": (rng, tier) => {
    const n = rng.pick(tier === 1 ? [12, 20, 24] : [24, 36, 40, 48, 60]);
    const factors: number[] = [];
    for (let i = 2; i < n; i++) if (n % i === 0) factors.push(i);
    const good = rng.pick(factors);
    const bads: number[] = [];
    let cand = 2;
    while (bads.length < 3 && cand < n) {
      if (n % cand !== 0 && !bads.includes(cand)) bads.push(cand + 0);
      cand += rng.int(1, 3);
    }
    return makeTask({
      criterionCode: "5MD-2",
      rocketPart: "engine",
      tier,
      briefing: `The turbine has ${n} blades that must be arranged in rings, with every ring holding exactly the same number of blades and none left over. Which of these ring sizes will work?`,
      engineeringContext: "An uneven ring makes the turbine wobble itself to pieces.",
      answer: String(good),
      choices: mc(rng, String(good), bads.map(String)),
      workedSteps: [
        `A ring size works if it divides ${n} exactly.`,
        `${good} divides ${n} exactly (${n / good} rings), so ${good} works.`,
      ],
      hints: [`Try sharing ${n} blades into each ring size — any left over?`, `Which choice is a factor of ${n}?`],
      visual: { widget: "payloadSplit", config: { total: n, groups: good, mode: "rows" } },
      rocketEffect: thrustEffect(245),
    });
  },

  "6MD-1": (rng, tier) => {
    const engines = tier === 3 ? rng.pick([12, 15, 16, 24]) : rng.pick([4, 6, 8]);
    const each = rng.int(tier === 3 ? 115 : 350, tier === 3 ? 385 : 950);
    const total = engines * each;
    return makeTask({
      criterionCode: "6MD-1",
      rocketPart: "engine",
      tier,
      briefing: `The design sheet says this rocket's total thrust is ${fmt(total)} kilonewtons, shared exactly equally across its ${engines} engines. The test stand checks engines one at a time. What thrust should each single engine produce?`,
      engineeringContext: "If one engine tests below its share, the whole rocket is grounded.",
      answer: String(each),
      workedSteps: [
        `Share ${fmt(total)} equally between ${engines} engines using division.`,
        `Each engine must produce ${fmt(each)} kN.`,
      ],
      hints: [`How many times does ${engines} fit into the thousands of ${fmt(total)}?`, "Work through the digits left to right, carrying remainders."],
      visual: { widget: "payloadSplit", config: { total, groups: engines, mode: "share" } },
      rocketEffect: thrustEffect(each > 400 ? 300 : each),
    });
  },
};