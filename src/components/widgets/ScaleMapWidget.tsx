import type { WidgetProps } from "./types";
import { cfgNum, cfgStr } from "./types";

/** Launch-pad map with a scale bar — measure and convert by scale factor. */
export default function ScaleMapWidget({ task }: WidgetProps) {
  const metresPerCm = cfgNum(task, "scaleMetresPerCm", 1);
  const mapCm = cfgNum(task, "mapCm", 5);
  const label = cfgStr(task, "label", "route");
  const pxPerCm = Math.min(28, 200 / Math.max(1, mapCm));
  const lineLen = mapCm * pxPerCm;

  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <svg width={260} height={140} viewBox="0 0 260 140" role="img" aria-label="Pad map"
        className="rounded border border-cyan-700/50 bg-[#0b1a10]">
        <rect x={16} y={18} width={44} height={30} rx={3} fill="#334155" stroke="#64748b" />
        <text x={38} y={62} textAnchor="middle" fontSize="8" fill="#94a3b8">VAB</text>
        <circle cx={16 + 44 + lineLen} cy={33} r={12} fill="#475569" stroke="#94a3b8" />
        <text x={16 + 44 + lineLen} y={58} textAnchor="middle" fontSize="8" fill="#94a3b8">PAD</text>
        <line x1={60} y1={33} x2={60 + lineLen} y2={33} stroke="#fbbf24" strokeWidth={2} strokeDasharray="6 3" />
        <text x={60 + lineLen / 2} y={26} textAnchor="middle" fontSize="9" fill="#fbbf24">{mapCm} cm on the map</text>
        {/* scale bar */}
        <line x1={20} y1={116} x2={20 + pxPerCm} y2={116} stroke="#22d3ee" strokeWidth={3} />
        <line x1={20} y1={110} x2={20} y2={122} stroke="#22d3ee" strokeWidth={1.5} />
        <line x1={20 + pxPerCm} y1={110} x2={20 + pxPerCm} y2={122} stroke="#22d3ee" strokeWidth={1.5} />
        <text x={26 + pxPerCm} y={119} fontSize="9" fill="#67e8f9">1 cm = {metresPerCm} m</text>
      </svg>
      <div className="text-[11px] text-slate-400">{label}</div>
    </div>
  );
}
