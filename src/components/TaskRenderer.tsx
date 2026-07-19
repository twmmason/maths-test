import { useEffect, useState } from "react";
import type { GeneratedTask } from "../engine/types";
import { checkAnswer } from "../engine";
import { useRocketState } from "../mission/useRocketState";
import { getAdaptiveHint } from "../ai/hints";
import { askChiefEngineer } from "../ai/chiefEngineer";
import { FALLBACK_CORRECT, FALLBACK_NUDGE, pickFallback } from "../ai/fallbacks";
import { sfx } from "../mission/sound";
import ProtractorWidget from "./widgets/ProtractorWidget";
import RulerWidget from "./widgets/RulerWidget";
import FuelGaugeWidget from "./widgets/FuelGaugeWidget";
import NumberLineWidget from "./widgets/NumberLineWidget";
import RatioMixerWidget from "./widgets/RatioMixerWidget";
import PayloadSplitWidget from "./widgets/PayloadSplitWidget";
import GridWidget from "./widgets/GridWidget";
import CircuitWidget from "./widgets/CircuitWidget";
import BarModelWidget from "./widgets/BarModelWidget";
import ChecklistWidget from "./widgets/ChecklistWidget";
import EquationWidget from "./widgets/EquationWidget";
import GraphPlotWidget from "./widgets/GraphPlotWidget";
import SequenceWidget from "./widgets/SequenceWidget";
import StandardFormWidget from "./widgets/StandardFormWidget";
import ConstructionWidget from "./widgets/ConstructionWidget";
import TriangleWidget from "./widgets/TriangleWidget";
import VennWidget from "./widgets/VennWidget";
import SampleSpaceWidget from "./widgets/SampleSpaceWidget";
import ChartWidget from "./widgets/ChartWidget";
import ScaleMapWidget from "./widgets/ScaleMapWidget";

const WIDGETS = {
  protractor: ProtractorWidget,
  ruler: RulerWidget,
  fuelGauge: FuelGaugeWidget,
  numberLine: NumberLineWidget,
  ratioMixer: RatioMixerWidget,
  payloadSplit: PayloadSplitWidget,
  grid: GridWidget,
  circuit: CircuitWidget,
  barModel: BarModelWidget,
  checklist: ChecklistWidget,
  // KS3 Astronaut Academy widgets
  equation: EquationWidget,
  graphPlot: GraphPlotWidget,
  sequence: SequenceWidget,
  standardForm: StandardFormWidget,
  construction: ConstructionWidget,
  triangle: TriangleWidget,
  venn: VennWidget,
  sampleSpace: SampleSpaceWidget,
  chart: ChartWidget,
  scaleMap: ScaleMapWidget,
} as const;

export interface TaskResult {
  correct: boolean;
  firstTry: boolean;
  hintsUsed: number;
}

interface Props {
  task: GeneratedTask;
  onFinished: (result: TaskResult) => void;
  /** Record attempts to the DB (off for sandbox play). */
  record?: boolean;
}

