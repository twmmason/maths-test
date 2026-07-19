import type { WidgetProps } from "./types";
import { cfgNum, cfgStr } from "./types";

/** Two-set Venn board for sorting tested components into regions. */
export default function VennWidget({ task }: WidgetProps) {
  const leftLabel = cfgStr(task, "leftLabel", "A");
  const rightLabel = cfgStr(task, "rightLabel", "B");
  const leftOnly = cfgNum(task, "leftOnly", NaN);
  const rightOnly = cfgNum(task, "rightOnly", NaN);
  const both = cfgNum(task, "both", NaN);
  const neither = cfgNum(task, "neither", NaN);
  const unknown = cfgStr(task, "unknown");

  const cell = (region: string, n: number) =>
    unknown === region ? "?" : Number.isFinite(n) ? String(n) : "";

  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <svg width={260} height={160} viewBox="0 0 260 160" role="img" aria-label="Venn diagram"
        className="rounded border border-cyan-700/50 bg-[#06101f]">
        <rect x={4} y={4} width={252} height={152} fill="none" stroke="#334155" />
        <circle cx={100} cy={80} r={58} fill="rgba(34,211,238,0.12)" stroke="#22d3ee" strokeWidth={1.5} />
        <circle cx={160} cy={80} r={58} fill="rgba(244,114,182,0.12)" stroke="#f472b6" strokeWidth={1.5} />
        <text x={70} y={26} fontSize="10" fill="#67e8f9">{leftLabel}</text>
        <text x={168} y={26} fontSize="10" fill="#f9a8d4">{rightLabel}</text>
        <text x={72} y={86} textAnchor="middle" fontSize="16" fill={unknown === "leftOnly" ? "#fbbf24" : "#e2e8f0"}>{cell("leftOnly", leftOnly)}</text>
        <text x={130} y={86} textAnchor="middle" fontSize="16" fill={unknown === "both" ? "#fbbf24" : "#e2e8f0"}>{cell("both", both)}</text>
        <text x={188} y={86} textAnchor="middle" fontSize="16" fill={unknown === "rightOnly" ? "#fbbf24" : "#e2e8f0"}>{cell("rightOnly", rightOnly)}</text>
        <text x={26} y={146} fontSize="14" fill={unknown === "neither" ? "#fbbf24" : "#e2e8f0"}>{cell("neither", neither)}</text>
      </svg>
      <div className="text-[11px] text-slate-400">component test board — count every region</div>
    </div>
  );
}
