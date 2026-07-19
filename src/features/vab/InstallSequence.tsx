import { useMemo, useState } from "react";
import type { RocketPart } from "../../curriculum/types";
import { useRocketState } from "../../mission/useRocketState";
import { STAGE_BY_PART } from "../../mission/stages";
import { installStepsFor, evaluateInstallAnswer, buildStepResult, type InstallStep } from "../../mission/installPlan";
import { generateTask } from "../../engine";
import { randomSeed } from "../../engine/rng";
import { CRITERIA_BY_CODE } from "../../curriculum/criteria";
import { WIDGETS } from "../../components/TaskRenderer";
import { sfx } from "../../mission/sound";

const KIND_BADGE: Record<string, { label: string; cls: string }> = {
  fit: { label: "FIT", cls: "border-cyan-400/50 text-cyan-300" },
  torque: { label: "TORQUE / SET", cls: "border-amber-400/50 text-amber-300" },
  connect: { label: "CONNECT", cls: "border-violet-400/50 text-violet-300" },
  inspect: { label: "INSPECT", cls: "border-emerald-400/50 text-emerald-300" },
};

const SUBMIT_LABEL: Record<string, string> = {
  fit: "🔩 Fit it",
  torque: "🔧 Torque to this value",
  connect: "🔌 Connect it",
  inspect: "📋 Sign it off",
};

/**
 * Wrench Time — the installation sequence for a part. Every step's maths
 * answer is WRITTEN into the RocketDesign (never checked live): the torque
 * wrench clicks, the gauge settles wherever the player set it. Wrong maths
 * builds a wrong rocket — and the launch shows it.
 */
