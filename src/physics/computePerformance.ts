import type { RocketDesign } from "../three/rocketDesign";
import type { RocketPerformance } from "./types";

/**
 * Deterministic performance model (simplified but internally consistent).
 * Sharper nose → less drag; more fins + symmetry → stability; boosters add
 * thrust (jettisoned at staging).
 */
export function computePerformance(design: RocketDesign): RocketPerformance {
  const dryMass =
    design.hullHeight * 80 +
    design.engineCount * 120 +
    design.finCount * 35 +
    design.payloadPods * design.payloadPerPod * 25 / 25 + // pods carry payloadPerPod kg each
    design.payloadPods * 25 +
    design.boosterCount * 150 +
    design.noseHeight * 30;
  const fuelMass = design.tankFill * design.hullHeight * 200;
  const totalMass = dryMass + fuelMass;
  const totalThrust = design.engineCount * design.thrustPerEngine + design.boosterCount * 400;
  const twr = totalThrust / (totalMass * 0.0098);
  const exhaustVelocity = 2500; // m/s (simplified)
  const deltaV = fuelMass > 0 ? exhaustVelocity * Math.log((dryMass + fuelMass) / dryMass) : 0;
  const dragCoeff = Math.max(0.05, 0.5 - (Math.max(10, Math.min(120, design.noseAngle)) / 360) * 0.3 - (design.noseAngle < 45 ? 0.08 : 0));
  const stability = design.finCount >= 3 && design.finSymmetry ? 1.0 + design.finCount * 0.1 : 0.3;
  const burnTime = totalThrust > 0 ? fuelMass / (design.engineCount * design.thrustPerEngine * 0.004 + design.boosterCount * 1.6 + 0.0001) : 0;
  const maxAltitude = (deltaV * Math.min(burnTime, 120) * 0.5 * (1 - dragCoeff)) / 1000;

  return {
    totalMass: Math.round(totalMass),
    dryMass: Math.round(dryMass),
    fuelMass: Math.round(fuelMass),
    totalThrust: Math.round(totalThrust),
    twr: Math.round(twr * 100) / 100,
    deltaV: Math.round(deltaV),
    dragCoeff: Math.round(dragCoeff * 100) / 100,
    stability: Math.round(stability * 100) / 100,
    burnTime: Math.round(burnTime),
    maxAltitude: Math.round(maxAltitude),
    flightReady: twr > 1.2 && stability > 0.8 && design.tankFill > 0.2,
  };
}