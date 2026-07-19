# Rocket Lab — KS3 "Astronaut Academy" Expansion (build prompt)

> **Give this entire document to the AI coding agent.** It extends the existing,
> working Rocket Lab app (see `PROMPT.md` and `PROGRESS.md`) with the FULL
> Key Stage 3 secondary mathematics curriculum from
> `docs/SECONDARY_national_curriculum_-_Mathematics.pdf`. Nothing that already
> works may regress: all 81 KS1/KS2 RTP criteria, the multi-profile system,
> the VAB loop, launch sim, mastery engine and `pnpm verify` must stay green
> throughout.

---

## 1. Concept: from Rocket Engineer to Flight Scientist

The existing game covers Years 1–6 (KS2 Ready-to-Progress). This expansion
adds **Years 7–9 (KS3)** as a natural in-fiction promotion: once a commander
has strong KS2 mastery, Mission Control promotes them into the **Astronaut
Academy** — a senior engineering programme where the missions get harder
(real orbital mechanics, mission risk analysis, telemetry science) and the
maths steps up to algebra, ratio & proportion, formal geometry, probability
and statistics.

The golden rules from `PROMPT.md` §10–11 still apply word-for-word:
- Every task is a real engineering situation about the rocket/mission — never
  a labelled worksheet sum.
- Briefings NEVER contain the symbols + − × ÷ = (algebra tasks show equations
  inside the WIDGET, never in the briefing prose — see §5 rule below).
- Deterministic core for maths: task generation, answer checking, mastery and
  physics never depend on the LLM. But Gemini IS a first-class part of the
  experience layer — use it wherever it helps (see §6).
- Gentle tone, UK conventions, answers change the 3D scene.

**Network-first**: this app runs on a connected machine with working API keys
in `.env.local` (`VITE_GEMINI_API_KEY` + pool, `VITE_GOOGLE_MAPS_API_KEY`).
Use Gemini and Google Maps/3D Tiles **wherever possible and helpful** — they
are the intended experience, not an optional extra. Static fallbacks exist
only as graceful degradation if a call fails mid-session; never design a
feature down to avoid the network.

---

## 2. New curriculum data (67 new criteria — the source of truth is the PDF)

Extend `src/curriculum/` with a `keyStage` field (`"ks2" | "ks3"`) on every
criterion and add the KS3 criteria below, coded by domain. Cross-check every
description against `docs/SECONDARY_national_curriculum_-_Mathematics.pdf`
(KS3 programme of study, September 2013) before finalising — the PDF wording
is authoritative; the list below is the enumeration to implement.

### Number — KS3N-1 … KS3N-17 (17)
1. Place value for decimals, measures and integers of any size
2. Order positive/negative integers, decimals, fractions; number line; use =, ≠, <, >, ≤, ≥
3. Primes, factors, multiples, HCF, LCM, prime factorisation (product notation)
4. Four operations with integers, decimals, fractions and mixed numbers (positive and negative)
5. Priority of operations incl. brackets, powers, roots, reciprocals
6. Relationships between operations incl. inverse operations
7. Integer powers and real roots (square, cube, higher); powers of 2, 3, 4, 5; exact roots vs decimal approximations
8. Standard form A × 10ⁿ (1 ≤ A < 10, n integer)
9. Terminating decimals ↔ corresponding fractions
10. Percentages: parts per hundred, percentage change, one quantity as % of another, comparisons, > 100%
11. Fractions and percentages as operators
12. Standard units of mass, length, time, money with decimal quantities
13. Rounding to decimal places and significant figures
14. Estimation via rounding; error intervals with inequality notation a < x ≤ b
15. Use a calculator/technology and interpret results appropriately
16. Infinite nature of integers, reals and rationals
17. (Fold the remaining PDF bullet(s) so all Number bullets in the PDF are covered 1:1 — adjust the final count to match the PDF exactly.)

### Algebra — KS3A-1 … KS3A-16 (16)
1. Algebraic notation (ab, 3y, a², a²b, a/b, fractional coefficients, brackets)
2. Substitute numerical values into formulae/expressions incl. scientific formulae
3. Vocabulary: expressions, equations, inequalities, terms, factors
4. Simplify/manipulate: collect like terms, expand a single bracket, factorise common factors, expand binomial products
5. Use and rearrange standard formulae (change the subject)
6. Model situations as algebraic expressions/formulae and graphs
7. Solve linear equations in one variable (incl. forms needing rearrangement)
8. Coordinates in all four quadrants
9. Recognise/sketch/plot linear and quadratic graphs
10. Interpret relationships algebraically and graphically
11. y = mx + c; gradients and intercepts (numerically, graphically, algebraically)
12. Use graphs to estimate values and solve simultaneous linear equations approximately
13. Contextual graphs: piece-wise linear, exponential, reciprocal
14. Generate sequences from term-to-term or position-to-term rules
15. Arithmetic sequences and the nth term
16. Geometric and other sequences

