import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import RocketScene from "../../three/RocketScene";
import Rocket3D from "../../three/Rocket3D";
import PerformancePanel from "../../components/PerformancePanel";
import TuningPanel, { TUNING_BY_PART } from "../vab/TuningPanel";
import { useRocketState } from "../../mission/useRocketState";
import { SITE_BY_ID } from "../../mission/launchSites";
import { DEFAULT_DESIGN, type RocketDesign } from "../../three/rocketDesign";
import { simulateFlight } from "../../physics/simulateFlight";
import { STAGES } from "../../mission/stages";
import type { RocketPart } from "../../curriculum/types";

/**
 * Sandbox — free-play mirror of the VAB's Part Tuning panels (same shared
 * component, freePlay: no token costs, no mastery impact, nothing persisted).
 * Turn any dial past spec and the deterministic sim shows the consequence.
 */
export default function SandboxPage() {
  const navigate = useNavigate();
  const profile = useRocketState((s) => s.profile);
  const [design, setDesign] = useState<RocketDesign>({
    ...DEFAULT_DESIGN,
    finSymmetry: true,
    installedParts: {},
  });
  const site = SITE_BY_ID[profile?.launchSiteId ?? "canaveral"];
  const [openPart, setOpenPart] = useState<RocketPart>("engine");
  // Deterministic: same dial settings ⇒ same predicted flight, every time.
  const flight = useMemo(() => simulateFlight(design, 1), [design]);

  const parts = STAGES.map((s) => s.part).filter((p) => (TUNING_BY_PART[p] ?? []).length > 0);

  return (
    <div className="h-full flex gap-3 p-3">
      <div className="relative flex-1 rounded-2xl overflow-hidden border border-cyan-500/20 min-w-0">
        <RocketScene site={site}>
          <Rocket3D design={design} complete partLevels={profile?.partLevels} />
        </RocketScene>
        <div className="absolute top-3 left-3 hud-panel px-3 py-1.5 text-xs">🧪 Sandbox — free tuning, instant physics, no marks</div>
        <div className="absolute top-3 right-3">
          <button className="btn-ghost !px-3 !py-1 text-xs" onClick={() => navigate("/")}>← Hangar</button>
        </div>
      </div>

      <div className="w-96 shrink-0 flex flex-col gap-3 overflow-auto">
        <PerformancePanel design={design} destinationId="lowOrbit" />

        {/* Predicted outcome from the deterministic sim */}
        <div className="hud-panel p-3 space-y-1">
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

        {/* Part selector + shared tuning panel (freePlay) */}
        <div className="hud-panel p-2 flex flex-wrap gap-1.5">
          {parts.map((p) => {
            const stage = STAGES.find((s) => s.part === p)!;
            return (
              <button
                key={p}
                className={`rounded-lg px-2 py-1 text-xs border ${
                  openPart === p ? "border-cyan-400 bg-cyan-500/20 text-cyan-100" : "border-slate-700 bg-space-800/50 text-slate-400"
                }`}
                onClick={() => setOpenPart(p)}
              >
                {stage.emoji} {stage.label}
              </button>
            );
          })}
        </div>
        <TuningPanel part={openPart} design={design} onChange={(patch) => setDesign((d) => ({ ...d, ...patch }))} freePlay />
      </div>
    </div>
  );
}