# PROMPT — "Dial It In": VAB Tuning, Mission Targets, True Orbit, Cinematic Cameras, Real Voices & World Upgrade

Copy-paste this whole file as the task prompt. It extends **Artie's Rocket Lab** (this repo) after the "Wrench Time" installation/consequence system. Six workstreams, in priority order.

---

## 1. Move the Sandbox parametric controls INTO the VAB — every part gets tunable features

The parametric sliders currently living in `src/features/sandbox/SandboxPage.tsx` (Crash Lab) must become a core VAB feature, not a side mode.

- When a part is attached (and its Wrench Time installation is complete), selecting it in the VAB opens a **Part Tuning panel** alongside the existing engineering-tasks panel. Every one of the 8 part types exposes 2–4 controllable features, for example:
  - **Engine**: throttle limit %, gimbal range, nozzle extension (Δv vs thrust trade-off)
  - **Fuel tank**: fill level %, oxidiser:fuel ratio trim
  - **Fins**: cant angle trim, fin count/symmetry (already partly there), span
  - **Hull**: panel thickness (mass vs `hullIntegrity`), stringer count
  - **Nose cone**: cone angle / fineness ratio (drag vs mass)
  - **Electronics**: guidance gain, battery reserve
  - **Payload bay**: payload mass, CG trim
  - **Boosters**: count, staging timer, thrust offset
- **Interaction rule**: Wrench Time maths still *writes* the initial values (unchanged). Tuning lets the player *adjust* installed values afterwards — but every adjustment beyond a small free band costs spare-part tokens, and moving a value AWAY from the engineering spec re-arms the corresponding failure mode from `src/physics/failureModes.ts`. Tuning is how a player fixes a botched install without redoing maths — at a price — and how they optimise a correct install further.
- All tuned values live in `RocketDesign` (extend `src/three/rocketDesign.ts` as needed), are persisted via the existing `persistDesign` path, feed `computePerformance` and `simulateFlight` deterministically, and update the ROCKET PERFORMANCE board live.
- Keep a slimmed-down Sandbox as a free-play mirror of the same Tuning panel (no token costs, no mastery impact) — it should import the SAME components, not duplicate them.

## 2. Per-mission engineering targets — fresh every mission

Add a **mission target system** (`src/mission/targets.ts`):

- Each mission (destination + attempt) generates 2–4 concrete, checkable targets from the deterministic engine RNG seeded by `(profileId, destinationId, missionIndex)` — e.g. "Apogee between 210–260 km", "Max-Q below 32 kPa", "Burn time ≥ 180 s", "Land the CG offset within 0.2 m", "TWR at liftoff between 1.3 and 1.6".
- Targets are shown in the VAB (so tuning has a purpose) and evaluated after flight from `FlightResult` — deterministic, no AI.
- Meeting all targets = mission gold (bonus XP, spare parts, a patch); partial = silver/bronze. Targets regenerate (new values, possibly new metric mix) on the NEXT mission so the player must re-tune, not memorise.
- Record target results in the Dexie mission record and show them on `ReportPage` and `FlightLogPage`.
- Tests: `src/mission/targets.test.ts` — same seed ⇒ same targets; evaluation logic against synthetic `FlightResult`s.

## 3. True 3D orbit around the Earth

Yes — the stack is plain three.js via `@react-three/fiber` (no map-library lock-in; `GeoEnvironment` is just meshes/tiles in a scene graph), so a full orbital scene is achievable:

