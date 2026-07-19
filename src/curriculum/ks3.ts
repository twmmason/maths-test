import type { Criterion } from "./types";

/**
 * The 65 KS3 programme-of-study statements (DfE, September 2013 —
 * docs/SECONDARY_national_curriculum_-_Mathematics.pdf), coded by domain:
 *   Number KS3N-1..16 · Algebra KS3A-1..16 · Ratio KS3R-1..10
 *   Geometry & measures KS3G-1..16 · Probability KS3P-1..4 · Statistics KS3S-1..3
 *
 * Academy facilities: Number → Propellant Chemistry Lab (fuelTank),
 * Algebra → Flight Computer (electronics), Ratio → Mission Planning Office
 * (payloadBay), Geometry → Structures & Trajectory Bay (noseCone + fins),
 * Probability → Mission Risk Console (hull), Statistics → Telemetry Science
 * Deck (engine).
 */
export const KS3_CRITERIA: Criterion[] = [
  // ── KS3N — Number (16) — Propellant Chemistry Lab ──────────────────────
  { code: "KS3N-1", strand: "KS3N", year: 7, keyStage: "ks3", part: "fuelTank", description: "Understand and use place value for decimals, measures and integers of any size" },
  { code: "KS3N-2", strand: "KS3N", year: 7, keyStage: "ks3", part: "fuelTank", description: "Order positive and negative integers, decimals and fractions; use the number line; use the symbols =, ≠, <, >, ≤, ≥" },
  { code: "KS3N-3", strand: "KS3N", year: 7, keyStage: "ks3", part: "fuelTank", description: "Use primes, factors, multiples, common factors and multiples, HCF, LCM and prime factorisation, including product notation" },
  { code: "KS3N-4", strand: "KS3N", year: 7, keyStage: "ks3", part: "fuelTank", description: "Use the four operations, including formal written methods, applied to integers, decimals, fractions and mixed numbers, all both positive and negative" },
  { code: "KS3N-5", strand: "KS3N", year: 7, keyStage: "ks3", part: "fuelTank", description: "Use conventional notation for the priority of operations, including brackets, powers, roots and reciprocals" },
  { code: "KS3N-6", strand: "KS3N", year: 7, keyStage: "ks3", part: "fuelTank", description: "Recognise and use relationships between operations including inverse operations" },
  { code: "KS3N-7", strand: "KS3N", year: 8, keyStage: "ks3", part: "fuelTank", description: "Use integer powers and associated real roots (square, cube and higher); recognise powers of 2, 3, 4, 5; distinguish exact roots from decimal approximations" },
  { code: "KS3N-8", strand: "KS3N", year: 8, keyStage: "ks3", part: "fuelTank", description: "Interpret and compare numbers in standard form A × 10ⁿ, 1 ≤ A < 10, where n is a positive or negative integer or zero" },
  { code: "KS3N-9", strand: "KS3N", year: 8, keyStage: "ks3", part: "fuelTank", description: "Work interchangeably with terminating decimals and their corresponding fractions" },
  { code: "KS3N-10", strand: "KS3N", year: 8, keyStage: "ks3", part: "fuelTank", description: "Define percentage as parts per hundred; interpret percentages and percentage changes as fractions or decimals; express one quantity as a percentage of another; compare quantities; work with percentages greater than 100%" },
  { code: "KS3N-11", strand: "KS3N", year: 8, keyStage: "ks3", part: "fuelTank", description: "Interpret fractions and percentages as operators" },
  { code: "KS3N-12", strand: "KS3N", year: 7, keyStage: "ks3", part: "fuelTank", description: "Use standard units of mass, length, time, money and other measures, including with decimal quantities" },
  { code: "KS3N-13", strand: "KS3N", year: 8, keyStage: "ks3", part: "fuelTank", description: "Round numbers and measures to an appropriate degree of accuracy, for example to a number of decimal places or significant figures" },
  { code: "KS3N-14", strand: "KS3N", year: 9, keyStage: "ks3", part: "fuelTank", description: "Use approximation through rounding to estimate answers and calculate possible resulting errors expressed using inequality notation a < x ≤ b" },
  { code: "KS3N-15", strand: "KS3N", year: 9, keyStage: "ks3", part: "fuelTank", description: "Use a calculator and other technologies to calculate results accurately and then interpret them appropriately" },
  { code: "KS3N-16", strand: "KS3N", year: 9, keyStage: "ks3", part: "fuelTank", description: "Appreciate the infinite nature of the sets of integers, real and rational numbers" },

  // ── KS3A — Algebra (16) — Flight Computer ──────────────────────────────
  { code: "KS3A-1", strand: "KS3A", year: 7, keyStage: "ks3", part: "electronics", description: "Use and interpret algebraic notation: ab, 3y, a², a³, a²b, a/b, fractional coefficients and brackets" },
  { code: "KS3A-2", strand: "KS3A", year: 7, keyStage: "ks3", part: "electronics", description: "Substitute numerical values into formulae and expressions, including scientific formulae" },
  { code: "KS3A-3", strand: "KS3A", year: 7, keyStage: "ks3", part: "electronics", description: "Understand and use the concepts and vocabulary of expressions, equations, inequalities, terms and factors" },
  { code: "KS3A-4", strand: "KS3A", year: 7, keyStage: "ks3", part: "electronics", description: "Simplify and manipulate algebraic expressions: collect like terms, multiply a single term over a bracket, take out common factors, expand products of binomials" },
  { code: "KS3A-5", strand: "KS3A", year: 8, keyStage: "ks3", part: "electronics", description: "Understand and use standard mathematical formulae; rearrange formulae to change the subject" },
  { code: "KS3A-6", strand: "KS3A", year: 8, keyStage: "ks3", part: "electronics", description: "Model situations or procedures by translating them into algebraic expressions or formulae and by using graphs" },
  { code: "KS3A-7", strand: "KS3A", year: 7, keyStage: "ks3", part: "electronics", description: "Use algebraic methods to solve linear equations in one variable, including all forms that require rearrangement" },
  { code: "KS3A-8", strand: "KS3A", year: 7, keyStage: "ks3", part: "electronics", description: "Work with coordinates in all four quadrants" },
  { code: "KS3A-9", strand: "KS3A", year: 8, keyStage: "ks3", part: "electronics", description: "Recognise, sketch and produce graphs of linear and quadratic functions of one variable on the Cartesian plane" },
  { code: "KS3A-10", strand: "KS3A", year: 8, keyStage: "ks3", part: "electronics", description: "Interpret mathematical relationships both algebraically and graphically" },
  { code: "KS3A-11", strand: "KS3A", year: 8, keyStage: "ks3", part: "electronics", description: "Reduce a linear equation in two variables to the form y = mx + c; calculate and interpret gradients and intercepts numerically, graphically and algebraically" },
  { code: "KS3A-12", strand: "KS3A", year: 9, keyStage: "ks3", part: "electronics", description: "Use linear and quadratic graphs to estimate values and find approximate solutions of simultaneous linear equations" },
  { code: "KS3A-13", strand: "KS3A", year: 9, keyStage: "ks3", part: "electronics", description: "Find approximate solutions to contextual problems from graphs of a variety of functions, including piece-wise linear, exponential and reciprocal graphs" },
  { code: "KS3A-14", strand: "KS3A", year: 7, keyStage: "ks3", part: "electronics", description: "Generate terms of a sequence from either a term-to-term or a position-to-term rule" },
  { code: "KS3A-15", strand: "KS3A", year: 8, keyStage: "ks3", part: "electronics", description: "Recognise arithmetic sequences and find the nth term" },
  { code: "KS3A-16", strand: "KS3A", year: 9, keyStage: "ks3", part: "electronics", description: "Recognise geometric sequences and appreciate other sequences that arise" },

  // ── KS3R — Ratio, proportion and rates of change (10) — Mission Planning Office ──
  { code: "KS3R-1", strand: "KS3R", year: 7, keyStage: "ks3", part: "payloadBay", description: "Change freely between related standard units, for example time, length, area, volume/capacity and mass" },
  { code: "KS3R-2", strand: "KS3R", year: 7, keyStage: "ks3", part: "payloadBay", description: "Use scale factors, scale diagrams and maps" },
  { code: "KS3R-3", strand: "KS3R", year: 7, keyStage: "ks3", part: "payloadBay", description: "Express one quantity as a fraction of another, where the fraction is less than 1 and greater than 1" },
  { code: "KS3R-4", strand: "KS3R", year: 7, keyStage: "ks3", part: "payloadBay", description: "Use ratio notation, including reduction to simplest form" },
  { code: "KS3R-5", strand: "KS3R", year: 7, keyStage: "ks3", part: "payloadBay", description: "Divide a given quantity into two parts in a given part:part or part:whole ratio; express the division of a quantity into two parts as a ratio" },
  { code: "KS3R-6", strand: "KS3R", year: 8, keyStage: "ks3", part: "payloadBay", description: "Understand that a multiplicative relationship between two quantities can be expressed as a ratio or a fraction" },
  { code: "KS3R-7", strand: "KS3R", year: 8, keyStage: "ks3", part: "payloadBay", description: "Relate the language of ratios and the associated calculations to the arithmetic of fractions and to linear functions" },
  { code: "KS3R-8", strand: "KS3R", year: 8, keyStage: "ks3", part: "payloadBay", description: "Solve problems involving percentage change: percentage increase, decrease, original-value problems and simple interest in financial mathematics" },
  { code: "KS3R-9", strand: "KS3R", year: 9, keyStage: "ks3", part: "payloadBay", description: "Solve problems involving direct and inverse proportion, including graphical and algebraic representations" },
  { code: "KS3R-10", strand: "KS3R", year: 9, keyStage: "ks3", part: "payloadBay", description: "Use compound units such as speed, unit pricing and density to solve problems" },

  // ── KS3G — Geometry and measures (16) — Structures & Trajectory Bay ────
  { code: "KS3G-1", strand: "KS3G", year: 7, keyStage: "ks3", part: "noseCone", description: "Derive and apply formulae for perimeter and area of triangles, parallelograms and trapezia, and volume of cuboids and other prisms, including cylinders" },
  { code: "KS3G-2", strand: "KS3G", year: 8, keyStage: "ks3", part: "noseCone", description: "Calculate and solve problems involving perimeters of 2-D shapes including circles, areas of circles and composite shapes" },
  { code: "KS3G-3", strand: "KS3G", year: 7, keyStage: "ks3", part: "noseCone", description: "Draw and measure line segments and angles in geometric figures, including interpreting scale drawings" },
  { code: "KS3G-4", strand: "KS3G", year: 8, keyStage: "ks3", part: "noseCone", description: "Derive and use standard ruler and compass constructions: perpendicular bisector, perpendicular from or at a point, angle bisector; use perpendicular distance from a point to a line" },
  { code: "KS3G-5", strand: "KS3G", year: 7, keyStage: "ks3", part: "noseCone", description: "Describe, sketch and draw using conventional terms and notations: points, lines, parallel and perpendicular lines, right angles, regular polygons and other symmetric polygons" },
  { code: "KS3G-6", strand: "KS3G", year: 8, keyStage: "ks3", part: "fins", description: "Use standard conventions for labelling the sides and angles of triangle ABC; know and use the criteria for congruence of triangles (SSS, SAS, ASA, RHS)" },
  { code: "KS3G-7", strand: "KS3G", year: 7, keyStage: "ks3", part: "noseCone", description: "Derive and illustrate properties of triangles, quadrilaterals, circles and other plane figures using appropriate language and technologies" },
  { code: "KS3G-8", strand: "KS3G", year: 7, keyStage: "ks3", part: "fins", description: "Identify properties of, and describe the results of, translations, rotations and reflections applied to given figures" },
  { code: "KS3G-9", strand: "KS3G", year: 8, keyStage: "ks3", part: "fins", description: "Identify and construct congruent triangles, and construct similar shapes by enlargement, with and without coordinate grids" },
  { code: "KS3G-10", strand: "KS3G", year: 7, keyStage: "ks3", part: "fins", description: "Apply the properties of angles at a point, angles at a point on a straight line, and vertically opposite angles" },
  { code: "KS3G-11", strand: "KS3G", year: 8, keyStage: "ks3", part: "fins", description: "Understand and use the relationship between parallel lines and alternate and corresponding angles" },
  { code: "KS3G-12", strand: "KS3G", year: 8, keyStage: "ks3", part: "noseCone", description: "Derive and use the sum of angles in a triangle; deduce the angle sum in any polygon and derive properties of regular polygons" },
  { code: "KS3G-13", strand: "KS3G", year: 9, keyStage: "ks3", part: "fins", description: "Apply angle facts, triangle congruence, similarity and properties of quadrilaterals to derive results about angles and sides, including Pythagoras' Theorem, and obtain simple proofs" },
  { code: "KS3G-14", strand: "KS3G", year: 9, keyStage: "ks3", part: "fins", description: "Use Pythagoras' Theorem and trigonometric ratios in similar triangles to solve problems involving right-angled triangles" },
  { code: "KS3G-15", strand: "KS3G", year: 7, keyStage: "ks3", part: "noseCone", description: "Use the properties of faces, surfaces, edges and vertices of cubes, cuboids, prisms, cylinders, pyramids, cones and spheres to solve problems in 3-D" },
  { code: "KS3G-16", strand: "KS3G", year: 9, keyStage: "ks3", part: "fins", description: "Interpret mathematical relationships both algebraically and geometrically" },

  // ── KS3P — Probability (4) — Mission Risk Console ──────────────────────
  { code: "KS3P-1", strand: "KS3P", year: 7, keyStage: "ks3", part: "hull", description: "Record, describe and analyse the frequency of outcomes of simple probability experiments involving randomness, fairness, and equally and unequally likely outcomes, using the 0-1 probability scale" },
  { code: "KS3P-2", strand: "KS3P", year: 7, keyStage: "ks3", part: "hull", description: "Understand that the probabilities of all possible outcomes sum to 1" },
  { code: "KS3P-3", strand: "KS3P", year: 8, keyStage: "ks3", part: "hull", description: "Enumerate sets and unions/intersections of sets systematically, using tables, grids and Venn diagrams" },
  { code: "KS3P-4", strand: "KS3P", year: 8, keyStage: "ks3", part: "hull", description: "Generate theoretical sample spaces for single and combined events with equally likely, mutually exclusive outcomes and use these to calculate theoretical probabilities" },

  // ── KS3S — Statistics (3) — Telemetry Science Deck ─────────────────────
  { code: "KS3S-1", strand: "KS3S", year: 7, keyStage: "ks3", part: "engine", description: "Describe, interpret and compare observed distributions of a single variable through graphical representation and measures of central tendency (mean, mode, median) and spread (range, outliers)" },
  { code: "KS3S-2", strand: "KS3S", year: 8, keyStage: "ks3", part: "engine", description: "Construct and interpret appropriate tables, charts and diagrams, including frequency tables, bar charts, pie charts and pictograms, and vertical line charts for ungrouped and grouped numerical data" },
  { code: "KS3S-3", strand: "KS3S", year: 9, keyStage: "ks3", part: "engine", description: "Describe simple mathematical relationships between two variables (bivariate data) and illustrate using scatter graphs" },
];