import type { RocketDesign } from "../three/rocketDesign";
import type { FlightResult, FlightSample, FlightEvent } from "./types";
import { computePerformance } from "./computePerformance";

const G = 9.8;

/**
 * Step-by-step flight sim from the actual design. Bad TWR struggles off the
 * pad, high drag bleeds speed, low stability tumbles (capped altitude),
 * boosters stage part-way through the burn.
 */
export function simulateFlight(design: RocketDesign, engineeringQuality = 1): FlightResult {
  const perf = computePerformance(design);
  const samples: FlightSample[] = [];
  const events: FlightEvent[] = [];
  const dt = 0.25;

  // Engineering quality (fraction of tasks correct) trims thrust efficiency.
  const quality = 0.6 + 0.4 * Math.max(0, Math.min(1, engineeringQuality));
  const tumbled = perf.stability < 0.8;

  let t = 0;
  let alt = 0; // metres
  let vel = 0;
  let mass = perf.totalMass;
  const burnTime = Math.max(1, perf.burnTime);
  const fuelPerSec = perf.fuelMass / burnTime;
  const stagingT = design.boosterCount > 0 ? Math.min(burnTime * 0.35, 20) : -1;
  let boostersAttached = design.boosterCount > 0;
  let struggledOffPad = perf.twr < 1.4;
  let apogeeT = 0;
  let burnoutT = 0;

  events.push({ t: 0, label: "Liftoff" });
  if (struggledOffPad) events.push({ t: 1, label: `TWR only ${perf.twr} — slow climb off the pad` });

  const maxT = 240;
  while (t < maxT) {
    const burning = t < burnTime;
    let thrustN = 0;
    if (burning) {
      thrustN = design.engineCount * design.thrustPerEngine * 1000 * quality;
      if (boostersAttached) thrustN += design.boosterCount * 400 * 1000 * quality;
      mass = Math.max(perf.dryMass, mass - fuelPerSec * dt);
    }
    if (boostersAttached && stagingT > 0 && t >= stagingT) {
      boostersAttached = false;
      mass = Math.max(100, mass - design.boosterCount * 150);
      events.push({ t, label: "Booster staging — boosters jettisoned" });
    }
    // Drag proportional to v^2, thinning with altitude.
    const airDensity = Math.exp(-alt / 8000);
    const dragN = perf.dragCoeff * 0.5 * airDensity * vel * Math.abs(vel) * (tumbled ? 8 : 1.2);
    const accel = thrustN / Math.max(mass, 1) - G * Math.max(0, 1 - alt / 400000) - dragN / Math.max(mass, 1);
    vel += accel * dt;
    if (alt <= 0 && vel < 0) vel = 0;
    alt = Math.max(0, alt + vel * dt);
    t += dt;

    if (burning && t + dt >= burnTime && burnoutT === 0) {
      burnoutT = t;
      events.push({ t, label: "Engine cutoff — coasting" });
    }
    if (Math.round(t / dt) % 2 === 0) {
      samples.push({ t: Math.round(t * 100) / 100, altitude: alt / 1000, velocity: Math.round(vel) });
    }
    if (!burning && vel <= 0) {
      apogeeT = t;
      break;
    }
  }
  if (apogeeT === 0) apogeeT = t;

  let maxAltitudeKm = Math.max(...samples.map((s) => s.altitude), 0);
  if (tumbled) {
    maxAltitudeKm = Math.min(maxAltitudeKm, 30);
    events.push({ t: Math.min(12, apogeeT), label: "Unstable — the rocket tumbled without enough fins" });
  }
  events.push({ t: apogeeT, label: `Apogee at ${Math.round(maxAltitudeKm)} km` });

  return {
    samples,
    events: events.sort((a, b) => a.t - b.t),
    maxAltitudeKm: Math.round(maxAltitudeKm),
    burnoutT: Math.round(burnoutT),
    apogeeT: Math.round(apogeeT),
    struggledOffPad,
    tumbled,
  };
}