### Ratio, proportion and rates of change — KS3R-1 … KS3R-10 (10)
1. Convert between related standard units (time, length, area, volume, mass)
2. Scale factors, scale diagrams and maps
3. One quantity as a fraction of another (< 1 and > 1)
4. Ratio notation and simplest form
5. Divide a quantity in a part:part or part:whole ratio
6. Multiplicative relationships as ratio or fraction
7. Ratios ↔ fractions ↔ linear functions
8. Percentage change: increase, decrease, original-value, simple interest
9. Direct and inverse proportion (graphical and algebraic)
10. Compound units: speed, unit pricing, density

### Geometry and measures — KS3G-1 … KS3G-17 (17)
1. Perimeter/area of triangles, parallelograms, trapezia; volume of cuboids and prisms (incl. cylinders)
2. Perimeter of 2-D shapes incl. circles; area of circles and composite shapes
3. Draw/measure line segments and angles; interpret scale drawings
4. Ruler-and-compass constructions (perpendicular bisector, perpendicular from/at a point, angle bisector); perpendicular distance
5. Conventional terms/notation: points, lines, parallel/perpendicular, right angles, regular polygons, symmetric polygons
6. Triangle labelling conventions; congruence criteria (SSS, SAS, ASA, RHS)
7. Properties of triangles, quadrilaterals, circles and other plane figures
8. Translations, rotations, reflections and their properties
9. Congruent triangles; similar shapes by enlargement (with/without grids)
10. Angles at a point, on a straight line, vertically opposite
11. Parallel lines: alternate and corresponding angles
12. Angle sum of a triangle → polygons → regular polygon properties
13. Derive results about angles/sides incl. Pythagoras' Theorem; simple proofs
14. Pythagoras and trigonometric ratios in right-angled triangles
15. Faces/surfaces/edges/vertices of 3-D solids (cubes, prisms, cylinders, pyramids, cones, spheres)
16. Interpret relationships algebraically and geometrically
17. (Adjust so the PDF's Geometry bullets are covered 1:1.)

### Probability — KS3P-1 … KS3P-4 (4)
1. Record/describe/analyse frequency of outcomes; fairness; the 0–1 probability scale
2. Probabilities of all possible outcomes sum to 1
3. Enumerate sets and unions/intersections: tables, grids, Venn diagrams
4. Theoretical sample spaces for single and combined events; calculate theoretical probabilities

### Statistics — KS3S-1 … KS3S-3 (3)
1. Describe/interpret/compare distributions: mean, mode, median, range, outliers
2. Construct/interpret tables, bar charts, pie charts, pictograms, line charts (grouped and ungrouped)
3. Bivariate data and scatter graphs

**Coverage requirement**: `scripts/coverage-check.ts` and `/dev/status` must
enforce and display the ENLARGED total (81 KS2 + all KS3 criteria), per key
stage, with zero gaps.

---

## 3. Where the KS3 maths lives in the game (new engineering contexts)

Keep the existing eight parts for KS2. Add **new Academy facilities and parts**
so each KS3 domain has an intrinsic engineering home:

| KS3 domain | New home | Engineering fiction |
|---|---|---|
| Number | **Propellant Chemistry Lab** (upgraded fuel system) | Standard form for propellant molecule counts, significant-figure tolerances on tank pressures, negative numbers for temperatures, error intervals on sensor readings, prime-factor batch packing |
| Algebra | **Flight Computer** (upgraded electronics bay) | Write/edit guidance formulae, substitute telemetry values, rearrange thrust equations for the unknown, solve linear equations to calibrate sensors, plot y = mx + c ascent profiles, sequences for burn schedules |
| Ratio & proportion | **Mission Planning Office** | Scale models and pad maps, fuel:oxidiser ratios extended (part:part, part:whole), speed/density/unit-pricing of propellants, percentage-change on budgets, direct/inverse proportion (more engines → shorter burn) |
| Geometry & measures | **Structures & Trajectory Bay** (upgraded nose cone + fins) | Areas/volumes of tank prisms and cylinders, circle maths for bulkheads, Pythagoras for strut lengths, trig ratios for launch elevation angles, constructions for antenna alignment, transformations for booster placement |
| Probability | **Mission Risk Console** (new pre-flight facility) | Component failure odds on the 0–1 scale, sample spaces for dual-redundant systems, Venn diagrams for overlapping system checks, "all outcomes sum to 1" go/no-go boards |
| Statistics | **Telemetry Science Deck** (upgraded Flight Log) | Mean/median/mode/range of past flight altitudes (from the commander's REAL mission records!), bar/pie charts of task performance, scatter graphs of thrust vs altitude across their own launches |

Statistics tasks should — wherever possible — use the commander's **own Dexie
mission data** as the dataset (their real altitudes, real task scores), with a
deterministic synthetic fallback dataset when they have fewer than 5 missions.

---

## 4. New widgets (in `src/components/widgets/`)

Build these interactive widgets, each keyboard-accessible, each with a
`VisualSpec` config, all registered in `TaskRenderer.tsx`:

1. **EquationWidget** — renders an equation with a draggable/typeable unknown
   (e.g. `▢ × 8 = 96` style, but shown as a flight-computer readout). Handles
   linear equations, substitution, and rearrangement steps.
2. **GraphPlotWidget** — Cartesian plane (4 quadrants): plot points, read
   gradients/intercepts, drag a line to match y = mx + c, tap intersections
   for simultaneous equations. Reuse the ascent-profile aesthetic of the
   report chart.
3. **SequenceWidget** — burn-schedule timeline: continue a sequence, give the
   nth term, spot arithmetic vs geometric.
4. **StandardFormWidget** — dual readout (ordinary ↔ A × 10ⁿ) with steppers
   for A and n.
5. **ConstructionWidget** — simplified compass-and-straightedge canvas
   (perpendicular bisector, angle bisector) with snap tolerance.
6. **TriangleWidget** — right-angled triangle with labelled sides for
   Pythagoras/trig; drag a vertex, read/enter a side or angle.
7. **VennWidget** — 2-set Venn diagram; drag system components into regions;
   count unions/intersections.
8. **SampleSpaceWidget** — grid of combined outcomes (e.g. two redundant
   valves); click to enumerate; probability fraction readout.
9. **ChartWidget** — build/read bar, pie and scatter charts from a small
   dataset table.
10. **ScaleMapWidget** — pad map with a scale bar; measure and convert
    distances by scale factor.

Reuse existing widgets where they fit (NumberLine for ordering negatives,
RatioMixer for KS3R, Protractor for angle facts, Grid for 4-quadrant work —
extend GridWidget to negative axes).

**Equation display rule (refines §10 rule 4):** briefings stay symbol-free
prose; algebraic notation (=, ×, ², graphs) may appear **only inside widget
canvases and worked steps**, since reading/writing that notation IS the KS3
skill. Update the template test + coverage-check to enforce: briefings clean,
`visual.config` may carry expressions.

---

## 5. Progression changes

- **Academy unlock**: KS3 content unlocks per-profile at **60% KS2 mastery**
  OR via an explicit "I'm in Year 7+" toggle when creating/editing a profile
  (so an older child like Walter isn't forced to grind Year 1 content first).
  Store `academyUnlocked`/`yearGroupHint` on the Profile (Dexie v3 migration).
- **New destinations** (Academy tier, gated on KS3 mastery %):
  - Jupiter's Moons 🪐 (tier 1–2 KS3), Saturn's Rings 🪐 (tier 2), Interstellar
    Probe 🌌 (tier 2–3), Generation Ship 🌠 (tier 3, capstone).
- The **mission planner** mixes strands as before but never mixes key stages
  within one part's certification (a part is either a KS2 or a KS3 fit-out,
  chosen by the planner based on unlock + due reviews).
- Mastery, spaced repetition, XP, patches all extend unchanged to the new
  codes. Add Academy patches (First Academy Mission, Algebra Ace, Risk
  Analyst, Data Scientist, Pythagoras Prize, KS3 strand-mastery set).
- Flight Log coverage map gains a **KS2/KS3 toggle** (or stacked sections)
  showing the enlarged grid.

---

## 6. Network & AI features (REQUIRED — use Gemini and Maps wherever helpful)

The keys in `.env.local` work. This expansion must actively USE them:

### 6a. Real terrain, sky and clouds at the launch site (takram + Google 3D Tiles)
The Phase 7 deferral in `PROGRESS.md` is now cancelled — implement it properly:
- Stream **Google Photorealistic 3D Tiles** (via `3d-tiles-renderer` + the
  `@takram/three-geospatial` plugins, following Gaudi's
  `GeospatialEnvironment.tsx`) using `VITE_GOOGLE_MAPS_API_KEY`, positioned at
  the **exact lat/lon of the chosen launch site** from `launchSites.ts` — the
  commander should recognise the real coastline at Cape Canaveral or the real
  Shetland cliffs at SaxaVord from the pad.
- Add `@takram/three-atmosphere` (physically-based sky, sun, stars, aerial
  perspective) and `@takram/three-clouds` (volumetric cloud layer) so the
  launch sequence shows the real sky→space transition: golden hour on the
  pad → sky darkening → clouds falling away below → stars.
- If the takram packages genuinely cannot coexist with the pinned R3F v8
  stack, upgrade the three/R3F stack as needed to make them work (this is a
  sanctioned breaking upgrade — keep `pnpm verify` green afterwards). Only if
  that is impossible after a real attempt may the drei fallback remain, and
  the blocker must be documented in PROGRESS.md with the exact version
  conflict.
- Tiles/atmosphere failures at runtime degrade gracefully to the current
  stylised terrain — but degradation is an error path, not the default.

### 6a-ii. Cinematic launch: proper camera tracking + photorealism (REQUIRED)
The launch sequence must look and feel like real launch footage — as
photorealistic as the browser allows — and the camera must genuinely TRACK
the rocket from ignition to space, never losing it:

**Camera tracking (driven by the real `simulateFlight` trajectory):**
- A small **launch director** system cuts between shots as altitude/events
  dictate, each shot smoothly eased (lerp/damp, never snapping):
  1. **Pad cam** — low wide shot for countdown/ignition, camera shake at T-0
  2. **Tower cam** — close pass as the rocket clears the gantry
  3. **Ground tracking telephoto** — the classic press-site shot: camera
     stays planted on the ground near the pad, pitching up to follow the
     rocket as it climbs and shrinks, terrain and sky in frame
  4. **Chase cam** — flies alongside/behind the rocket through the cloud
     layer, clouds streaking past, booster staging visible
  5. **Orbit reveal** — pulls back as the sky turns black to show the Earth's
     curve (3D Tiles terrain falling away below) and the coasting rocket
- Every shot looks at the rocket's actual simulated position each frame —
  if TWR is poor and the ascent is slow, the shots hold longer; the camera
  never plays a canned path detached from the physics.
- A small "📺 shot" indicator lets the player manually cycle cameras during
  flight; `prefers-reduced-motion` gets a single steady tracking shot.

**Photorealism (make it as good as possible):**
- Renderer: ACES filmic tone mapping, physically correct lights, HDR
  environment, soft shadows (PCFSoft), high-DPI aware.
- Post-processing (via `postprocessing` / `@takram/three-geospatial-effects`):
  bloom on the engine plume, lens flare from the sun, subtle vignette and
  film grain, aerial-perspective haze from takram fading with altitude.
- **Engine exhaust**: layered volumetric-style plume (bright core + expanding
  translucent cone), plume lengthens/expands as the atmosphere thins,
  mach-diamond hints at low altitude, particle smoke billowing across the
  pad at ignition with a lingering steam cloud.
- PBR rocket materials: metalness/roughness maps or procedural variation,
  panel line normal detail, sun glinting off the hull during ascent.
- The takram sky + clouds (§6a) and 3D Tiles terrain complete the picture —
  launching from SaxaVord should read like a real Shetland launch video:
  green cliffs shrinking below, cloud deck punched through, sky fading to
  black, Earth's limb appearing.
- Target 60fps on an Apple-Silicon MacBook; add a graphics quality toggle
  (Cinematic/Standard) if needed to keep the Standard path smooth.

### 6b. Gemini everywhere it helps (using the §5a `PROMPT.md` client + key pool)
- **Model line-up (match Gaudi's, verified from its source)**:
  - Text (hints/paraphrase/debrief/Chief Engineer/telemetry insights):
    **`gemini-3.5-flash`** — Gaudi's codebase norm; upgrade Rocket Lab's
    `MODEL` in `src/ai/gemini.ts` from `gemini-3-flash-preview` to this.
    Use `gemini-3.1-flash-lite` only for trivial one-liners (milestone
    flavour) where latency matters more than quality.
  - Image fast tier (📸 Photo): **`gemini-3.1-flash-lite-image`**
    (Gaudi's `FAST_RENDER_MODEL`).
  - Image quality tier (🎞 Poster): **`gemini-3-pro-image-preview`**
    (Nano Banana Pro — Gaudi's `RENDER_MODEL`).
  - Optional launch-film flourish: **`gemini-omni-flash-preview`** (Gaudi's
    `VIDEO_MODEL`) may generate a short cinematic launch clip from the
    poster frame — nice-to-have, only if time allows.
- **Adaptive hints, briefing paraphrase, debrief, Chief Engineer** all extend
  to the KS3 content — same validation guardrails (no answer leaks; the §4
  equation-display rule applies to LLM output too).
- **Academy tutor moments**: for KS3 concepts (e.g. "what IS a gradient?"),
  the Chief Engineer should give richer, slightly older-pitched explanations —
  update the persona prompt to address a Year 7–9 commander when the task is
  a KS3 criterion.
- **Telemetry insights**: on the Telemetry Science Deck, after the
  deterministic stats are computed, ask Gemini to narrate one interesting
  pattern in the commander's own flight data ("your altitude jumped once you
  started using the Needle Cone…").
- **Mission Camera / posters / milestone flavour** work for all new Academy
  destinations, with destination-appropriate imagery prompts (Jupiter's
  moons, Saturn's rings…).

### 6c. Render modes must work properly (Gaudi's ViewSwitcher, for real)
Audit and fix the Mission Camera so it genuinely matches Gaudi's behaviour —
verify each mode end-to-end in the browser with the real keys:
- **🛠 Workshop (`cad`)** — the live interactive R3F viewport (default; the
  game is always played here).
- **📸 Photo (`fast`)** — capture the canvas as PNG (same-frame capture /
  `preserveDrawingBuffer`) and have **`gemini-3.1-flash-lite-image`**
  (Gaudi's fast render model) repaint it photorealistically in seconds.
- **🎞 Poster (`quality`)** — capture → **`gemini-3-pro-image-preview`**
  (Nano Banana Pro — Gaudi's quality render model) for the high-quality
  mission poster.
- Prompt template must keep the rocket faithful: "Repaint this 3D render of a
  child's rocket on the launch pad at {site name} as a {style} photograph.
  Keep the rocket's shape, parts and colours exactly as shown." Include the
  destination/site flavour for Academy missions.
- **Style presets row** appears when a photo mode is active: `photorealistic`,
  `night-launch`, `watercolor`, `concept-art`, `toy-model`.
- **Overlay behaviour exactly like Gaudi**: the generated image sits as a
  pointer-transparent `<img>` over the canvas; switching back to Workshop or
  moving the camera dismisses it; a "developing photo… 📷" shimmer shows
  while generating.
- Every generated Photo/Poster saves to the mission record's `photos` for the
  Flight Log scrapbook. Rotate keys on 429 like all other Gemini calls.
- If the image model returns nothing/invalid, save the plain screenshot —
  but treat that as an error path and surface a gentle "camera glitch" toast,
  not a silent downgrade.

### What must NOT change
- All 81 KS2 criteria, templates and tests keep passing untouched.
- Multi-profile system (each commander keeps an independent KS2+KS3 record).
- The deterministic maths core (generation/checking/mastery/physics) stays
  LLM-free so `pnpm verify` runs headless without keys.
- `run.sh` boot, port 3002, `pnpm verify` as the single green/red command.

---

## 7. Process (same discipline as `PROMPT.md` §9)

1. Update `PROGRESS.md` with a new "KS3 Expansion" phase plan (Phase 8:
   curriculum data + coverage tooling; Phase 9: widgets; Phase 10: templates
   per domain; Phase 11: Academy progression + destinations; Phase 12:
   takram atmosphere/clouds + Google 3D Tiles terrain at the launch site
   (§6a); Phase 13: Gemini integrations (§6b) + telemetry-statistics + polish).
   Tick items only when verified.
2. Vitest tests for every new template (all tiers, answer consistency,
   briefing symbol rule) and every new widget's pure logic; extend
   `scripts/coverage-check.ts` to the full enlarged criteria list.
3. Commit per completed item with `phaseN:` prefixes.
4. Final acceptance: `pnpm verify` green with the enlarged coverage,
   `/dev/status` shows every KS2+KS3 criterion green, and a browser
   walkthrough (dated in PROGRESS.md) shows: a 60%-mastery profile unlocking
   the Academy, certifying one part per new domain (Number, Algebra, Ratio,
   Geometry, Probability, Statistics) through the new widgets, flying an
   Academy destination whose report references the KS3 maths used, **real 3D
   Tiles terrain + takram sky visible at the chosen launch site**, **a full
   launch watched end-to-end with the cinematic multi-shot camera tracking
   the rocket from pad to orbit (§6a-ii)**, a live Gemini
   hint/debrief/telemetry-insight observed working with the real keys, and
   **both Photo and Poster render modes producing real Nano Banana repaints**
   that land in the Flight Log scrapbook.
