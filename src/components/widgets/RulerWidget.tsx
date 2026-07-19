import type { WidgetProps } from "./types";
import { cfgNum, cfgStr } from "./types";

/** Workshop ruler / readout strip showing a measurement or panel count. */
export default function RulerWidget({ task }: WidgetProps) {
  const mode = cfgStr(task, "mode", "length");
  const value = cfgNum(task, "value", cfgNum(task, "current", 0));
  const max = cfgNum(task, "max", Math.max(value * 1.4, 10));
  const frac = Math.max(0.02, Math.min(1, value / max));

  if (mode === "panels") {
    const shown = Math.min(Math.round(value), 40);
    return (
      <div className="py-2">
        <div className="grid grid-cols-10 gap-1 max-w-[260px] mx-auto" aria-label="Hull panels">
          {Array.from({ length: Math.max(shown, 10) }).map((_, i) => (
            <div
              key={i}
              className={`h-4 rounded-sm ${i < shown ? "bg-cyan-500/70 shadow-glow" : "bg-space-700"}`}
            />
          ))}
        </div>
        <div className="text-center text-xs text-cyan-300/70 mt-2">Panel bay — workshop camera</div>
      </div>
    );
  }

  return (
    <div className="py-2 flex flex-col items-center gap-1">
      <div className="relative w-72 h-8 rounded border border-cyan-400/50 bg-cyan-400/5 overflow-hidden" aria-label="Ruler">
        <div className="absolute inset-y-0 left-0 bg-cyan-500/40" style={{ width: `${frac * 100}%` }} />
        {Array.from({ length: 11 }).map((_, i) => (
          <div key={i} className="absolute top-0 h-2 border-l border-cyan-300/70" style={{ left: `${i * 10}%` }} />
        ))}
        <div className="absolute inset-y-0 border-l-2 border-amber-400" style={{ left: `${frac * 100}%` }} />
      </div>
      <div className="text-xs text-cyan-300/70">
        {mode === "mass" ? "Mass readout" : "Laser measure"} — scale 0 to {max.toLocaleString("en-GB")}
      </div>
    </div>
  );
}