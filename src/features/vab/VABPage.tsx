import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import RocketScene from "../../three/RocketScene";
import Rocket3D, { focusHeightFor } from "../../three/Rocket3D";
import PartsTray from "./PartsTray";
import StagePanel from "./StagePanel";
import InstallSequence from "./InstallSequence";
import TuningPanel from "./TuningPanel";
import MissionCamera from "../../components/MissionCamera";
import PerformancePanel from "../../components/PerformancePanel";
import MissionTargetsPanel from "../../components/MissionTargetsPanel";
import TaskRenderer from "../../components/TaskRenderer";
import { useRocketState } from "../../mission/useRocketState";
import { SITE_BY_ID } from "../../mission/launchSites";
import { DESTINATION_BY_ID } from "../../mission/destinations";
import { STAGES, REQUIRED_PARTS } from "../../mission/stages";
import { generateChecklist } from "../../engine/templates/checklist";
import { createRng, randomSeed } from "../../engine/rng";
import { computePerformance } from "../../physics/computePerformance";
import { sfx } from "../../mission/sound";
import { isDebugMode } from "../../debug";
import type { RocketPart } from "../../curriculum/types";

export default function VABPage() {
  const navigate = useNavigate();
  const profile = useRocketState((s) => s.profile);
  const design = useRocketState((s) => s.design);
  const destinationId = useRocketState((s) => s.destinationId);
  const selectedPart = useRocketState((s) => s.selectedPart);
  const selectPart = useRocketState((s) => s.selectPart);
  const installingPart = useRocketState((s) => s.installingPart);
  const setInstallingPart = useRocketState((s) => s.setInstallingPart);
  const updateDesign = useRocketState((s) => s.updateDesign);
  const adjustSpareParts = useRocketState((s) => s.adjustSpareParts);
  const resetBuild = useRocketState((s) => s.resetBuild);
  const debugCertifyAll = useRocketState((s) => s.debugCertifyAll);
  const [preflight, setPreflight] = useState(false);
  const debug = isDebugMode();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const site = SITE_BY_ID[profile?.launchSiteId ?? "canaveral"];
  const dest = DESTINATION_BY_ID[destinationId];

  const attached = Object.keys(design.installedParts) as RocketPart[];
  const allCertified = attached.length > 0 && attached.every((p) => design.installedParts[p]?.certified);
  const missingRequired = REQUIRED_PARTS.filter((p) => !design.installedParts[p]);
  const readyForPreflight = debug || (allCertified && missingRequired.length === 0);
  const perf = computePerformance(design);

  return (
    <div className="h-full flex gap-3 p-3">
      {/* Parts tray */}
      <div className="w-72 shrink-0">
        <PartsTray />
      </div>

      {/* 3D viewport + certification board */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        <div className="relative flex-1 rounded-2xl overflow-hidden border border-cyan-500/20">
          <RocketScene
            site={site}
            focusY={selectedPart ? focusHeightFor(selectedPart, design) : null}
            onCanvasReady={(c) => (canvasRef.current = c)}
          >
            <Rocket3D
              design={design}
              interactive
              partLevels={profile?.partLevels}
              selectedPart={selectedPart}
              onSelectPart={(p) => selectPart(p)}
            />
          </RocketScene>
          <div className="absolute top-3 left-3 hud-panel px-3 py-1.5 text-xs">
            🏗️ Vehicle Assembly Building — mission to {dest?.emoji} {dest?.name}
          </div>
          <div className="absolute top-3 right-3 flex gap-2">
            <button className="btn-ghost !px-3 !py-1 text-xs" onClick={() => navigate("/")}>← Hangar</button>
            <button
              className="btn-ghost !px-3 !py-1 text-xs"
              onClick={() => {
                if (confirm("Clear the whole build and start fresh?")) void resetBuild();
              }}
            >
              🧹 Clear build
            </button>
          </div>
          <MissionCamera
            getCanvas={() => canvasRef.current}
            siteName={site.name}
            siteTerrain={site.terrain}
            pillClassName="absolute bottom-3 right-3 z-30"
          />
        </div>

        {/* Certification board */}
        <div className="hud-panel px-3 py-2 flex items-center gap-2 overflow-x-auto">
          {STAGES.map((s) => {
            const inst = design.installedParts[s.part];
            const active = selectedPart === s.part;
            return (
              <button
                key={s.part}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs border transition ${
                  active
                    ? "border-cyan-400 bg-cyan-500/20 animate-pulse-slow"
                    : inst?.certified
                      ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                      : inst
                        ? "border-amber-400/50 bg-amber-500/10 text-amber-200"
                        : "border-slate-700 bg-space-800/50 text-slate-500"
                }`}
                onClick={() => {
                  selectPart(s.part);
                  // Attached part ⇒ open its Wrench Time installation sequence.
                  if (inst) setInstallingPart(s.part);
                }}
                title={inst && !inst.certified ? "Continue installation" : inst ? "Re-open installation" : "Attach from the parts tray first"}
              >
                {s.emoji} {s.label} {inst?.certified ? "✅" : inst ? "🔧" : "⬜"}
              </button>
            );
          })}
          <div className="ml-auto shrink-0">
            <button
              className={`text-xs font-bold rounded-lg px-3 py-1.5 ${
                readyForPreflight
                  ? "bg-emerald-500/20 border border-emerald-400 text-emerald-200 shadow-glow"
                  : "bg-space-800 border border-slate-700 text-slate-500"
              }`}
              disabled={!readyForPreflight}
              title={
                missingRequired.length > 0
                  ? `Still needed: ${missingRequired.join(", ")}`
                  : allCertified
                    ? "All systems certified"
                    : "Certify every attached part first"
              }
              onClick={() => {
                sfx.snap();
                // Debug: straight to the pad — no checklist maths.
                if (debug) navigate("/launch");
                else setPreflight(true);
              }}
            >
              ✅ Pre-flight →
            </button>
          </div>
        </div>
      </div>

      {/* Right column */}
      <div className="w-96 shrink-0 flex flex-col gap-3 overflow-auto">
        {debug && (
          <div className="hud-panel px-3 py-2 text-xs space-y-2 !border-amber-400/60">
            <div className="text-amber-300 font-bold">🐞 Debug mode <span className="font-normal text-slate-400">(?debug=off to disable)</span></div>
            <button
              className="btn-ghost w-full !py-1 text-xs justify-center !border-amber-400/40"
              onClick={() => void debugCertifyAll()}
            >
              ✅ Certify all attached parts
            </button>
            <div className="text-[10px] text-slate-400">Pre-flight launches instantly — no checklist, no required-parts gate.</div>
          </div>
        )}
        <PerformancePanel design={design} destinationId={destinationId} />
        {profile && (
          <MissionTargetsPanel profileId={profile.id} destinationId={destinationId} design={design} mode="next" />
        )}
        {selectedPart && design.installedParts[selectedPart] && (
          <>
            {!design.installedParts[selectedPart]?.certified && (
              <div className="hud-panel px-3 py-2 text-xs text-amber-300">
                🔧 {selectedPart} is installed but not certified yet —{" "}
                <button className="underline text-amber-200" onClick={() => setInstallingPart(selectedPart)}>
                  finish Wrench Time
                </button>{" "}
                to certify it.
              </div>
            )}
            <TuningPanel
              part={selectedPart}
              design={design}
              onChange={(patch) => updateDesign(patch)}
              spareParts={profile?.spareParts ?? 0}
              onSpendToken={() => void adjustSpareParts(-1)}
            />
          </>
        )}
        <StagePanel />
        {!perf.flightReady && attached.length > 0 && (
          <div className="hud-panel p-3 text-xs text-amber-300">
            ⚠️ The performance board shows what needs attention before this design can fly.
          </div>
        )}
      </div>

      {installingPart && <InstallSequence part={installingPart} onClose={() => setInstallingPart(null)} />}
      {preflight && <PreflightModal onDone={() => navigate("/launch")} onClose={() => setPreflight(false)} />}
    </div>
  );
}

function PreflightModal({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [ticks, setTicks] = useState<boolean[]>([]);
  const tasks = useMemo(() => generateChecklist(createRng(randomSeed()), 5), []);
  const current = tasks[index];

  return (
    <div className="fixed inset-0 z-40 bg-space-950/85 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="hud-panel p-5 max-w-lg w-full">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-cyan-200 neon">🚦 Pre-flight checklist</h2>
          <button className="btn-ghost !px-3 !py-1 text-sm" onClick={onClose}>✕</button>
        </div>
        {/* Tick list */}
        <div className="flex gap-1.5 mb-4">
          {tasks.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-2 rounded-full transition ${
                i < index ? (ticks[i] ? "bg-emerald-400" : "bg-amber-400") : i === index ? "bg-cyan-400 animate-pulse" : "bg-space-700"
              }`}
            />
          ))}
        </div>
        {current ? (
          <TaskRenderer
            key={current.id}
            task={current}
            onFinished={(res) => {
              sfx.snap();
              useRocketState.setState((s) => ({
                tasksTotal: s.tasksTotal + 1,
                tasksCorrect: s.tasksCorrect + (res.correct && res.firstTry ? 1 : 0),
              }));
              setTicks((t) => [...t, res.correct]);
              if (index + 1 >= tasks.length) {
                onDone();
              } else {
                setIndex(index + 1);
              }
            }}
          />
        ) : null}
      </div>
    </div>
  );
}