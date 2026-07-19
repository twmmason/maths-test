import type { WidgetProps } from "./types";
import { cfgNum, cfgBool, cfgStr } from "./types";

/** Flight-computer readout: shows an equation/console line; optional slider
 *  to dial in the unknown. Notation lives HERE, never in the briefing. */
export default function EquationWidget({ task, value, onChange, disabled }: WidgetProps) {
  const readout = cfgStr(task, "readout");
  const equation = cfgStr(task, "equation");
  const unknown = cfgStr(task, "unknown", "x");
  const interactive = cfgBool(task, "interactive");
  const min = cfgNum(task, "min", 0);
  const max = cfgNum(task, "max", 20);
  const step = cfgNum(task, "step", 1);
  const current = value ? Number(value) : min;

  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <div className="rounded-lg border border-emerald-500/50 bg-black/70 px-5 py-3 font-mono text-lg text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.25)]">
        <span className="mr-2 text-emerald-600">&gt;</span>
        {equation || readout || "SYSTEM READY"}
      </div>
      {interactive && (
        <>
          <div className="text-sm text-cyan-200" aria-live="polite">
            {unknown} = <span className="font-bold text-amber-300">{value || "?"}</span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={Number.isFinite(current) ? current : min}
            disabled={disabled}
            aria-label={`Set the value of ${unknown}`}
            className="w-56 accent-emerald-400"
            onChange={(e) => onChange(e.target.value)}
          />
        </>
      )}
    </div>
  );
}
