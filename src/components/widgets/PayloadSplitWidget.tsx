import type { WidgetProps } from "./types";
import { cfgNum, cfgStr } from "./types";

/** Crates + compartments visual for sharing / grouping / fraction tasks. */
export default function PayloadSplitWidget({ task }: WidgetProps) {
  const total = cfgNum(task, "total", 12);
  const groups = cfgNum(task, "groups", 4);
  const filled = cfgNum(task, "filled", NaN);
  const mode = cfgStr(task, "mode", "share");

  if (mode === "fraction") {
    const compartments = Math.max(groups, 1);
    const fullCount = Number.isNaN(filled) ? 0 : filled;
    return (
      <div className="py-2 flex flex-col items-center gap-2">
        <div className="flex gap-1" aria-label="Payload bay compartments">
          {Array.from({ length: compartments }).map((_, i) => (
            <div
              key={i}
              className={`w-10 h-14 rounded border ${
                i < fullCount % (compartments + 1) || i < fullCount
                  ? "bg-violet-500/70 border-violet-300 shadow-glow"
                  : "bg-space-700 border-cyan-500/30"
              } flex items-center justify-center text-lg`}
            >
              {i < fullCount ? "📦" : ""}
            </div>
          ))}
        </div>
        <div className="text-xs text-cyan-300/70">Payload bay — {compartments} equal compartments</div>
      </div>
    );
  }

  const crates = Math.min(total, 48);
  return (
    <div className="py-2 flex flex-col items-center gap-2">
      <div className="grid grid-cols-8 gap-1 max-w-[260px]" aria-label="Supply crates">
        {Array.from({ length: crates }).map((_, i) => (
          <div key={i} className="w-6 h-6 rounded bg-violet-500/60 border border-violet-300/60 flex items-center justify-center text-xs">
            📦
          </div>
        ))}
      </div>
      {total > crates && <div className="text-xs text-cyan-300/60">…and {total - crates} more on the dock</div>}
      {groups > 0 && mode !== "primeCheck" && (
        <div className="text-xs text-cyan-300/70">
          {mode === "rows" ? `Arranged in groups of ${groups}` : `To share between ${groups} compartments`}
        </div>
      )}
    </div>
  );
}