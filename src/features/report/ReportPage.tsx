import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import RocketScene from "../../three/RocketScene";
import Rocket3D from "../../three/Rocket3D";
import ViewSwitcher from "../../components/ViewSwitcher";
import { useRocketState } from "../../mission/useRocketState";
import { SITE_BY_ID } from "../../mission/launchSites";
import { DESTINATION_BY_ID } from "../../mission/destinations";
import { CRITERIA_BY_CODE } from "../../curriculum/criteria";
import { STAGE_BY_PART } from "../../mission/stages";
import { PATCH_BY_ID } from "../../mission/patches";
import { narrateDebrief } from "../../ai/debrief";
import { deriveFailurePlan, type PlannedFailure } from "../../physics/failureModes";
import { gradeForError } from "../../three/rocketDesign";
import { db } from "../../db/db";
import type { RocketPart } from "../../curriculum/types";

function TrajectoryPlot({ samples, events }: { samples: { t: number; altitude: number }[]; events: { t: number; label: string }[] }) {
  const w = 340;
  const h = 120;
  const maxT = Math.max(...samples.map((s) => s.t), 1);
  const maxA = Math.max(...samples.map((s) => s.altitude), 1);
  const pts = samples.map((s) => `${(s.t / maxT) * w},${h - (s.altitude / maxA) * (h - 10)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h + 16}`} className="w-full">
      <polyline points={pts} fill="none" stroke="#22d3ee" strokeWidth="2" />
      {events.map((e, i) => {
        const x = (e.t / maxT) * w;
        return (
          <g key={i}>
            <line x1={x} y1={0} x2={x} y2={h} stroke="#f59e0b55" strokeDasharray="3 3" />
            <text x={Math.min(x + 2, w - 60)} y={12 + (i % 3) * 12} fill="#fbbf24" fontSize="8">
              {e.label}
            </text>
          </g>
        );
      })}
      <text x={2} y={h + 12} fill="#64748b" fontSize="8">T+0s</text>
      <text x={w - 40} y={h + 12} fill="#64748b" fontSize="8">T+{Math.round(maxT)}s</text>
    </svg>
  );
}

