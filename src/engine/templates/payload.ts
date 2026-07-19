import type { GeneratedTask } from "../types";
import type { Rng } from "../rng";
import { makeTask, mc, fmt, frac, simplifyFraction } from "./helpers";

type Gen = (rng: Rng, tier: 1 | 2 | 3) => GeneratedTask;

const podEffect = (pods: number) => ({
  property: "payloadPods",
  correctValue: pods,
  incorrectValue: Math.max(1, pods - 1),
  unit: "pods",
});
const massEffect = (perPod: number) => ({
  property: "payloadPerPod",
  correctValue: perPod,
  incorrectValue: Math.round(perPod * 1.3),
  unit: "kg",
});

export const payloadTemplates: Record<string, Gen> = {
  "3MD-1": (rng, tier) => {
    const pods = rng.pick(tier === 1 ? [2, 5] : [3, 4, 6, 8]);
    const each = rng.int(2, tier === 3 ? 12 : 8);
    const total = pods * each;
    return makeTask({
      criterionCode: "3MD-1",
      rocketPart: "payloadBay",
      tier,
      briefing: `${total} supply crates are waiting at the loading dock. They must go equally into the bay's ${pods} compartments so the rocket stays balanced. How many crates go in each compartment?`,
      engineeringContext: "An unbalanced bay tips the rocket's centre of gravity sideways.",
      answer: String(each),
      workedSteps: [`Share ${total} crates into ${pods} equal groups.`, `Each compartment takes ${each} crates.`],
      hints: [`Deal the crates out one at a time into the ${pods} compartments.`, `What number, ${pods} times over, makes ${total}?`],
      visual: { widget: "payloadSplit", config: { total, groups: pods, mode: "share", interactive: true } },
      rocketEffect: podEffect(pods),
    });
  },

  "4MD-3": (rng, tier) => {
    const per = rng.int(3, tier === 3 ? 9 : 6);
    const left = rng.int(2, 5);
    const right = rng.int(2, 5);
    const ans = per * (left + right);
    return makeTask({
      criterionCode: "4MD-3",
      rocketPart: "payloadBay",
      tier,
      briefing: `Every pod holds ${per} crates. The crane loads ${left} pods on the port side and ${right} pods on the starboard side. The manifest needs the total crate count for the whole bay. How many crates is that?`,
      engineeringContext: "The manifest total is checked against the dock records before the doors close.",
      answer: String(ans),
      workedSteps: [
        `There are ${left} pods and ${right} pods, making ${left + right} pods in all.`,
        `${left + right} pods of ${per} crates makes ${ans} crates.`,
        `Or count each side first (${per * left} and ${per * right}) and combine — the answer matches.`,
      ],
      hints: ["Count the pods on both sides first.", "You can do each side separately and put them together."],
      visual: { widget: "payloadSplit", config: { total: ans, groups: left + right, mode: "rows" } },
      rocketEffect: podEffect(Math.min(left + right, 6)),
    });
  },

  "5MD-3": (rng, tier) => {
    const perPod = rng.int(tier === 3 ? 1150 : 125, tier === 3 ? 2450 : 480);
    const pods = tier === 3 ? rng.int(12, 24) : rng.int(3, 8);
    const ans = perPod * pods;
    return makeTask({
      criterionCode: "5MD-3",
      rocketPart: "payloadBay",
      tier,
      briefing: `Each cargo pod carries ${fmt(perPod)} kg, and the mission loads ${pods} identical pods. The crane's lifting computer needs the full payload mass before it will lift. What total should the crew type in?`,
      engineeringContext: "The crane refuses to lift until the entered mass matches its own sensors.",
      answer: String(ans),
      workedSteps: [
        `Set out ${fmt(perPod)} taken ${pods} times as a column multiplication.`,
        `Work through each place value: the total is ${fmt(ans)} kg.`,
      ],
      hints: ["Break the pod mass into thousands, hundreds, tens and ones.", "Multiply each part, then combine the results."],
      visual: { widget: "payloadSplit", config: { total: ans, groups: pods, mode: "rows" } },
      rocketEffect: massEffect(Math.min(perPod, 400)),
    });
  },

  "5MD-4": (rng, tier) => {
    const pods = rng.pick(tier === 1 ? [2, 5] : [4, 5, 6, 8]);
    const each = rng.int(tier === 3 ? 315 : 120, tier === 3 ? 985 : 450);
    const total = pods * each;
    return makeTask({
      criterionCode: "5MD-4",
      rocketPart: "payloadBay",
      tier,
      briefing: `The complete payload weighs ${fmt(total)} kg and must be split exactly equally across ${pods} pods, or the centre of gravity drifts. What weight goes into each pod?`,
      engineeringContext: "Even one heavy pod makes the rocket veer off course.",
      answer: String(each),
      workedSteps: [
        `Divide ${fmt(total)} by ${pods} using short division.`,
        `Each pod carries ${fmt(each)} kg.`,
      ],
      hints: [`Start with the thousands: how many times does ${pods} go in?`, "Carry any remainder to the next digit."],
      visual: { widget: "payloadSplit", config: { total, groups: pods, mode: "share" } },
      rocketEffect: massEffect(Math.min(each, 400)),
    });
  },

  "3F-2": (rng, tier) => {
    const den = rng.pick(tier === 1 ? [4, 5] : [5, 6, 8]);
    const loaded = rng.int(1, den - 1);
    const empty = den - loaded;
    return makeTask({
      criterionCode: "3F-2",
      rocketPart: "payloadBay",
      tier,
      briefing: `The payload bay is divided into ${den} equal compartments, and ${loaded} of them are already loaded with science experiments. What fraction of the bay is still empty for more cargo?`,
      engineeringContext: "The empty fraction tells the dock how much more cargo to send up the lift.",
      answer: frac(empty, den),
      workedSteps: [
        `The bay has ${den} equal parts and ${loaded} are full.`,
        `That leaves ${empty} parts empty: the fraction is ${frac(empty, den)}.`,
      ],
      hints: [`How many compartments are NOT loaded yet?`, `The bottom number of the fraction is the total compartments: ${den}.`],
      visual: { widget: "payloadSplit", config: { total: den, groups: den, filled: loaded, mode: "fraction" } },
      rocketEffect: podEffect(den > 6 ? 6 : den),
      acceptEquivalentFractions: true,
    });
  },

  "3F-3": (rng, tier) => {
    const den = rng.pick(tier === 1 ? [2, 4] : [4, 5, 8]);
    const num = rng.int(1, den - 1);
    const value = num / den;
    return makeTask({
      criterionCode: "3F-3",
      rocketPart: "payloadBay",
      tier,
      briefing: `This cargo container weighs ${frac(num, den)} of a tonne. Slide it onto the loading scale, which runs from 0 to 1 tonne, at exactly the right spot.`,
      engineeringContext: "The scale checks the container is inside the bay's weight limit.",
      answer: String(Math.round(value * 1000) / 1000),
      workedSteps: [
        `Split the scale into ${den} equal steps.`,
        `Count ${num} step${num > 1 ? "s" : ""} from 0: that is where ${frac(num, den)} sits.`,
      ],
      hints: [`Cut the line into ${den} equal pieces first.`, `Count along ${num} of those pieces.`],
      visual: { widget: "numberLine", config: { min: 0, max: 1, step: 1 / den, target: value, interactive: true, unit: "t", fractions: true } },
      rocketEffect: massEffect(250),
      tolerance: 1 / (den * 2.5),
    });
  },

  "3F-4": (rng, tier) => {
    const den = rng.pick(tier === 1 ? [4] : [4, 5, 8]);
    const a = rng.int(1, den - 2);
    const b = rng.int(1, den - a - 1);
    const sum = a + b;
    return makeTask({
      criterionCode: "3F-4",
      rocketPart: "payloadBay",
      tier,
      briefing: `Cargo Pod A holds ${frac(a, den)} of a tonne of food supplies and Pod B holds ${frac(b, den)} of a tonne of water. The payload arm can only lift them together if you tell it the combined weight. What fraction of a tonne is that?`,
      engineeringContext: "The arm's grip strength is set from the combined weight you enter.",
      answer: frac(sum, den),
      workedSteps: [
        `Both fractions count in ${den}ths, so add the top numbers.`,
        `${a} and ${b} make ${sum}: the total is ${frac(sum, den)} of a tonne.`,
      ],
      hints: ["The bottom numbers match, so only the top numbers combine.", `Think of the pods in ${den}th-of-a-tonne pieces.`],
      visual: { widget: "payloadSplit", config: { total: den, groups: den, filled: sum, mode: "fraction" } },
      rocketEffect: massEffect(300),
      acceptEquivalentFractions: true,
    });
  },

  "4F-2": (rng, tier) => {
    const den = rng.pick(tier === 1 ? [2, 4] : [3, 4, 5, 8]);
    const whole = rng.int(1, tier === 3 ? 3 : 1);
    const extra = rng.int(1, den - 1);
    const improper = whole * den + extra;
    const answer = `${whole} ${frac(extra, den)}`;
    return makeTask({
      criterionCode: "4F-2",
      rocketPart: "payloadBay",
      tier,
      briefing: `The loading manifest lists ${frac(improper, den)} tonnes of equipment, but the crane display only reads mixed numbers. Rewrite ${frac(improper, den)} as a mixed number for the crane operator.`,
      engineeringContext: "The operator reads whole tonnes at a glance, then the fraction.",
      answer,
      choices: tier === 1 ? mc(rng, answer, [`${whole} ${frac(Math.max(1, extra - 1), den)}`, `${whole + 1} ${frac(extra, den)}`, `${whole} ${frac(extra, den + 1)}`]) : undefined,
      workedSteps: [
        `How many whole lots of ${den} ${den}ths fit into ${improper} ${den}ths? ${whole} whole one${whole > 1 ? "s" : ""}.`,
        `That leaves ${extra} ${den}ths over: ${answer}.`,
      ],
      hints: [`${den} ${den}ths make one whole tonne.`, `How many wholes fit inside ${improper} ${den}ths?`],
      visual: { widget: "payloadSplit", config: { total: improper, groups: den, mode: "fraction", filled: improper } },
      rocketEffect: massEffect(280),
      acceptEquivalentFractions: true,
    });
  },

  "4F-3": (rng, tier) => {
    const den = 8;
    const a = rng.int(1, 4);
    const b = rng.int(1, 3);
    const c = tier === 1 ? 0 : rng.int(1, 2);
    const sum = a + b + c;
    const parts = c
      ? `science instruments (${frac(a, den)} of a tonne), crew supplies (${frac(b, den)} of a tonne), and communication gear (${frac(c, den)} of a tonne)`
      : `science instruments (${frac(a, den)} of a tonne) and crew supplies (${frac(b, den)} of a tonne)`;
    return makeTask({
      criterionCode: "4F-3",
      rocketPart: "payloadBay",
      tier,
      briefing: `We are loading ${parts}. The bay's weight log needs the total payload as a single fraction. What is it?`,
      engineeringContext: "The weight log must match the launch computer's fuel plan.",
      answer: frac(sum, den),
      workedSteps: [
        `All the weights count in eighths, so combine the top numbers: ${[a, b, c].filter(Boolean).join(", ")}.`,
        `The total is ${frac(sum, den)} of a tonne.`,
      ],
      hints: ["The bottom numbers all match — combine only the tops.", "Count the eighths one cargo item at a time."],
      visual: { widget: "payloadSplit", config: { total: den, groups: den, filled: Math.min(sum, den), mode: "fraction" } },
      rocketEffect: massEffect(320),
      acceptEquivalentFractions: true,
    });
  },

  "5F-2": (rng, tier) => {
    const pairs = [
      { a: [4, 6], b: [2, 3], same: true },
      { a: [6, 8], b: [3, 4], same: true },
      { a: [2, 10], b: [1, 5], same: true },
      { a: [4, 10], b: [2, 5], same: true },
      { a: [3, 8], b: [1, 2], same: false },
      { a: [5, 6], b: [3, 4], same: false },
    ];
    const p = rng.pick(tier === 1 ? pairs.slice(0, 4) : pairs);
    const ans = p.same ? "yes" : "no";
    return makeTask({
      criterionCode: "5F-2",
      rocketPart: "payloadBay",
      tier,
      briefing: `The bay's own gauge shows it ${frac(p.a[0], p.a[1])} full. Mission Control's screen shows ${frac(p.b[0], p.b[1])} full. Before loading continues, check: are the two displays showing the same amount?`,
      engineeringContext: "If the displays disagree, loading stops until someone checks the maths.",
      answer: ans,
      choices: mc(rng, ans, ["yes", "no"].filter((c) => c !== ans)),
      workedSteps: [
        `Simplify ${frac(p.a[0], p.a[1])}: divide top and bottom by their common factor to get ${frac(...simplifyFraction(p.a[0], p.a[1]))}.`,
        `Compare with ${frac(p.b[0], p.b[1])}: they are ${p.same ? "equivalent — same amount" : "different amounts"}.`,
      ],
      hints: ["Try simplifying the first fraction to its smallest form.", "Two fractions match if one scales into the other."],
      visual: { widget: "payloadSplit", config: { total: p.a[1], groups: p.a[1], filled: p.a[0], mode: "fraction" } },
      rocketEffect: podEffect(4),
    });
  },

  "5F-3": (rng, tier) => {
    const options = [
      { dec: "0.5", f: "1/2", wrongs: ["1/5", "2/5", "1/4"] },
      { dec: "0.25", f: "1/4", wrongs: ["1/2", "2/5", "1/3"] },
      { dec: "0.75", f: "3/4", wrongs: ["1/4", "3/5", "7/10"] },
      { dec: "0.2", f: "1/5", wrongs: ["1/2", "2/10 0", "1/4"] },
      { dec: "0.1", f: "1/10", wrongs: ["1/5", "1/100", "1/4"] },
    ];
    const pool = tier === 1 ? options.slice(0, 3) : options;
    const o = rng.pick(pool);
    return makeTask({
      criterionCode: "5F-3",
      rocketPart: "payloadBay",
      tier,
      briefing: `The digital readout says the payload bay is ${o.dec} full. The old analogue gauge next to it only shows fractions. What fraction should the analogue gauge show?`,
      engineeringContext: "Both gauges must agree before the bay doors are allowed to close.",
      answer: o.f,
      choices: mc(rng, o.f, o.wrongs),
      workedSteps: [
        `${o.dec} read by place value is ${o.dec.replace("0.", "")} ${o.dec.length > 3 ? "hundredths" : "tenths"}.`,
        `Written as a simple fraction, that is ${o.f}.`,
      ],
      hints: ["Say the decimal out loud using tenths or hundredths.", "Then see if that fraction simplifies."],
      visual: { widget: "fuelGauge", config: { capacity: 1, level: Number(o.dec), readOnly: true, asFraction: true } },
      rocketEffect: podEffect(4),
      acceptEquivalentFractions: true,
    });
  },

  "6F-2": (rng, tier) => {
    const pairs = [
      { x: [5, 8], y: [7, 12], bigger: "X" },
      { x: [2, 3], y: [3, 5], bigger: "X" },
      { x: [3, 8], y: [2, 5], bigger: "Y" },
      { x: [5, 6], y: [7, 8], bigger: "Y" },
      { x: [3, 4], y: [7, 10], bigger: "X" },
    ];
    const p = rng.pick(tier === 1 ? pairs.slice(0, 2) : pairs);
    const ans = `Container ${p.bigger}`;
    return makeTask({
      criterionCode: "6F-2",
      rocketPart: "payloadBay",
      tier,
      briefing: `Only one more container fits in the bay, and the crane must lift the heavier one first. Container X weighs ${frac(p.x[0], p.x[1])} of a tonne and Container Y weighs ${frac(p.y[0], p.y[1])} of a tonne. Which container is heavier?`,
      engineeringContext: "Lifting the heavier container first keeps the crane's arm inside its safe range.",
      answer: ans,
      choices: mc(rng, ans, [`Container ${p.bigger === "X" ? "Y" : "X"}`]),
      workedSteps: [
        `Rewrite both fractions with the same bottom number (a common denominator of ${p.x[1] * p.y[1] / (p.x[1] % p.y[1] === 0 || p.y[1] % p.x[1] === 0 ? Math.min(p.x[1], p.y[1]) : 1)} works).`,
        `Compare the top numbers: Container ${p.bigger} is heavier.`,
      ],
      hints: ["Give both fractions the same bottom number first.", "Or compare each one to a half — which is further above it?"],
      visual: { widget: "payloadSplit", config: { total: p.x[1], groups: p.x[1], filled: p.x[0], mode: "fraction", compareNum: p.y[0], compareDen: p.y[1] } },
      rocketEffect: massEffect(350),
    });
  },

  "6F-3": (rng, tier) => {
    const sets = [
      { a: [1, 4], b: [3, 8], sum: [5, 8] },
      { a: [1, 2], b: [1, 4], sum: [3, 4] },
      { a: [1, 3], b: [1, 6], sum: [1, 2] },
      { a: [2, 5], b: [3, 10], sum: [7, 10] },
      { a: [1, 6], b: [5, 12], sum: [7, 12] },
    ];
    const s = rng.pick(tier === 1 ? sets.slice(0, 2) : sets);
    return makeTask({
      criterionCode: "6F-3",
      rocketPart: "payloadBay",
      tier,
      briefing: `The last two items going aboard are an instrument rack weighing ${frac(s.a[0], s.a[1])} of a tonne and a supply chest weighing ${frac(s.b[0], s.b[1])} of a tonne. The bay's weight log needs their combined weight as one fraction. What is it?`,
      engineeringContext: "The final logged weight sets the fuel margin for the whole flight.",
      answer: frac(s.sum[0], s.sum[1]),
      workedSteps: [
        `The bottom numbers differ, so rewrite both in ${Math.max(s.a[1], s.b[1], s.sum[1])}ths.`,
        `Combine the tops: the total is ${frac(s.sum[0], s.sum[1])} of a tonne.`,
      ],
      hints: ["Find a bottom number both fractions can share.", `${s.a[1]} and ${s.b[1]} both fit into which number?`],
      visual: { widget: "payloadSplit", config: { total: s.sum[1], groups: s.sum[1], filled: s.sum[0], mode: "fraction" } },
      rocketEffect: massEffect(360),
      acceptEquivalentFractions: true,
    });
  },
};