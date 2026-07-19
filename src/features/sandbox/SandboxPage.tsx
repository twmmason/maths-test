import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import RocketScene from "../../three/RocketScene";
import Rocket3D from "../../three/Rocket3D";
import PerformancePanel from "../../components/PerformancePanel";
import { useRocketState } from "../../mission/useRocketState";
import { SITE_BY_ID } from "../../mission/launchSites";
import { DEFAULT_DESIGN, type RocketDesign } from "../../three/rocketDesign";
import { simulateFlight } from "../../physics/simulateFlight";

interface SliderSpec {
  key: keyof RocketDesign;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  maths: string;
}

const SLIDERS: SliderSpec[] = [
  { key: "noseAngle", label: "Nose cone tip angle", min: 20, max: 120, step: 1, unit: "°", maths: "angles & geometry — sharper cone, less drag" },
  { key: "hullHeight", label: "Hull height", min: 3, max: 12, step: 0.5, unit: "m", maths: "place value & measurement — more hull, more mass" },
  { key: "tankFill", label: "Fuel fill level", min: 0, max: 1, step: 0.05, unit: "", maths: "fractions — fill vs burn time vs weight" },
  { key: "engineCount", label: "Engines", min: 1, max: 6, step: 1, unit: "", maths: "multiplication — engines × thrust each" },
  { key: "thrustPerEngine", label: "Thrust per engine", min: 80, max: 400, step: 10, unit: "kN", maths: "number facts — total thrust at liftoff" },
  { key: "finCount", label: "Fins", min: 0, max: 6, step: 1, unit: "", maths: "symmetry — 3+ symmetric fins keep it stable" },
  { key: "boosterCount", label: "Boosters", min: 0, max: 4, step: 1, unit: "", maths: "addition — extra thrust, staged away mid-flight" },
  { key: "payloadPods", label: "Payload pods", min: 0, max: 6, step: 1, unit: "", maths: "division — sharing cargo keeps balance" },
];

/** Crash Lab dials — deliberately mis-configure and watch the physics respond.
 *  Pure curiosity play: nothing here touches mastery or the database. */
const CRASH_DIALS: SliderSpec[] = [
  { key: "finAngle", label: "Fin cant angle", min: -12, max: 12, step: 0.5, unit: "°", maths: "angles — past ±4° the fins shear off at max-Q" },
  { key: "fuelRatio", label: "Oxidiser:fuel ratio", min: 0.5, max: 5, step: 0.1, unit: ":1", maths: "ratio — rich (>3.5) fireballs, lean (<1.6) flames out" },
  { key: "engineGimbalOffset", label: "Engine gimbal offset", min: -8, max: 8, step: 0.25, unit: "°", maths: "angles — thrust off-vertical veers the trajectory" },
  { key: "hullIntegrity", label: "Hull integrity", min: 0.1, max: 1, step: 0.05, unit: "", maths: "multiplication — too few bolts ⇒ breakup at max-Q" },
  { key: "boosterStageT", label: "Staging timer error", min: -1, max: 1, step: 0.05, unit: "", maths: "arithmetic — wrong timer ⇒ boosters hit the core" },
  { key: "cgOffset", label: "Payload CG offset", min: -0.8, max: 0.8, step: 0.05, unit: "", maths: "fractions — an uneven mass split pitches it over" },
];