export default function ReportPage() {
  const navigate = useNavigate();
  const profile = useRocketState((s) => s.profile);
  const design = useRocketState((s) => s.design);
  const flight = useRocketState((s) => s.lastFlight);
  const missionId = useRocketState((s) => s.lastMissionId);
  const newPatches = useRocketState((s) => s.lastNewPatches);
  const destinationId = useRocketState((s) => s.destinationId);
  const tasksCorrect = useRocketState((s) => s.tasksCorrect);
  const tasksTotal = useRocketState((s) => s.tasksTotal);
  const completedTasks = useRocketState((s) => s.completedTasks);
  const [debrief, setDebrief] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const site = SITE_BY_ID[profile?.launchSiteId ?? "canaveral"];
  const dest = DESTINATION_BY_ID[destinationId];
  const reached = !!flight && flight.maxAltitudeKm >= (dest?.requiredAltitudeKm ?? 150);

  const selectPart = useRocketState((s) => s.selectPart);
  const setInstallingPart = useRocketState((s) => s.setInstallingPart);

  useEffect(() => {
    if (!flight) navigate("/");
  }, [flight, navigate]);

  // Crash investigation: re-derive the deterministic failure plan and keep
  // the entries that actually fired during THIS flight (matched by stepId).
  const anomalies = useMemo<PlannedFailure[]>(() => {
    if (!flight || flight.failures.length === 0) return [];
    const plan = deriveFailurePlan(design);
    const firedSteps = new Set(flight.failures.map((f) => f.stepId).filter(Boolean));
    const matched = plan.filter((p) => firedSteps.has(p.stepId));
    return matched.length > 0 ? matched : plan.filter((p) => p.severity === "failure" || p.severity === "catastrophic");
  }, [flight, design]);

  // Quality grades per install step — revealed only AFTER launch, here.
  const installGrades = useMemo(() => {
    const rows: { part: RocketPart; stepId: string; grade: "A" | "B" | "C" | "D"; skipped: boolean; actual: number; target: number; criterionCode: string }[] = [];
    for (const [part, inst] of Object.entries(design.installedParts)) {
      for (const s of inst?.install?.steps ?? []) {
        rows.push({
          part: part as RocketPart,
          stepId: s.stepId,
          grade: gradeForError(s.errorPct),
          skipped: !!s.skipped,
          actual: s.actual,
          target: s.target,
          criterionCode: s.criterionCode,
        });
      }
    }
    return rows;
  }, [design]);

  useEffect(() => {
    if (!flight) return;
    let live = true;
    void narrateDebrief({
      destinationName: dest?.name ?? "Low Orbit",
      siteName: site?.name,
      tasksCorrect,
      tasksTotal,
      maxAltitudeKm: Math.round(flight.maxAltitudeKm),
      reachedDestination: reached,
      events: flight.events.map((e) => e.label),
      struggledOffPad: flight.struggledOffPad,
      tumbled: flight.tumbled,
      outcome: flight.outcome,
      anomalies: anomalies.map((a) => ({
        part: STAGE_BY_PART[a.partAtFault]?.label ?? a.partAtFault,
        step: a.stepId,
        playerValue: a.playerValue,
        targetValue: a.targetValue,
        explanation: a.explanation,
      })),
    }).then((text) => live && setDebrief(text));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flight]);

  const mathsUsed = useMemo(() => {
    const rows: { part: RocketPart; codes: string[] }[] = [];
    for (const [part, codes] of Object.entries(completedTasks)) {
      if (codes && codes.length) rows.push({ part: part as RocketPart, codes });
    }
    return rows;
  }, [completedTasks]);

  if (!flight) return null;

  return (
    <div className="h-full overflow-auto p-4">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-4">
        {/* Left: rocket + camera */}
        <div className="space-y-3">
          <div className="relative h-72 rounded-2xl overflow-hidden border border-cyan-500/20">
            <RocketScene site={site} autoRotate cameraDistance={15} onCanvasReady={(c) => (canvasRef.current = c)}>
              <Rocket3D design={design} complete partLevels={profile?.partLevels} />
            </RocketScene>
            <div className="absolute bottom-3 left-3 z-10">
              <ViewSwitcher
                getCanvas={() => canvasRef.current}
                siteName={site?.name ?? "the launch site"}
                onPhoto={(dataUrl) => {
                  if (missionId != null) {
                    void db.missions.get(missionId).then((m) => {
                      if (m) void db.missions.update(missionId, { photos: [...(m.photos ?? []), dataUrl] });
                    });
                  }
                }}
              />
            </div>
          </div>
          {flight.screenshot && (
            <div className="hud-panel p-3">
              <div className="text-xs text-slate-400 mb-2 uppercase tracking-widest">Mission photo — moment of launch</div>
              <img src={flight.screenshot} alt="Launch" className="rounded-lg w-full" />
            </div>
          )}
        </div>

        {/* Right: report */}
        <div className="space-y-3">
          <div className="hud-panel p-4">
            <h1 className="text-xl font-black text-cyan-200 neon mb-1">
              {flight.outcome === "lostVehicle" || flight.outcome === "padAbort" ? "🕵️ Crash investigation" : "📋 After-action report"}
            </h1>
            <div className="text-sm text-slate-300">
              {dest?.emoji} {dest?.name} from {site?.name} — peak{" "}
              <span className="text-cyan-300 font-bold">{Math.round(flight.maxAltitudeKm).toLocaleString("en-GB")} km</span> —{" "}
              {reached ? <span className="text-emerald-300">destination reached ✅</span> : <span className="text-amber-300">a strong climb 🌤</span>}
            </div>
            <div className="text-sm text-slate-300 mt-1">
              Engineering tasks locked in first time: <span className="font-bold text-cyan-300">{tasksCorrect}</span> of {tasksTotal}
            </div>
          </div>

          <div className="hud-panel p-4">
            <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">🎙 Flight Director</div>
            <p className="text-sm text-slate-200 italic leading-relaxed">
              {debrief ?? <span className="text-slate-500">Mission Control is preparing the debrief…</span>}
            </p>
          </div>

          {/* ── Anomaly board: which bolt, which maths ── */}
          {anomalies.length > 0 && (
            <div className="hud-panel p-4 border-red-400/40">
              <div className="text-xs text-red-300 uppercase tracking-widest mb-2">🚨 Anomaly board — what went wrong, and which maths fixes it</div>
              <div className="space-y-3">
                {anomalies.map((a) => {
                  const stage = STAGE_BY_PART[a.partAtFault];
                  const step = design.installedParts[a.partAtFault]?.install?.steps.find((s) => s.stepId === a.stepId);
                  return (
                    <div key={a.stepId + a.mode} className="rounded-lg border border-red-500/30 bg-red-950/20 p-3 space-y-1.5">
                      <div className="text-sm font-bold text-red-200">
                        {stage?.emoji} {stage?.label} — <span className="font-mono text-xs">{a.stepId}</span>
                        {step?.skipped && <span className="ml-2 text-[10px] text-amber-300">⚠️ inspection was skipped</span>}
                      </div>
                      {a.playerValue !== undefined && a.targetValue !== undefined && (
                        <div className="text-xs text-slate-300">
                          Your setting: <b className="text-red-300">{a.playerValue}</b> · engineering spec: <b className="text-emerald-300">{a.targetValue}</b>
                          {step && <span className="ml-2 text-slate-500">({CRITERIA_BY_CODE[step.criterionCode]?.description ?? step.criterionCode})</span>}
                        </div>
                      )}
                      <div className="text-xs text-slate-400 italic">{a.explanation}</div>
                      <button
                        className="btn-amber !px-3 !py-1 text-xs"
                        onClick={() => {
                          selectPart(a.partAtFault);
                          setInstallingPart(a.partAtFault);
                          navigate("/vab");
                        }}
                      >
                        🔧 Return to VAB — fix it
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Quality grades per install step (revealed only after flight) ── */}
          {installGrades.length > 0 && (
            <div className="hud-panel p-4">
              <div className="text-xs text-slate-400 uppercase tracking-widest mb-2">🔍 Installation quality — graded by the inspectors</div>
              <div className="grid grid-cols-1 gap-1">
                {installGrades.map((g) => (
                  <div key={g.stepId} className="flex items-center gap-2 text-xs">
                    <span
                      className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center font-black border ${
                        g.skipped
                          ? "border-slate-600 text-slate-500"
                          : g.grade === "A"
                            ? "border-emerald-400 text-emerald-300"
                            : g.grade === "B"
                              ? "border-cyan-400 text-cyan-300"
                              : g.grade === "C"
                                ? "border-amber-400 text-amber-300"
                                : "border-red-400 text-red-300"
                      }`}
                    >
                      {g.skipped ? "–" : g.grade}
                    </span>
                    <span className="text-slate-300">
                      {STAGE_BY_PART[g.part]?.emoji} <span className="font-mono">{g.stepId}</span>
                      {g.skipped ? (
                        <span className="text-amber-300 ml-1">inspection skipped — not checked before flight</span>
                      ) : (
                        <span className="text-slate-500 ml-1">set {g.actual} · spec {g.target}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="hud-panel p-4">
            <div className="text-xs text-slate-400 uppercase tracking-widest mb-2">📈 Flight replay — altitude vs time</div>
            <TrajectoryPlot samples={flight.samples} events={flight.events} />
            {flight.struggledOffPad && <p className="text-xs text-amber-300 mt-1">Slow off the pad — more thrust or less mass next time.</p>}
            {flight.tumbled && <p className="text-xs text-amber-300 mt-1">Tumbled in flight — symmetrical fins keep it straight.</p>}
          </div>

          {mathsUsed.length > 0 && (
            <div className="hud-panel p-4">
              <div className="text-xs text-slate-400 uppercase tracking-widest mb-2">🧠 The maths that flew this mission</div>
              <div className="space-y-1.5">
                {mathsUsed.map(({ part, codes }) => (
                  <div key={part} className="text-xs text-slate-300">
                    <span className="mr-1">{STAGE_BY_PART[part]?.emoji}</span>
                    <span className="text-cyan-300 font-semibold">{STAGE_BY_PART[part]?.label}:</span>{" "}
                    {codes.map((c) => CRITERIA_BY_CODE[c]?.description ?? c).join(" · ")}
                  </div>
                ))}
              </div>
            </div>
          )}

          {newPatches.length > 0 && (
            <div className="hud-panel p-4 border-amber-400/40">
              <div className="text-xs text-amber-300 uppercase tracking-widest mb-2">🏅 New mission patches</div>
              <div className="flex flex-wrap gap-2">
                {newPatches.map((id) => (
                  <span key={id} className="text-xs bg-amber-500/15 border border-amber-400/40 rounded-full px-3 py-1 text-amber-200">
                    {PATCH_BY_ID[id]?.emoji} {PATCH_BY_ID[id]?.name ?? id}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button className="btn-primary flex-1 justify-center" onClick={() => navigate("/")}>🏠 Back to the Hangar</button>
            <button className="btn-ghost flex-1 justify-center" onClick={() => navigate("/flightlog")}>📡 Flight Log</button>
          </div>
        </div>
      </div>
    </div>
  );
}