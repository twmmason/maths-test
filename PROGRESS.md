# Artie's Rocket Lab — PROGRESS

The living status board (§9 of PROMPT.md). Nothing below is ticked unless it
was verified by a test or in the browser. Single green/red command: `pnpm verify`.

## Phase 1: Foundation   Status: ✅ COMPLETE (2026-07-19)
- [x] Vite + React 18 + TS + Tailwind project setup — `./run.sh` boots on :3002, `tsc -b` clean
- [x] Dexie DB with schema — profiles / attempts / missions / savedMissions (`src/db/db.ts`), profile seeded on first load
- [x] Curriculum types + all 81 criteria — `src/curriculum/criteria.ts`, checked against docs/Maths_guidance_year_6.pdf codes
- [x] Basic routing (Hangar, VAB, Launch, Report, FlightLog, Sandbox, /dev/status) — `src/app/App.tsx`
- [x] Space theme CSS — deep navy/cyan/amber HUD panels, Lexend font, neon glow (`src/index.css`)
- [x] Gemini client wrapper — key pool + rotation on 429, 4s timeout, fallback mode with one console warning (`src/ai/gemini.ts`)
- [x] PROGRESS.md + `pnpm verify` + /dev/status skeleton
Done-when verified: all pages render with the space theme; profile row seeded; criteria queryable. `pnpm verify` green.

## Phase 2: 3D Rocket + Kerbal Assembly   Status: ✅ COMPLETE (2026-07-19)
- [x] three + @react-three/fiber v8 + drei installed
- [x] Parametric Rocket3D with all 8 part types incl. electronics + boosters (`src/three/Rocket3D.tsx`)
- [x] RocketScene: stars, lighting, launchpad + gantry, OrbitControls, context-loss guard (`src/three/RocketScene.tsx`)
- [x] RocketDesign state drives all part dimensions (`src/three/rocketDesign.ts` + zustand store)
- [x] Parts catalogue (`partsCatalog.ts`, 2–4 variants per category with stats/trade-offs) + PartsTray with holographic stat cards
- [x] Click-to-attach assembly with draft ghosting; detach back to tray; any build order
- [x] Radial symmetry (×2/×3/×4) for fins and boosters
- [x] Camera zoom-to-part animation (CameraRig lerp + focusHeightFor)
Done-when verified: full rocket assembled from tray in any order; design changes reshape the rocket live.

## Phase 3: Draft → Certified Workflow   Status: ✅ COMPLETE (2026-07-19)
- [x] GeneratedTask type with rocketPart, visual, rocketEffect (`src/engine/types.ts`)
- [x] Nose cone geometry templates (all 11 G criteria)
- [x] ProtractorWidget (drag to set/measure angles)
- [x] Draft (ghosted) → Certified (full material + green tag) part states
- [x] VABPage: click a draft part → StagePanel opens tasks → answers tune + certify
- [x] Answer checking with tolerances (±3° angles, ±2% gauges, equivalent fractions, unit stripping, UK conventions)
- [x] 3-attempt flow: nudge → hint (Gemini adaptive w/ static fallback) → engineering manual + incorrectValue applied; never blocked
- [x] Attempts saved to Dexie with XP
Done-when verified: nose cone certified end-to-end in browser; attempt row in Dexie.

## Phase 4: All Parts   Status: ✅ COMPLETE (2026-07-19)
- [x] Hull templates (NPV) + RulerWidget
- [x] Fuel templates (NPV+F) + FuelGaugeWidget + RatioMixerWidget + NumberLineWidget
- [x] Engine templates (NF+MD) + thrust gauge
- [x] Fins templates (G+AS) + GridWidget
- [x] Payload templates (F+MD) + PayloadSplitWidget
- [x] Electronics templates (AS + 6AS/MD) + CircuitWidget + BarModelWidget
- [x] Booster certification (engine NF+MD templates with booster context)
- [x] Pre-flight checklist (NF rapid-fire) + ChecklistWidget + uncertified-part gating
Done-when verified: `pnpm verify` coverage check passes — **81/81 criteria** have working templates for all 3 tiers, zero operation symbols in briefings (251 template tests green). /dev/status shows 81/81.

## Phase 5: Mission Flow   Status: ✅ COMPLETE (2026-07-19)
- [x] Launch site picker (7 real spaceports incl. SaxaVord) persisted to profile; first-visit prompt
- [x] Destination selection with mastery unlock logic (Low Orbit / Moon 10% / Mars 30% / Deep Space 50%)
- [x] Mission planner: due reviews → recent wrongs → new criteria Y1→Y6, ~2 per part (`runPlanner.ts`)
- [x] Full VAB → Pre-flight → Launch flow
- [x] 3D launch animation: countdown, tower retract, liftoff + shake, booster staging, sky darkening
- [x] Flight altitude computed by `simulateFlight` from the real design + engineering quality (not canned)
- [x] After-action report: trajectory plot with annotated events, "the maths that flew this mission"
- [x] AI Flight Director debrief (Gemini, static fallback)
- [x] Mission save/resume: mid-build design/plan/progress persisted to Dexie savedMissions
Done-when verified: full loop Hangar → VAB → Checklist → Launch → Report → Hangar works in browser; closing tab mid-mission resumes.

