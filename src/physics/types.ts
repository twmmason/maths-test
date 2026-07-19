export interface RocketPerformance {
  totalMass: number; // kg
  dryMass: number; // kg
  fuelMass: number; // kg
  totalThrust: number; // kN
  twr: number; // thrust-to-weight ratio
  deltaV: number; // m/s
  dragCoeff: number; // 0..0.5
  stability: number; // > 0.8 = stable
  burnTime: number; // s
  maxAltitude: number; // km (analytic estimate)
  flightReady: boolean;
}

export interface FlightSample {
  t: number; // seconds
  altitude: number; // km
  velocity: number; // m/s
}

export interface FlightEvent {
  t: number;
  label: string;
}

export interface FlightResult {
  samples: FlightSample[];
  events: FlightEvent[];
  maxAltitudeKm: number;
  burnoutT: number;
  apogeeT: number;
  struggledOffPad: boolean;
  tumbled: boolean;
}