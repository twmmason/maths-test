# PROMPT — "Wrench Time": Installation, Configuration & Consequence System

Copy-paste this whole file as the task prompt. It extends **Artie's Rocket Lab** (this repo) with a gamified part-installation system where the maths a player does *becomes* the rocket's real configuration — and getting it wrong produces spectacular, diagnosable launch failures.

---

## 1. The core idea

Right now, parts are attached in the VAB and "certified" by solving maths tasks, but certification is pass/fail and only gates the pre-flight button. Flight failure is limited to `tumbled` / `struggledOffPad` in `src/physics/simulateFlight.ts`.

**Change this so that:**

1. **Installing a part is a physical, multi-step process** (a mini installation sequence), not just a drag-and-drop attach.
2. **The player's maths answers ARE the configuration values.** No "correct/incorrect, try again" gate — the number the player computes gets written into `RocketDesign`. If the maths is wrong, the rocket is *built wrong*.
3. **Wrong configurations produce specific, physical failure modes at launch** — on-pad explosions, fireballs, veering off course, mid-air breakup, shattering fins, fuel starvation, payload doors blowing open — each traceable to the exact part and the exact maths task that caused it.
4. **The after-action report is a crash investigation** that tells the player *which bolt they got wrong and which maths to redo*, turning failure into a learning loop instead of a punishment.

Fun first: explosions must be gorgeous. Failure should make the player laugh, screenshot it, and immediately want to fix it.

---

## 2. Installation system — "Wrench Time"

When a part from `PartsTray` is dropped onto the rocket, do NOT just attach it. Open an **Installation Sequence** panel (new component `src/features/vab/InstallSequence.tsx`) that walks through 2–4 installation steps for that part. Each step is one of:

- **FIT** — a geometry/measurement task (does the part physically fit? bolt circle diameter, alignment angle, symmetry).
- **TORQUE / SET** — a numeric configuration task (a value dialled into the part: fuel ratio, thrust limit, fin cant angle, wire gauge).
- **CONNECT** — a matching/logic task (wiring, plumbing, stage ordering).
- **INSPECT** — a quick estimation/checking task (spot the error, sanity-check a reading).

Steps reuse the existing task engine (`src/engine/templates/*`, `TaskRenderer`, existing widgets — ProtractorWidget, RatioMixerWidget, CircuitWidget, FuelGaugeWidget, EquationWidget, etc.). **Each step's criterion codes come from `criteriaForPart(part, keyStage)`** so curriculum coverage is preserved, and results still feed `recordMission` / mastery exactly as certification does today.

### The crucial mechanic: answers are written, not checked

For each step, take the player's submitted answer and **commit it to the design**:

- Extend `InstalledPart` in `src/three/rocketDesign.ts`:

```ts
interface InstalledPart {
  variantId: string;
  certified: boolean;            // keep for compatibility
  attachment: "stack" | "radial";
  radialCount?: 2 | 3 | 4;
  install?: {
    steps: InstallStepResult[];  // one per install step
    integrity: number;           // 0..1 aggregate, see below
  };
}

interface InstallStepResult {
  stepId: string;                // e.g. "fins.cantAngle"
  criterionCode: string;         // maths criterion exercised
  kind: "fit" | "torque" | "connect" | "inspect";
  target: number;                // the engineering-correct value
  actual: number;                // what the player computed/entered
  errorPct: number;              // |actual - target| / tolerance band
  tier: 1 | 2 | 3;               // task difficulty used
}
```

- **Integrity per part** = weighted function of step errors. Small errors (≤5%) → cosmetic ("slightly scorched"). Medium (5–25%) → degraded performance. Large (>25%) or a critically-wrong CONNECT step → armed failure.
- The player is NEVER told "wrong answer" during installation. They get in-fiction feedback only: the torque wrench clicks, the gauge settles where they set it, the wire sparks slightly. A sharp-eyed player can notice a gauge looks off and **re-do a step** (costs "spare parts" — see economy, §5) before launch.

### Configuration mapping (make wrong maths physically wrong)

Wire specific install steps to specific `RocketDesign` fields so the sim consumes real values:

| Part | Install step (maths) | Design field written | Wrong ⇒ |
|---|---|---|---|
| Engine | thrust limiter % (percentages/fractions) | `thrustPerEngine` scaled by answer | under: can't lift off; over: pad structural failure |
| Engine | gimbal alignment angle (angles/protractor) | new `engineGimbalOffset` | veer off course |
| Fuel tank | oxidiser:fuel ratio (ratio) | `fuelRatio` | fuel-rich fireball or early flame-out |
| Fuel tank | fill volume calc (volume/measures) | `tankFill` | runs dry before target apogee |
| Fins | cant angle & symmetry (angles/symmetry) | `finAngle`, `finSymmetry` | spin-up, tumble, fin shatter at max-Q |
| Hull | panel bolt count/spacing (multiplication/division) | new `hullIntegrity` | mid-air breakup at max-Q |
| Nose cone | cone angle (geometry) | `noseAngle` | drag spike, "shatter" at high speed |
| Electronics | circuit wiring (logic/CircuitWidget) | `circuitsWired`, `powerBalanced` | guidance loss ⇒ random veer; or total abort on pad |
| Payload bay | mass distribution split (fractions) | new `cgOffset` | pitch-over / veering arc |
| Boosters | staging timer arithmetic | new `boosterStageT` | boosters collide with core ⇒ explosion at staging |

