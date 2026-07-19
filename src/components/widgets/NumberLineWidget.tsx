import type { WidgetProps } from "./types";
import { cfgNum, cfgBool, cfgStr } from "./types";

/** Number line: read a pointer, or slide a marker to place a value. */
export default function NumberLineWidget({ task, value, onChange, disabled }: WidgetProps) {
  const min = cfgNum(task, "min", 0);
  const max = cfgNum(task, "max", 100);
  const step = cfgNum(task, "step", 1) || 1;
  const unit = cfgStr(task, "unit");
  const readOnly = cfgBool(task, "readOnly") || !cfgBool(task, "interactive");
  const pointer = cfgNum(task, "pointer", NaN);
  const pointer2 = cfgNum(task, "pointer2", NaN);
  const current = value ? Number(value) : min;

  const W = 300, PAD = 18;
  const toX = (v: number) => PAD + ((v - min) / (max - min)) * (W - PAD * 2);
  const ticks: number[] = [];
  const tickStep = (max - min) / 10;
  for (let v = min; v <= max + 1e-9; v += tickStep) ticks.push(Math.round(v * 1000) / 1000);

  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <svg width={W} height="70" viewBox={`0 0 ${W} 70`} aria-label="Number line">
        <line x1={PAD} y1={40} x2={W - PAD} y2={40} stroke="#22d3ee" strokeWidth="2" />
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={toX(v)} y1={34} x2={toX(v)} y2={46} stroke="#67e8f9" strokeWidth="1.5" />
            {(i % 2 === 0 || ticks.length <= 6) && (
              <text x={toX(v)} y={62} fill="#a5f3fc" fontSize="9" textAnchor="middle">
                {v >= 10000 ? `${Math.round(v / 1000)}k` : v}
              </text>
            )}
          </g>
        ))}
        {!Number.isNaN(pointer) && (
          <g>
            <path d={`M ${toX(pointer)} 12 L ${toX(pointer) - 6} 24 L ${toX(pointer) + 6} 24 Z`} fill="#fbbf24" />
            <line x1={toX(pointer)} y1={24} x2={toX(pointer)} y2={40} stroke="#fbbf24" strokeWidth="2" />
          </g>
        )}
        {!Number.isNaN(pointer2) && (
          <g>
            <path d={`M ${toX(pointer2)} 12 L ${toX(pointer2) - 6} 24 L ${toX(pointer2) + 6} 24 Z`} fill="#f472b6" />
            <line x1={toX(pointer2)} y1={24} x2={toX(pointer2)} y2={40} stroke="#f472b6" strokeWidth="2" />
          </g>
        )}
        {!readOnly && value && (
          <g>
            <circle cx={toX(Math.max(min, Math.min(max, current)))} cy={40} r="7" fill="#22d3ee" opacity="0.9" />
          </g>
        )}
      </svg>
      {!readOnly && (
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value ? current : min}
          disabled={disabled}
          aria-label="Slide to place the value"
          className="w-64 accent-cyan-400"
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {!readOnly && value && (
        <div className="text-sm text-amber-300 font-semibold">
          {current} {unit}
        </div>
      )}
    </div>
  );
}