export default function InstallSequence({ part, onClose }: { part: RocketPart; onClose: () => void }) {
  const design = useRocketState((s) => s.design);
  const partPlans = useRocketState((s) => s.partPlans);
  const profile = useRocketState((s) => s.profile);
  const recordAttempt = useRocketState((s) => s.recordAttempt);
  const completeTask = useRocketState((s) => s.completeTask);
  const commitInstallStep = useRocketState((s) => s.commitInstallStep);
  const adjustSpareParts = useRocketState((s) => s.adjustSpareParts);

  const plan = partPlans[part];
  const steps = useMemo(() => installStepsFor(part, plan), [part, plan]);
  const installed = design.installedParts[part];
  const alreadyDone = new Set(installed?.install?.steps.map((s) => s.stepId) ?? []);
  const wasCertified = installed?.certified ?? false;

  // Resume mid-sequence if some steps are already done (fresh install only).
  const firstPending = steps.findIndex((s) => !alreadyDone.has(s.spec.stepId));
  const [index, setIndex] = useState(wasCertified ? -1 : Math.max(0, firstPending));
  const [seed, setSeed] = useState(() => randomSeed());
  const [fiction, setFiction] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const spareParts = profile?.spareParts ?? 10;

  const stage = STAGE_BY_PART[part];
  const step: InstallStep | undefined = index >= 0 ? steps[index] : undefined;
  const task = useMemo(() => {
    if (!step) return null;
    try {
      return generateTask(step.criterionCode, step.tier, seed);
    } catch {
      return null;
    }
  }, [step?.criterionCode, step?.tier, seed]); // eslint-disable-line react-hooks/exhaustive-deps

  const finishStep = () => {
    setFiction(null);
    setValue("");
    setSeed(randomSeed());
    if (index >= 0 && index + 1 < steps.length && !wasCertified) {
      setIndex(index + 1);
    } else if (wasCertified) {
      setIndex(-1);
    } else {
      sfx.correct();
      onClose();
    }
  };

  const submit = async (raw: string, skipped = false) => {
    if (!step || !task) return;
    const evaluation = evaluateInstallAnswer(task, raw || "0");
    const result = buildStepResult(step, evaluation, skipped);
    // 1. The answer IS the configuration — write it into the design.
    const patch = skipped ? {} : step.spec.apply(design, evaluation.signedError);
    await commitInstallStep(part, result, patch);
    // 2. Mastery pipeline: attempts + certification progress recorded as ever.
    if (!skipped) await recordAttempt(step.criterionCode, step.tier, evaluation.withinSpec, 0);
    await completeTask(part, step.criterionCode, !skipped && evaluation.withinSpec);
    // 3. Flawless installs refund a spare-part token.
    if (!skipped && evaluation.errorPct === 0) void adjustSpareParts(1);
    // In-fiction feedback ONLY — never "right/wrong".
    sfx.snap();
    setFiction(
      skipped
        ? "Inspection skipped — the clipboard goes back on its hook. Fingers crossed, Commander."
        : `${step.spec.tool}${Number.isFinite(evaluation.actual) ? ` Reading: ${evaluation.actual}.` : ""}`,
    );
  };

  const redoStep = () => {
    if (spareParts < 1) return;
    void adjustSpareParts(-1);
    setFiction(null);
    setValue("");
    setSeed(randomSeed());
  };

  // ── Completed-install view (re-open to re-do individual steps) ──
  if (index < 0) {
    const results = installed?.install?.steps ?? [];
    return (
      <Modal onClose={onClose} title={`🔧 Wrench Time — ${stage.emoji} ${stage.label}`}>
        <p className="text-xs text-slate-400 mb-3">
          Installation complete. You can re-do any step with fresh numbers — it costs <b className="text-amber-300">1 spare part</b> (you have {spareParts} 🔩).
        </p>
        <div className="space-y-2">
          {steps.map((s, i) => {
            const r = results.find((x) => x.stepId === s.spec.stepId);
            return (
              <div key={s.spec.stepId} className="flex items-center justify-between rounded-lg border border-slate-700 bg-space-800/60 px-3 py-2">
                <div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border mr-2 ${KIND_BADGE[s.spec.kind].cls}`}>{KIND_BADGE[s.spec.kind].label}</span>
                  <span className="text-xs text-slate-200">{s.spec.label}</span>
                  {r?.skipped && <span className="ml-2 text-[10px] text-amber-300">inspection skipped</span>}
                </div>
                <button
                  className="btn-ghost !px-2 !py-1 text-[11px]"
                  disabled={spareParts < 1}
                  onClick={() => {
                    if (spareParts < 1) return;
                    void adjustSpareParts(-1);
                    setSeed(randomSeed());
                    setIndex(i);
                  }}
                >
                  ↩ Re-do (−1 🔩)
                </button>
              </div>
            );
          })}
        </div>
        <button className="btn-primary w-full justify-center mt-4 text-sm" onClick={onClose}>Close panel</button>
      </Modal>
    );
  }

  if (!step || !task) {
    return (
      <Modal onClose={onClose} title={`🔧 Wrench Time — ${stage.emoji} ${stage.label}`}>
        <p className="text-sm text-slate-400">No installation steps queued for this part.</p>
        <button className="btn-primary w-full justify-center mt-3 text-sm" onClick={onClose}>Close</button>
      </Modal>
    );
  }

  const Widget = WIDGETS[task.visual.widget as keyof typeof WIDGETS];
  const criterion = CRITERIA_BY_CODE[step.criterionCode];
  const badge = KIND_BADGE[step.spec.kind];

  return (
    <Modal onClose={onClose} title={`🔧 Wrench Time — ${stage.emoji} ${stage.label}`}>
      {/* Step progress */}
      <div className="flex gap-1.5 mb-3">
        {steps.map((s, i) => (
          <div
            key={s.spec.stepId}
            className={`flex-1 h-2 rounded-full ${
              i < index || alreadyDone.has(s.spec.stepId) && i !== index ? "bg-cyan-400" : i === index ? "bg-amber-400 animate-pulse" : "bg-space-700"
            }`}
            title={s.spec.label}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 mb-1">
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badge.cls}`}>{badge.label}</span>
        <span className="text-sm font-bold text-slate-100">{step.spec.label}</span>
        <span className="ml-auto text-[10px] text-slate-500">step {index + 1} of {steps.length} · 🔩 {spareParts}</span>
      </div>
      {criterion && <div className="text-[11px] text-slate-500 mb-2">{criterion.description}</div>}

      {fiction ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-cyan-500/30 bg-space-800/80 px-3 py-2 text-sm text-cyan-100 italic">⚙️ {fiction}</div>
          <div className="text-[11px] text-slate-500">
            The gauge shows what you set — the launch will show whether it was right. Sharp-eyed engineers can re-do a step before flight.
          </div>
          <div className="flex gap-2">
            <button
              className="btn-ghost flex-1 justify-center text-xs"
              disabled={spareParts < 1}
              title={spareParts < 1 ? "No spare parts left" : "Re-do with fresh numbers"}
              onClick={redoStep}
            >
              ↩ Re-do this step (−1 🔩)
            </button>
            <button className="btn-primary flex-1 justify-center text-sm" onClick={finishStep}>
              {index + 1 < steps.length && !wasCertified ? "Next step →" : "Finish installation ✓"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[15px] leading-relaxed text-slate-100">{task.briefing}</p>
          <p className="text-xs text-cyan-300/70 italic">🛠 {task.engineeringContext}</p>
          <Widget task={task} value={value} onChange={setValue} disabled={false} />
          {task.choices ? (
            <div className="grid grid-cols-2 gap-2">
              {task.choices.map((c) => (
                <button
                  key={c}
                  className={`btn-ghost !justify-center text-sm ${value === c ? "!bg-cyan-500/20" : ""}`}
                  onClick={() => {
                    setValue(c);
                    void submit(c);
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          ) : (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void submit(value);
              }}
            >
              <input
                className="flex-1 rounded-lg bg-space-800 border border-cyan-500/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                placeholder="Dial in your value…"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                aria-label="Your setting"
              />
              <button type="submit" className="btn-primary text-sm" disabled={!value.trim()}>
                {SUBMIT_LABEL[step.spec.kind]}
              </button>
            </form>
          )}
          {step.spec.optional && (
            <button className="text-[11px] text-amber-300/80 hover:text-amber-200 underline underline-offset-2" onClick={() => void submit("", true)}>
              ⏭ Skip this inspection (saves time — but nobody checks this part before flight)
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 bg-space-950/85 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="hud-panel p-5 max-w-lg w-full max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-cyan-200 neon">{title}</h2>
          <button className="btn-ghost !px-3 !py-1 text-sm" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}