---

## 3. Failure simulation — make it spectacular and diagnosable

Extend `simulateFlight(design)` in `src/physics/simulateFlight.ts`:

1. **Pre-launch checks** — derive a `FailurePlan` from `installedParts[*].install`:
   - critical electronics error ⇒ `padAbort` (klaxons, no launch, no explosion — teaches that inspections save rockets)
   - thrust >130% of structural limit ⇒ `padExplosion` at t≈0.5s
   - gimbal offset ⇒ continuous lateral veer proportional to error (add `driftX` to `FlightSample`)
   - fin asymmetry ⇒ roll rate builds ⇒ `finShatter` then `tumble` at max-Q
   - hullIntegrity low ⇒ `breakup` when dynamic pressure exceeds threshold
   - wrong fuelRatio ⇒ thrust curve altered + `flameOut`/`fireball` event mid-burn
   - boosterStageT wrong ⇒ `stagingCollision` explosion at staging
2. Add to `FlightEvent` a `severity: "info" | "warning" | "failure" | "catastrophic"` and `partAtFault?: RocketPart`, `stepId?: string`.
3. `FlightResult` gains `outcome: "nominal" | "degraded" | "lostVehicle" | "padAbort"` and `failures: FlightEvent[]`.
4. **Determinism**: same design ⇒ same flight. No RNG deciding failure; only the player's numbers. (Use `src/engine/rng.ts` seeded by design hash for cosmetic variation only.)

### Visuals (LaunchPage + Rocket3D)

- Explosions/fireballs: layered emissive sphere bursts + GPU particle sparks + smoke billboards + screen shake + white flash; debris = the actual part meshes given impulse velocities and tumble (reuse `Rocket3D` part geometry, don't fake it — the fins that shatter are *the fins the player installed*).
- Veering: trajectory visibly arcs using `driftX`; camera struggles to track it.
- Fireball at altitude: rocket continues as a tumbling flaming wreck; sound design via `src/mission/sound.ts` (new: explosion, klaxon, structural groan, RSO "we've lost the vehicle" callout).
- Every failure event pops a big on-screen caption: **"MAX-Q — FIN SEPARATION (port fin, cant angle 12° vs spec 4°)"**.

---

## 4. Crash Investigation (after-action report)

Extend `ReportPage`:

- **Anomaly board**: for each failure event, show the part, the install step, the player's value vs target, and a one-line physics explanation ("Your fin cant of 12° produced 3× the roll torque the airframe can take").
- **"Return to VAB — fix it" button** that deep-links to the exact part's install step with the same task *template* but fresh numbers (use engine seeding).
- Successful re-flight after a fix awards a **"Failure Is Not An Option"** patch (add to `src/mission/patches.ts`); the corrected criterion gets a mastery boost via the existing spaced-repetition path.
- Gemini debrief (`src/ai/debrief.ts`) narrates the investigation NTSB-style, language-only as ever — physics facts come from the deterministic sim, never the model.

---

## 5. Gamification layer

- **Spare parts economy**: each mission grants spare-part tokens. Re-doing an install step or replacing a shattered part costs tokens; flawless installs refund them. Tokens persist in Dexie (`src/db/db.ts`).
- **Quality grades per install**: each step graded A–D from `errorPct` (shown only AFTER launch, in the investigation — preserving the "answers aren't checked live" rule).
- **Streak mechanic — "Green Board"**: N consecutive nominal launches unlocks cosmetic liveries and higher-tier part variants in `partsCatalog.ts`.
- **Risk dial**: player may *choose* to skip an INSPECT step to save time/tokens — pure risk/reward, and skipped inspections are called out in the investigation.
- **Sandbox "Crash Lab"**: in `SandboxPage`, let players deliberately mis-configure to see failures safely — curiosity-driven physics learning; no mastery impact.

---

## 6. Constraints

- Local-first, offline-capable; Gemini is language-only (unchanged rule from PROMPT.md).
- All maths generated/marked by the deterministic template engine; every install step maps to a real KS2/KS3 criterion code and records attempts through the existing mastery pipeline.
- Keep `certified` semantics so existing pre-flight gating, DevStatusPage coverage checks, and `scripts/coverage-check.ts` still pass; a part is `certified` when its installation sequence is *completed* (not necessarily correct).
- Add tests: `src/physics/failureModes.test.ts` (given design X with error Y ⇒ outcome Z, deterministic), install-step → design-field mapping tests, and update `physics.test.ts`.
- Age-appropriate tone: failures are dramatic but jolly — cartoon-boom, RSO quips, no injuries ("the crew capsule escape tower worked perfectly, again").

## 7. Definition of done

- Installing every one of the 8 part types walks through a Wrench Time sequence whose answers write real `RocketDesign` values.
- At least 8 distinct failure modes reachable, each with unique visuals/audio/caption, each traceable in the Crash Investigation to a specific step and criterion.
- A wrong fin angle demonstrably veers/tumbles; a wrong fuel ratio demonstrably fireballs; correct maths demonstrably flies nominal — verified by tests and a manual browser run.
- No regression in curriculum coverage (coverage-check passes) or existing tests.