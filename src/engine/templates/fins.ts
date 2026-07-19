import type { GeneratedTask } from "../types";
import type { Rng } from "../rng";
import { makeTask, mc, nearBy } from "./helpers";

type Gen = (rng: Rng, tier: 1 | 2 | 3) => GeneratedTask;

const finEffect = (count: number) => ({
  property: "finCount",
  correctValue: count,
  incorrectValue: Math.max(2, count - 1),
  unit: "fins",
});
const symmetryEffect = () => ({
  property: "finSymmetry",
  correctValue: 1,
  incorrectValue: 0,
  unit: "",
});

export const finsTemplates: Record<string, Gen> = {
  "3G-2": (rng, tier) => {
    const items = [
      { thing: "the fin's leading edge, running straight up and down the hull", ans: "vertical" },
      { thing: "the launch rail, running flat along the ground", ans: "horizontal" },
      { thing: "the service tower, standing straight up from the pad", ans: "vertical" },
      { thing: "the crew walkway, lying flat from the tower to the rocket", ans: "horizontal" },
    ];
    const item = rng.pick(tier === 1 ? items.slice(0, 2) : items);
    return makeTask({
      criterionCode: "3G-2",
      rocketPart: "fins",
      tier,
      briefing: `The pad survey team is labelling every line in the blueprint. Look at ${item.thing}. Should they label it horizontal or vertical?`,
      engineeringContext: "The autopilot uses these labels to know which way is up.",
      answer: item.ans,
      choices: mc(rng, item.ans, ["horizontal", "vertical"].filter((c) => c !== item.ans)),
      workedSteps: [
        "Horizontal lines lie flat, like the horizon. Vertical lines stand straight up.",
        `So this one is ${item.ans}.`,
      ],
      hints: ["Horizontal comes from 'horizon' — flat like the sea.", "Vertical stands tall like a flag pole."],
      visual: { widget: "grid", config: { size: 8, mode: "lines", orientation: item.ans } },
      rocketEffect: symmetryEffect(),
    });
  },

  "4G-3": (rng, tier) => {
    const size = tier === 1 ? 6 : 10;
    const x = rng.int(1, size - 1);
    const y = rng.int(1, size - 1);
    return makeTask({
      criterionCode: "4G-3",
      rocketPart: "fins",
      tier,
      briefing: `The blueprint grid shows where each fin bolt goes. Place the fin bolt at the point (${x}, ${y}) — count along the bottom first, then up.`,
      engineeringContext: "A bolt in the wrong grid square would leave the fin loose in flight.",
      answer: `${x},${y}`,
      workedSteps: [
        `Start at (0, 0) in the corner.`,
        `Go ${x} squares along the bottom, then ${y} squares up. That is (${x}, ${y}).`,
      ],
      hints: ["Along the corridor, then up the stairs — across first, then up.", `The first number (${x}) is the across number.`],
      visual: { widget: "grid", config: { size, targetX: x, targetY: y, interactive: true } },
      rocketEffect: finEffect(4),
    });
  },

  "5G-2": (rng, tier) => {
    const size = 10;
    const x = rng.int(0, 5);
    const y = rng.int(0, 5);
    const dx = rng.int(1, tier === 1 ? 3 : 4);
    const dy = rng.int(1, tier === 1 ? 3 : 4);
    return makeTask({
      criterionCode: "5G-2",
      rocketPart: "fins",
      tier,
      briefing: `Wind tunnel results say the fin bolt at (${x}, ${y}) must move: slide it ${dx} squares right and ${dy} squares up on the blueprint. Click the square where it lands.`,
      engineeringContext: "Moving the fin changes where the steering force pushes on the rocket.",
      answer: `${x + dx},${y + dy}`,
      workedSteps: [
        `Start at (${x}, ${y}).`,
        `Right ${dx} changes the across number to ${x + dx}; up ${dy} changes the up number to ${y + dy}.`,
        `The bolt lands at (${x + dx}, ${y + dy}).`,
      ],
      hints: ["Sliding right changes only the first number.", "Sliding up changes only the second number."],
      visual: { widget: "grid", config: { size, startX: x, startY: y, targetX: x + dx, targetY: y + dy, interactive: true, showStart: true } },
      rocketEffect: symmetryEffect(),
    });
  },

  "1AS-1": (rng, tier) => {
    const fitted = rng.int(1, 9);
    const ans = 10 - fitted;
    return makeTask({
      criterionCode: "1AS-1",
      rocketPart: "fins",
      tier,
      briefing: `Each fin pair is held on by 10 rivets in total. The workshop has already fitted ${fitted} rivets on the left fin. How many rivets are needed on the right fin to finish the pair?`,
      engineeringContext: "Both fins must share the 10 rivets or one will shake loose.",
      answer: String(ans),
      choices: tier === 1 ? mc(rng, String(ans), nearBy(rng, ans, 2)) : undefined,
      workedSteps: [`${fitted} rivets are in. The pair needs 10 altogether.`, `Count on from ${fitted} to 10: that is ${ans} more.`],
      hints: [`${fitted} and how many more make 10?`, "Use your pairs that make ten."],
      visual: { widget: "barModel", config: { total: 10, known: fitted, label: "rivets" } },
      rocketEffect: finEffect(4),
    });
  },

  "2AS-1": (rng, tier) => {
    const a = rng.int(tier === 1 ? 11 : 25, tier === 1 ? 38 : 48);
    const b = rng.int(tier === 1 ? 11 : 25, tier === 1 ? 38 : 48);
    const ans = a + b;
    return makeTask({
      criterionCode: "2AS-1",
      rocketPart: "fins",
      tier,
      briefing: `Fin A weighs ${a} kg and Fin B weighs ${b} kg. The launch rail team must check the rail can hold both fins at once, so they need the combined weight. What is it?`,
      engineeringContext: "The rail bends if the true weight is more than its rating.",
      answer: String(ans),
      workedSteps: [`Add the tens: ${Math.floor(a / 10) * 10} and ${Math.floor(b / 10) * 10}.`, `Add the ones, then combine: ${ans} kg.`],
      hints: ["Add the tens first, then the ones.", `Start from ${Math.max(a, b)} and count on ${Math.min(a, b)}.`],
      visual: { widget: "barModel", config: { partA: a, partB: b, label: "kg" } },
      rocketEffect: finEffect(4),
    });
  },

  "3AS-1": (rng, tier) => {
    const used = rng.int(tier === 1 ? 20 : 11, tier === 1 ? 80 : 89);
    const ans = 100 - used;
    return makeTask({
      criterionCode: "3AS-1",
      rocketPart: "fins",
      tier,
      briefing: `The aerodynamics team set a fin mass budget of exactly 100 kg. The lower fins came off the workshop scales at ${used} kg. How much of the budget is left for the upper fins?`,
      engineeringContext: "Heavier fins steal lifting power from the payload.",
      answer: String(ans),
      workedSteps: [
        `Count from ${used} up to the next ten: that takes ${(10 - (used % 10)) % 10}.`,
        `Then count the tens up to 100. Altogether the budget left is ${ans} kg.`,
      ],
      hints: ["Jump to the next multiple of 10 first.", `${used} and what make 100?`],
      visual: { widget: "barModel", config: { total: 100, known: used, label: "kg" } },
      rocketEffect: finEffect(4),
    });
  },
};