- Extend `simulateFlight` with an **orbital phase**: after burnout above ~140 km with sufficient horizontal velocity (add a simple pitch-over/gravity-turn profile driven by the design's guidance values), output orbital samples (position on a circular/elliptical orbit; Kepler-lite is fine, deterministic).
- New scene: when the flight enters the orbital phase, LaunchPage cross-fades from the pad scene to an **Earth globe scene** — a textured sphere (public-domain NASA Blue Marble + cloud layer + atmosphere fresnel shader), the rocket/spacecraft as a small model tracing its orbit line, sun light, star field. Show at least one full orbit with a ground-track line; destination markers (ISS for LEO, Moon in the distance for lunar missions).
- Camera orbits with the craft; the player can drag to look around. Keep it 60 fps on modest hardware (single sphere, no tile streaming needed at orbital distance).
- Failure modes still apply (e.g. under-fuelled = suborbital re-entry arc that never circularises — show it falling back with a re-entry glow).

## 4. Launch camera overhaul

Rework `LaunchDirector` in `src/features/launch/LaunchPage.tsx`:

- Proper cinematography: locked-off pad wide with heat-haze, tower cam that the rocket sweeps past, long-lens press-site tracking shot with realistic slow pan and slight lag/overshoot, aerial chase, and the orbital handover from §3.
- Fix current issues: no clipping through terrain, no losing the rocket at frame edge (keep it rule-of-thirds framed), smooth FOV pulls, cut (don't lerp) between distant shots, hold shots longer, and add a free "director mode" where the player can orbit/zoom manually during flight.
- Failure moments get a dedicated crash-zoom + slow-motion beat before the explosion.

## 5. Proper voice generation — Google Cloud TTS

Replace the current speech (browser `speechSynthesis`) used for RSO callouts / flight director lines:

- Add `src/ai/voice.ts` using **Google Cloud Text-to-Speech** (same API-key pattern as `src/ai/gemini.ts`, key via `.env` / `VITE_` var) with high-quality voices (e.g. `en-GB-Neural2`/`Studio` voices) — one voice for Flight Director, one for the RSO, one for the Commander AI.
- **Local-first rule preserved**: synthesise on first use, cache the audio (IndexedDB blob via Dexie) keyed by text hash + voice, replay from cache offline; fall back to `speechSynthesis`, then to captions-only, when no key/network. Never block the launch sequence on TTS.
- Pre-warm the fixed callout lines ("T-minus ten…", "Max-Q", "We've lost the vehicle…") at app start.

## 6. Launch-site world upgrade + asset review

Sites currently look wrong (no 3D buildings, bad trees). Do BOTH of:

a) **Asset review**: open https://leap-for-mankind.com/credits and audit every linked asset (models, towers, gantries, sounds, textures, fonts). For each: name, source URL, licence (CC0/CC-BY/etc.), and whether we may bundle it in this repo. Produce `docs/ASSET_AUDIT.md`. Then actually integrate the usable ones: launch tower/gantry models, pad structures, VAB-style buildings, ambient/launch sound effects — with attribution added to an in-app credits screen and `CREDITS.md`. Reject anything with unclear or non-commercial-only licensing.

b) **Procedural/curated environment pass** (`src/three/GeoEnvironment.tsx`): replace the current terrain look with per-site curated scenes — low-poly but *deliberate*: proper launch complex (pad, flame trench, lightning towers, water tower, crawlerway, VAB block in the distance for Canaveral; steppe + rail gantry for Baikonur; jungle + coastline for Kourou; cliffs + sea for SaxaVord), instanced trees that match the biome, better ground materials, and skybox/lighting per site + time-of-day. If Google Photorealistic 3D Tiles are feasible (API key available, r3f-compatible via `3d-tiles-renderer`), add them as an optional "satellite view" mode behind the existing key pattern with graceful offline fallback — but the curated low-poly scenes are the default and must work offline.

## Constraints

- Local-first and offline-capable throughout; Gemini/TTS are progressive enhancements with fallbacks (unchanged rule from PROMPT.md).
- All physics/targets deterministic from design + seed; AI is language/voice only.
- No regressions: existing tests, `scripts/coverage-check.ts`, Wrench Time flow, and the crash-investigation loop must keep passing. Add tests for targets, orbital-phase samples, and tuning→design mapping.
- Keep bundle size sane: lazy-load the Earth scene and any large models/textures.

## Definition of done

- Tuning panel in VAB for all 8 parts; values demonstrably change `FlightResult`; token costs and failure re-arming work.
- Every mission shows fresh deterministic targets; gold/silver/bronze awarded and logged; new targets on the next mission.
- A well-flown LEO mission visibly circularises and orbits a textured Earth in 3D; a bad one falls back with re-entry glow.
- Launch is watchable start-to-finish with no camera glitches; director mode works.
- Voice lines use Google TTS with offline cache + fallback chain.
- All six sites look like real launch complexes; `docs/ASSET_AUDIT.md` and in-app credits exist; every bundled asset is licence-clean.