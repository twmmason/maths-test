import type { GeneratedTask } from "../types";
import type { Rng } from "../rng";
import { makeTask, mc, nearBy, fmt, frac, dec, gcd, lcm, primeFactorisation, roundSf } from "./helpers";

type Gen = (rng: Rng, tier: 1 | 2 | 3) => GeneratedTask;

/** Propellant Chemistry Lab — KS3 Number lives in the upgraded fuel system. */

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

const readout = (text: string) => ({ widget: "equation" as const, config: { readout: text } });

export const ks3NumberTemplates: Record<string, Gen> = {
  // Place value for decimals, measures and integers of any size
  "KS3N-1": (rng, tier) => {
    if (tier === 1) {
      const digits = [rng.int(1, 9), rng.int(0, 9), rng.int(1, 9), rng.int(0, 9), rng.int(1, 9), rng.int(0, 9), rng.int(1, 9)];
      const n = Number(digits.join(""));
      const pos = rng.pick([0, 2, 4]); // millions, ten-thousands, hundreds
      const place = 10 ** (6 - pos);
      const ans = digits[pos] * place;
      return makeTask({
        criterionCode: "KS3N-1",
        rocketPart: "fuelTank",
        tier,
        briefing: `The molecule counter reads ${fmt(n)} propellant molecules in the sample. The chemist needs to log the value of the digit ${digits[pos]} in that reading. What is it worth?`,
        engineeringContext: "Mis-reading one digit in the molecule count throws the whole batch mix off.",
        answer: String(ans),
        choices: mc(rng, String(ans), [String(digits[pos] * place * 10), String(digits[pos] * Math.max(1, place / 10)), String(digits[pos])]),
        workedSteps: [`Count the places from the right: that digit sits in the ${fmt(place)}s place.`, `So the digit ${digits[pos]} is worth ${fmt(ans)}.`],
        hints: ["Write the number in a place-value grid.", "Each step left multiplies the place by ten."],
        visual: readout(`${fmt(n)} molecules`),
        rocketEffect: fillEffect(0.7, 0.5),
      });
    }
    const whole = rng.int(1, 9);
    const tenths = rng.int(1, 9);
    const hundredths = rng.int(1, 9);
    const thousandths = tier === 3 ? rng.int(1, 9) : 0;
    const value = whole + tenths / 10 + hundredths / 100 + thousandths / 1000;
    const which = tier === 3 ? rng.pick(["tenths", "hundredths", "thousandths"]) : rng.pick(["tenths", "hundredths"]);
    const digit = which === "tenths" ? tenths : which === "hundredths" ? hundredths : thousandths;
    const worth = which === "tenths" ? digit / 10 : which === "hundredths" ? digit / 100 : digit / 1000;
    return makeTask({
      criterionCode: "KS3N-1",
      rocketPart: "fuelTank",
      tier,
      briefing: `The precision flow meter shows ${dec(value, 3)} litres per second. Quality control wants the value of the digit in the ${which} place. What is that digit worth, as a decimal?`,
      engineeringContext: "The lab logs every decimal place of the flow rate separately for the safety audit.",
      answer: dec(worth, 3),
      workedSteps: [`The digit in the ${which} place of ${dec(value, 3)} is ${digit}.`, `One ${which.slice(0, -1)} is worth ${which === "tenths" ? "0.1" : which === "hundredths" ? "0.01" : "0.001"}, so the digit is worth ${dec(worth, 3)}.`],
      hints: ["Say the number aloud, place by place: ones, tenths, hundredths…", `Find the digit sitting in the ${which} column first.`],
      visual: readout(`${dec(value, 3)} L/s`),
      rocketEffect: fillEffect(0.75, 0.55),
      tolerance: 0.0001,
    });
  },

  // Order positive/negative integers, decimals, fractions; number line; inequality symbols
  "KS3N-2": (rng, tier) => {
    if (tier === 3) {
      const options = [
        { list: ["-3/4", "-0.5", "0.3", "2/5"], low: "-3/4" },
        { list: ["-1/2", "-0.7", "1/4", "0.2"], low: "-0.7" },
        { list: ["-0.25", "-2/5", "0.1", "-1/8"], low: "-2/5" },
        { list: ["-1.2", "-5/4", "-0.9", "-7/8"], low: "-5/4" },
      ];
      const o = rng.pick(options);
      return makeTask({
        criterionCode: "KS3N-2",
        rocketPart: "fuelTank",
        tier,
        briefing: `Four cryo-sensors logged these overnight drift readings, in degrees: ${o.list.join(", ")}. Mission Control needs the lowest reading first in the report. Which reading is the lowest?`,
        engineeringContext: "Drift readings are filed coldest-first so engineers spot the worst sensor instantly.",
        answer: o.low,
        choices: mc(rng, o.low, o.list.filter((x) => x !== o.low)),
        workedSteps: ["Convert each fraction to a decimal so everything is in the same form.", `Compare on a number line: the furthest left is ${o.low}.`],
        hints: ["Turn the fractions into decimals first.", "With negative readings, the bigger the digits, the colder it is."],
        visual: { widget: "numberLine", config: { min: -2, max: 1, step: 0.25, readOnly: true } },
        rocketEffect: fillEffect(0.8, 0.6),
      });
    }
    const count = 4;
    const vals = new Set<number>();
    while (vals.size < count) vals.add(tier === 1 ? rng.int(-9, 9) : Math.round(rng.int(-90, 90)) / 10);
    const list = [...vals];
    const askLowest = rng.next() < 0.5;
    const ans = askLowest ? Math.min(...list) : Math.max(...list);
    return makeTask({
      criterionCode: "KS3N-2",
      rocketPart: "fuelTank",
      tier,
      briefing: `The propellant tanks reported these overnight temperatures, in degrees: ${list.map((v) => dec(v, 1)).join(", ")}. Which temperature was the ${askLowest ? "lowest" : "highest"}?`,
      engineeringContext: "The coldest tank sets how long the pre-heat cycle must run before fuelling.",
      answer: dec(ans, 1),
      choices: tier === 1 ? mc(rng, dec(ans, 1), list.filter((v) => v !== ans).map((v) => dec(v, 1))) : undefined,
      workedSteps: ["Place each reading on a number line — negatives sit left of zero.", `The ${askLowest ? "furthest left" : "furthest right"} is ${dec(ans, 1)}.`],
      hints: ["Negative readings are below zero: -7 is colder than -3.", "Sketch a quick number line and mark each reading."],
      visual: { widget: "numberLine", config: { min: -10, max: 10, step: 1, pointer: ans, readOnly: true, unit: "°C" } },
      rocketEffect: fillEffect(0.75, 0.55),
    });
  },

  // Primes, factors, multiples, HCF, LCM, prime factorisation
  "KS3N-3": (rng, tier) => {
    const variant = tier === 1 ? "hcf" : tier === 2 ? rng.pick(["hcf", "lcm"]) : rng.pick(["lcm", "primefact"]);
    if (variant === "primefact") {
      const n = rng.pick([24, 36, 40, 60, 72, 90]);
      const ans = primeFactorisation(n);
      const wrongs = [primeFactorisation(n * 2), primeFactorisation(Math.max(2, n / 2)), primeFactorisation(n + 6)].filter((w) => w !== ans);
      return makeTask({
        criterionCode: "KS3N-3",
        rocketPart: "fuelTank",
        tier,
        briefing: `Batch ${n} pellets must be logged in the chemistry ledger as a product of prime numbers only. Which product notation is correct for ${n}?`,
        engineeringContext: "Prime products let the packing machine build any crate arrangement without waste.",
        answer: ans,
        choices: mc(rng, ans, wrongs),
        workedSteps: [`Split ${n} with a factor tree, dividing by primes: 2, 3, 5…`, `Collect the primes with powers: ${n} is ${ans}.`],
        hints: ["Keep halving while the number is even.", "A factor tree finishes when every branch ends on a prime."],
        visual: readout(`batch size ${n}`),
        rocketEffect: ratioEffect(3),
      });
    }
    if (variant === "lcm") {
      const pairs = [[6, 8], [4, 10], [6, 9], [8, 12], [10, 15], [12, 18]];
      const [a, b] = rng.pick(pairs);
      const ans = lcm(a, b);
      return makeTask({
        criterionCode: "KS3N-3",
        rocketPart: "fuelTank",
        tier,
        briefing: `The fuel valve clicks every ${a} seconds and the oxidiser valve clicks every ${b} seconds. They just clicked together. After how many seconds will they next click at exactly the same moment?`,
        engineeringContext: "Synchronised valve clicks are when the mixing chamber can safely be sampled.",
        answer: String(ans),
        choices: tier === 2 ? mc(rng, String(ans), [String(a * b), String(ans * 2), String(a + b)]) : undefined,
        workedSteps: [`List multiples of ${a} and of ${b}.`, `The first number in both lists is ${ans} — the lowest common multiple.`],
        hints: [`Count up in ${a}s and in ${b}s.`, "You want the first number that appears in both lists."],
        visual: { widget: "sequence", config: { terms: Array.from({ length: 5 }, (_, i) => a * (i + 1)).join(","), terms2: Array.from({ length: 5 }, (_, i) => b * (i + 1)).join(","), label: "valve clicks (s)" } },
        rocketEffect: ratioEffect(4),
      });
    }
    const pairs = tier === 1 ? [[12, 18], [10, 15], [8, 12], [6, 9]] : [[24, 36], [18, 30], [28, 42], [32, 48], [45, 60]];
    const [a, b] = rng.pick(pairs);
    const ans = gcd(a, b);
    return makeTask({
      criterionCode: "KS3N-3",
      rocketPart: "fuelTank",
      tier,
      briefing: `We have ${a} fuel pellets and ${b} oxidiser pellets. Every crate must hold only one kind, all crates the same size, with nothing left over. What is the largest crate size we can use?`,
      engineeringContext: "Equal crates keep the pad crane perfectly balanced during loading.",
      answer: String(ans),
      choices: tier === 1 ? mc(rng, String(ans), nearBy(rng, ans, 3)) : undefined,
      workedSteps: [`List the factors of ${a} and of ${b}.`, `The biggest number in both lists is ${ans} — the highest common factor.`],
      hints: [`Which numbers divide exactly into both ${a} and ${b}?`, "Try the factors of the smaller number, biggest first."],
      visual: readout(`${a} fuel pellets · ${b} oxidiser pellets`),
      rocketEffect: ratioEffect(ans),
    });
  },

  // Four operations with integers, decimals, fractions, mixed numbers (pos and neg)
  "KS3N-4": (rng, tier) => {
    if (tier === 1) {
      const start = -rng.int(2, 9);
      const drop = rng.int(3, 9);
      const ans = start - drop;
      return makeTask({
        criterionCode: "KS3N-4",
        rocketPart: "fuelTank",
        tier,
        briefing: `The cryo tank reads ${start} degrees and the chiller pulls it down by another ${drop} degrees overnight. What will the gauge read in the morning?`,
        engineeringContext: "The morning reading decides whether the tank needs a warm-up cycle before fuelling.",
        answer: String(ans),
        choices: mc(rng, String(ans), [String(start + drop), String(-(Math.abs(start) - drop)), String(ans - 1)]),
        workedSteps: [`Start at ${start} on the number line and step down ${drop} more.`, `You land on ${ans}.`],
        hints: ["Going colder means moving left along the number line.", `Count down ${drop} steps starting from ${start}.`],
        visual: { widget: "numberLine", config: { min: -20, max: 5, step: 1, pointer: start, readOnly: true, unit: "°C" } },
        rocketEffect: fillEffect(0.7, 0.5),
      });
    }
    if (tier === 2) {
      const variant = rng.pick(["decimals", "negmul"]);
      if (variant === "negmul") {
        const k = rng.int(3, 6);
        const q = -rng.int(2, 8);
        const ans = k * q;
        return makeTask({
          criterionCode: "KS3N-4",
          rocketPart: "fuelTank",
          tier,
          briefing: `Each of the ${k} vent cycles changes the tank pressure by ${q} millibars. What is the total pressure change after all ${k} cycles?`,
          engineeringContext: "The total vent change is fed straight into the pressurisation controller.",
          answer: String(ans),
          workedSteps: [`Each cycle changes the pressure by ${q}, and there are ${k} cycles.`, `${k} lots of ${q} is ${ans}.`],
          hints: ["A negative change repeated stays negative.", `Work out ${k} lots of ${Math.abs(q)} first, then apply the sign.`],
          visual: readout(`${k} cycles at ${q} mbar each`),
          rocketEffect: fillEffect(0.75, 0.55),
        });
      }
      const a = rng.int(12, 60) / 10;
      const b = rng.int(12, 60) / 10;
      const ans = Math.round((a + b) * 10) / 10;
      return makeTask({
        criterionCode: "KS3N-4",
        rocketPart: "fuelTank",
        tier,
        briefing: `The morning delivery pumped in ${dec(a, 1)} litres of propellant and the afternoon delivery ${dec(b, 1)} litres. How many litres arrived in total today?`,
        engineeringContext: "The daily total goes on the fuel manifest that Mission Control signs off.",
        answer: dec(ans, 1),
        workedSteps: ["Line up the decimal points before combining.", `${dec(a, 1)} with ${dec(b, 1)} makes ${dec(ans, 1)} litres.`],
        hints: ["Line up the decimal points in columns.", "Combine the tenths first, then the ones."],
        visual: readout(`${dec(a, 1)} L morning · ${dec(b, 1)} L afternoon`),
        rocketEffect: fillEffect(0.8, 0.6),
        tolerance: 0.01,
      });
    }
    const wholes = [1, 2];
    const w1 = rng.pick(wholes);
    const w2 = rng.pick(wholes);
    const den = rng.pick([2, 4]);
    const n1 = rng.int(1, den - 1);
    const n2 = rng.int(1, den - 1);
    const totalQuarters = (w1 * den + n1) + (w2 * den + n2);
    const whole = Math.floor(totalQuarters / den);
    const rem = totalQuarters % den;
    const g = gcd(rem || den, den);
    const ans = rem === 0 ? String(whole) : `${whole} ${rem / g}/${den / g}`;
    return makeTask({
      criterionCode: "KS3N-4",
      rocketPart: "fuelTank",
      tier,
      briefing: `Two feed pipes must be joined end to end. One measures ${w1} ${frac(n1, den)} metres and the other ${w2} ${frac(n2, den)} metres. How long will the joined pipe be, in metres?`,
      engineeringContext: "The joined pipe has to reach from the pump skid to the tank inlet exactly.",
      answer: ans,
      workedSteps: [`Combine the whole metres: ${w1} and ${w2}.`, `Combine the fraction parts and simplify: the total is ${ans} metres.`],
      hints: ["Deal with the whole metres first, then the fraction parts.", `Both fractions are in ${den}ths — combine the tops.`],
      visual: readout(`${w1} ${frac(n1, den)} m and ${w2} ${frac(n2, den)} m`),
      rocketEffect: fillEffect(0.8, 0.6),
      acceptEquivalentFractions: true,
    });
  },

  // Priority of operations incl. brackets, powers, roots, reciprocals
  "KS3N-5": (rng, tier) => {
    if (tier === 1) {
      const a = rng.int(2, 9);
      const b = rng.int(2, 5);
      const c = rng.int(2, 5);
      const ans = a + b * c;
      return makeTask({
        criterionCode: "KS3N-5",
        rocketPart: "fuelTank",
        tier,
        briefing: `The mixing computer must run the instruction shown on its readout. It always follows the proper order of operations. What result should it print?`,
        engineeringContext: "The instruction sets how many scoops of catalyst go into the mix.",
        answer: String(ans),
        choices: mc(rng, String(ans), [String((a + b) * c), String(a * b + c), String(ans + b)]),
        workedSteps: [`Multiplication comes before addition: ${b} × ${c} = ${b * c}.`, `Then add ${a}: the result is ${ans}.`],
        hints: ["Multiplication happens before addition.", `Work out ${b} lots of ${c} first.`],
        visual: readout(`${a} + ${b} × ${c}`),
        rocketEffect: ratioEffect(3),
      });
    }
    if (tier === 2) {
      const a = rng.int(10, 20);
      const b = rng.int(2, 4);
      const c = rng.int(1, 4);
      const d = rng.int(2, 3);
      const ans = a - b * (c + d);
      return makeTask({
        criterionCode: "KS3N-5",
        rocketPart: "fuelTank",
        tier,
        briefing: `The pressure controller runs the bracketed instruction on its readout, obeying brackets before everything else. What value should it output?`,
        engineeringContext: "This output sets the vent valve opening in millimetres.",
        answer: String(ans),
        workedSteps: [`Brackets first: ${c} + ${d} = ${c + d}.`, `Then multiply: ${b} × ${c + d} = ${b * (c + d)}.`, `Finally subtract from ${a}: ${ans}.`],
        hints: ["Brackets first, then multiply, then subtract.", `Start with ${c} plus ${d}.`],
        visual: readout(`${a} - ${b} × (${c} + ${d})`),
        rocketEffect: ratioEffect(4),
      });
    }
    const base = rng.pick([2, 3]);
    const exp = base === 2 ? rng.pick([3, 4]) : 2;
    const a = rng.int(2, 6);
    const b = rng.int(2, 4);
    const ans = a + b * base ** exp;
    return makeTask({
      criterionCode: "KS3N-5",
      rocketPart: "fuelTank",
      tier,
      briefing: `The flow computer evaluates the powered instruction on its readout, applying powers before multiplying and adding. What result should appear?`,
      engineeringContext: "This number becomes the pump speed in litres per minute.",
      answer: String(ans),
      workedSteps: [`Powers first: ${base}^${exp} = ${base ** exp}.`, `Multiply: ${b} × ${base ** exp} = ${b * base ** exp}.`, `Add ${a}: the result is ${ans}.`],
      hints: ["The order is: powers, then multiplication, then addition.", `${base}^${exp} means ${base} multiplied by itself ${exp} times.`],
      visual: readout(`${a} + ${b} × ${base}^${exp}`),
      rocketEffect: ratioEffect(5),
    });
  },

  // Relationships between operations incl. inverse operations
  "KS3N-6": (rng, tier) => {
    if (tier === 3) {
      const root = rng.int(4, 12);
      const sq = root * root;
      return makeTask({
        criterionCode: "KS3N-6",
        rocketPart: "fuelTank",
        tier,
        briefing: `The pressure sensor squares its raw signal before displaying it, and the display shows ${sq}. Use the inverse of squaring to recover the raw signal.`,
        engineeringContext: "Engineers need the raw signal to calibrate the replacement sensor.",
        answer: String(root),
        workedSteps: ["The inverse of squaring is taking the square root.", `The square root of ${sq} is ${root}.`],
        hints: ["What operation undoes squaring?", `Which number multiplied by itself gives ${sq}?`],
        visual: readout(`display: ${sq}  (signal squared)`),
        rocketEffect: fillEffect(0.8, 0.6),
      });
    }
    const k = rng.int(3, tier === 1 ? 6 : 12);
    const orig = rng.int(4, tier === 1 ? 12 : 40);
    const result = k * orig;
    return makeTask({
      criterionCode: "KS3N-6",
      rocketPart: "fuelTank",
      tier,
      briefing: `The booster pump multiplies the incoming flow by ${k}, and the outgoing flow measures ${fmt(result)} litres per minute. Use the inverse operation to find the incoming flow.`,
      engineeringContext: "The incoming flow tells us whether the supply line itself is healthy.",
      answer: String(orig),
      choices: tier === 1 ? mc(rng, String(orig), [String(result - k), String(orig + k), String(orig * 2)]) : undefined,
      workedSteps: [`The inverse of multiplying by ${k} is dividing by ${k}.`, `${fmt(result)} divided by ${k} is ${orig}.`],
      hints: ["Which operation undoes multiplying?", `Split ${fmt(result)} into ${k} equal parts.`],
      visual: readout(`out: ${fmt(result)} L/min  (in × ${k})`),
      rocketEffect: fillEffect(0.75, 0.55),
    });
  },

  // Integer powers and real roots; powers of 2,3,4,5; exact vs approximate roots
  "KS3N-7": (rng, tier) => {
    if (tier === 1) {
      const base = rng.pick([2, 3, 4, 5]);
      const exp = base === 2 ? rng.pick([3, 4, 5]) : base === 3 ? rng.pick([2, 3]) : 2;
      const ans = base ** exp;
      return makeTask({
        criterionCode: "KS3N-7",
        rocketPart: "fuelTank",
        tier,
        briefing: `The catalyst doubler chains ${exp} stages, each multiplying by ${base}. Starting from 1 gram, the readout shows the power notation. How many grams come out?`,
        engineeringContext: "Chained catalyst stages grow the reaction mass by the same factor each time.",
        answer: String(ans),
        choices: mc(rng, String(ans), [String(base * exp), String(base ** (exp - 1)), String(ans + base)]),
        workedSteps: [`${base}^${exp} means ${exp} copies of ${base} multiplied together.`, `That gives ${ans}.`],
        hints: [`${base}^${exp} is NOT ${base} × ${exp}.`, `Multiply: ${base}, then by ${base} again, ${exp} times in all.`],
        visual: readout(`${base}^${exp} grams`),
        rocketEffect: ratioEffect(base),
      });
    }
    if (tier === 2) {
      const edge = rng.int(3, 9);
      const cube = edge ** 3;
      return makeTask({
        criterionCode: "KS3N-7",
        rocketPart: "fuelTank",
        tier,
        briefing: `A cubic pellet crate holds exactly ${fmt(cube)} pellets, stacked the same number along every edge. How many pellets long is one edge?`,
        engineeringContext: "Edge counts let the loader arm plan its grip positions.",
        answer: String(edge),
        workedSteps: [`We need the cube root of ${fmt(cube)}.`, `${edge} × ${edge} × ${edge} = ${fmt(cube)}, so the edge is ${edge} pellets.`],
        hints: ["Cube root: which number used three times in a multiplication gives the total?", `Try small numbers: 4 cubed is 64, 5 cubed is 125…`],
        visual: readout(`crate capacity: ${fmt(cube)} pellets (a perfect cube)`),
        rocketEffect: fillEffect(0.8, 0.6),
      });
    }
    const targets = [
      { n: 50, lo: 7, hi: 8 },
      { n: 30, lo: 5, hi: 6 },
      { n: 70, lo: 8, hi: 9 },
      { n: 20, lo: 4, hi: 5 },
      { n: 90, lo: 9, hi: 10 },
    ];
    const t = rng.pick(targets);
    const ans = `${t.lo} and ${t.hi}`;
    return makeTask({
      criterionCode: "KS3N-7",
      rocketPart: "fuelTank",
      tier,
      briefing: `A square baffle plate must have area ${t.n} square centimetres. Its side length is the square root of ${t.n}, which is not a whole number. Between which two whole numbers does the side length lie?`,
      engineeringContext: "Knowing the bounds tells the cutter which stock strip to start from.",
      answer: ans,
      choices: mc(rng, ans, [`${t.lo - 1} and ${t.lo}`, `${t.hi} and ${t.hi + 1}`, `${t.lo + 2} and ${t.hi + 2}`]),
      workedSteps: [`${t.lo}² = ${t.lo ** 2} and ${t.hi}² = ${t.hi ** 2}.`, `${t.n} sits between them, so the root lies between ${t.lo} and ${t.hi} — an approximation, not an exact root.`],
      hints: ["Square some whole numbers and see which pair traps the area.", `Is ${t.n} a perfect square? If not, the root is a decimal.`],
      visual: readout(`plate area: ${t.n} cm²`),
      rocketEffect: fillEffect(0.85, 0.65),
    });
  },

  // Standard form A × 10^n
  "KS3N-8": (rng, tier) => {
    if (tier === 1) {
      const a = rng.int(2, 9);
      const n = rng.int(3, 5);
      const value = a * 10 ** n;
      return makeTask({
        criterionCode: "KS3N-8",
        rocketPart: "fuelTank",
        tier,
        briefing: `The spectrometer logs the molecule count in standard form, shown on the readout. The old pump computer only takes ordinary numbers. What ordinary number should we type in?`,
        engineeringContext: "Both computers must hold exactly the same count or the mix drifts.",
        answer: String(value),
        choices: mc(rng, String(value), [String(a * 10 ** (n - 1)), String(a * 10 ** (n + 1)), String(a * n)]),
        workedSteps: [`${a} × 10^${n} means ${a} followed by ${n} zeros in place value.`, `That is ${fmt(value)}.`],
        hints: [`10^${n} is a 1 with ${n} zeros.`, `Multiply ${a} by that power of ten.`],
        visual: { widget: "standardForm", config: { mode: "read", a, n } },
        rocketEffect: ratioEffect(3),
      });
    }
    const negative = tier === 3 && rng.next() < 0.5;
    if (negative) {
      const a = rng.int(11, 89) / 10;
      const n = -rng.int(3, 6);
      const ans = `${dec(a, 1)} × 10^${n}`;
      const ordinary = a * 10 ** n;
      return makeTask({
        criterionCode: "KS3N-8",
        rocketPart: "fuelTank",
        tier,
        briefing: `One propellant droplet has mass ${ordinary.toFixed(Math.abs(n) + 1).replace(/0+$/, "").replace(/\.$/, "")} grams. Use the standard-form builder to express this tiny mass with one digit before the decimal point.`,
        engineeringContext: "Standard form keeps the droplet log readable — no strings of zeros.",
        answer: ans,
        workedSteps: [`Move the decimal point right until one non-zero digit leads: that gives ${dec(a, 1)}.`, `You moved it ${Math.abs(n)} places right, so the power is 10^${n}.`],
        hints: ["For numbers smaller than 1 the power of ten is negative.", "Count how many places the decimal point moves."],
        visual: { widget: "standardForm", config: { mode: "build", interactive: true, targetOrdinary: ordinary } },
        rocketEffect: ratioEffect(2),
      });
    }
    const a = rng.int(11, 89) / 10;
    const n = rng.int(4, tier === 3 ? 10 : 7);
    const value = a * 10 ** n;
    const ans = `${dec(a, 1)} × 10^${n}`;
    return makeTask({
      criterionCode: "KS3N-8",
      rocketPart: "fuelTank",
      tier,
      briefing: `The sample holds ${fmt(value)} propellant molecules. That is far too long for the chemistry ledger. Use the standard-form builder to express the count with one digit before the decimal point.`,
      engineeringContext: "Ledger entries must be in standard form so counts of any size line up.",
      answer: ans,
      workedSteps: [`Place the decimal after the first digit: ${dec(a, 1)}.`, `Count the places back to the original number: ${n}, so the count is ${dec(a, 1)} × 10^${n}.`],
      hints: ["The front number must be at least 1 and less than 10.", "The power counts how many places the decimal point moved."],
      visual: { widget: "standardForm", config: { mode: "build", interactive: true, targetOrdinary: value } },
      rocketEffect: ratioEffect(3),
    });
  },

  // Terminating decimals ↔ fractions
  "KS3N-9": (rng, tier) => {
    const table = [
      { f: [1, 2], d: "0.5" }, { f: [1, 4], d: "0.25" }, { f: [3, 4], d: "0.75" },
      { f: [1, 5], d: "0.2" }, { f: [2, 5], d: "0.4" }, { f: [3, 5], d: "0.6" },
      { f: [3, 8], d: "0.375" }, { f: [5, 8], d: "0.625" }, { f: [7, 20], d: "0.35" }, { f: [9, 25], d: "0.36" },
    ];
    const pool = tier === 1 ? table.slice(0, 6) : tier === 2 ? table.slice(0, 8) : table;
    const p = rng.pick(pool);
    const toFraction = rng.next() < 0.5;
    if (toFraction) {
      return makeTask({
        criterionCode: "KS3N-9",
        rocketPart: "fuelTank",
        tier,
        briefing: `The digital mixer shows the additive setting as ${p.d}. The manual backup dial only takes fractions in simplest form. What fraction should we set the dial to?`,
        engineeringContext: "Digital and manual mixers must agree exactly or the additive dose is wrong.",
        answer: frac(p.f[0], p.f[1]),
        choices: tier === 1 ? mc(rng, frac(p.f[0], p.f[1]), [frac(p.f[0], p.f[1] * 2), frac(Math.max(1, p.f[0] - 1), p.f[1]), frac(p.f[0] + 1, p.f[1])]) : undefined,
        workedSteps: [`Read ${p.d} by place value — tenths, hundredths, thousandths.`, `Simplify the fraction: ${p.d} is ${frac(p.f[0], p.f[1])}.`],
        hints: ["Write the decimal over 10, 100 or 1000 first.", "Then divide top and bottom by their common factor."],
        visual: readout(`additive setting: ${p.d}`),
        rocketEffect: ratioEffect(2),
        acceptEquivalentFractions: true,
      });
    }
    return makeTask({
      criterionCode: "KS3N-9",
      rocketPart: "fuelTank",
      tier,
      briefing: `The manual dial is set to ${frac(p.f[0], p.f[1])} of full flow. The digital mixer needs the same setting as a decimal. What decimal should we type in?`,
      engineeringContext: "The digital mixer stores every flow setting as a decimal fraction of full.",
      answer: p.d,
      choices: tier === 1 ? mc(rng, p.d, [dec(Number(p.d) / 10, 3), dec(Number(p.d) + 0.1, 3), dec(1 - Number(p.d), 3)]) : undefined,
      workedSteps: [`Divide the top by the bottom: ${p.f[0]} divided by ${p.f[1]}.`, `That gives ${p.d} exactly — a terminating decimal.`],
      hints: ["A fraction is a division in disguise.", `Try making the bottom 10, 100 or 1000 by scaling.`],
      visual: readout(`dial: ${frac(p.f[0], p.f[1])} of full flow`),
      rocketEffect: ratioEffect(2),
      tolerance: 0.0001,
    });
  },

  // Percentages: parts per hundred, percentage change, one qty as % of another, >100%
  "KS3N-10": (rng, tier) => {
    if (tier === 1) {
      const total = rng.pick([20, 25, 40, 50]);
      const part = rng.int(1, total - 1) * (100 / total) % 100 === 0 ? rng.int(1, total - 1) : Math.round(total * rng.pick([0.25, 0.5, 0.75, 0.1, 0.2]));
      const safePart = Math.max(1, Math.min(total - 1, part));
      const ans = Math.round((safePart / total) * 100);
      return makeTask({
        criterionCode: "KS3N-10",
        rocketPart: "fuelTank",
        tier,
        briefing: `Out of ${total} pressure checks this week, ${safePart} came back green. What percentage of the checks came back green?`,
        engineeringContext: "The weekly green-check percentage goes on the pad safety board.",
        answer: String(ans),
        choices: mc(rng, String(ans), nearBy(rng, ans, 10)),
        workedSteps: [`Percentage means parts per hundred.`, `${safePart} out of ${total} scaled to 100 gives ${ans}%.`],
        hints: ["Scale the fraction so the bottom becomes 100.", `What do you multiply ${total} by to reach 100?`],
        visual: { widget: "fuelGauge", config: { capacity: total, level: safePart, readOnly: true } },
        rocketEffect: fillEffect(0.75, 0.55),
      });
    }
    if (tier === 2) {
      const start = rng.pick([200, 250, 400, 500]);
      const pct = rng.pick([10, 20, 25, 50]);
      const end = start + (start * pct) / 100;
      return makeTask({
        criterionCode: "KS3N-10",
        rocketPart: "fuelTank",
        tier,
        briefing: `During the pre-burn, tank pressure rose from ${start} millibars to ${end} millibars. What was the percentage increase in pressure?`,
        engineeringContext: "Percentage rise, not raw numbers, is what the safety rules are written in.",
        answer: String(pct),
        workedSteps: [`The change is ${end - start} millibars.`, `Divide by the original ${start} and scale to 100: ${pct}%.`],
        hints: ["Percentage change compares the CHANGE with the ORIGINAL value.", `Find the rise first: ${end} take away ${start}.`],
        visual: readout(`${start} mbar → ${end} mbar`),
        rocketEffect: fillEffect(0.8, 0.6),
      });
    }
    const start = rng.pick([40, 50, 80, 100]);
    const factor = rng.pick([1.5, 2, 2.5, 3]);
    const end = start * factor;
    const ans = factor * 100;
    return makeTask({
      criterionCode: "KS3N-10",
      rocketPart: "fuelTank",
      tier,
      briefing: `The upgraded pump moves ${end} litres a minute, while the old pump managed ${start}. Express the new rate as a percentage of the old rate.`,
      engineeringContext: "Rates above one hundred percent show the upgrade beat the old pump.",
      answer: String(ans),
      choices: mc(rng, String(ans), [String(ans - 100), String(ans + 50), String(100 - (start / end) * 100 | 0)]),
      workedSteps: [`Divide the new rate by the old: ${end} over ${start} gives ${factor}.`, `Scale to parts per hundred: ${ans}% — more than 100% because it is bigger than the old rate.`],
      hints: ["Percentages can pass 100 when the new value beats the original.", `Work out ${end} divided by ${start} first.`],
      visual: readout(`old: ${start} L/min · new: ${end} L/min`),
      rocketEffect: fillEffect(0.85, 0.65),
    });
  },

  // Fractions and percentages as operators
  "KS3N-11": (rng, tier) => {
    if (rng.next() < 0.5) {
      const pct = tier === 1 ? rng.pick([10, 25, 50]) : tier === 2 ? rng.pick([15, 30, 35, 60]) : rng.pick([12.5, 17.5, 32.5, 65]);
      const amount = tier === 3 ? rng.pick([240, 480, 640, 800]) : rng.pick([80, 120, 200, 400]);
      const ans = (amount * pct) / 100;
      return makeTask({
        criterionCode: "KS3N-11",
        rocketPart: "fuelTank",
        tier,
        briefing: `The flight plan reserves ${dec(pct, 1)}% of the ${fmt(amount)} litre tank for the landing burn. How many litres is the landing reserve?`,
        engineeringContext: "The reserve is pumped into a sealed section before the main fill starts.",
        answer: dec(ans, 1),
        choices: tier === 1 ? mc(rng, dec(ans, 1), [dec(ans / 2, 1), dec(ans * 2, 1), dec(amount - ans, 1)]) : undefined,
        workedSteps: [`${dec(pct, 1)}% as an operator means multiply by ${dec(pct / 100, 3)}.`, `${fmt(amount)} × ${dec(pct / 100, 3)} = ${dec(ans, 1)} litres.`],
        hints: ["Ten percent is easy — divide by ten. Build from there.", "Turn the percentage into a decimal and multiply."],
        visual: { widget: "fuelGauge", config: { capacity: amount, level: 0, interactive: true, unit: "L" } },
        rocketEffect: fillEffect(pct / 100, Math.min(1, pct / 100 + 0.2)),
        tolerance: Math.max(0.5, amount * 0.005),
      });
    }
    const den = tier === 1 ? rng.pick([2, 4]) : rng.pick([5, 8, 4]);
    const num = tier === 1 ? 1 : rng.int(1, den - 1);
    const amount = den * rng.int(20, tier === 3 ? 120 : 60);
    const ans = (amount * num) / den;
    return makeTask({
      criterionCode: "KS3N-11",
      rocketPart: "fuelTank",
      tier,
      briefing: `The oxidiser drum holds ${fmt(amount)} litres and the transfer order says move ${frac(num, den)} of it into the day tank. How many litres move across?`,
      engineeringContext: "Fractions act as multipliers on the drum volume — the pump takes litres only.",
      answer: String(ans),
      workedSteps: [`Divide ${fmt(amount)} by ${den}: one part is ${amount / den}.`, `Take ${num} part${num > 1 ? "s" : ""}: ${fmt(ans)} litres.`],
      hints: ["Divide by the bottom, multiply by the top.", `Find one ${den}th of the drum first.`],
      visual: { widget: "fuelGauge", config: { capacity: amount, level: 0, interactive: true, unit: "L" } },
      rocketEffect: fillEffect(num / den, Math.max(0.1, num / den - 0.25)),
      tolerance: Math.max(0.5, amount * 0.005),
    });
  },

  // Standard units of mass, length, time, money with decimal quantities
  "KS3N-12": (rng, tier) => {
    const variants = tier === 1
      ? [
          { make: () => { const v = rng.int(15, 95) / 10; return { q: `${dec(v, 1)} metres of feed pipe`, ask: "centimetres", ans: v * 100 }; } },
          { make: () => { const v = rng.int(15, 95) / 10; return { q: `${dec(v, 1)} kilograms of catalyst`, ask: "grams", ans: v * 1000 }; } },
        ]
      : tier === 2
        ? [
            { make: () => { const v = rng.int(105, 495) / 100; return { q: `${dec(v, 2)} litres of additive`, ask: "millilitres", ans: v * 1000 }; } },
            { make: () => { const v = rng.pick([1.5, 2.25, 2.5, 3.75]); return { q: `a fuelling window of ${dec(v, 2)} hours`, ask: "minutes", ans: v * 60 }; } },
          ]
        : [
            { make: () => { const v = rng.int(1250, 9750); return { q: `${fmt(v)} metres of umbilical cable`, ask: "kilometres", ans: v / 1000 }; } },
            { make: () => { const v = rng.int(105, 980); return { q: `${v} pence per litre of propellant`, ask: "pounds per litre", ans: v / 100 }; } },
          ];
    const v = rng.pick(variants).make();
    return makeTask({
      criterionCode: "KS3N-12",
      rocketPart: "fuelTank",
      tier,
      briefing: `The stores ledger records ${v.q}. The pad checklist wants the same quantity in ${v.ask}. What number goes on the checklist?`,
      engineeringContext: "Stores and pad crews use different units — conversions must be exact.",
      answer: dec(v.ans, 3),
      workedSteps: [`Find the conversion between the two units.`, `Scale the quantity: the checklist entry is ${dec(v.ans, 3)} ${v.ask}.`],
      hints: ["Is the new unit bigger or smaller? That tells you multiply or divide.", "Conversions between metric units use 10, 100 or 1000."],
      visual: readout(v.q),
      rocketEffect: fillEffect(0.8, 0.6),
      tolerance: 0.001,
    });
  },

  // Rounding to decimal places and significant figures
  "KS3N-13": (rng, tier) => {
    if (tier === 3) {
      const small = rng.next() < 0.5;
      const value = small ? rng.int(3111, 9899) / 1_000_000 : rng.int(31111, 98999);
      const sf = 2;
      const ans = roundSf(value, sf);
      return makeTask({
        criterionCode: "KS3N-13",
        rocketPart: "fuelTank",
        tier,
        briefing: `The lab balance shows ${small ? value.toFixed(6) : fmt(value)} ${small ? "grams" : "molecule clusters"}. The report format allows exactly ${sf} significant figures. What value goes in the report?`,
        engineeringContext: "Significant figures keep every report line to the same precision.",
        answer: small ? ans.toFixed(6).replace(/0+$/, "") : String(ans),
        workedSteps: ["Find the first non-zero digit — that is the first significant figure.", `Keep ${sf} significant figures and round the next digit: ${small ? ans.toFixed(6).replace(/0+$/, "") : fmt(ans)}.`],
        hints: ["Leading zeros never count as significant figures.", "Look at the digit AFTER the last one you keep."],
        visual: readout(`${small ? value.toFixed(6) : fmt(value)}`),
        rocketEffect: fillEffect(0.85, 0.65),
        tolerance: small ? 0.0000001 : 0,
      });
    }
    const dp = tier === 1 ? 1 : 2;
    const value = rng.int(10_000, 99_999) / 10_000 + rng.int(1, 9);
    const ans = Math.round(value * 10 ** dp) / 10 ** dp;
    return makeTask({
      criterionCode: "KS3N-13",
      rocketPart: "fuelTank",
      tier,
      briefing: `The pressure probe streams ${value.toFixed(4)} bar, but the flight log stores readings to ${dp} decimal place${dp > 1 ? "s" : ""}. What value should the log store?`,
      engineeringContext: "Every log entry uses the same precision so trends line up.",
      answer: ans.toFixed(dp),
      choices: tier === 1 ? mc(rng, ans.toFixed(dp), [(ans + 0.1).toFixed(dp), (ans - 0.1).toFixed(dp), value.toFixed(2)]) : undefined,
      workedSteps: [`Look at the digit just after the ${dp === 1 ? "tenths" : "hundredths"} place.`, `It ${(value * 10 ** dp) % 1 >= 0.5 ? "is 5 or more, so round up" : "is below 5, so keep the digit"}: ${ans.toFixed(dp)}.`],
      hints: [`Keep ${dp} digit${dp > 1 ? "s" : ""} after the decimal point.`, "The NEXT digit decides: 5 or more rounds up."],
      visual: readout(`${value.toFixed(4)} bar`),
      rocketEffect: fillEffect(0.8, 0.6),
      tolerance: 0.0001,
    });
  },

  // Estimation via rounding; error intervals with inequality notation
  "KS3N-14": (rng, tier) => {
    if (tier === 1) {
      const a = rng.pick([19, 21, 29, 31, 39, 41]);
      const b = rng.pick([4.8, 5.1, 2.9, 3.1, 4.1]);
      const est = Math.round(a / 10) * 10 * Math.round(b);
      return makeTask({
        criterionCode: "KS3N-14",
        rocketPart: "fuelTank",
        tier,
        briefing: `Roughly ${a} crates arrive, each holding about ${dec(b, 1)} litres of additive. Round each number to a friendly value first, then estimate the total litres.`,
        engineeringContext: "A quick estimate tells us if the storage bund is big enough before the exact sums.",
        answer: String(est),
        choices: mc(rng, String(est), [String(est + 10), String(est - 10), String(Math.round(a * b))]),
        workedSteps: [`Round ${a} to ${Math.round(a / 10) * 10} and ${dec(b, 1)} to ${Math.round(b)}.`, `Multiply the rounded values: ${est} litres, a sensible estimate.`],
        hints: ["Round each number before you multiply.", `${a} is close to ${Math.round(a / 10) * 10}.`],
        visual: readout(`${a} crates · about ${dec(b, 1)} L each`),
        rocketEffect: fillEffect(0.7, 0.5),
      });
    }
    const nearest = tier === 2 ? 10 : rng.pick([0.1, 5]);
    const shown = nearest === 10 ? rng.int(5, 60) * 10 : nearest === 5 ? rng.int(10, 90) * 5 : rng.int(20, 90) / 10;
    const half = nearest / 2;
    const lo = dec(shown - half, 2);
    const hi = dec(shown + half, 2);
    const ans = `${lo} ≤ x < ${hi}`;
    return makeTask({
      criterionCode: "KS3N-14",
      rocketPart: "fuelTank",
      tier,
      briefing: `The tank display rounds to the nearest ${dec(nearest, 1)} and currently shows ${dec(shown, 1)} litres. Choose the error interval for the true amount x that could be in the tank.`,
      engineeringContext: "The safety margin must cover every value the rounded display could be hiding.",
      answer: ans,
      choices: mc(rng, ans, [
        `${dec(shown - nearest, 2)} ≤ x < ${dec(shown + nearest, 2)}`,
        `${lo} < x ≤ ${hi}`,
        `${dec(shown, 2)} ≤ x < ${dec(shown + half, 2)}`,
      ]),
      workedSteps: [`Half of ${dec(nearest, 1)} is ${dec(half, 2)}.`, `The true value is from ${lo} up to but not including ${hi}: ${ans}.`],
      hints: ["The true value can sit half a step either side of the display.", "The lower bound is included; the upper bound is not."],
      visual: { widget: "numberLine", config: { min: shown - nearest * 2, max: shown + nearest * 2, step: half, pointer: shown, readOnly: true, unit: "L" } },
      rocketEffect: fillEffect(0.85, 0.65),
    });
  },

  // Calculator / technology results interpreted appropriately
  "KS3N-15": (rng, tier) => {
    if (tier === 1) {
      const perCrate = rng.pick([4, 6, 8]);
      const need = perCrate * rng.int(3, 7) + rng.int(1, perCrate - 1);
      const displayed = need / perCrate;
      const ans = Math.ceil(displayed);
      return makeTask({
        criterionCode: "KS3N-15",
        rocketPart: "fuelTank",
        tier,
        briefing: `The lab calculator says we need ${dec(displayed, 3)} crates to carry ${need} pellet packs, ${perCrate} packs per crate. Crates only come whole. How many crates must we actually order?`,
        engineeringContext: "A decimal crate does not exist — the calculator answer needs interpreting.",
        answer: String(ans),
        choices: mc(rng, String(ans), [String(ans - 1), String(ans + 1), dec(displayed, 3)]),
        workedSteps: [`${dec(displayed, 3)} crates means ${ans - 1} full crates and a bit left over.`, `The leftover packs still need a crate, so order ${ans}.`],
        hints: ["Can you leave pellet packs behind? If not, round which way?", "Part of a crate still costs a whole crate."],
        visual: readout(`calc: ${dec(displayed, 3)} crates`),
        rocketEffect: fillEffect(0.75, 0.55),
      });
    }
    if (tier === 2) {
      const hours = rng.pick([1.25, 1.75, 2.25, 2.5, 3.75]);
      const ans = hours * 60;
      return makeTask({
        criterionCode: "KS3N-15",
        rocketPart: "fuelTank",
        tier,
        briefing: `The fuelling computer reports the pump will run for ${dec(hours, 2)} hours. The pad clock counts in minutes. How many minutes is that?`,
        engineeringContext: "Decimal hours are a classic calculator trap — 2.5 hours is not 2 hours 50.",
        answer: String(ans),
        workedSteps: [`The decimal part is a fraction of an hour, not minutes.`, `${dec(hours, 2)} hours × 60 gives ${ans} minutes.`],
        hints: ["One hour is 60 minutes, so 0.5 hours is 30 minutes.", "Multiply the whole decimal by 60."],
        visual: readout(`pump time: ${dec(hours, 2)} h`),
        rocketEffect: fillEffect(0.8, 0.6),
      });
    }
    const pounds = rng.pick([7.5, 12.4, 9.1, 15.3, 22.7]);
    const ans = dec(pounds, 2);
    return makeTask({
      criterionCode: "KS3N-15",
      rocketPart: "fuelTank",
      tier,
      briefing: `The costing spreadsheet shows the additive bill as ${pounds} in pounds. Written properly as pounds and pence for the invoice, what should the amount say?`,
      engineeringContext: "Finance rejects invoices whose amounts are not written to the penny.",
      answer: ans,
      choices: mc(rng, ans, [dec(pounds / 10, 2), `${Math.floor(pounds)}.${Math.round((pounds % 1) * 10)}5`, dec(pounds + 0.05, 2)]),
      workedSteps: [`The display drops trailing zeros: ${pounds} pounds means ${ans} in pounds and pence.`, `Money always shows two decimal places.`],
      hints: ["Money needs exactly two decimal places.", "0.5 of a pound is 50 pence."],
      visual: readout(`bill: ${pounds} GBP`),
      rocketEffect: fillEffect(0.8, 0.6),
      tolerance: 0.001,
    });
  },

  // Infinite nature of integers, reals and rationals
  "KS3N-16": (rng, tier) => {
    const variants = [
      {
        briefing: "The mission clock counts whole seconds upward forever. The trainee asks whether the count must eventually stop at a biggest possible whole number. What is the truth about the whole numbers?",
        answer: "they go on forever",
        wrongs: ["they stop at a googol", "they stop when the computer overflows", "there is a largest whole number"],
        steps: ["Whatever whole number you name, adding one gives a bigger one.", "So the integers never run out — they go on forever."],
        hints: ["Can you always add one more?", "Naming a biggest number instantly defeats itself."],
      },
      {
        briefing: "Two pressure readings sit at 3.14 and 3.15 bar. The trainee claims no reading could ever fall between them. What is true about values between the two readings?",
        answer: "there are infinitely many values between them",
        wrongs: ["there are no values between them", "there are exactly nine values between them", "only 3.145 lies between them"],
        steps: ["Between any two decimals you can always find another, like 3.141.", "Repeat forever: the values between never run out."],
        hints: ["Try averaging the two readings.", "Once you find one value in between, can you do it again?"],
      },
      {
        briefing: "The lab lists mix settings as fractions. The trainee wonders whether the list of all possible fractions between 0 and 1 could ever be finished. What is true about the fractions between 0 and 1?",
        answer: "there are infinitely many fractions",
        wrongs: ["there are exactly one hundred fractions", "the list ends at 99/100", "fractions stop at thousandths"],
        steps: ["Halving any fraction gives a new smaller fraction.", "So the fractions between 0 and 1 are infinite — the rationals never run out."],
        hints: ["What happens if you halve the smallest fraction on the list?", "Every new denominator brings new fractions."],
      },
    ];
    const v = variants[Math.min(variants.length - 1, tier - 1 + (rng.next() < 0.5 ? 0 : 1)) % variants.length];
    return makeTask({
      criterionCode: "KS3N-16",
      rocketPart: "fuelTank",
      tier,
      briefing: v.briefing,
      engineeringContext: "Understanding the number system stops false limits creeping into the flight software.",
      answer: v.answer,
      choices: mc(rng, v.answer, v.wrongs),
      workedSteps: v.steps,
      hints: v.hints,
      visual: { widget: "numberLine", config: { min: 0, max: 10, step: 1, readOnly: true } },
      rocketEffect: fillEffect(0.7, 0.5),
    });
  },
};