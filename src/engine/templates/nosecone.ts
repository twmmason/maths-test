import type { GeneratedTask } from "../types";
import type { Rng } from "../rng";
import { makeTask, mc, nearBy } from "./helpers";

type Gen = (rng: Rng, tier: 1 | 2 | 3) => GeneratedTask;

const effect = (correct: number, incorrect: number) => ({
  property: "noseAngle",
  correctValue: correct,
  incorrectValue: incorrect,
  unit: "°",
});

export const noseconeTemplates: Record<string, Gen> = {
  "1G-1": (rng, tier) => {
    const target = rng.pick(["cone", "cylinder", "sphere"] as const);
    const jobs: Record<string, string> = {
      cone: "the pointed nose at the very tip of the rocket",
      cylinder: "the round tube section that the nose sits on",
      sphere: "the round ball-shaped fuel blister",
    };
    const pool = tier === 1 ? ["cone", "cube", "sphere"] : ["cone", "cube", "sphere", "cylinder"];
    return makeTask({
      criterionCode: "1G-1",
      rocketPart: "noseCone",
      tier,
      briefing: `The parts tray has arrived from the workshop. We need ${jobs[target]}. Which shape on the tray is the ${target} we need?`,
      engineeringContext: "Picking the right shaped part keeps the airflow smooth over the rocket.",
      answer: target,
      choices: mc(rng, target, pool.filter((s) => s !== target)),
      workedSteps: [
        `A ${target} is the shape with ${target === "cone" ? "a circle at the bottom and a point at the top" : target === "cylinder" ? "two circle ends and straight sides" : "a perfectly round surface all over"}.`,
        `Find that shape on the tray and select it.`,
      ],
      hints: [`Think about what a ${target} looks like from the side.`, "Look for the part that matches the job described."],
      visual: { widget: "protractor", config: { showShape: target, showAngle: false } },
      rocketEffect: effect(36, 60),
    });
  },

  "1G-2": (rng, tier) => {
    const top = "cone";
    const below = tier === 1 ? "cylinder" : rng.pick(["cylinder", "cuboid fairing", "hexagonal collar"]);
    return makeTask({
      criterionCode: "1G-2",
      rocketPart: "noseCone",
      tier,
      briefing: `We are stacking the nose section: one cone and one ${below}. The rocket must end in a point so the air slides past. Which shape goes on top?`,
      engineeringContext: "Stacking the shapes in the right order gives the rocket a smooth pointed tip.",
      answer: top,
      choices: mc(rng, top, [below.split(" ")[0], "sphere", "cube"]),
      workedSteps: [
        "The rocket needs a pointed tip so the air flows around it.",
        `The cone has the point, so the cone goes on top of the ${below}.`,
      ],
      hints: ["Which of the two shapes has a point?", "The pointy end always faces the sky."],
      visual: { widget: "protractor", config: { showShape: "stack", showAngle: false } },
      rocketEffect: effect(36, 60),
    });
  },

  "2G-1": (rng, tier) => {
    const shapes = [
      { name: "triangle", sides: 3 },
      { name: "square", sides: 4 },
      { name: "pentagon", sides: 5 },
      { name: "hexagon", sides: 6 },
    ];
    const shape = tier === 1 ? shapes[0] : rng.pick(shapes);
    const askVertices = rng.next() < 0.5;
    const ans = shape.sides;
    return makeTask({
      criterionCode: "2G-1",
      rocketPart: "noseCone",
      tier,
      briefing: `Slice the nose section straight down the middle and the cross-section is a ${shape.name}. The strength team needs to know how many ${askVertices ? "corners" : "sides"} the ${shape.name} has so they can brace each one. How many?`,
      engineeringContext: "Every corner of the cross-section needs a support brace to survive launch forces.",
      answer: String(ans),
      choices: tier < 3 ? mc(rng, String(ans), nearBy(rng, ans, 2)) : undefined,
      workedSteps: [
        `Picture the ${shape.name} and count around its edge.`,
        `A ${shape.name} has ${ans} sides and ${ans} corners.`,
      ],
      hints: [`Trace around the ${shape.name} with your finger and count as you go.`, "A shape has the same number of corners as sides."],
      visual: { widget: "protractor", config: { showShape: shape.name, showAngle: false } },
      rocketEffect: effect(40, 55),
    });
  },

  "3G-1": (rng, tier) => {
    return makeTask({
      criterionCode: "3G-1",
      rocketPart: "noseCone",
      tier,
      briefing:
        tier === 1
          ? "The joint where the nose cone meets the hull must be a perfect quarter turn — a right angle. Use the protractor to set the joint. How many degrees is a right angle?"
          : "The inspection hatch swings open through a quarter turn before it locks. Set the protractor to show exactly that quarter turn. How many degrees?",
      engineeringContext: "A true right-angle joint spreads launch forces evenly into the hull.",
      answer: "90",
      choices: tier === 1 ? mc(rng, "90", ["45", "180", "100"]) : undefined,
      workedSteps: [
        "A full turn is 360 degrees.",
        "A quarter turn is a quarter of 360, which is 90 degrees — a right angle.",
      ],
      hints: ["Think of the corner of a square — that is a right angle.", "A quarter of a full 360 degree turn."],
      visual: { widget: "protractor", config: { target: 90, interactive: true } },
      rocketEffect: effect(90, 75),
      tolerance: 3,
    });
  },

  "4G-1": (rng, tier) => {
    const kinds = [
      { label: "acute", range: [15, 80] },
      { label: "right", range: [90, 90] },
      { label: "obtuse", range: [100, 165] },
    ] as const;
    const kind = rng.pick(kinds);
    const angle = kind.range[0] === kind.range[1] ? 90 : rng.int(kind.range[0], kind.range[1]);
    return makeTask({
      criterionCode: "4G-1",
      rocketPart: "noseCone",
      tier,
      briefing: `The design scanner measured this nose cone's tip angle at ${angle}°. The catalogue files cones by angle type. Is this tip angle acute, right, or obtuse?`,
      engineeringContext: "Sharper (acute) tips slice through the air with less drag.",
      answer: kind.label,
      choices: mc(rng, kind.label, ["acute", "right", "obtuse"].filter((k) => k !== kind.label)),
      workedSteps: [
        "Acute angles are smaller than 90°. Right angles are exactly 90°. Obtuse angles are bigger than 90° but smaller than 180°.",
        `${angle}° is ${kind.label}.`,
      ],
      hints: ["Compare the angle to 90° — the corner of a square.", "Smaller than a square corner is acute; bigger is obtuse."],
      visual: { widget: "protractor", config: { angle, interactive: false } },
      rocketEffect: effect(Math.min(angle, 60), 60),
    });
  },

  "4G-2": (rng, tier) => {
    const count = tier === 1 ? 3 : 4;
    const angles = rng.shuffle([rng.int(20, 34), rng.int(38, 52), rng.int(56, 70), rng.int(74, 88)]).slice(0, count);
    const labels = ["A", "B", "C", "D"].slice(0, count);
    const min = Math.min(...angles);
    const winner = labels[angles.indexOf(min)];
    const listing = labels.map((l, i) => `Cone ${l} has a tip angle of ${angles[i]}°`).join(", ");
    return makeTask({
      criterionCode: "4G-2",
      rocketPart: "noseCone",
      tier,
      briefing: `The wind tunnel report is in: the cone with the smallest tip angle slips through the air with the least drag. ${listing}. Which cone should we fit?`,
      engineeringContext: "Less drag means the rocket keeps more of its speed on the way up.",
      answer: `Cone ${winner}`,
      choices: mc(rng, `Cone ${winner}`, labels.filter((l) => l !== winner).map((l) => `Cone ${l}`)),
      workedSteps: [
        `Compare the tip angles: ${angles.join("°, ")}°.`,
        `The smallest is ${min}°, so Cone ${winner} has the least drag.`,
      ],
      hints: ["Order the angles from smallest to largest first.", "The sharpest tip has the smallest angle number."],
      visual: { widget: "protractor", config: { angle: min, interactive: false, compare: angles.join(",") } },
      rocketEffect: effect(min, 70),
    });
  },

  "5G-1": (rng, tier) => {
    const step = tier === 1 ? 10 : tier === 2 ? 5 : 1;
    const angle = rng.int(2, tier === 3 ? 15 : 12) * step + (tier === 3 ? rng.int(0, 4) : 0);
    const clamped = Math.max(15, Math.min(150, angle));
    return makeTask({
      criterionCode: "5G-1",
      rocketPart: "noseCone",
      tier,
      briefing: `Quality control needs a reading before this cone is certified. Line the protractor up on the tip and measure the angle. Type your reading in degrees.`,
      engineeringContext: "The certificate must record the exact tip angle so the drag numbers can be trusted.",
      answer: String(clamped),
      workedSteps: [
        "Put the protractor's centre point on the tip of the cone.",
        "Line the zero line along one edge, then read where the other edge crosses the scale.",
        `The edge crosses at ${clamped}°.`,
      ],
      hints: ["Make sure you read from the scale that starts at zero on your baseline edge.", "Count the small marks between the labelled numbers."],
      visual: { widget: "protractor", config: { angle: clamped, interactive: true, measure: true } },
      rocketEffect: effect(clamped, 60),
      tolerance: 3,
    });
  },

  "6G-1": (rng, tier) => {
    const shapes = [
      { name: "an isosceles triangle", lines: 1 },
      { name: "an equilateral triangle", lines: 3 },
      { name: "a square", lines: 4 },
      { name: "a regular pentagon", lines: 5 },
      { name: "a regular hexagon", lines: 6 },
    ];
    const shape = tier === 1 ? shapes[0] : tier === 2 ? rng.pick(shapes.slice(0, 3)) : rng.pick(shapes);
    return makeTask({
      criterionCode: "6G-1",
      rocketPart: "noseCone",
      tier,
      briefing: `The nose cone cross-section is ${shape.name}. The balance team needs its lines of symmetry — each one is a fold line where both halves match perfectly. How many lines of symmetry does it have?`,
      engineeringContext: "A symmetrical cross-section keeps the rocket balanced as it spins.",
      answer: String(shape.lines),
      choices: tier < 3 ? mc(rng, String(shape.lines), nearBy(rng, shape.lines, 2)) : undefined,
      workedSteps: [
        `Imagine folding ${shape.name} so both halves land exactly on each other.`,
        `It folds perfectly along ${shape.lines} different line${shape.lines === 1 ? "" : "s"}.`,
      ],
      hints: ["Try folding the shape in your head — top to bottom, side to side, corner to corner.", "Regular shapes have as many fold lines as sides."],
      visual: { widget: "protractor", config: { showShape: shape.name, showAngle: false } },
      rocketEffect: effect(36, 55),
    });
  },
};