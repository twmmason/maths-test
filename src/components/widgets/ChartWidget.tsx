import type { WidgetProps } from "./types";
import { cfgStr } from "./types";

/** Telemetry Science Deck chart: bar, pie or scatter from "label:value;…". */
export default function ChartWidget({ task }: WidgetProps) {
  const type = cfgStr(task, "type", "bar");
  const raw = cfgStr(task, "data");
  const xLabel = cfgStr(task, "xLabel");
  const yLabel = cfgStr(task, "yLabel");
  const pairs = raw
    .split(";")
    .map((p) => p.split(":"))
    .filter((p) => p.length === 2)
    .map(([l, v]) => ({ label: l.trim(), value: Number(v) }));

  const W = 260, H = 170, PAD = 26;
  const maxV = Math.max(1, ...pairs.map((p) => p.value));

  if (type === "pie") {
    const total = pairs.reduce((s, p) => s + p.value, 0) || 1;
    let acc = 0;
    const colors = ["#22d3ee", "#f472b6", "#fbbf24", "#34d399", "#a78bfa", "#f87171"];
    return (
      <div className="flex flex-col items-center gap-1 py-2">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Pie chart">
          {pairs.map((p, i) => {
            const a0 = (acc / total) * Math.PI * 2 - Math.PI / 2;
            acc += p.value;
            const a1 = (acc / total) * Math.PI * 2 - Math.PI / 2;
            const cx = 80, cy = 85, r = 62;
            const large = a1 - a0 > Math.PI ? 1 : 0;
            return (
              <path key={i}
                d={`M${cx},${cy} L${cx + r * Math.cos(a0)},${cy + r * Math.sin(a0)} A${r},${r} 0 ${large} 1 ${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)} Z`}
                fill={colors[i % colors.length]} stroke="#0f172a" strokeWidth={1} />
            );
          })}
          {pairs.map((p, i) => (
            <g key={`l${i}`}>
              <rect x={160} y={20 + i * 18} width={10} height={10} fill={colors[i % colors.length]} />
              <text x={175} y={29 + i * 18} fontSize="9" fill="#cbd5e1">{p.label} ({p.value})</text>
            </g>
          ))}
        </svg>
      </div>
    );
  }

  if (type === "scatter") {
    const maxX = Math.max(1, ...pairs.map((p) => Number(p.label)));
    return (
      <div className="flex flex-col items-center gap-1 py-2">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Scatter graph"
          className="rounded border border-cyan-700/50 bg-[#06101f]">
          <line x1={PAD} y1={H - PAD} x2={W - 8} y2={H - PAD} stroke="#475569" />
          <line x1={PAD} y1={8} x2={PAD} y2={H - PAD} stroke="#475569" />
          {pairs.map((p, i) => (
            <circle key={i}
              cx={PAD + (Number(p.label) / maxX) * (W - PAD - 16)}
              cy={H - PAD - (p.value / maxV) * (H - PAD - 16)}
              r={4} fill="#22d3ee" />
          ))}
          <text x={W / 2} y={H - 6} textAnchor="middle" fontSize="9" fill="#94a3b8">{xLabel}</text>
          <text x={10} y={12} fontSize="9" fill="#94a3b8">{yLabel}</text>
        </svg>
      </div>
    );
  }

  // bar chart
  const bw = Math.min(40, (W - PAD * 2) / Math.max(1, pairs.length) - 8);
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Bar chart"
        className="rounded border border-cyan-700/50 bg-[#06101f]">
        <line x1={PAD} y1={H - PAD} x2={W - 8} y2={H - PAD} stroke="#475569" />
        <line x1={PAD} y1={8} x2={PAD} y2={H - PAD} stroke="#475569" />
        {pairs.map((p, i) => {
          const h = (p.value / maxV) * (H - PAD - 20);
          const x = PAD + 8 + i * (bw + 8);
          return (
            <g key={i}>
              <rect x={x} y={H - PAD - h} width={bw} height={h} fill="#22d3ee" opacity={0.85} />
              <text x={x + bw / 2} y={H - PAD + 10} textAnchor="middle" fontSize="8" fill="#94a3b8">{p.label}</text>
              <text x={x + bw / 2} y={H - PAD - h - 3} textAnchor="middle" fontSize="8" fill="#fbbf24">{p.value}</text>
            </g>
          );
        })}
        <text x={10} y={12} fontSize="9" fill="#94a3b8">{yLabel}</text>
      </svg>
      {xLabel && <div className="text-[11px] text-slate-400">{xLabel}</div>}
    </div>
  );
}