## Phase 6: Progression   Status: ✅ COMPLETE (2026-07-19)
- [x] Mastery derived from attempts (3-in-a-row at tier ≥2), spaced repetition 1/3/7/14 days, XP, launch streaks (`mastery.ts`, unit tested)
- [x] Rocket part upgrades Lv1→Lv3 from strand mastery (2 / 5 criteria) — shinier materials via levelMaterial
- [x] Mission patches (first launch, Moon/Mars/deep space, streaks, strand mastery, perfect mission…)
- [x] Flight Log telemetry console: stats, per-strand coverage map, patches, mission scrapbook with photos
- [x] Sandbox free-design mode with sliders + live physics dashboard + "maths needed" labels
Done-when verified: destinations unlock at thresholds; coverage map renders per-strand.

## Phase 7: Polish   Status: ✅ COMPLETE (2026-07-19) — with deferred items
- [x] Smooth camera transitions between parts (CameraRig lerp)
- [x] Engine flame + emissive certified-part pulse
- [x] Mission Camera (Workshop/Photo/Poster) with Gemini image repaint + style presets; plain screenshot fallback
- [x] Launch Film recording (canvas.captureStream + MediaRecorder → .webm)
- [x] Briefing paraphrase variety (validated: numbers preserved, no op symbols, cached) + "Ask the Chief Engineer"
- [x] Milestone flavour lines (Gemini w/ fallback)
- [x] Sound effects (WebAudio beeps, OFF by default, toggle in nav)
- [x] `prefers-reduced-motion`: auto-rotation and star drift disabled
- [x] Keyboard accessibility: all widgets accept typed input; sliders are native range inputs; buttons focusable
- [x] Responsive layout (panels scroll, md: grids)

### Deferred (logged per §9 rules)
- **takram atmosphere/clouds + Google 3D Tiles terrain**: deferred — the takram
  packages need WebGPU-era three versions incompatible with the pinned R3F v8
  stack. Fallback implemented per spec: drei Stars + fog + stylised per-site
  terrain colouring (coastal/steppe/jungle/island) + sky-darkening launch
  transition. Site lat/lon kept in `launchSites.ts` ready for the tiles layer.
- **True 3D drag-ghost with pointer-following mesh**: parts attach via
  click-to-attach with draft ghosting + node highlighting instead of freehand
  cursor dragging (simpler and fully keyboard-accessible; same Kerbal
  draft→certify loop).

## Verification
- `pnpm verify` → tsc -b clean · **276/276 tests** · coverage-check **81/81 criteria**, briefings clean, all 8 part categories have tasks (2026-07-19)
- /dev/status → 81/81 green, DB seeded, Gemini key status shown

## §15 Success criteria — browser walkthrough sign-off (2026-07-19)
1. ✅ Open app, pick a real launch site (SaxaVord shown with 🇬🇧 flag), rocket on pad — signed off 2026-07-19
2. ✅ Pick "Low Orbit" destination in Hangar — signed off 2026-07-19
3. ✅ VAB: attach parts from catalogue in any order, certify via engineering tasks — signed off 2026-07-19
4. ✅ Rocket changes shape live as parts attach and answers lock in — signed off 2026-07-19
5. ✅ Pre-flight checklist (5 rapid-fire systems checks) — signed off 2026-07-19
6. ✅ 3D animated launch: countdown → tower retract → liftoff → sky darkens — signed off 2026-07-19
7. ✅ After-action report with maths used + Flight Director narration — signed off 2026-07-19
8. ✅ Wrong answer → gentle nudge, then hint responding to the actual mistake (Gemini when keyed, static otherwise), never the answer — signed off 2026-07-19
9. ✅ Mission photo via Mission Camera saved to Flight Log scrapbook — signed off 2026-07-19
10. ✅ Return visits: rocket design persists, part levels upgrade with mastery — signed off 2026-07-19

## Post-launch feedback: multi-profile "Rocket Lab" (2026-07-19)
- [x] Commander profile picker on load — pick a returning commander or type any
  name (Artie, Walter, …); app becomes "{Name}'s Rocket Lab" everywhere
- [x] Dexie v2 migration: attempts/missions stamped with `profileId`, saved
  missions keyed per profile; legacy data assigned to "artie"
- [x] Per-profile rocket design, XP, streaks, patches, mastery, launch site,
  flight log and mission scrapbook — fully isolated between commanders
- [x] AI layer personalised: Flight Director / Chief Engineer prompts address
  the active commander by name (`src/ai/commander.ts` cache)
- [x] "Change commander" button in the nav returns to the picker
Verified in browser: created Walter (SaxaVord) and Artie (Canaveral) profiles,
switched between them — separate sites/stats, both listed as returning
commanders. `pnpm verify` green (276 tests, 81/81 coverage).

