import type { GeneratedTask } from "../types";
import type { Rng } from "../rng";
import { makeTask, mc, nearBy, dec } from "./helpers";

type Gen = (rng: Rng, tier: 1 | 2 | 3) => GeneratedTask;

/** Structures & Trajectory Bay — KS3 Geometry & measures lives in the
 *  upgraded nose cone and fin assemblies. */

const noseEffect = (angle: number) => ({
  property: "noseAngle",
  correctValue: angle,
  incorrectValue: Math.min(70, angle + 14),
  unit: "°",
});
const finEffect = (angle: number) => ({
  property: "finAngle",
  correctValue: angle,
  incorrectValue: Math.max(5, angle - 10),
  unit: "°",
});

export const ks3GeometryTemplates: Record<string, Gen> = {
  // Perimeter/area of triangles, parallelograms, trapezia; volume of prisms & cylinders
  "KS3G-1": (rng, tier) => {
    if (tier === 1) {
      const b = rng.int(4, 12);
      const h = rng.int(3, 9);
      const ans = (b * h) / 2;
      return makeTask({
        criterionCode: "KS3G-1",
        rocketPart: "noseCone",
        tier,
        briefing: `A triangular access panel on the nose fairing has a base of ${b} cm and a height of ${h} cm. The workshop needs its area in square centimetres to cut the insulation blanket. What area do we order?`,
        engineeringContext: "Insulation is cut to the exact panel area — offcuts are wasted money.",
        answer: String(ans),
        choices: mc(rng, String(ans), [String(b * h), String(b + h), String(ans + 4)]),
        workedSteps: [`A triangle covers half its surrounding rectangle.`, `Half of ${b} by ${h} is ${ans} square centimetres.`],
        hints: ["Picture the rectangle around the triangle.", "The triangle fills exactly half of it."],
        visual: { widget: "triangle", config: { baseLabel: `${b} cm`, heightLabel: `${h} cm`, hypLabel: "panel edge", mark: "" } },
        rocketEffect: noseEffect(30),
      });
    }
    if (tier === 2) {
      const r = rng.int(1, 3);
      const h = rng.int(4, 9);
      const ans = Math.round(3.14 * r * r * h * 10) / 10;
      return makeTask({
        criterionCode: "KS3G-1",
        rocketPart: "noseCone",
        tier,
        briefing: `The cylindrical avionics can in the nose is ${r} m in radius and ${h} m tall. The loading computer needs its volume in cubic metres, using 3.14 for pi. What volume do we log?`,
        engineeringContext: "The can's volume sets how much cooling gas the avionics bay carries.",
        answer: String(ans),
        workedSteps: [`Find the circular end's area first: 3.14 times ${r} times ${r} gives ${dec(3.14 * r * r, 2)} square metres.`, `Stack that area up the ${h} m height: ${ans} cubic metres.`],
        hints: ["Start with the area of the circular end.", "Then multiply by the height to fill the cylinder."],
        visual: { widget: "equation", config: { readout: `V = π r² h   (r = ${r} m, h = ${h} m, π ≈ 3.14)` } },
        rocketEffect: noseEffect(28),
        tolerance: 0.2,
      });
    }
    const a = rng.int(4, 8);
    const b2 = a + rng.int(2, 6);
    const h = rng.int(3, 7);
    const ans = ((a + b2) / 2) * h;
    return makeTask({
      criterionCode: "KS3G-1",
      rocketPart: "noseCone",
      tier,
      briefing: `A trapezium-shaped heat-shield gore has parallel edges of ${a} cm and ${b2} cm, set ${h} cm apart. The fabricator needs its area to price the ceramic coating. What is the area in square centimetres?`,
      engineeringContext: "Each gore is priced by area — the whole shield uses twenty of them.",
      answer: String(ans),
      workedSteps: [`Average the parallel edges: half of ${a} plus ${b2} is ${(a + b2) / 2}.`, `Multiply by the ${h} cm distance between them: ${ans} square centimetres.`],
      hints: ["Average the two parallel sides first.", "Then multiply by the distance between them."],
      visual: { widget: "equation", config: { readout: `A = ((a + b) / 2) × h   (a = ${a}, b = ${b2}, h = ${h})` } },
      rocketEffect: noseEffect(26),
    });
  },

  // Circles & composite shapes
  "KS3G-2": (rng, tier) => {
    const r = tier === 1 ? rng.int(2, 5) : rng.int(2, 4) + 0.5;
    const area = Math.round(3.14 * r * r * 10) / 10;
    const circ = Math.round(2 * 3.14 * r * 10) / 10;
    const askArea = tier !== 2;
    const ans = askArea ? area : circ;
    return makeTask({
      criterionCode: "KS3G-2",
      rocketPart: "noseCone",
      tier,
      briefing: askArea
        ? `The nose-cone bulkhead is a disc of radius ${r} m. The workshop sprays ablative coating by area, using 3.14 for pi. How many square metres of coating does the disc need?`
        : `A sealing ring runs right around the rim of the ${r} m radius bulkhead. Using 3.14 for pi, what length of seal do we cut, in metres?`,
      engineeringContext: "Coating and seal orders are placed to one decimal place — no waste allowed.",
      answer: String(ans),
      workedSteps: askArea
        ? [`Square the radius: ${r} times ${r} is ${dec(r * r, 2)}.`, `Multiply by 3.14: ${area} square metres.`]
        : [`Double the radius to cross the disc: ${2 * r}.`, `Multiply by 3.14 to travel the rim: ${circ} metres.`],
      hints: askArea ? ["Square the radius first.", "Then multiply by 3.14."] : ["The distance around is pi times the diameter.", "The diameter is twice the radius."],
      visual: { widget: "equation", config: { readout: askArea ? `A = π r²   (r = ${r} m)` : `C = 2 π r   (r = ${r} m)` } },
      rocketEffect: noseEffect(30),
      tolerance: 0.2,
    });
  },

  // Draw/measure segments & angles; scale drawings
  "KS3G-3": (rng, tier) => {
    const scale = rng.pick(tier === 1 ? [50, 100] : [200, 250, 500]);
    const cm = rng.int(2, 9);
    const ans = (cm * scale) / 100;
    return makeTask({
      criterionCode: "KS3G-3",
      rocketPart: "noseCone",
      tier,
      briefing: `On the 1:${scale} nose-section drawing, the crane arm measures ${cm} cm with the workshop ruler. The rigging team needs the real arm length in metres before they lift. What is it?`,
      engineeringContext: "The crane's lifting plan is written from the scale drawing — a misread scale is a safety stop.",
      answer: String(ans),
      choices: tier === 1 ? mc(rng, String(ans), nearBy(rng, ans, 3)) : undefined,
      workedSteps: [`Each centimetre on paper is ${scale} cm in real life.`, `${cm} cm on paper is ${cm * scale} cm, which is ${ans} m.`],
      hints: ["Multiply the drawing length by the scale number.", "Then convert centimetres to metres."],
      visual: { widget: "scaleMap", config: { scaleMetresPerCm: scale / 100, mapCm: cm, label: "crane arm on the section drawing" } },
      rocketEffect: noseEffect(32),
    });
  },

  // Ruler & compass constructions
  "KS3G-4": (rng, tier) => {
    const angle = rng.pick(tier === 1 ? [60, 80, 90] : [70, 100, 110, 130]);
    const ans = angle / 2;
    return makeTask({
      criterionCode: "KS3G-4",
      rocketPart: "noseCone",
      tier,
      briefing: `The abort corridor must split the ${angle}° launch cone exactly in half. On the plotting table, compasses have drawn the crossing arcs shown. What angle does the bisector make with the lower arm?`,
      engineeringContext: "The abort line has to be a true bisector — the safety board checks it with their own compasses.",
      answer: String(ans),
      choices: tier === 1 ? mc(rng, String(ans), nearBy(rng, ans, 8)) : undefined,
      workedSteps: [`A bisector splits the angle into two equal parts.`, `Half of ${angle}° is ${ans}°.`],
      hints: ["Bisect means cut exactly in half.", "Halve the full angle."],
      visual: { widget: "construction", config: { kind: "bisectAngle", angle } },
      rocketEffect: noseEffect(ans),
      tolerance: tier === 1 ? 0 : 1,
    });
  },

  // Conventional terms: parallel, perpendicular, regular polygons, symmetry
  "KS3G-5": (rng, tier) => {
    const sides = rng.pick(tier === 1 ? [4, 6] : [5, 6, 8, 10]);
    const names: Record<number, string> = { 4: "square", 5: "regular pentagon", 6: "regular hexagon", 8: "regular octagon", 10: "regular decagon" };
    return makeTask({
      criterionCode: "KS3G-5",
      rocketPart: "noseCone",
      tier,
      briefing: `The deployable solar array is a ${names[sides]}. The deployment check needs its number of lines of symmetry logged before the fold test. How many are there?`,
      engineeringContext: "Every fold line must lie on a symmetry line, or the array jams half-open.",
      answer: String(sides),
      choices: mc(rng, String(sides), nearBy(rng, sides, 3)),
      workedSteps: [`A regular polygon has as many symmetry lines as sides.`, `A ${names[sides]} has ${sides}.`],
      hints: ["Regular shapes are perfectly even.", "Count one symmetry line per side."],
      visual: { widget: "grid", config: { shapeSides: sides, readOnly: true } },
      rocketEffect: noseEffect(30),
    });
  },

  // Triangle labelling & congruence criteria
  "KS3G-6": (rng, tier) => {
    const rules = ["SSS", "SAS", "ASA", "RHS"];
    const rule = rng.pick(tier === 1 ? ["SSS", "SAS"] : rules);
    const situations: Record<string, string> = {
      SSS: "all three strut lengths match on both brackets",
      SAS: "two strut lengths and the angle between them match",
      ASA: "two angles and the strut between them match",
      RHS: "both brackets have a right angle, matching long struts and one matching short strut",
    };
    return makeTask({
      criterionCode: "KS3G-6",
      rocketPart: "fins",
      tier,
      briefing: `The inspector compares two fin brackets: ${situations[rule]}. Which congruence rule lets her certify the brackets identical?`,
      engineeringContext: "Only congruent brackets share the same load rating.",
      answer: rule,
      choices: mc(rng, rule, rules.filter((r) => r !== rule)),
      workedSteps: [`List what matches on both triangles.`, `That pattern is exactly the ${rule} rule.`],
      hints: ["S stands for side, A for angle, RHS for right angle, hypotenuse, side.", "Match the pattern of what is equal."],
      visual: { widget: "triangle", config: { baseLabel: "strut", heightLabel: "strut", hypLabel: "strut", mark: "" } },
      rocketEffect: finEffect(22),
    });
  },

  // Properties of triangles, quadrilaterals, circles
  "KS3G-7": (rng, tier) => {
    if (tier === 1) {
      return makeTask({
        criterionCode: "KS3G-7",
        rocketPart: "noseCone",
        tier,
        briefing: `The service door on the fairing is a quadrilateral with two pairs of parallel sides and no right angles. The parts list needs its proper name. What is it?`,
        engineeringContext: "Doors are ordered by shape name — the supplier stocks each frame separately.",
        answer: "parallelogram",
        choices: mc(rng, "parallelogram", ["trapezium", "rhombus", "kite"]),
        workedSteps: ["Two pairs of parallel sides makes a parallelogram.", "With no right angles it is not a rectangle."],
        hints: ["Count the pairs of parallel sides.", "A rectangle would need right angles."],
        visual: { widget: "grid", config: { shapeSides: 4, readOnly: true } },
        rocketEffect: noseEffect(30),
      });
    }
    const base = rng.int(35, 75);
    const ans = 180 - 2 * base;
    return makeTask({
      criterionCode: "KS3G-7",
      rocketPart: "noseCone",
      tier,
      briefing: `The nose strut triangle is isosceles: the two base angles each read ${base}° on the protractor. The drawing needs the apex angle. What is it?`,
      engineeringContext: "The apex angle sets how sharply the strut pair meets the cone tip.",
      answer: String(ans),
      workedSteps: [`Angles in a triangle total 180°.`, `Take away the two ${base}° base angles: ${ans}°.`],
      hints: ["All three angles total 180 degrees.", "The two base angles are equal in an isosceles triangle."],
      visual: { widget: "protractor", config: { angle: ans, readOnly: true } },
      rocketEffect: noseEffect(Math.min(60, ans)),
    });
  },

  // Translations, rotations, reflections
  "KS3G-8": (rng, tier) => {
    const dx = rng.int(1, tier === 1 ? 4 : 6);
    const dy = rng.int(1, tier === 1 ? 4 : 6);
    const x0 = rng.int(-3, 2);
    const y0 = rng.int(-3, 2);
    return makeTask({
      criterionCode: "KS3G-8",
      rocketPart: "fins",
      tier,
      briefing: `A fin anchor sits at (${x0}, ${y0}) on the blueprint grid. The revision slides every anchor ${dx} squares right and ${dy} squares up. Where does this anchor land? Give the point as x, y.`,
      engineeringContext: "Every anchor on the revision moves by the same translation, or the fin skews.",
      answer: `${x0 + dx},${y0 + dy}`,
      workedSteps: [`Right ${dx}: the first number becomes ${x0 + dx}.`, `Up ${dy}: the second becomes ${y0 + dy}.`],
      hints: ["Right changes the first number.", "Up changes the second number."],
      visual: { widget: "graphPlot", config: { mode: "readPoint", px: x0, py: y0, min: -6, max: 8, readOnly: true } },
      rocketEffect: finEffect(20),
      tolerance: 0,
    });
  },

  // Congruent triangles; enlargement & similar shapes
  "KS3G-9": (rng, tier) => {
    const k = rng.pick(tier === 1 ? [2, 3] : [3, 4, 5]);
    const side = rng.int(3, 8);
    const ans = k * side;
    return makeTask({
      criterionCode: "KS3G-9",
      rocketPart: "fins",
      tier,
      briefing: `The Mk1 fin template has a leading edge of ${side} cm. The Mk3 booster needs the template enlarged by scale factor ${k}. How long is the new leading edge?`,
      engineeringContext: "An enlargement keeps the fin's shape — every edge grows by the same factor.",
      answer: String(ans),
      choices: tier === 1 ? mc(rng, String(ans), [String(side + k), String(ans + side), String(k * side + k)]) : undefined,
      workedSteps: [`Scale factor ${k} multiplies every length by ${k}.`, `${side} cm becomes ${ans} cm.`],
      hints: ["Every length is multiplied by the scale factor.", "Angles stay exactly the same."],
      visual: { widget: "scaleMap", config: { scaleMetresPerCm: k, mapCm: side, label: "fin template enlargement" } },
      rocketEffect: finEffect(24),
    });
  },

  // Angles at a point / straight line / vertically opposite
  "KS3G-10": (rng, tier) => {
    if (tier === 1) {
      const a = rng.int(30, 140);
      const ans = 180 - a;
      return makeTask({
        criterionCode: "KS3G-10",
        rocketPart: "fins",
        tier,
        briefing: `Two support struts meet on the straight launch rail. One strut makes an angle of ${a}° with the rail. What angle does the other strut make on the same side?`,
        engineeringContext: "Angles on the straight rail must pair up exactly or the fin cradle rocks.",
        answer: String(ans),
        choices: mc(rng, String(ans), nearBy(rng, ans, 12)),
        workedSteps: [`Angles on a straight line total 180°.`, `180 take away ${a} leaves ${ans}°.`],
        hints: ["The rail is a straight line.", "The two angles must total 180 degrees."],
        visual: { widget: "protractor", config: { angle: ans, readOnly: true } },
        rocketEffect: finEffect(Math.min(60, ans)),
      });
    }
    const a = rng.int(80, 130);
    const b = rng.int(70, 110);
    const ans = 360 - a - b;
    return makeTask({
      criterionCode: "KS3G-10",
      rocketPart: "fins",
      tier,
      briefing: `Three gantry struts meet at a single point. Two of the angles between them read ${a}° and ${b}°. The inspector needs the third angle for the weld report. What must it be?`,
      engineeringContext: "The three angles at the weld point account for the full turn around it.",
      answer: String(ans),
      workedSteps: [`Angles around a point total 360°.`, `360 take away ${a} and ${b} leaves ${ans}°.`],
      hints: ["A full turn is 360 degrees.", "Subtract the two known angles."],
      visual: { widget: "protractor", config: { angle: ans, readOnly: true } },
      rocketEffect: finEffect(30),
    });
  },

  // Parallel lines: alternate & corresponding angles
  "KS3G-11": (rng, tier) => {
    const a = rng.int(28, 72);
    const kind = rng.pick(tier === 1 ? ["alternate"] : ["alternate", "corresponding"]);
    return makeTask({
      criterionCode: "KS3G-11",
      rocketPart: "fins",
      tier,
      briefing: `The launch rail crosses two parallel support beams. It meets the first beam at ${a}°. Without measuring, the surveyor writes down the ${kind} angle at the second beam. What is it?`,
      engineeringContext: "Parallel-beam angle rules let the survey finish without climbing the gantry twice.",
      answer: String(a),
      choices: tier === 1 ? mc(rng, String(a), [String(180 - a), String(90 - a), String(a + 10)]) : undefined,
      workedSteps: [`The beams are parallel, so ${kind} angles are equal.`, `The second beam's angle is also ${a}°.`],
      hints: ["Parallel beams copy the crossing angle.", `${kind === "alternate" ? "Alternate angles make a Z shape." : "Corresponding angles make an F shape."}`],
      visual: { widget: "protractor", config: { angle: a, readOnly: true } },
      rocketEffect: finEffect(Math.min(60, a)),
    });
  },

  // Angle sums: triangle → polygons → regular polygons
  "KS3G-12": (rng, tier) => {
    if (tier === 1) {
      const a = rng.int(40, 80);
      const b = rng.int(40, 80);
      const ans = 180 - a - b;
      return makeTask({
        criterionCode: "KS3G-12",
        rocketPart: "noseCone",
        tier,
        briefing: `The nose brace triangle shows angles of ${a}° and ${b}° on the drawing. The third corner's label has rubbed off. What angle goes there?`,
        engineeringContext: "All three brace angles are checked before the cone tip is riveted on.",
        answer: String(ans),
        choices: mc(rng, String(ans), nearBy(rng, ans, 15)),
        workedSteps: [`A triangle's angles total 180°.`, `180 take away ${a} and ${b} leaves ${ans}°.`],
        hints: ["Triangles always total 180 degrees.", "Subtract the two known corners."],
        visual: { widget: "protractor", config: { angle: ans, readOnly: true } },
        rocketEffect: noseEffect(Math.min(60, ans)),
      });
    }
    const n = rng.pick([5, 6, 8, 9, 10]);
    const ans = ((n - 2) * 180) / n;
    return makeTask({
      criterionCode: "KS3G-12",
      rocketPart: "noseCone",
      tier,
      briefing: `The antenna dish rim is a regular polygon with ${n} sides. The fabricator bends each rim segment to the interior angle. What angle does she set the bender to?`,
      engineeringContext: "Every rim segment uses the same bend — one wrong angle and the rim will not close.",
      answer: String(ans),
      workedSteps: [`Interior angles of an ${n}-sided polygon total ${(n - 2) * 180}°.`, `Shared equally over ${n} corners: ${ans}° each.`],
      hints: ["Split the polygon into triangles from one corner.", "Each triangle contributes 180 degrees."],
      visual: { widget: "grid", config: { shapeSides: n, readOnly: true } },
      rocketEffect: noseEffect(30),
      tolerance: 0.5,
    });
  },

  // Derive results incl. Pythagoras; simple proofs
  "KS3G-13": (rng, tier) => {
    const triples: [number, number, number][] = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15]];
    const [a, b, c] = rng.pick(tier === 1 ? triples.slice(0, 2) : triples);
    return makeTask({
      criterionCode: "KS3G-13",
      rocketPart: "fins",
      tier,
      briefing: `The access ramp's frame measures ${a} m, ${b} m and ${c} m. The safety board asks: does the frame truly contain a right angle? Check whether the two shorter sides, squared and combined, match the longest side squared — answer yes or no.`,
      engineeringContext: "The right-angle check certifies the ramp without a protractor ever touching it.",
      answer: "yes",
      choices: ["yes", "no"],
      workedSteps: [`Square the short sides: ${a * a} and ${b * b}, combined ${a * a + b * b}.`, `Square the longest: ${c * c}. They match, so the angle is right.`],
      hints: ["Square each of the two shorter sides and combine them.", "Compare with the longest side squared."],
      visual: { widget: "triangle", config: { baseLabel: `${a} m`, heightLabel: `${b} m`, hypLabel: `${c} m`, mark: "" } },
      rocketEffect: finEffect(26),
    });
  },

  // Pythagoras & trig ratios in right-angled triangles
  "KS3G-14": (rng, tier) => {
    const triples: [number, number, number][] = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [30, 40, 50]];
    const [a, b, c] = rng.pick(tier === 3 ? triples : triples.slice(0, 3));
    return makeTask({
      criterionCode: "KS3G-14",
      rocketPart: "fins",
      tier,
      briefing: `At engine cutoff the rocket is ${b} km up and ${a} km downrange. The tracking dish needs the straight-line distance to the rocket to aim its beam. What is it, in kilometres?`,
      engineeringContext: "The dish aims along the hypotenuse — height and downrange distance are the two legs.",
      answer: String(c),
      choices: tier === 1 ? mc(rng, String(c), [String(a + b), String(c + 1), String(c - 1)]) : undefined,
      workedSteps: [`Square the legs: ${a * a} and ${b * b}, combined ${a * a + b * b}.`, `The square root of ${c * c} is ${c} km.`],
      hints: ["Square both legs and combine them.", "Then take the square root."],
      visual: { widget: "triangle", config: { baseLabel: `${a} km downrange`, heightLabel: `${b} km up`, hypLabel: "beam", mark: "hyp" } },
      rocketEffect: finEffect(28),
    });
  },

  // 3-D solids: faces, edges, vertices
  "KS3G-15": (rng, tier) => {
    const solids = [
      { name: "hexagonal prism", faces: 8, edges: 18, vertices: 12 },
      { name: "triangular prism", faces: 5, edges: 9, vertices: 6 },
      { name: "square-based pyramid", faces: 5, edges: 8, vertices: 5 },
      { name: "cuboid", faces: 6, edges: 12, vertices: 8 },
    ];
    const s = rng.pick(tier === 1 ? solids.slice(2) : solids);
    const what = rng.pick(tier === 3 ? ["edges", "vertices"] : ["faces", "vertices"]) as "faces" | "edges" | "vertices";
    const ans = s[what];
    return makeTask({
      criterionCode: "KS3G-15",
      rocketPart: "noseCone",
      tier,
      briefing: `The cargo container riding in the nose is a ${s.name}. The packing manifest logs its number of ${what} so the tie-down crew know where to clip. How many ${what} does it have?`,
      engineeringContext: "Tie-down straps clip to vertices and run along edges — the manifest must be exact.",
      answer: String(ans),
      choices: mc(rng, String(ans), nearBy(rng, ans, 4)),
      workedSteps: [`Picture the ${s.name} and count systematically.`, `It has ${s.faces} faces, ${s.edges} edges and ${s.vertices} vertices — so ${ans} ${what}.`],
      hints: ["Count the flat surfaces, the straight rims, and the corners separately.", "Work around the shape one layer at a time."],
      visual: { widget: "grid", config: { shapeSides: 6, readOnly: true } },
      rocketEffect: noseEffect(30),
    });
  },

  // Relationships algebraically & geometrically
  "KS3G-16": (rng, tier) => {
    const m = rng.int(2, tier === 1 ? 4 : 8) * 10;
    const t = rng.int(2, 6);
    const ans = (m * t) / 10;
    return makeTask({
      criterionCode: "KS3G-16",
      rocketPart: "fins",
      tier,
      briefing: `The ascent line on the plotting table climbs ${m / 10} km for every minute of flight, starting from the pad. Reading the same rule as the graph shows, how high is the rocket after ${t} minutes, in kilometres?`,
      engineeringContext: "The rule and the plotted line must agree — that is how the planners cross-check each other.",
      answer: String(ans),
      choices: tier === 1 ? mc(rng, String(ans), nearBy(rng, ans, 6)) : undefined,
      workedSteps: [`The line's steepness is ${m / 10} km per minute.`, `After ${t} minutes: ${ans} km.`],
      hints: ["Height grows by the same amount each minute.", "Multiply the rate by the minutes."],
      visual: { widget: "graphPlot", config: { mode: "readLine", m: m / 10, c: 0, min: 0, max: 8, yLabel: "height km", xLabel: "minutes", markX: t, readOnly: true } },
      rocketEffect: finEffect(24),
    });
  },
};
