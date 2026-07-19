import type { WidgetProps } from "./types";
import { cfgNum, cfgStr } from "./types";

/** Two coloured liquids side by side — visualises a ratio or a scaling. */
export default function RatioMixerWidget({ task }: WidgetProps) {
  const left = cfgNum(task, "left", 1);
  const right = cfgNum(task, "right", 0);
  const ratio = cfgNum(task, "ratio", 0);
  const unit = cfgStr(task, "unit");
  const maxVal = Math.max(left, right, 1);

  const Column = ({ v, color, label }: { v: number; color: string; label: string }) => (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-36 rounded-b-lg border-2 border-cyan-400/50 bg-cyan-400/5 overflow-hidden">
        <div
          className={`absolute bottom-0 left-0 right-0 ${color} transition-all duration-500`}
          style={{ height: `${Math.max(4, (v / maxVal) * 100)}%` }}
        />
      </div>
      <div className="text-xs text-cyan-200 font-semibold">{label}</div>
      <div className="text-xs text-amber-300">{v > 0 ? `${v.toLocaleString("en-GB")}${unit ? ` ${unit}` : ""}` : "?"}</div>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <div className="flex gap-8">
        <Column v={left} color="bg-gradient-to-t from-orange-500 to-amber-400" label="Fuel" />
        <Column v={right} color="bg-gradient-to-t from-cyan-500 to-teal-300" label="Oxidiser" />
      </div>
      {ratio > 0 && <div className="text-xs text-cyan-300/80">Mixer set to {ratio} to 1</div>}
    </div>
  );
}