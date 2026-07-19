import type { WidgetProps } from "./types";
import { cfgNum, cfgStr } from "./types";

/** Bar model: whole/part comparison or ratio bars for 2-unknown problems. */
export default function BarModelWidget({ task }: WidgetProps) {
  const total = cfgNum(task, "total", 100);
  const known = cfgNum(task, "known", NaN);
  const partA = cfgNum(task, "partA", NaN);
  const partB = cfgNum(task, "partB", NaN);
  const ratio = cfgNum(task, "ratio", 0);
  const label = cfgStr(task, "label", "");

  // Ratio mode: A is `ratio` bars, B is 1 bar
  if (ratio > 0) {
    const bars = ratio + 1;
    return (
      <div className="py-3 flex flex-col items-center gap-2">
        <div className="w-72">
          <div className="text-xs text-cyan-300/80 mb-1">Resistor A ({ratio} equal bars)</div>
          <div className="flex gap-0.5">
            {Array.from({ length: ratio }).map((_, i) => (
              <div key={i} className="flex-1 h-8 rounded bg-pink-500/60 border border-pink-300/60 flex items-center justify-center text-xs">?</div>
            ))}
          </div>
          <div className="text-xs text-cyan-300/80 mt-2 mb-1">Resistor B (1 bar)</div>
          <div className="flex">
            <div className="h-8 rounded bg-cyan-500/60 border border-cyan-300/60 flex items-center justify-center text-xs" style={{ width: `${100 / ratio}%` }}>?</div>
          </div>
          <div className="mt-2 h-6 rounded border border-amber-400/60 bg-amber-400/10 flex items-center justify-center text-xs text-amber-300">
            All {bars} bars together: {total} {label}
          </div>
        </div>
      </div>
    );
  }

  // Two-part mode (A and B known → total asked)
  if (!Number.isNaN(partA) && !Number.isNaN(partB)) {
    const sum = partA + partB;
    return (
      <div className="py-3 flex flex-col items-center">
        <div className="w-72">
          <div className="flex h-9 rounded overflow-hidden border border-cyan-400/50">
            <div className="bg-pink-500/60 flex items-center justify-center text-xs font-semibold" style={{ width: `${(partA / sum) * 100}%` }}>
              {partA}
            </div>
            <div className="bg-cyan-500/60 flex items-center justify-center text-xs font-semibold" style={{ width: `${(partB / sum) * 100}%` }}>
              {partB}
            </div>
          </div>
          <div className="mt-1 h-6 rounded border border-amber-400/60 bg-amber-400/10 flex items-center justify-center text-xs text-amber-300">
            whole {label}: ?
          </div>
        </div>
      </div>
    );
  }

  // Whole + one known part → missing part
  const knownFrac = Number.isNaN(known) ? 0.5 : Math.max(0.05, Math.min(0.95, known / total));
  return (
    <div className="py-3 flex flex-col items-center">
      <div className="w-72">
        <div className="h-6 rounded border border-amber-400/60 bg-amber-400/10 flex items-center justify-center text-xs text-amber-300 mb-1">
          whole: {total} {label}
        </div>
        <div className="flex h-9 rounded overflow-hidden border border-cyan-400/50">
          <div className="bg-cyan-500/60 flex items-center justify-center text-xs font-semibold" style={{ width: `${knownFrac * 100}%` }}>
            {Number.isNaN(known) ? "" : known}
          </div>
          <div className="bg-space-700 flex items-center justify-center text-xs text-cyan-200" style={{ width: `${(1 - knownFrac) * 100}%` }}>
            ?
          </div>
        </div>
      </div>
    </div>
  );
}