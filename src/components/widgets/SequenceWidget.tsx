import type { WidgetProps } from "./types";
import { cfgStr, cfgNum } from "./types";

/** Burn-schedule timeline: sequence terms as pulses, with a "?" for the next. */
export default function SequenceWidget({ task, value }: WidgetProps) {
  const terms = cfgStr(task, "terms").split(",").filter(Boolean);
  const terms2 = cfgStr(task, "terms2").split(",").filter(Boolean);
  const ask = cfgStr(task, "ask", "next");
  const n = cfgNum(task, "n", 0);
  const label = cfgStr(task, "label");

  const Row = ({ ts, tone }: { ts: string[]; tone: string }) => (
    <div className="flex items-center gap-2">
      {ts.map((t, i) => (
        <div key={i} className={`flex h-10 min-w-[2.75rem] items-center justify-center rounded border px-2 font-mono text-sm ${tone}`}>
          {t.trim()}
        </div>
      ))}
      {ask !== "classify" && (
        <div className="flex h-10 min-w-[2.75rem] items-center justify-center rounded border border-amber-500/70 bg-amber-500/10 px-2 font-mono text-sm text-amber-300">
          {ask === "position" && n ? `n=${n}?` : value || "?"}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <Row ts={terms} tone="border-cyan-600/60 bg-cyan-500/10 text-cyan-200" />
      {terms2.length > 0 && <Row ts={terms2} tone="border-pink-500/60 bg-pink-500/10 text-pink-200" />}
      {label && <div className="text-[11px] text-slate-400">{label}</div>}
    </div>
  );
}
