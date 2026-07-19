import { useState } from "react";
import { useNavigate } from "react-router-dom";
import RocketScene from "../../three/RocketScene";
import Rocket3D from "../../three/Rocket3D";
import PerformancePanel from "../../components/PerformancePanel";
import { useRocketState } from "../../mission/useRocketState";
import { SITE_BY_ID } from "../../mission/launchSites";
import { DEFAULT_DESIGN, type RocketDesign } from "../../three/rocketDesign";

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

export default function SandboxPage() {
  const navigate = useNavigate();
  const profile = useRocketState((s) => s.profile);
  const [design, setDesign] = useState<RocketDesign>({
    ...DEFAULT_DESIGN,
    finSymmetry: true,
    installedParts: {},
  });
  const site = SITE_BY_ID[profile?.launchSiteId ?? "canaveral"];

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
      </div>
    </div>
  );
}