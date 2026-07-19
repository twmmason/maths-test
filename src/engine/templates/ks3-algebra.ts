import type { GeneratedTask } from "../types";
import type { Rng } from "../rng";
import { makeTask, mc, nearBy } from "./helpers";

type Gen = (rng: Rng, tier: 1 | 2 | 3) => GeneratedTask;

/** Flight Computer — KS3 Algebra lives in the upgraded electronics bay. */

const powerEffect = () => ({ property: "powerBalanced", correctValue: 1, incorrectValue: 0, unit: "" });
const wiredEffect = (n: number) => ({ property: "circuitsWired", correctValue: n, incorrectValue: Math.max(0, n - 1), unit: "" });

const readout = (text: string) => ({ widget: "equation" as const, config: { readout: text } });

export const ks3AlgebraTemplates: Record<string, Gen> = {
  // Algebraic notation
  "KS3A-1": (rng, tier) => {
    const variants = tier === 1
      ? [
          { show: "3y", ans: "y + y + y", wrongs: ["y + 3", "y × y × y", "3 + y"] },
          { show: "ab", ans: "a × b", wrongs: ["a + b", "a - b", "a ÷ b"] },
        ]
      : tier === 2
        ? [
            { show: "a²", ans: "a × a", wrongs: ["a + a", "2 × a", "a × 2"] },
            { show: "a/b", ans: "a ÷ b", wrongs: ["a × b", "a - b", "b ÷ a"] },
          ]
        : [
            { show: "a²b", ans: "a × a × b", wrongs: ["a × b × b", "2 × a × b", "a × b × 2"] },
            { show: "x/4", ans: "one quarter of x", wrongs: ["4 lots of x", "x take away 4", "4 more than x"] },
          ];
    const v = rng.pick(variants);
    return makeTask({
      criterionCode: "KS3A-1",
      rocketPart: "electronics",
      tier,
      briefing: `The guidance program uses the shorthand shown on the flight-computer readout. A trainee needs to wire the matching calculation by hand. Which calculation does the shorthand stand for?`,
      engineeringContext: "The backup wiring must compute exactly what the shorthand means.",
      answer: v.ans,
      choices: mc(rng, v.ans, v.wrongs),
      workedSteps: [`Algebra shorthand hides the multiplication sign: letters written together are multiplied.`, `So ${v.show} stands for ${v.ans}.`],
      hints: ["Letters written side by side are multiplied.", "A small raised 2 means the letter is used twice in a multiplication."],
      visual: readout(v.show),
      rocketEffect: powerEffect(),
    });
  },

  // Substitute numerical values into formulae, incl. scientific formulae
  "KS3A-2": (rng, tier) => {
    if (tier === 1) {
      const m = rng.int(2, 6);
      const c = rng.int(1, 9);
      const x = rng.int(2, 9);
      const ans = m * x + c;
      return makeTask({
        criterionCode: "KS3A-2",
        rocketPart: "electronics",
        tier,
        briefing: `The heater formula is on the readout. Substitute x as ${x} to find the heater power in watts.`,
        engineeringContext: "The flight computer substitutes live sensor values into this formula every second.",
        answer: String(ans),
        choices: mc(rng, String(ans), [String(m * x - c), String(m * (x + c)), String(m + x + c)]),
        workedSteps: [`Replace x with ${x}: ${m} × ${x} + ${c}.`, `Multiply first, then add: ${m * x} + ${c} = ${ans}.`],
        hints: [`Swap the letter x for the number ${x}.`, "Multiply before adding."],
        visual: readout(`P = ${m}x + ${c}`),
        rocketEffect: powerEffect(),
      });
    }
    if (tier === 2) {
      const u = rng.int(2, 10);
      const a = rng.int(2, 5);
      const t = rng.int(2, 8);
      const ans = u + a * t;
      return makeTask({
        criterionCode: "KS3A-2",
        rocketPart: "electronics",
        tier,
        briefing: `The ascent-speed formula is on the readout. The launch data gives u as ${u}, a as ${a} and t as ${t}. Substitute the values to find the speed v in metres per second.`,
        engineeringContext: "This is the real physics formula the guidance computer runs during ascent.",
        answer: String(ans),
        workedSteps: [`Substitute: v = ${u} + ${a} × ${t}.`, `Multiply first: ${a} × ${t} = ${a * t}, then add ${u}: v = ${ans}.`],
        hints: ["Replace each letter with its number.", "Multiplication comes before addition."],
        visual: readout(`v = u + at`),
        rocketEffect: powerEffect(),
      });
    }
    const t = rng.int(2, 6);
    const half = rng.pick([5, 10]);
    const s = half * t * t;
    return makeTask({
      criterionCode: "KS3A-2",
      rocketPart: "electronics",
      tier,
      briefing: `The drop-test formula on the readout predicts fall distance. With g taken as ${half * 2} and t as ${t} seconds, substitute to find the distance s in metres.`,
      engineeringContext: "The parachute team uses this scientific formula to set the release height.",
      answer: String(s),
      workedSteps: [`Square the time first: ${t}² = ${t * t}.`, `Then s = half of ${half * 2} × ${t * t} = ${s}.`],
      hints: ["Deal with the squared letter first.", `Half of g is ${half}.`],
      visual: readout(`s = ½gt²`),
      rocketEffect: powerEffect(),
    });
  },

  // Vocabulary: expressions, equations, inequalities, terms, factors
  "KS3A-3": (rng, tier) => {
    const variants = tier === 1
      ? [
          { show: "3x + 5 = 20", ans: "an equation", wrongs: ["an expression", "an inequality", "a factor"] },
          { show: "4a - 7", ans: "an expression", wrongs: ["an equation", "an inequality", "a term"] },
        ]
      : tier === 2
        ? [
            { show: "2y + 3 < 11", ans: "an inequality", wrongs: ["an equation", "an expression", "a term"] },
            { show: "7b", ans: "a term", wrongs: ["an equation", "an inequality", "a factor pair"] },
          ]
        : [
            { show: "5(x + 2)", ans: "5 is a factor of the expression", wrongs: ["5 is a term of the expression", "the whole thing is an equation", "x is a factor of 2"] },
            { show: "3x + 5 = 2x + 9", ans: "an equation", wrongs: ["an expression", "an inequality", "a sequence"] },
          ];
    const v = rng.pick(variants);
    return makeTask({
      criterionCode: "KS3A-3",
      rocketPart: "electronics",
      tier,
      briefing: `The code reviewer must file the line shown on the flight-computer readout under the correct mathematical name. How should it be classified?`,
      engineeringContext: "Filing code lines correctly tells the compiler how to treat them.",
      answer: v.ans,
      choices: mc(rng, v.ans, v.wrongs),
      workedSteps: ["An equation has an equals sign; an inequality has a comparison sign; an expression has neither.", `So the readout shows ${v.ans}.`],
      hints: ["Look for an equals sign or a comparison sign.", "No sign at all means it is just an expression."],
      visual: readout(v.show),
      rocketEffect: powerEffect(),
    });
  },

  // Simplify/manipulate: collect terms, expand brackets, factorise, binomials
  "KS3A-4": (rng, tier) => {
    if (tier === 1) {
      const a = rng.int(2, 6);
      const b = rng.int(2, 6);
      const c = rng.int(1, 9);
      const ans = `${a + b}x + ${c}`;
      return makeTask({
        criterionCode: "KS3A-4",
        rocketPart: "electronics",
        tier,
        briefing: `The power-budget line on the readout is longer than it needs to be. Collect the like terms to give the tidiest version.`,
        engineeringContext: "Shorter formulae run faster on the flight computer.",
        answer: ans,
        choices: mc(rng, ans, [`${a + b + c}x`, `${a + b}x + ${c}x`, `${a * b}x + ${c}`]),
        workedSteps: [`The x terms combine: ${a}x and ${b}x make ${a + b}x.`, `The plain number ${c} stays separate: ${ans}.`],
        hints: ["Only terms with the same letter can combine.", "The number without a letter stays on its own."],
        visual: readout(`${a}x + ${c} + ${b}x`),
        rocketEffect: wiredEffect(3),
      });
    }
    if (tier === 2) {
      const k = rng.int(2, 6);
      const a = rng.int(2, 9);
      const ans = `${k}x + ${k * a}`;
      return makeTask({
        criterionCode: "KS3A-4",
        rocketPart: "electronics",
        tier,
        briefing: `The compiler needs the bracketed instruction on the readout expanded into separate terms. What does it become?`,
        engineeringContext: "Expanded terms map one-to-one onto wires in the loom.",
        answer: ans,
        choices: mc(rng, ans, [`${k}x + ${a}`, `${k + a}x`, `${k}x + ${k + a}`]),
        workedSteps: [`Multiply everything inside the bracket by ${k}.`, `${k} × x gives ${k}x and ${k} × ${a} gives ${k * a}: ${ans}.`],
        hints: ["The number outside multiplies BOTH things inside.", `Do ${k} times x, then ${k} times ${a}.`],
        visual: readout(`${k}(x + ${a})`),
        rocketEffect: wiredEffect(4),
      });
    }
    const p = rng.int(1, 5);
    const q = rng.int(1, 5);
    const ans = `x² + ${p + q}x + ${p * q}`;
    return makeTask({
      criterionCode: "KS3A-4",
      rocketPart: "electronics",
      tier,
      briefing: `The guidance gain is the product of the two bracketed factors on the readout. Expand the product into a single expression.`,
      engineeringContext: "The expanded form is what the autopilot actually computes each cycle.",
      answer: ans,
      choices: mc(rng, ans, [`x² + ${p * q}x + ${p + q}`, `x² + ${p + q}x`, `x² + ${p}x + ${q}`]),
      workedSteps: [`Multiply each part of the first bracket by each part of the second.`, `x times x, x times ${q}, ${p} times x, ${p} times ${q}.`, `Collect: ${ans}.`],
      hints: ["Every term in the first bracket multiplies every term in the second.", `The plain number at the end is ${p} times ${q}.`],
      visual: readout(`(x + ${p})(x + ${q})`),
      rocketEffect: wiredEffect(5),
    });
  },

  // Use and rearrange standard formulae (change the subject)
  "KS3A-5": (rng, tier) => {
    if (tier === 1) {
      const m = rng.int(2, 9);
      const ans = `t = d/${m}`;
      return makeTask({
        criterionCode: "KS3A-5",
        rocketPart: "electronics",
        tier,
        briefing: `The readout shows the distance formula for a rover moving at ${m} metres per second. Mission Control wants the formula rearranged so it starts with t. Which version is right?`,
        engineeringContext: "Rearranged formulae let the computer solve for whichever value is missing.",
        answer: ans,
        choices: mc(rng, ans, [`t = ${m}d`, `t = d - ${m}`, `t = ${m}/d`]),
        workedSteps: [`d equals ${m} times t, so to leave t alone, divide both sides by ${m}.`, `That gives ${ans}.`],
        hints: ["Undo the multiplication with a division.", "Whatever you do to one side, do to the other."],
        visual: readout(`d = ${m}t`),
        rocketEffect: powerEffect(),
      });
    }
    if (tier === 2) {
      const ans = "u = v - at";
      return makeTask({
        criterionCode: "KS3A-5",
        rocketPart: "electronics",
        tier,
        briefing: `The ascent formula on the readout gives the final speed v. The launch team needs it rearranged to find the starting speed u. Which rearrangement is correct?`,
        engineeringContext: "Different consoles need the same physics solved for different letters.",
        answer: ans,
        choices: mc(rng, ans, ["u = v + at", "u = at - v", "u = v/at"]),
        workedSteps: ["u has at added to it on the right side.", "Undo that by subtracting at from both sides: u = v - at."],
        hints: ["What has been done to u? Undo it.", "Subtract the same thing from both sides."],
        visual: readout(`v = u + at`),
        rocketEffect: powerEffect(),
      });
    }
    const ans = "h = (p - 2w)/2";
    return makeTask({
      criterionCode: "KS3A-5",
      rocketPart: "electronics",
      tier,
      briefing: `The readout shows the perimeter formula for a rectangular solar panel with width w and height h. Rearrange it to make h the subject. Which version is right?`,
      engineeringContext: "The panel cutter needs h computed from the perimeter the frame allows.",
      answer: ans,
      choices: mc(rng, ans, ["h = p - 2w", "h = (p + 2w)/2", "h = p/2 - w/2 - 1"]),
      workedSteps: ["Subtract 2w from both sides: p - 2w = 2h.", "Divide both sides by 2: h = (p - 2w)/2."],
      hints: ["Undo the additions first, then the multiplication.", "Two steps: subtract 2w, then halve."],
      visual: readout(`p = 2w + 2h`),
      rocketEffect: powerEffect(),
    });
  },

  // Model situations as expressions/formulae and graphs
  "KS3A-6": (rng, tier) => {
    const per = rng.int(2, 9) * 10;
    const base = rng.int(10, 45);
    const ans = `w = ${per}p + ${base}`;
    if (tier === 1) {
      const p = rng.int(2, 6);
      return makeTask({
        criterionCode: "KS3A-6",
        rocketPart: "electronics",
        tier,
        briefing: `Each solar panel generates ${per} watts and the core battery adds ${base} watts. With ${p} panels installed, how many watts does the whole system supply?`,
        engineeringContext: "The power model predicts supply before we ever bolt a panel on.",
        answer: String(per * p + base),
        choices: mc(rng, String(per * p + base), [String(per * p), String((per + base) * p), String(per + base + p)]),
        workedSteps: [`${p} panels give ${per * p} watts.`, `Add the battery's ${base}: ${per * p + base} watts.`],
        hints: [`Work out the panels first: ${p} lots of ${per}.`, "Then add the battery on top."],
        visual: readout(`${per} W per panel · battery ${base} W`),
        rocketEffect: powerEffect(),
      });
    }
    return makeTask({
      criterionCode: "KS3A-6",
      rocketPart: "electronics",
      tier,
      briefing: `Each solar panel generates ${per} watts and the core battery always adds ${base} watts. The software team needs a formula for the total watts w when p panels are installed. Which formula models the system?`,
      engineeringContext: "The formula goes straight into the power-management software.",
      answer: ans,
      choices: mc(rng, ans, [`w = ${base}p + ${per}`, `w = ${per + base}p`, `w = ${per}p - ${base}`]),
      workedSteps: [`Each panel contributes ${per}, so p panels give ${per}p.`, `The battery adds a constant ${base}: ${ans}.`],
      hints: ["Which part changes with the panel count? Which part never changes?", "The constant joins with a plus at the end."],
      visual: { widget: "graphPlot", config: { mode: "readLine", m: per, c: base, min: 0, max: 8, yLabel: "watts", xLabel: "panels", readOnly: true } },
      rocketEffect: powerEffect(),
    });
  },

  // Solve linear equations in one variable
  "KS3A-7": (rng, tier) => {
    if (tier === 1) {
      const m = rng.int(2, 9);
      const x = rng.int(2, 12);
      const b = rng.int(1, 9);
      const rhs = m * x + b;
      return makeTask({
        criterionCode: "KS3A-7",
        rocketPart: "electronics",
        tier,
        briefing: `The sensor calibration equation is on the readout. Solve it to find the calibration constant x.`,
        engineeringContext: "The constant x is burned into the sensor chip once we find it.",
        answer: String(x),
        choices: mc(rng, String(x), nearBy(rng, x, 3)),
        workedSteps: [`Subtract ${b} from both sides: ${m}x = ${rhs - b}.`, `Divide by ${m}: x = ${x}.`],
        hints: [`First remove the ${b} from the left side.`, `Then divide by ${m}.`],
        visual: { widget: "equation", config: { equation: `${m}x + ${b} = ${rhs}`, unknown: "x", interactive: true, min: 0, max: 20, step: 1 } },
        rocketEffect: powerEffect(),
      });
    }
    if (tier === 2) {
      const k = rng.int(2, 5);
      const a = rng.int(1, 6);
      const x = rng.int(2, 9);
      const rhs = k * (x + a);
      return makeTask({
        criterionCode: "KS3A-7",
        rocketPart: "electronics",
        tier,
        briefing: `The bracketed calibration equation is on the readout. Solve it for the gain setting x.`,
        engineeringContext: "The gain must be exact or the gyros drift during coast.",
        answer: String(x),
        workedSteps: [`Divide both sides by ${k}: x + ${a} = ${rhs / k}.`, `Subtract ${a}: x = ${x}.`],
        hints: [`Divide both sides by ${k} first.`, "Then undo the addition."],
        visual: { widget: "equation", config: { equation: `${k}(x + ${a}) = ${rhs}`, unknown: "x", interactive: true, min: 0, max: 20, step: 1 } },
        rocketEffect: powerEffect(),
      });
    }
    const x = rng.int(2, 10);
    const a = rng.int(3, 7);
    const b = rng.int(1, 9);
    const c = rng.int(1, a - 2);
    const d = (a - c) * x + b;
    return makeTask({
      criterionCode: "KS3A-7",
      rocketPart: "electronics",
      tier,
      briefing: `The thrust-balance equation on the readout has the unknown x on both sides. Rearrange and solve it to balance the two thruster banks.`,
      engineeringContext: "Both banks fire with matching force only at the exact solution.",
      answer: String(x),
      workedSteps: [`Subtract ${c}x from both sides: ${a - c}x + ${b} = ${d}.`, `Subtract ${b}: ${a - c}x = ${d - b}.`, `Divide by ${a - c}: x = ${x}.`],
      hints: ["Gather the x terms on one side first.", `Take ${c}x away from both sides.`],
      visual: { widget: "equation", config: { equation: `${a}x + ${b} = ${c}x + ${d}`, unknown: "x", interactive: true, min: 0, max: 20, step: 1 } },
      rocketEffect: powerEffect(),
    });
  },

  // Coordinates in all four quadrants
  "KS3A-8": (rng, tier) => {
    const px = (tier === 1 ? rng.int(1, 5) : rng.int(-5, 5)) || 2;
    const py = (tier === 1 ? -rng.int(1, 5) : rng.int(-5, 5)) || -3;
    const read = rng.next() < 0.5 || tier === 1;
    if (read) {
      return makeTask({
        criterionCode: "KS3A-8",
        rocketPart: "electronics",
        tier,
        briefing: `The radar plot shows the recovery beacon as a dot on the four-quadrant grid. Read off its coordinates and report them as x, y.`,
        engineeringContext: "The recovery truck drives to whatever coordinates you report.",
        answer: `${px},${py}`,
        workedSteps: ["Read across first (x), then up or down (y).", `The beacon sits at (${px}, ${py}).`],
        hints: ["Across first, then up or down.", "Negative x means left of centre; negative y means below."],
        visual: { widget: "graphPlot", config: { mode: "readPoint", px, py, min: -6, max: 6, readOnly: true } },
        rocketEffect: wiredEffect(3),
      });
    }
    return makeTask({
      criterionCode: "KS3A-8",
      rocketPart: "electronics",
      tier,
      briefing: `The tracking dish must be registered at ${px} across and ${py} up on the pad grid. Click that point on the four-quadrant plot to register it.`,
      engineeringContext: "Registered dish positions feed the triangulation software.",
      answer: `${px},${py}`,
      workedSteps: [`Start at the centre, move ${Math.abs(px)} ${px >= 0 ? "right" : "left"}.`, `Then ${Math.abs(py)} ${py >= 0 ? "up" : "down"}: that is (${px}, ${py}).`],
      hints: ["The first number is across; the second is up or down.", "Negative numbers flip the direction."],
      visual: { widget: "graphPlot", config: { mode: "plotPoint", min: -6, max: 6, interactive: true } },
      rocketEffect: wiredEffect(4),
      tolerance: 0,
    });
  },

  // Recognise/sketch/plot linear and quadratic graphs
  "KS3A-9": (rng, tier) => {
    if (tier === 1) {
      const quad = rng.next() < 0.5;
      const ans = quad ? "a U-shaped curve" : "a straight line";
      return makeTask({
        criterionCode: "KS3A-9",
        rocketPart: "electronics",
        tier,
        briefing: `The telemetry screen shows the graph of the ${quad ? "drag" : "climb"} function on the readout. What shape is this graph?`,
        engineeringContext: "Recognising graph shapes at a glance is a core flight-controller skill.",
        answer: ans,
        choices: mc(rng, ans, ["a straight line", "a U-shaped curve", "a circle", "a zig-zag"].filter((c) => c !== ans)),
        workedSteps: [quad ? "A squared term makes a symmetric U-shaped curve (a parabola)." : "An equation with plain x and no squares makes a straight line.", `So this graph is ${ans}.`],
        hints: ["Does the equation square its letter?", "Squared letter means a curve; plain letter means a line."],
        visual: { widget: "graphPlot", config: { mode: quad ? "quadratic" : "readLine", m: 2, c: 1, a: 1, min: -5, max: 5, readOnly: true } },
        rocketEffect: powerEffect(),
      });
    }
    const m = rng.int(1, 2);
    const c = rng.int(-2, 2);
    const x = rng.int(tier === 3 ? -3 : 1, 3);
    const quad = tier === 3 && rng.next() < 0.5;
    const y = quad ? x * x : m * x + c;
    return makeTask({
      criterionCode: "KS3A-9",
      rocketPart: "electronics",
      tier,
      briefing: `The ${quad ? "drag curve" : "climb line"} is plotted on the four-quadrant screen. Use the graph to read the value of y when x is ${x}.`,
      engineeringContext: "Controllers read predicted values straight off the plotted function.",
      answer: String(y),
      workedSteps: [`Find x as ${x} on the horizontal axis.`, `Go up (or down) to the graph, then across: y is ${y}.`],
      hints: ["Start on the horizontal axis.", "Trace vertically to the graph, then horizontally to the y axis."],
      visual: { widget: "graphPlot", config: { mode: quad ? "quadratic" : "readLine", m, c, a: 1, min: -10, max: 10, markX: x, readOnly: true } },
      rocketEffect: powerEffect(),
      tolerance: 0.5,
    });
  },

  // Interpret relationships algebraically and graphically
  "KS3A-10": (rng, tier) => {
    const rate = rng.int(2, tier === 1 ? 5 : 9);
    const start = rng.int(20, 60);
    return makeTask({
      criterionCode: "KS3A-10",
      rocketPart: "electronics",
      tier,
      briefing: `The screen plots fuel remaining against time during a static burn: the line starts at ${start} litres and falls steadily, dropping ${rate} litres every second. How many litres does the tank lose each second?`,
      engineeringContext: "The slope of the fuel line IS the burn rate — graph and algebra say the same thing.",
      answer: String(rate),
      choices: tier === 1 ? mc(rng, String(rate), nearBy(rng, rate, 2)) : undefined,
      workedSteps: ["The steepness (gradient) of the line is the change per second.", `The line drops ${rate} litres per second, so the rate is ${rate}.`],
      hints: ["How much does the line fall for one step across?", "The gradient is the per-second change."],
      visual: { widget: "graphPlot", config: { mode: "readLine", m: -rate, c: start, min: 0, max: 10, yLabel: "litres", xLabel: "seconds", readOnly: true } },
      rocketEffect: powerEffect(),
    });
  },

  // y = mx + c: gradients and intercepts
  "KS3A-11": (rng, tier) => {
    const m = rng.int(1, tier === 1 ? 3 : 5) * (tier === 3 && rng.next() < 0.4 ? -1 : 1);
    const c = rng.int(-4, 4);
    if (tier === 3) {
      return makeTask({
        criterionCode: "KS3A-11",
        rocketPart: "electronics",
        tier,
        briefing: `The ascent-profile screen shows a target line. Drag the guidance line's gradient and intercept until it matches, then lock in your m and c values as m, c.`,
        engineeringContext: "Matching the target profile is exactly how the autopilot is tuned.",
        answer: `${m},${c}`,
        workedSteps: [`The line rises ${m} for every 1 across, so m is ${m}.`, `It crosses the vertical axis at ${c}, so c is ${c}.`],
        hints: ["m is the rise for one step across.", "c is where the line cuts the vertical axis."],
        visual: { widget: "graphPlot", config: { mode: "matchLine", m, c, min: -6, max: 6, interactive: true } },
        rocketEffect: powerEffect(),
        tolerance: 0,
      });
    }
    const askGradient = rng.next() < 0.5;
    const ans = askGradient ? m : c;
    return makeTask({
      criterionCode: "KS3A-11",
      rocketPart: "electronics",
      tier,
      briefing: `The guidance line is plotted on the screen. Read off its ${askGradient ? "gradient — how much it rises for each step across" : "intercept — where it crosses the vertical axis"}.`,
      engineeringContext: "Gradient sets climb rate; intercept sets the starting height of the profile.",
      answer: String(ans),
      choices: tier === 1 ? mc(rng, String(ans), [String(ans + 1), String(ans - 1), String(askGradient ? c : m)]) : undefined,
      workedSteps: [askGradient ? `For each 1 across, the line rises ${m}.` : `The line crosses the vertical axis at ${c}.`, `So the answer is ${ans}.`],
      hints: [askGradient ? "Pick two grid points on the line and compare the rise to the run." : "Look where the line meets the vertical axis.", "The equation form is y = mx + c."],
      visual: { widget: "graphPlot", config: { mode: "readLine", m, c, min: -6, max: 6, readOnly: true } },
      rocketEffect: powerEffect(),
    });
  },

  // Use graphs to estimate values / solve simultaneous equations approximately
  "KS3A-12": (rng, tier) => {
    const x = rng.int(tier === 1 ? 1 : -2, 2);
    const m1 = rng.int(1, 2);
    const m2 = rng.int(1, 2) * -1;
    const c1 = rng.int(-2, 2);
    const y = m1 * x + c1;
    const c2 = y - m2 * x;
    return makeTask({
      criterionCode: "KS3A-12",
      rocketPart: "electronics",
      tier,
      briefing: `Two telemetry lines are plotted: the climb line and the descent line. The handover happens where they cross. Read the crossing point off the graph and report it as x, y.`,
      engineeringContext: "The crossing point is where control passes from boost to re-entry software.",
      answer: `${x},${y}`,
      workedSteps: ["Find where the two lines meet on the screen.", `They cross at (${x}, ${y}) — the shared solution of both equations.`],
      hints: ["Only one point sits on BOTH lines.", "Read its x first, then its y."],
      visual: { widget: "graphPlot", config: { mode: "intersection", m: m1, c: c1, m2, c2, min: -6, max: 6, readOnly: true } },
      rocketEffect: powerEffect(),
      tolerance: 0,
    });
  },

  // Contextual graphs: piece-wise linear, exponential, reciprocal
  "KS3A-13": (rng, tier) => {
    if (tier === 1) {
      const flatAt = rng.int(3, 7);
      return makeTask({
        criterionCode: "KS3A-13",
        rocketPart: "electronics",
        tier,
        briefing: `The speed graph climbs steadily, then goes flat. The flat section starts ${flatAt} seconds into the burn. How many seconds in did the speed stop climbing?`,
        engineeringContext: "The flat section is the cruise phase — engines throttled to hold speed.",
        answer: String(flatAt),
        choices: mc(rng, String(flatAt), nearBy(rng, flatAt, 2)),
        workedSteps: ["A flat section means no change — the speed holds steady.", `The graph turns flat at ${flatAt} seconds.`],
        hints: ["Flat means the value stops changing.", "Find the corner where the slope becomes level."],
        visual: { widget: "graphPlot", config: { mode: "piecewise", breakX: flatAt, m: 2, min: 0, max: 12, yLabel: "speed", xLabel: "seconds", readOnly: true } },
        rocketEffect: powerEffect(),
      });
    }
    if (tier === 2) {
      const start = rng.pick([64, 96, 128]);
      const halvings = rng.int(1, 3);
      const ans = start / 2 ** halvings;
      return makeTask({
        criterionCode: "KS3A-13",
        rocketPart: "electronics",
        tier,
        briefing: `The battery-charge graph halves every hour, starting at ${start} units. Use the curve to estimate the charge after ${halvings} hour${halvings > 1 ? "s" : ""}.`,
        engineeringContext: "Halving curves (exponential decay) govern battery drain in eclipse.",
        answer: String(ans),
        workedSteps: [`Each hour the charge halves.`, `After ${halvings} halving${halvings > 1 ? "s" : ""}: ${ans} units.`],
        hints: ["Halve the starting value once per hour.", "The curve drops fast at first, then flattens."],
        visual: { widget: "graphPlot", config: { mode: "exponential", start, min: 0, max: 6, yLabel: "charge", xLabel: "hours", readOnly: true } },
        rocketEffect: powerEffect(),
      });
    }
    const k = rng.pick([12, 24, 36]);
    const x = rng.pick([2, 3, 4, 6]);
    const ans = k / x;
    return makeTask({
      criterionCode: "KS3A-13",
      rocketPart: "electronics",
      tier,
      briefing: `The sharing graph shows how the ${k} kilowatt supply divides among active thrusters: the more thrusters, the less power each gets. Use the curve to find the power per thruster with ${x} thrusters running.`,
      engineeringContext: "Reciprocal curves appear whenever a fixed supply is shared out.",
      answer: String(ans),
      workedSteps: [`The curve shows ${k} shared among the thruster count.`, `With ${x} thrusters: ${k} split ${x} ways is ${ans} kilowatts each.`],
      hints: ["A fixed total shared more ways means less each.", `Split ${k} into ${x} equal parts.`],
      visual: { widget: "graphPlot", config: { mode: "reciprocal", k, min: 0, max: 12, yLabel: "kW each", xLabel: "thrusters", markX: x, readOnly: true } },
      rocketEffect: powerEffect(),
      tolerance: 0.5,
    });
  },

  // Generate sequences from term-to-term or position-to-term rules
  "KS3A-14": (rng, tier) => {
    if (tier === 3) {
      const mult = rng.int(3, 6);
      const add = rng.int(1, 9);
      const n = rng.int(3, 6);
      const ans = mult * n + add;
      return makeTask({
        criterionCode: "KS3A-14",
        rocketPart: "electronics",
        tier,
        briefing: `The burn scheduler uses a position-to-term rule: multiply the burn number by ${mult}, then add ${add} seconds. What is the length of burn number ${n}?`,
        engineeringContext: "Position-to-term rules let the computer jump straight to any burn.",
        answer: String(ans),
        workedSteps: [`Multiply the position ${n} by ${mult}: ${mult * n}.`, `Add ${add}: burn ${n} lasts ${ans} seconds.`],
        hints: ["Use the position number in the rule directly.", `Start with ${n} times ${mult}.`],
        visual: { widget: "sequence", config: { terms: [1, 2, 3].map((i) => mult * i + add).join(","), ask: "position", n, label: "burn length (s)" } },
        rocketEffect: wiredEffect(4),
      });
    }
    const start = rng.int(2, 9);
    const step = rng.int(2, tier === 1 ? 5 : 9);
    const terms = [start, start + step, start + step * 2, start + step * 3];
    const ans = start + step * 4;
    return makeTask({
      criterionCode: "KS3A-14",
      rocketPart: "electronics",
      tier,
      briefing: `The burn schedule fires pulses at these mission times, in seconds: ${terms.join(", ")}. The term-to-term rule adds the same amount each time. When does the next pulse fire?`,
      engineeringContext: "The scheduler builds each pulse time from the one before it.",
      answer: String(ans),
      choices: tier === 1 ? mc(rng, String(ans), [String(ans + 1), String(ans - step + 1), String(ans + step)]) : undefined,
      workedSteps: [`The gap between pulses is ${step} seconds.`, `Add ${step} to ${terms[3]}: the next pulse is at ${ans}.`],
      hints: ["Find the gap between neighbouring times.", "Add that same gap to the last time."],
      visual: { widget: "sequence", config: { terms: terms.join(","), ask: "next", interactive: true, label: "pulse times (s)" } },
      rocketEffect: wiredEffect(3),
    });
  },

  // Arithmetic sequences and the nth term
  "KS3A-15": (rng, tier) => {
    const step = rng.int(2, 6);
    const first = rng.int(1, 9);
    const terms = [first, first + step, first + step * 2, first + step * 3];
    if (tier === 3) {
      const ans = `${step}n + ${first - step}`;
      const c0 = first - step;
      return makeTask({
        criterionCode: "KS3A-15",
        rocketPart: "electronics",
        tier,
        briefing: `The antenna deploy steps happen at these times, in seconds: ${terms.join(", ")}. The software needs the nth-term rule for this arithmetic sequence. Which rule is correct?`,
        engineeringContext: "With the nth term coded, the computer knows step one thousand without counting.",
        answer: ans,
        choices: mc(rng, ans, [`${step}n + ${first}`, `${first}n + ${step}`, `${step + 1}n + ${c0}`]),
        workedSteps: [`The common difference is ${step}, so the rule starts ${step}n.`, `Check n as 1: ${step}n gives ${step}; we need ${first}, so adjust by ${c0 >= 0 ? "adding" : "subtracting"} ${Math.abs(c0)}: ${ans}.`],
        hints: ["The number in front of n is the common difference.", "Test your rule with the first term."],
        visual: { widget: "sequence", config: { terms: terms.join(","), ask: "nth", label: "deploy times (s)" } },
        rocketEffect: wiredEffect(5),
      });
    }
    const n = tier === 1 ? 6 : rng.pick([10, 15, 20]);
    const ans = first + step * (n - 1);
    return makeTask({
      criterionCode: "KS3A-15",
      rocketPart: "electronics",
      tier,
      briefing: `Deploy steps run at these times, in seconds: ${terms.join(", ")}, continuing with the same gap. What time is step number ${n}?`,
      engineeringContext: "Late steps matter: the dish must be open before the first downlink.",
      answer: String(ans),
      choices: tier === 1 ? mc(rng, String(ans), [String(ans + step), String(ans - step), String(step * n)]) : undefined,
      workedSteps: [`The gap is ${step}; step ${n} needs ${n - 1} gaps after the first.`, `${first} plus ${n - 1} times ${step} is ${ans}.`],
      hints: ["How many gaps between step 1 and the step you want?", `Each gap adds ${step}.`],
      visual: { widget: "sequence", config: { terms: terms.join(","), ask: "position", n, interactive: true, label: "deploy times (s)" } },
      rocketEffect: wiredEffect(4),
    });
  },

  // Geometric and other sequences
  "KS3A-16": (rng, tier) => {
    if (tier === 1) {
      const first = rng.pick([2, 3, 5]);
      const terms = [first, first * 2, first * 4, first * 8];
      const ans = first * 16;
      return makeTask({
        criterionCode: "KS3A-16",
        rocketPart: "electronics",
        tier,
        briefing: `The signal repeater doubles its output each stage: ${terms.join(", ")} millivolts so far. What is the next stage's output?`,
        engineeringContext: "Doubling chains are geometric — they grow by multiplying, not adding.",
        answer: String(ans),
        choices: mc(rng, String(ans), [String(terms[3] + first * 8), String(terms[3] + 2), String(terms[3] * 3)]),
        workedSteps: ["Each stage multiplies by 2, not adds.", `${terms[3]} doubled is ${ans}.`],
        hints: ["Check: is the sequence adding or multiplying?", "Double the last term."],
        visual: { widget: "sequence", config: { terms: terms.join(","), ask: "next", interactive: true, label: "output (mV)" } },
        rocketEffect: wiredEffect(3),
      });
    }
    if (tier === 2) {
      const kind = rng.pick(["geometric", "arithmetic"]);
      const first = rng.int(2, 5);
      const terms = kind === "geometric"
        ? [first, first * 3, first * 9, first * 27]
        : [first, first + 7, first + 14, first + 21];
      return makeTask({
        criterionCode: "KS3A-16",
        rocketPart: "electronics",
        tier,
        briefing: `The diagnostics log shows these readings: ${terms.join(", ")}. The analyst must file the pattern type. Is this sequence arithmetic or geometric?`,
        engineeringContext: "Pattern type decides which prediction module the computer loads.",
        answer: kind,
        choices: mc(rng, kind, ["arithmetic", "geometric"].filter((k) => k !== kind)),
        workedSteps: [kind === "geometric" ? "Each term is the one before multiplied by 3." : "Each term is the one before with 7 added.", `Multiplying makes it geometric; adding makes it arithmetic. This one is ${kind}.`],
        hints: ["Compare neighbouring terms: same difference or same multiplier?", "Divide a term by the one before and see."],
        visual: { widget: "sequence", config: { terms: terms.join(","), ask: "classify", label: "diagnostic readings" } },
        rocketEffect: wiredEffect(4),
      });
    }
    const fib = [1, 1, 2, 3, 5, 8, 13, 21];
    const startIdx = rng.int(0, 2);
    const window = fib.slice(startIdx, startIdx + 5);
    const ans = fib[startIdx + 5];
    return makeTask({
      criterionCode: "KS3A-16",
      rocketPart: "electronics",
      tier,
      briefing: `The spiral antenna winds in segments of ${window.join(", ")} centimetres — each segment is the sum of the two before it. How long is the next segment?`,
      engineeringContext: "This famous sequence shapes natural spirals — and our antenna coil.",
      answer: String(ans),
      workedSteps: [`Add the last two segments: ${window[3]} and ${window[4]}.`, `The next segment is ${ans} centimetres.`],
      hints: ["Each term comes from the two before it.", `Add ${window[3]} and ${window[4]}.`],
      visual: { widget: "sequence", config: { terms: window.join(","), ask: "next", interactive: true, label: "segment lengths (cm)" } },
      rocketEffect: wiredEffect(5),
    });
  },
};