export default function SandboxPage() {
  const navigate = useNavigate();
  const profile = useRocketState((s) => s.profile);
  const [design, setDesign] = useState<RocketDesign>({
    ...DEFAULT_DESIGN,
    finSymmetry: true,
    installedParts: {},
  });
  const site = SITE_BY_ID[profile?.launchSiteId ?? "canaveral"];
  const [crashLab, setCrashLab] = useState(false);
  // Deterministic: same dial settings ⇒ same predicted flight, every time.
  const flight = useMemo(() => simulateFlight(design, 1), [design]);

  return (
    <div className="h-full flex gap-3 p-3">
      <div className="relative flex-1 rounded-2xl overflow-hidden border border-cyan-500/20 min-w-0">
        <RocketScene site={site}>
          <Rocket3D design={design} complete partLevels={profile?.partLevels} />
        </RocketScene>
        <div className="absolute top-3 left-3 hud-panel px-3 py-1.5 text-xs">🧪 Sandbox — free design, instant physics</div>
        <div className="absolute top-3 right-3">
          <button className="btn-ghost !px-3 !py-1 text-xs" onClick={() => navigate("/")}>← Hangar</button>
        </div>
      </div>

      <div className="w-96 shrink-0 flex flex-col gap-3 overflow-auto">
        <PerformancePanel design={design} destinationId="lowOrbit" />
        <div className="hud-panel p-4 space-y-4">
          <div className="text-xs text-slate-400 uppercase tracking-widest">Design parameters</div>
          {SLIDERS.map((s) => (
            <div key={s.key as string}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">{s.label}</span>
                <span className="text-cyan-300 font-bold tabular-nums">
                  {s.key === "tankFill"
                    ? `${Math.round((design[s.key] as number) * 100)}%`
                    : `${design[s.key]}${s.unit}`}
                </span>
              </div>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={design[s.key] as number}
                onChange={(e) =>
                  setDesign((d) => ({
                    ...d,
                    [s.key]: Number(e.target.value),
                    ...(s.key === "finCount" ? { finSymmetry: Number(e.target.value) >= 3 } : {}),
                  }))
                }
                className="w-full accent-cyan-400"
                aria-label={s.label}
              />
              <div className="text-[10px] text-slate-500 mt-0.5">{s.maths}</div>
            </div>
          ))}
        </div>

        {/* ── Crash Lab ── */}
        <div className="hud-panel p-4 space-y-4 border-red-400/30">
          <button className="w-full flex items-center justify-between text-left" onClick={() => setCrashLab(!crashLab)}>
            <span className="text-xs text-red-300 uppercase tracking-widest">💥 Crash Lab — break it on purpose</span>
            <span className="text-slate-500 text-xs">{crashLab ? "▲" : "▼"}</span>
          </button>
          {crashLab && (
            <>
              <p className="text-[11px] text-slate-500">
                Turn the dials past spec and see exactly how the physics bites back. Safe science: no mission, no marks, nobody hurt.
              </p>
              {CRASH_DIALS.map((s) => (
                <div key={s.key as string}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{s.label}</span>
                    <span className="text-red-300 font-bold tabular-nums">
                      {s.key === "hullIntegrity" || s.key === "cgOffset" || s.key === "boosterStageT"
                        ? `${Math.round((design[s.key] as number) * 100)}%`
                        : `${design[s.key]}${s.unit}`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={design[s.key] as number}
                    onChange={(e) => setDesign((d) => ({ ...d, [s.key]: Number(e.target.value) }))}
                    className="w-full accent-red-400"
                    aria-label={s.label}
                  />
                  <div className="text-[10px] text-slate-500 mt-0.5">{s.maths}</div>
                </div>
              ))}
              {/* Predicted outcome from the deterministic sim */}
              <div className="rounded-lg border border-slate-700 bg-space-800/60 p-3 space-y-1">
                <div className="text-[10px] text-slate-400 uppercase tracking-widest">Predicted flight</div>
                <div
                  className={`text-sm font-black ${
                    flight.outcome === "nominal"
                      ? "text-emerald-300"
                      : flight.outcome === "degraded"
                        ? "text-amber-300"
                        : "text-red-300"
                  }`}
                >
                  {flight.outcome === "nominal" && "🟢 NOMINAL — she flies straight and true"}
                  {flight.outcome === "degraded" && "🟡 DEGRADED — she flies, but she's not happy"}
                  {flight.outcome === "lostVehicle" && "💥 VEHICLE LOST — spectacular"}
                  {flight.outcome === "padAbort" && "🚨 PAD ABORT — she never leaves the ground"}
                </div>
                <div className="text-xs text-slate-400">Peak altitude: {Math.round(flight.maxAltitudeKm)} km</div>
                {flight.failures.map((f) => (
                  <div key={f.t + f.label} className="text-[11px] text-red-300">⚠️ T+{Math.round(f.t)}s — {f.label}</div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
