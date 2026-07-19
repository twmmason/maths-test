import type { WidgetProps } from "./types";
import { cfgNum, cfgStr } from "./types";

/** Compass-and-straightedge plotting table (perpendicular/angle bisectors). */
export default function ConstructionWidget({ task }: WidgetProps) {
  const kind = cfgStr(task, "kind", "bisectAngle");
  const angle = cfgNum(task, "angle", 60);
  const rad = (angle * Math.PI) / 180;
  const cx = 40, cy = 140, arm = 160;
  const x2 = cx + arm * Math.cos(rad), y2 = cy - arm * Math.sin(rad);
  const half = rad / 2;
  const bx = cx + arm * Math.cos(half), by = cy - arm * Math.sin(half);

  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <svg width={240} height={160} viewBox="0 0 240 160" role="img" aria-label="Construction plotting table"
        className="rounded border border-cyan-700/50 bg-[#06101f]">
        {kind === "bisectAngle" ? (
          <>
            <line x1={cx} y1={cy} x2={cx + arm} y2={cy} stroke="#22d3ee" strokeWidth={2} />
            <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="#22d3ee" strokeWidth={2} />
            {/* compass arcs */}
            <path d={`M${cx + 44},${cy} A44,44 0 0 0 ${cx + 44 * Math.cos(rad)},${cy - 44 * Math.sin(rad)}`}
              fill="none" stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={cx + 44} cy={cy} r={20} fill="none" stroke="#94a3b8" strokeWidth={0.8} strokeDasharray="3 3" />
            <circle cx={cx + 44 * Math.cos(rad)} cy={cy - 44 * Math.sin(rad)} r={20} fill="none" stroke="#94a3b8" strokeWidth={0.8} strokeDasharray="3 3" />
            <line x1={cx} y1={cy} x2={bx} y2={by} stroke="#fbbf24" strokeWidth={2} strokeDasharray="6 4" />
          </>
        ) : (
          <>
            <line x1={30} y1={80} x2={210} y2={80} stroke="#22d3ee" strokeWidth={2} />
            <circle cx={30} cy={80} r={70} fill="none" stroke="#94a3b8" strokeWidth={0.8} strokeDasharray="3 3" />
            <circle cx={210} cy={80} r={70} fill="none" stroke="#94a3b8" strokeWidth={0.8} strokeDasharray="3 3" />
            <line x1={120} y1={16} x2={120} y2={144} stroke="#fbbf24" strokeWidth={2} strokeDasharray="6 4" />
          </>
        )}
      </svg>
      <div className="text-[11px] text-slate-400">
        {kind === "bisectAngle" ? "compass arcs cross — join to bisect the angle" : "equal arcs from each end — join the crossings"}
      </div>
    </div>
  );
}
