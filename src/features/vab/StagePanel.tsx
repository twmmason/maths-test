import { useMemo, useState } from "react";
import { useRocketState } from "../../mission/useRocketState";
import { STAGE_BY_PART } from "../../mission/stages";
import { generateTask } from "../../engine";
import { randomSeed } from "../../engine/rng";
import TaskRenderer from "../../components/TaskRenderer";
import { CRITERIA_BY_CODE } from "../../curriculum/criteria";

/** Engineering task panel for the selected (draft or certified) part. */
export default function StagePanel() {
  const selectedPart = useRocketState((s) => s.selectedPart);
  const design = useRocketState((s) => s.design);
  const partPlans = useRocketState((s) => s.partPlans);
  const completedTasks = useRocketState((s) => s.completedTasks);
  const completeTask = useRocketState((s) => s.completeTask);
  const [seed, setSeed] = useState(() => randomSeed());
  const [reEdit, setReEdit] = useState(false);

  const plan = selectedPart ? partPlans[selectedPart] : undefined;
  const done = selectedPart ? new Set(completedTasks[selectedPart] ?? []) : new Set<string>();
  const pending = plan?.criteria.filter((c) => !done.has(c.code)) ?? [];
  const current = reEdit && plan ? plan.criteria[0] : pending[0];

  const task = useMemo(() => {
    if (!current) return null;
    return generateTask(current.code, current.tier, seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.code, current?.tier, seed, selectedPart]);

  if (!selectedPart) {
    return (
      <div className="hud-panel p-4 text-sm text-slate-400">
        <div className="hud-title mb-2">🛠 Engineering tasks</div>
        Attach a part from the catalogue, then click it (in the 3D view or on the board below) to open its engineering tasks.
      </div>
    );
  }

  const stage = STAGE_BY_PART[selectedPart];
  const installed = design.installedParts[selectedPart];
  const certified = installed?.certified;

  if (!installed) {
    return (
      <div className="hud-panel p-4 text-sm text-slate-400">
        <div className="hud-title mb-2">{stage.emoji} {stage.label}</div>
        This part is not on the rocket yet — attach one from the catalogue first.
      </div>
    );
  }

  if (certified && !reEdit) {
    return (
      <div className="hud-panel p-4">
        <div className="hud-title mb-2">{stage.emoji} {stage.label}</div>
        <div className="text-sm text-emerald-300 font-bold">✅ CERTIFIED — flight-ready</div>
        <p className="text-xs text-slate-400 mt-1">Every engineering check on this part is locked in.</p>
        <button
          className="btn-ghost !py-1 text-xs mt-2"
          onClick={() => {
            setSeed(randomSeed());
            setReEdit(true);
          }}
        >
          🔧 Re-open tuning tasks
        </button>
      </div>
    );
  }

  if (!task || !current) {
    return (
      <div className="hud-panel p-4 text-sm text-slate-400">
        <div className="hud-title mb-2">{stage.emoji} {stage.label}</div>
        No tasks queued for this part.
      </div>
    );
  }

  const criterion = CRITERIA_BY_CODE[current.code];
  const total = plan?.criteria.length ?? 0;
  const doneCount = total - pending.length;

  return (
    <div className="hud-panel p-4 overflow-auto">
      <div className="flex items-center justify-between mb-2">
        <div className="hud-title">{stage.emoji} {stage.label} — engineering task</div>
        <div className="text-[11px] text-cyan-300/70">
          {reEdit ? "re-tune" : `${doneCount + 1} of ${total}`}
        </div>
      </div>
      {criterion && <div className="text-[11px] text-slate-500 mb-2">{criterion.description}</div>}
      <TaskRenderer
        task={task}
        onFinished={(res) => {
          if (reEdit) {
            setReEdit(false);
          } else {
            void completeTask(selectedPart, current.code, res.correct && res.firstTry);
          }
          setSeed(randomSeed());
        }}
      />
    </div>
  );
}