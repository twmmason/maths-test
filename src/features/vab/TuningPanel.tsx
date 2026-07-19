import { useMemo, useRef, useState } from "react";
import type { RocketPart } from "../../curriculum/types";
import type { RocketDesign } from "../../three/rocketDesign";

/** One tunable feature on a part. `safeMin/safeMax` is the engineering-spec
 * band — tuning OUTSIDE it re-arms the matching failure mode from
 * src/physics/failureModes.ts (the sim reads the same design fields). */
export interface TuneSpec {
  key: keyof RocketDesign;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  hint: string;
  safeMin?: number;
  safeMax?: number;
  percent?: boolean;
}

export const TUNING_BY_PART: Record<RocketPart, TuneSpec[]> = {
  engine: [
    { key: "thrustPerEngine", label: "Throttle limit", min: 80, max: 400, step: 10, unit: "kN", hint: "number facts — total thrust at liftoff", safeMax: 340 },
    { key: "engineCount", label: "Engines", min: 1, max: 6, step: 1, unit: "", hint: "multiplication — engines × thrust each" },
    { key: "engineGimbalOffset", label: "Gimbal trim", min: -8, max: 8, step: 0.25, unit: "°", hint: "angles — off-vertical thrust veers the flight", safeMin: -3, safeMax: 3 },
  ],
  fuelTank: [
    { key: "tankFill", label: "Fill level", min: 0, max: 1, step: 0.05, unit: "", hint: "fractions — fill vs burn time vs weight", percent: true, safeMin: 0.3 },
    { key: "fuelRatio", label: "Oxidiser:fuel ratio", min: 0.5, max: 5, step: 0.1, unit: ":1", hint: "ratio — rich (>3.5) fireballs, lean (<1.6) flames out", safeMin: 1.6, safeMax: 3.5 },
  ],
  fins: [
    { key: "finAngle", label: "Cant angle trim", min: -12, max: 12, step: 0.5, unit: "°", hint: "angles — past ±4° the fins shear off at max-Q", safeMin: -4, safeMax: 4 },
    { key: "finCount", label: "Fin count", min: 0, max: 6, step: 1, unit: "", hint: "symmetry — 3+ symmetric fins keep it stable", safeMin: 3 },
  ],
  hull: [
    { key: "hullHeight", label: "Hull height", min: 3, max: 12, step: 0.5, unit: "m", hint: "measurement — more hull, more fuel, more mass" },
    { key: "hullIntegrity", label: "Panel bolting", min: 0.1, max: 1, step: 0.05, unit: "", hint: "multiplication — under 50% ⇒ breakup at max-Q", percent: true, safeMin: 0.5 },
  ],
  noseCone: [
    { key: "noseAngle", label: "Cone tip angle", min: 20, max: 120, step: 1, unit: "°", hint: "geometry — sharper cone, less drag", safeMax: 70 },
    { key: "noseHeight", label: "Cone height", min: 0.8, max: 3, step: 0.1, unit: "m", hint: "measurement — fineness ratio vs mass" },
  ],
  electronics: [
    { key: "circuitsWired", label: "Circuits wired", min: 0, max: 6, step: 1, unit: "", hint: "logic — guidance needs its buses live", safeMin: 1 },
  ],
  payloadBay: [
    { key: "payloadPods", label: "Payload pods", min: 0, max: 6, step: 1, unit: "", hint: "division — sharing cargo keeps balance" },
    { key: "payloadPerPod", label: "Mass per pod", min: 20, max: 120, step: 5, unit: "kg", hint: "multiplication — pods × mass each" },
    { key: "cgOffset", label: "CG trim", min: -0.8, max: 0.8, step: 0.05, unit: "", hint: "fractions — an uneven split pitches it over", percent: true, safeMin: -0.45, safeMax: 0.45 },
  ],
  booster: [
    { key: "boosterCount", label: "Boosters", min: 0, max: 4, step: 1, unit: "", hint: "addition — extra thrust, staged away mid-flight" },
    { key: "boosterStageT", label: "Staging timer trim", min: -1, max: 1, step: 0.05, unit: "", hint: "arithmetic — wrong timer ⇒ boosters hit the core", percent: true, safeMin: -0.25, safeMax: 0.25 },
  ],
};

