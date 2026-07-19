import type { RocketDesign } from "../three/rocketDesign";
import type { FlightResult, FlightSample, FlightEvent, FlightOutcome } from "./types";
import { computePerformance } from "./computePerformance";
import { deriveFailurePlan, type PlannedFailure } from "./failureModes";

const G = 9.8;
/** Dynamic-pressure threshold (Pa-ish, model units) treated as "max-Q". */
const MAX_Q_THRESHOLD = 30000;

function eventFrom(f: PlannedFailure, t: number): FlightEvent {
  return { t, label: f.caption, severity: f.severity, partAtFault: f.partAtFault, stepId: f.stepId };
}

/**
 * Step-by-step flight sim from the actual design. Fully deterministic —
 * failures are decided ONLY by the configuration values the player's install
 * maths wrote (see failureModes.ts), never by RNG.
 */
export function simulateFlight(design: RocketDesign, engineeringQuality = 1): FlightResult {
  const perf = computePerformance(design);
  const failPlan = deriveFailurePlan(design);
  const samples: FlightSample[] = [];
  const events: FlightEvent[] = [];
  const failures: FlightEvent[] = [];
  const dt = 0.25;

  const isFailure = (f: PlannedFailure) => f.severity === "failure" || f.severity === "catastrophic";
  const fire = (f: PlannedFailure, t: number) => {
    const ev = eventFrom(f, t);
    events.push(ev);
    if (isFailure(f)) failures.push(ev);
  };
  const finish = (
    tumbledFlag: boolean,
    struggled: boolean,
    burnoutT: number,
    apogeeT: number,
    outcome: FlightOutcome,
  ): FlightResult => ({
    samples,
    events: events.sort((a, b) => a.t - b.t),
    maxAltitudeKm: Math.round(Math.max(...samples.map((s) => s.altitude), 0)),
    burnoutT: Math.round(burnoutT),
    apogeeT: Math.round(apogeeT),
    struggledOffPad: struggled,
    tumbled: tumbledFlag,
    outcome,
    failures,
  });

  // ── Pre-launch checks ────────────────────────────────────────────────
  const padAbort = failPlan.find((f) => f.mode === "padAbort");
  if (padAbort) {
    fire(padAbort, 0);
    samples.push({ t: 0, altitude: 0, velocity: 0, driftX: 0 });
    return finish(false, false, 0, 0, "padAbort");
  }
  const padExplosion = failPlan.find((f) => f.mode === "padExplosion");
  if (padExplosion) {
    events.push({ t: 0, label: "Ignition", severity: "info" });
    fire(padExplosion, 0.5);
    samples.push({ t: 0, altitude: 0, velocity: 0, driftX: 0 });
    samples.push({ t: 0.5, altitude: 0, velocity: 0, driftX: 0 });
    return finish(false, false, 0.5, 0.5, "lostVehicle");
  }
  const cantLiftOff = failPlan.find((f) => f.mode === "cantLiftOff");
  if (cantLiftOff) {
    events.push({ t: 0, label: "Ignition", severity: "info" });
    fire(cantLiftOff, 1);
    for (let t = 0; t <= 4; t += 0.5) samples.push({ t, altitude: 0, velocity: 0, driftX: 0 });
    return finish(false, true, 4, 4, "lostVehicle");
  }

  // ── Ascent ───────────────────────────────────────────────────────────
  // Engineering quality (fraction of tasks correct) trims thrust efficiency.
  const quality = 0.6 + 0.4 * Math.max(0, Math.min(1, engineeringQuality));
  const tumbledUnstable = perf.stability < 0.8;
  let tumbled = tumbledUnstable;

  const flameOut = failPlan.find((f) => f.mode === "flameOut");
  const tankDry = failPlan.find((f) => f.mode === "tankDry");
  const fireball = failPlan.find((f) => f.mode === "fuelFireball");
  const stagingFail = failPlan.find((f) => f.mode === "stagingCollision");
  const maxQFails = failPlan.filter((f) => f.trigger === "maxQ" && isFailure(f)).sort((a) => (a.severity === "catastrophic" ? -1 : 1));
  const maxQWarnings = failPlan.filter((f) => f.trigger === "maxQ" && !isFailure(f));
  const ascentFails = failPlan.filter((f) => f.trigger === "ascent");

  // Lateral veer (km after t seconds): gimbal + CG offsets act like a small
  // constant sideways acceleration during the burn.
  const gimbalSign = Math.sign(design.engineGimbalOffset) || 1;
  const cgSign = Math.sign(design.cgOffset) || 1;
  const driftAccel = design.engineGimbalOffset * 0.4 + design.cgOffset * 8; // m/s²
  const veerFailure = ascentFails.some(isFailure);
  const driftAt = (t: number) => (0.5 * driftAccel * t * t) / 1000; // km
  void gimbalSign;
  void cgSign;

  let t = 0;
  let alt = 0; // metres
  let vel = 0;
  let mass = perf.totalMass;
  let burnTime = Math.max(1, perf.burnTime);
  // Flame-out / dry tank: the burn ends early — 40 % into the nominal burn.
  const shortBurn = flameOut ?? tankDry;
  if (shortBurn) burnTime = Math.max(1, burnTime * 0.4);
  // Fireball: catastrophic at 50 % of the nominal burn.
  const fireballT = fireball ? Math.max(1.5, burnTime * 0.5) : -1;

  const fuelPerSec = perf.fuelMass / burnTime;
  const nominalStagingT = design.boosterCount > 0 ? Math.min(burnTime * 0.35, 20) : -1;
  const stagingT = nominalStagingT > 0 ? nominalStagingT * (1 + Math.max(-0.9, design.boosterStageT)) : -1;
  let boostersAttached = design.boosterCount > 0;
  const struggledOffPad = perf.twr < 1.4;
  let apogeeT = 0;
  let burnoutT = 0;
  let maxQFired = false;
  let ascentFired = false;
  let catastrophicAt = -1;
  let sawFailure = failures.length > 0;

  events.push({ t: 0, label: "Liftoff", severity: "info" });
  if (struggledOffPad) events.push({ t: 1, label: `TWR only ${perf.twr} — slow climb off the pad`, severity: "warning" });

  const maxT = 240;
  while (t < maxT) {
    const burning = t < burnTime && catastrophicAt < 0;
    let thrustN = 0;
    if (burning) {
      thrustN = design.engineCount * design.thrustPerEngine * 1000 * quality;
      if (boostersAttached) thrustN += design.boosterCount * 400 * 1000 * quality;
      mass = Math.max(perf.dryMass, mass - fuelPerSec * dt);
    }
    if (boostersAttached && stagingT > 0 && t >= stagingT) {
      boostersAttached = false;
      mass = Math.max(100, mass - design.boosterCount * 150);
      if (stagingFail && catastrophicAt < 0) {
        fire(stagingFail, t);
        catastrophicAt = t;
        tumbled = true;
        sawFailure = true;
      } else {
        events.push({ t, label: "Booster staging — boosters jettisoned", severity: "info" });
      }
    }
    // Fireball mid-burn.
    if (fireball && catastrophicAt < 0 && t >= fireballT) {
      fire(fireball, t);
      catastrophicAt = t;
      tumbled = true;
      sawFailure = true;
    }
    // Ascent veer events (once, a few seconds in).
    if (!ascentFired && t >= 4 && alt > 200) {
      ascentFired = true;
      for (const f of ascentFails) {
        fire(f, t);
        if (isFailure(f)) sawFailure = true;
      }
    }
    // Drag proportional to v^2, thinning with altitude.
    const airDensity = Math.exp(-alt / 8000);
    const q = 0.5 * airDensity * vel * vel;
    // Max-Q structural checks.
    if (!maxQFired && q > MAX_Q_THRESHOLD) {
      maxQFired = true;
      for (const f of maxQWarnings) fire(f, t);
      const kill = maxQFails[0];
      if (kill && catastrophicAt < 0) {
        fire(kill, t);
        catastrophicAt = t;
        tumbled = true;
        sawFailure = true;
      }
    }
    const dragN = perf.dragCoeff * 0.5 * airDensity * vel * Math.abs(vel) * (tumbled ? 8 : 1.2);
    // Realistic acceleration in the atmosphere (~4 g max, like a real launch)
    // so the altitude readout is believable; the cap relaxes above the
    // atmosphere so far-flung game destinations stay reachable.
    // Throttle-up ramp: real rockets leave the pad at ~1.3 g net and only
    // build towards ~4 g as the tanks empty — so T+5 s sits around 60–100 m,
    // not half a kilometre. The cap still relaxes above the atmosphere.
    const thrustAccelCap = Math.min(40, G * (1.35 + 0.09 * t)) * (1 + Math.pow(alt / 40000, 2));
    const thrustAccel = Math.min(thrustN / Math.max(mass, 1), thrustAccelCap);
    const accel = thrustAccel - G * Math.max(0, 1 - alt / 400000) - dragN / Math.max(mass, 1);
    vel += accel * dt;
    if (alt <= 0 && vel < 0) vel = 0;
    alt = Math.max(0, alt + vel * dt);
    t += dt;

    if (burning && t + dt >= burnTime && burnoutT === 0) {
      burnoutT = t;
      if (shortBurn) {
        fire(shortBurn, t);
        sawFailure = true;
      } else {
        events.push({ t, label: "Engine cutoff — coasting", severity: "info" });
      }
    }
    if (catastrophicAt >= 0 && burnoutT === 0) burnoutT = catastrophicAt;
    if (Math.round(t / dt) % 2 === 0) {
      samples.push({
        t: Math.round(t * 100) / 100,
        altitude: alt / 1000,
        velocity: Math.round(vel),
        driftX: Math.round(driftAt(Math.min(t, burnTime)) * 1000) / 1000,
      });
    }
    // After a catastrophic event the wreck falls quickly — end the replay soon.
    if (catastrophicAt >= 0 && t >= catastrophicAt + 3) {
      apogeeT = t;
      break;
    }
    if (!burning && vel <= 0) {
      apogeeT = t;
      break;
    }
  }
  if (apogeeT === 0) apogeeT = t;

  let maxAltitudeKm = Math.max(...samples.map((s) => s.altitude), 0);
  if (tumbledUnstable) {
    maxAltitudeKm = Math.min(maxAltitudeKm, 30);
    events.push({ t: Math.min(12, apogeeT), label: "Unstable — the rocket tumbled without enough fins", severity: "failure" });
  }
  // A hard veer bleeds vertical performance: cap the achieved altitude.
  if (veerFailure) maxAltitudeKm = Math.min(maxAltitudeKm, Math.max(5, maxAltitudeKm * 0.55));
  // Clamp stored samples to the (possibly capped) ceiling so plots agree.
  for (const s of samples) s.altitude = Math.min(s.altitude, maxAltitudeKm);
  events.push({ t: apogeeT, label: `Apogee at ${Math.round(maxAltitudeKm)} km`, severity: "info" });

  const outcome: FlightOutcome =
    catastrophicAt >= 0 ? "lostVehicle" : sawFailure || tumbled || failures.length > 0 ? "degraded" : "nominal";

  return {
    samples,
    events: events.sort((a, b) => a.t - b.t),
    maxAltitudeKm: Math.round(maxAltitudeKm),
    burnoutT: Math.round(burnoutT),
    apogeeT: Math.round(apogeeT),
    struggledOffPad,
    tumbled,
    outcome,
    failures,
  };
}