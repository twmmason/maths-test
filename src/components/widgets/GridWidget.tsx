import type { WidgetProps } from "./types";
import { cfgNum, cfgBool, cfgStr } from "./types";

/** Coordinate grid — click a point to answer "x,y". */
export default function GridWidget({ task, value, onChange, disabled }: WidgetProps) {
  const size = cfgNum(task, "size", 10);
  const interactive = cfgBool(task, "interactive") && !disabled;
  const showStart = cfgBool(task, "showStart");
  const startX = cfgNum(task, "startX", NaN);
  const startY = cfgNum(task, "startY", NaN);
  const mode = cfgStr(task, "mode");
  const orientation = cfgStr(task, "orientation");

  const CELL = 24, PAD = 26;
  const W = PAD * 2 + size * CELL;
  const toPx = (gx: number, gy: number) => [PAD + gx * CELL, PAD + (size - gy) * CELL] as const;

  const picked = value?.match(/^(\d+)\s*,\s*(\d+)$/);
  const px = picked ? Number(picked[1]) : NaN;
  const py = picked ? Number(picked[2]) : NaN;

  if (mode === "lines") {
    return (
      <div className="flex justify-center py-2">
        <svg width="220" height="130" viewBox="0 0 220 130" aria-label="Blueprint line">
          <rect x="4" y="4" width="212" height="122" fill="rgba(34,211,238,0.05)" stroke="#164e63" />
          {orientation === "vertical"
            ? <line x1="110" y1="16" x2="110" y2="114" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" />
            : <line x1="24" y1="65" x2="196" y2="65" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" />}
        </svg>
      </div>
    );
  }

  return (
    <div className="flex justify-center py-2">
      <svg width={W} height={W} viewBox={`0 0 ${W} ${W}`} aria-label="Coordinate grid">
        {Array.from({ length: size + 1 }).map((_, i) => (
          <g key={i}>
            <line x1={PAD + i * CELL} y1={PAD} x2={PAD + i * CELL} y2={PAD + size * CELL} stroke="#164e63" strokeWidth="1" />
            <line x1={PAD} y1={PAD + i * CELL} x2={PAD + size * CELL} y2={PAD + i * CELL} stroke="#164e63" strokeWidth="1" />
            <text x={PAD + i * CELL} y={PAD + size * CELL + 14} fill="#67e8f9" fontSize="9" textAnchor="middle">{i}</text>
            <text x={PAD - 10} y={PAD + (size - i) * CELL + 3} fill="#67e8f9" fontSize="9" textAnchor="middle">{i}</text>
          </g>
        ))}
        {/* axes */}
        <line x1={PAD} y1={PAD} x2={PAD} y2={PAD + size * CELL} stroke="#22d3ee" strokeWidth="2" />
        <line x1={PAD} y1={PAD + size * CELL} x2={PAD + size * CELL} y2={PAD + size * CELL} stroke="#22d3ee" strokeWidth="2" />
        {/* start point */}
        {showStart && !Number.isNaN(startX) && (
          <circle cx={toPx(startX, startY)[0]} cy={toPx(startX, startY)[1]} r="6" fill="#f472b6" opacity="0.85" />
        )}
        {/* picked point */}
        {picked && <circle cx={toPx(px, py)[0]} cy={toPx(px, py)[1]} r="7" fill="#fbbf24" stroke="#fff7ed" strokeWidth="1.5" />}
        {/* click targets */}
        {interactive &&
          Array.from({ length: (size + 1) * (size + 1) }).map((_, i) => {
            const gx = i % (size + 1);
            const gy = Math.floor(i / (size + 1));
            const [cx, cy] = toPx(gx, gy);
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r="9"
                fill="transparent"
                className="cursor-pointer"
                onClick={() => onChange(`${gx},${gy}`)}
              />
            );
          })}
      </svg>
    </div>
  );
}