function isOffSpec(spec: TuneSpec, value: number): boolean {
  if (spec.safeMin !== undefined && value < spec.safeMin) return true;
  if (spec.safeMax !== undefined && value > spec.safeMax) return true;
  return false;
}

function fmt(spec: TuneSpec, value: number): string {
  return spec.percent ? `${Math.round(value * 100)}%` : `${value}${spec.unit}`;
}

/**
 * Part Tuning panel — shared by the VAB (token economy on) and the Sandbox
 * (freePlay: no costs, no persistence rules). Wrench Time maths writes the
 * initial values; tuning adjusts them afterwards. In the VAB the first move
 * of each dial beyond the free band costs 1 spare-part token, and pushing a
 * value outside its engineering spec re-arms that failure mode.
 */
export default function TuningPanel({
  part,
  design,
  onChange,
  freePlay = false,
  spareParts = 0,
  onSpendToken,
}: {
  part: RocketPart;
  design: RocketDesign;
  onChange: (patch: Partial<RocketDesign>) => void;
  freePlay?: boolean;
  spareParts?: number;
  onSpendToken?: () => void;
}) {
  const specs = TUNING_BY_PART[part] ?? [];
  // Values when the panel opened — the free band is ±2% of range around these.
  const baseline = useRef<Partial<Record<string, number>>>({});
  const [paidFor, setPaidFor] = useState<Set<string>>(new Set());
  useMemo(() => {
    baseline.current = {};
    for (const s of specs) baseline.current[s.key as string] = design[s.key] as number;
    setPaidFor(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [part]);

  if (specs.length === 0) return null;

  const handleChange = (spec: TuneSpec, value: number) => {
    const key = spec.key as string;
    const freeBand = (spec.max - spec.min) * 0.02;
    const base = baseline.current[key] ?? value;
    const beyondFree = Math.abs(value - base) > freeBand;
    if (!freePlay && beyondFree && !paidFor.has(key)) {
      if (spareParts <= 0) return; // out of tokens — dial won't budge past the free band
      onSpendToken?.();
      setPaidFor((s) => new Set(s).add(key));
    }
    const patch: Partial<RocketDesign> = { [key]: value } as Partial<RocketDesign>;
    if (spec.key === "finCount") (patch as Record<string, unknown>).finSymmetry = value >= 3;
    if (spec.key === "circuitsWired") (patch as Record<string, unknown>).powerBalanced = value >= 1;
    onChange(patch);
  };

  return (
    <div className="hud-panel p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-cyan-300 uppercase tracking-widest">🎛 Part tuning</div>
        {!freePlay && <div className="text-[10px] text-slate-400">1 🔩 per dial · {spareParts} left</div>}
      </div>
      {specs.map((spec) => {
        const value = design[spec.key] as number;
        const offSpec = isOffSpec(spec, value);
        const key = spec.key as string;
        return (
          <div key={key}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300">{spec.label}</span>
              <span className={`font-bold tabular-nums ${offSpec ? "text-red-300" : "text-cyan-300"}`}>
                {fmt(spec, value)}
                {!freePlay && paidFor.has(key) && <span className="text-amber-300"> 🔩</span>}
              </span>
            </div>
            <input
              type="range"
              min={spec.min}
              max={spec.max}
              step={spec.step}
              value={value}
              onChange={(e) => handleChange(spec, Number(e.target.value))}
              className={`w-full ${offSpec ? "accent-red-400" : "accent-cyan-400"}`}
              aria-label={spec.label}
            />
            <div className="text-[10px] text-slate-500 mt-0.5">
              {offSpec ? <span className="text-red-400">⚠ off spec — failure mode armed · </span> : null}
              {spec.hint}
            </div>
          </div>
        );
      })}
      {!freePlay && spareParts <= 0 && (
        <div className="text-[10px] text-amber-300">Out of spare parts — dials are locked to their free band. Fly a mission to earn more.</div>
      )}
    </div>
  );
}