export default function TaskRenderer({ task, onFinished, record = true }: Props) {
  const recordAttempt = useRocketState((s) => s.recordAttempt);
  const applyEffect = useRocketState((s) => s.applyEffect);

  const [value, setValue] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "nudge" | "hint" | "manual"; text: string } | null>(null);
  const [done, setDone] = useState(false);
  const [chiefOpen, setChiefOpen] = useState(false);
  const [chiefQ, setChiefQ] = useState("");
  const [chiefA, setChiefA] = useState<string | null>(null);
  const [chiefBusy, setChiefBusy] = useState(false);

  useEffect(() => {
    setValue("");
    setAttempts(0);
    setHintsUsed(0);
    setFeedback(null);
    setDone(false);
    setChiefA(null);
    setChiefQ("");
  }, [task.id]);

  const Widget = WIDGETS[task.visual.widget];
  const widgetInteractive = task.visual.config.interactive === true;

  const submit = async (answer: string) => {
    if (done || !answer.trim()) return;
    const correct = checkAnswer(task, answer);
    if (record) await recordAttempt(task.criterionCode, task.tier, correct, hintsUsed);

    if (correct) {
      sfx.correct();
      applyEffect(task.rocketEffect.property, task.rocketEffect.correctValue);
      setFeedback({ kind: "ok", text: pickFallback(FALLBACK_CORRECT) });
      setDone(true);
      setTimeout(() => onFinished({ correct: true, firstTry: attempts === 0 && hintsUsed === 0, hintsUsed }), 1100);
      return;
    }

    sfx.nudge();
    const n = attempts + 1;
    setAttempts(n);
    if (n === 1) {
      setFeedback({ kind: "nudge", text: pickFallback(FALLBACK_NUDGE) });
    } else if (n === 2) {
      // Show the static hint immediately; swap in the smarter one if it arrives.
      const staticHint = task.hints[0] ?? "Check the readout carefully.";
      setFeedback({ kind: "hint", text: `💡 ${staticHint}` });
      setHintsUsed((h) => h + 1);
      void getAdaptiveHint(task, answer, 0).then((hint) => {
        setFeedback((f) => (f && f.kind === "hint" && !done ? { kind: "hint", text: `💡 ${hint}` } : f));
      });
    } else {
      // Attempt 3: engineering manual + graceful degradation — never blocked.
      applyEffect(task.rocketEffect.property, task.rocketEffect.incorrectValue);
      setFeedback({ kind: "manual", text: "" });
      setDone(true);
    }
  };

  const askChief = async () => {
    if (!chiefQ.trim() || chiefBusy) return;
    setChiefBusy(true);
    setChiefA(null);
    const a = await askChiefEngineer(chiefQ, task);
    setChiefA(a);
    setChiefBusy(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-cyan-500/40 text-cyan-300">{task.criterionCode}</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-violet-400/40 text-violet-300">Tier {task.tier}</span>
      </div>

      <p className="text-[15px] leading-relaxed text-slate-100">{task.briefing}</p>
      <p className="text-xs text-cyan-300/70 italic">🛠 {task.engineeringContext}</p>

      <Widget task={task} value={value} onChange={setValue} disabled={done} />

      {/* Answer input */}
      {task.choices ? (
        <div className="grid grid-cols-2 gap-2">
          {task.choices.map((c) => (
            <button
              key={c}
              disabled={done}
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
            placeholder={widgetInteractive ? "Use the instrument or type here…" : "Type your reading…"}
            value={value}
            disabled={done}
            onChange={(e) => setValue(e.target.value)}
            aria-label="Your answer"
          />
          <button type="submit" className="btn-primary text-sm" disabled={done || !value.trim()}>
            Lock in
          </button>
        </form>
      )}

      {/* Feedback */}
      {feedback && feedback.kind !== "manual" && (
        <div
          role="status"
          className={`rounded-lg px-3 py-2 text-sm ${
            feedback.kind === "ok"
              ? "bg-emerald-500/15 border border-emerald-400/40 text-emerald-200"
              : "bg-amber-500/10 border border-amber-400/40 text-amber-200"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {feedback?.kind === "manual" && (
        <div className="rounded-lg border border-cyan-500/30 bg-space-800/80 p-3 space-y-2">
          <div className="hud-title">📘 Engineering manual</div>
          <ol className="list-decimal list-inside text-sm text-slate-200 space-y-1">
            {task.workedSteps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <div className="text-xs text-amber-300">
            The part still works — just not at its best yet. We'll revisit this check on a later mission, Commander.
          </div>
          <button className="btn-amber text-sm" onClick={() => onFinished({ correct: false, firstTry: false, hintsUsed })}>
            Carry on building →
          </button>
        </div>
      )}

      {/* Ask the Chief Engineer */}
      <div className="pt-1">
        <button className="text-xs text-cyan-300/70 hover:text-cyan-200 underline underline-offset-2" onClick={() => setChiefOpen(!chiefOpen)}>
          🧑‍🔧 Ask the Chief Engineer
        </button>
        {chiefOpen && (
          <div className="mt-2 space-y-2">
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg bg-space-800 border border-emerald-500/30 px-3 py-1.5 text-xs focus:outline-none"
                placeholder="e.g. what does thrust mean?"
                value={chiefQ}
                onChange={(e) => setChiefQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void askChief()}
              />
              <button className="btn-ghost !px-3 !py-1 text-xs" onClick={() => void askChief()} disabled={chiefBusy}>
                {chiefBusy ? "…" : "Ask"}
              </button>
            </div>
            {chiefA && <div className="rounded-lg bg-emerald-950/50 border border-emerald-500/30 p-2 text-xs text-emerald-100">{chiefA}</div>}
          </div>
        )}
      </div>
    </div>
  );
}