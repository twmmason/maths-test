import type { GeneratedTask } from "../types";
import type { Rng } from "../rng";
import { makeTask, mc, nearBy, fmt } from "./helpers";

type Gen = (rng: Rng, tier: 1 | 2 | 3) => GeneratedTask;

const powerEffect = () => ({
  property: "powerBalanced",
  correctValue: 1,
  incorrectValue: 0,
  unit: "",
});
const wiredEffect = (n: number) => ({
  property: "circuitsWired",
  correctValue: n,
  incorrectValue: Math.max(0, n - 1),
  unit: "circuits",
});

export const electronicsTemplates: Record<string, Gen> = {
  "1AS-2": (rng, tier) => {
    const total = tier === 1 ? 8 : 10;
    const lit = rng.int(2, total - 2);
    const ans = total - lit;
    return makeTask({
      criterionCode: "1AS-2",
      rocketPart: "electronics",
      tier,
      briefing: `The status board carries ${total} LEDs in a row. Right now ${lit} of them are glowing green and the rest are dark. The wiring check needs the count of dark LEDs. How many are off?`,
      engineeringContext: "Each dark LED marks a circuit still waiting to be wired.",
      answer: String(ans),
      choices: tier === 1 ? mc(rng, String(ans), nearBy(rng, ans, 2)) : undefined,
      workedSteps: [`${lit} are glowing out of ${total} altogether.`, `Count from ${lit} up to ${total}: ${ans} LEDs are off.`],
      hints: [`Cover the ${lit} lit ones — how many are left?`, `${lit} and how many more make ${total}?`],
      visual: { widget: "circuit", config: { mode: "leds", total, lit } },
      rocketEffect: wiredEffect(1),
    });
  },

  "2AS-2": (rng, tier) => {
    const b = rng.int(tier === 1 ? 20 : 28, tier === 1 ? 40 : 55);
    const a = b + rng.int(3, tier === 1 ? 9 : 27);
    const ans = a - b;
    return makeTask({
      criterionCode: "2AS-2",
      rocketPart: "electronics",
      tier,
      briefing: `Sensor A on the engine bay reads ${a}°C. Sensor B near the fuel tank reads ${b}°C. The cooling computer needs the temperature difference between the two sensors before it sets the fans. What is the difference?`,
      engineeringContext: "A big difference means one bay is running hot and needs more cooling.",
      answer: String(ans),
      workedSteps: [
        `Find how far apart ${b} and ${a} are on the thermometer.`,
        `Counting up from ${b} to ${a} covers ${ans} degrees.`,
      ],
      hints: [`Count up from ${b} to the next ten first.`, "The difference is the gap between the two readings."],
      visual: { widget: "numberLine", config: { min: 0, max: Math.ceil(a / 10) * 10 + 10, step: 5, pointer: a, pointer2: b, readOnly: true, unit: "°C" } },
      rocketEffect: powerEffect(),
    });
  },

  "2AS-3": (rng, tier) => {
    const draw = tier === 1 ? rng.int(2, 9) * 10 : rng.int(31, 89);
    const ans = 100 - draw;
    return makeTask({
      criterionCode: "2AS-3",
      rocketPart: "electronics",
      tier,
      briefing: `The main power bus supplies exactly 100 watts. The engine heaters are already drawing ${draw} watts of it. The comms array wants to switch on next. How many watts are left for it?`,
      engineeringContext: "If the comms array asks for more than the spare watts, the bus trips out.",
      answer: String(ans),
      choices: tier === 1 ? mc(rng, String(ans), [String(ans + 10), String(Math.max(0, ans - 10)), String(draw)]) : undefined,
      workedSteps: [`The bus holds 100 watts and ${draw} are used.`, `${draw} and ${ans} together make 100, so ${ans} watts are spare.`],
      hints: [`${draw} and how many more make 100?`, "Jump to the next ten first, then count the tens."],
      visual: { widget: "barModel", config: { total: 100, known: draw, label: "watts" } },
      rocketEffect: powerEffect(),
    });
  },

  "2AS-4": (rng, tier) => {
    const a = rng.int(23, 48);
    const b = rng.int(23, 48);
    const ans = a + b;
    return makeTask({
      criterionCode: "2AS-4",
      rocketPart: "electronics",
      tier,
      briefing: `Circuit board A draws ${a} watts and circuit board B draws ${b} watts. Before both boards can be switched on together, the fuse chart needs their combined draw. What is it, in watts?`,
      engineeringContext: "The fuse must be rated above the true combined draw or it blows at switch-on.",
      answer: String(ans),
      workedSteps: [`Add the tens of ${a} and ${b} first, then the ones.`, `The combined draw is ${ans} watts.`],
      hints: ["Split each number into tens and ones.", "Add tens with tens, ones with ones, then combine."],
      visual: { widget: "barModel", config: { partA: a, partB: b, label: "watts" } },
      rocketEffect: wiredEffect(2),
    });
  },

  "3AS-2": (rng, tier) => {
    const a = rng.int(112, 289);
    const b = rng.int(112, 289);
    const c = tier === 1 ? 0 : rng.int(105, 245);
    const ans = a + b + c;
    const boards = c ? `${a} watts, ${b} watts and ${c} watts` : `${a} watts and ${b} watts`;
    return makeTask({
      criterionCode: "3AS-2",
      rocketPart: "electronics",
      tier,
      briefing: `The ${c ? "three" : "two"} flight computers draw ${boards}. The main fuse is rated at 600 watts, and the electrician must write the exact total draw on the fuse label before launch. What total should the label show?`,
      engineeringContext: "The fuse holds only if the true total stays under its 600 watt rating.",
      answer: String(ans),
      workedSteps: [
        "Stack the numbers in columns: hundreds, tens, ones.",
        `Add each column, carrying where needed: the total is ${fmt(ans)} watts.`,
      ],
      hints: ["Line the numbers up by place value.", "Start with the ones column and carry into the tens."],
      visual: { widget: "circuit", config: { mode: "boards", draws: [a, b, c].filter(Boolean).join(","), fuse: 600 } },
      rocketEffect: wiredEffect(3),
    });
  },

  "3AS-3": (rng, tier) => {
    const a = rng.int(112, 268);
    const rest = rng.int(105, 260);
    const total = a + rest;
    return makeTask({
      criterionCode: "3AS-3",
      rocketPart: "electronics",
      tier,
      briefing: `The power log records a total draw of ${fmt(total)} watts. Board A alone uses ${a} watts. To double-check the log by working backwards, find what the OTHER boards use together. What is it?`,
      engineeringContext: "Working backwards catches copy errors before they reach the launch computer.",
      answer: String(rest),
      workedSteps: [
        `The total is ${fmt(total)} and board A takes ${a} of it.`,
        `Take ${a} away from ${fmt(total)}: the rest use ${rest} watts.`,
        `Check: ${a} put back with ${rest} gives ${fmt(total)} again.`,
      ],
      hints: ["The whole take away one part leaves the other part.", "You can check by putting the parts back together."],
      visual: { widget: "barModel", config: { total, known: a, label: "watts" } },
      rocketEffect: powerEffect(),
    });
  },

  "6AS/MD-1": (rng, tier) => {
    const panel = rng.pick([40, 50, 60]);
    const mult = rng.pick(tier === 1 ? [3] : [3, 4]);
    const addOption = panel * 2;
    const multOption = panel * mult;
    const ans = multOption > addOption ? "the multiplier" : "another panel";
    return makeTask({
      criterionCode: "6AS/MD-1",
      rocketPart: "electronics",
      tier,
      briefing: `The solar panel makes ${panel} watts. The guidance computer needs more power, and there are two upgrades on the shelf: fit a second identical ${panel} watt panel, or fit a booster module that makes the system produce ${mult} times the panel's output. Which upgrade delivers more watts?`,
      engineeringContext: "Adding combines amounts; a multiplier scales them — they behave very differently.",
      answer: ans,
      choices: mc(rng, ans, ["another panel", "the multiplier"].filter((c) => c !== ans)),
      workedSteps: [
        `A second panel gives ${panel} with ${panel} more: ${addOption} watts.`,
        `The booster gives ${mult} lots of ${panel}: ${multOption} watts.`,
        `${multOption > addOption ? "The multiplier wins." : "The extra panel wins."}`,
      ],
      hints: ["Work out each option's watts separately.", "Adding puts amounts together; multiplying takes an amount several times."],
      visual: { widget: "circuit", config: { mode: "power", panel, mult } },
      rocketEffect: powerEffect(),
    });
  },

  "6AS/MD-2": (rng, tier) => {
    const per = rng.pick(tier === 1 ? [4, 5] : [6, 7, 8, 9, 12]);
    const count = rng.int(4, tier === 3 ? 12 : 9);
    const total = per * count;
    return makeTask({
      criterionCode: "6AS/MD-2",
      rocketPart: "electronics",
      tier,
      briefing: `${count} identical batteries wired together supply ${total} watts to the flight computer. The label has worn off, so nobody knows one battery's output. Work backwards from the total: what does a single battery supply?`,
      engineeringContext: "Each battery's output must be logged so spares can be matched exactly.",
      answer: String(per),
      workedSteps: [
        `${count} equal batteries make ${total} watts, so undo the scaling.`,
        `Share ${total} into ${count} equal parts: one battery supplies ${per} watts.`,
      ],
      hints: ["Undo a scaling by sharing equally.", `What number, taken ${count} times, makes ${total}?`],
      visual: { widget: "circuit", config: { mode: "batteries", count, total } },
      rocketEffect: powerEffect(),
    });
  },

  "6AS/MD-4": (rng, tier) => {
    const k = rng.pick(tier === 1 ? [3] : [2, 3, 4]);
    const small = rng.int(2, tier === 3 ? 12 : 6);
    const total = small * (k + 1);
    return makeTask({
      criterionCode: "6AS/MD-4",
      rocketPart: "electronics",
      tier,
      briefing: `Two resistors control the thruster heater. Together they measure ${total} ohms, and Resistor A measures ${k} times as much as Resistor B. Use the bar model on the breadboard to find Resistor B's value. What is it, in ohms?`,
      engineeringContext: "The heater only warms evenly when both resistor values are exactly right.",
      answer: String(small),
      workedSteps: [
        `Draw 1 bar for B and ${k} equal bars for A: ${k + 1} equal bars in total.`,
        `The ${k + 1} bars together make ${total}, so one bar is ${small}.`,
        `Resistor B is ${small} ohms (and A is ${small * k} ohms).`,
      ],
      hints: [`If B is one bar, how many bars is A?`, `How many equal bars make up the total of ${total}?`],
      visual: { widget: "barModel", config: { total, ratio: k, label: "ohms", interactive: true } },
      rocketEffect: powerEffect(),
    });
  },
};