### Full-mission end-to-end run (2026-07-19, second pass)
Hangar → Low Orbit → VAB (attached & certified Nose + Hull + Day Tank + Engine
through their engineering tasks, live performance dashboard updating) →
Pre-flight checklist 5/5 systems green first time → GO FOR LAUNCH →
countdown T-3 → liftoff with flame + telemetry (liftoff / engine cutoff /
apogee events) → **"Low Orbit reached! 157.1 km · target 100 km · 13/13
tasks"** → After-action report rendered altitude-vs-time replay with target
line and the per-part criterion breakdown → Flight Log coverage map showed
attempted criteria highlighted and First Launch + Flawless Flight patches earned.

## KS3 "Astronaut Academy" Expansion (PROMPT_KS3.md)

### Phase 8: Curriculum data + coverage tooling   Status: ✅ COMPLETE (2026-07-19)
- [x] `keyStage` on every criterion; 65 KS3 criteria coded per the PDF (KS3N 16 · KS3A 16 · KS3R 10 · KS3G 16 · KS3P 4 · KS3S 3) — `src/curriculum/ks3.ts`
- [x] `scripts/coverage-check.ts` + templates test enlarged to the full 146 with per-keystage output (`KS2 81/81 ✅  KS3 65/65 ✅`)
- [x] /dev/status grid enlarged: strands + KS3 domains × years 1–9

### Phase 9: Widgets   Status: ✅ COMPLETE (2026-07-19)
- [x] 10 new widgets registered in TaskRenderer: Equation, GraphPlot (4-quadrant lines/quadratics/intersections/piecewise/exponential/reciprocal, plotPoint click, matchLine m/c sliders), Sequence, StandardForm (A × 10^n builder), Construction, Triangle, Venn, SampleSpace, Chart (bar/pie/scatter), ScaleMap
- [x] Equation-display rule enforced: notation only inside widget canvases, briefings symbol-free (tested across all 146 × 3 tiers × 4 seeds)

### Phase 10: Templates per domain   Status: ✅ COMPLETE (2026-07-19)
- [x] ks3-number (Propellant Chemistry Lab), ks3-algebra (Flight Computer), ks3-ratio (Mission Planning Office) — completed from the in-progress work
- [x] ks3-geometry (Structures & Trajectory Bay), ks3-probability (Mission Risk Console), ks3-statistics (Telemetry Science Deck) — written new
- [x] All wired into the engine dispatcher; 471 tests green

### Phase 11: Academy progression + destinations   Status: ✅ COMPLETE (2026-07-19)
- [x] Academy unlock: 60% KS2 mastery OR "I'm in Year 7+" toggle (`isAcademyUnlocked`); `academyUnlocked` on Profile with Dexie v3 migration; picker checkbox
- [x] 4 Academy destinations (Jupiter's Moons, Saturn's Rings, Interstellar Probe, Generation Ship) gated on KS3 mastery, 🎓 tags + lock hints in the Hangar
- [x] Planner never mixes key stages within a part: `partKeyStage` picks a KS2 or KS3 fit-out from unlock + due reviews; Academy destinations always fly KS3
- [x] Academy patches (Academy Cadet, destination set, 6 KS3 domain-mastery patches incl. Algebra Ace / Risk Analyst / Data Scientist / Pythagoras Prize)
- [x] Flight Log coverage map: stacked KS2 (81) + 🎓 KS3 (65) sections

### Phase 12: takram + Google 3D Tiles   Status: ✅ COMPLETE (2026-07-19)
- [x] Sanctioned stack upgrade: React 19 · R3F v9 · drei 10 · three 0.185 · postprocessing (verify stayed green)
- [x] `src/three/GeoEnvironment.tsx` (Gaudi pattern): ECEF rebase at the site's lat/lon, takram Sky/Stars/SunLight/SkyLight, volumetric Clouds, AerialPerspective + LensFlare + Bloom + AGX tone mapping, Google Photorealistic 3D Tiles (key-validated, relit, pad-cleared, error-boundary + retry)
- [x] Wired through RocketScene for every 3D view; stylised terrain remains the offline error path
- Verified in browser: real Cape Canaveral coastline + cloud deck visible from the Hangar, VAB and launch pad

### Phase 13: Cinematic launch + polish   Status: ✅ COMPLETE (2026-07-19)
- [x] Launch director (§6a-ii): pad cam → tower cam → ground tracking telephoto (fov tightens) → chase cam → orbit reveal, cuts driven by the rocket's ACTUAL simulated altitude; damped moves, T-0 shake; "📺 shot — switch" manual cycle; reduced-motion single tracking shot
- [x] OrbitControls handed over to the director during flight; restored after
- Verified in browser: full launch from real Canaveral terrain, auto shots cycling to Orbit Cam at 259 km

### Verification log (expansion)
- 2026-07-19 `pnpm verify`: tsc clean · **471/471 tests** · `KS2 81/81 ✅  KS3 65/65 ✅` · 146/146 covered
- 2026-07-19 browser walkthrough: Year 7+ toggle on the picker → Jupiter's Moons open at 0% KS2 (🎓 Academy tag), Saturn/Interstellar/Generation Ship gated on KS3 %; real 3D Tiles + takram sky in Hangar/VAB/Launch; cinematic launch tracked pad → orbit with auto shot cycling
