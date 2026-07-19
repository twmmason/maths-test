import type { WidgetProps } from "./types";
import { cfgNum, cfgBool, cfgStr } from "./types";

const SIZE = 240;

/** Cartesian ascent-profile screen: lines, curves, points, four quadrants.
 *  Modes: readLine, quadratic, intersection, piecewise, exponential,
 *  reciprocal, readPoint, plotPoint (click), matchLine (m/c sliders). */
export default function GraphPlotWidget({ task, value, onChange, disabled }: WidgetProps) {
  const mode = cfgStr(task, "mode", "readLine");
  const min = cfgNum(task, "min", -6);
  const max = cfgNum(task, "max", 6);
  const m = cfgNum(task, "m", 1);
  const c = cfgNum(task, "c", 0);
  const m2 = cfgNum(task, "m2", NaN);
  const c2 = cfgNum(task, "c2", NaN);
  const a = cfgNum(task, "a", 1);
  const k = cfgNum(task, "k", 6);
  const start = cfgNum(task, "start", 100);
  const breakX = cfgNum(task, "breakX", NaN);
  const markX = cfgNum(task, "markX", NaN);
  const px = cfgNum(task, "px", NaN);
  const py = cfgNum(task, "py", NaN);
  const xLabel = cfgStr(task, "xLabel");
  const yLabel = cfgStr(task, "yLabel");
  const interactive = cfgBool(task, "interactive");

  const span = max - min;
  // vertical range: for labelled data plots keep y >= 0 tall enough
  const yMax = mode === "exponential" || mode === "piecewise" || (yLabel && min >= 0)
    ? Math.max(start, Math.abs(m) * max + Math.abs(c) + 2, 10)
    : max;
  const yMin = yLabel && min >= 0 ? 0 : min;
  const ySpan = yMax - yMin;

  const X = (x: number) => ((x - min) / span) * SIZE;
  const Y = (y: number) => SIZE - ((y - yMin) / ySpan) * SIZE;

  const fnPath = (f: (x: number) => number, x0 = min, x1 = max) => {
    const pts: string[] = [];
    const steps = 72;
    for (let i = 0; i <= steps; i++) {
      const x = x0 + ((x1 - x0) * i) / steps;
      const y = f(x);
      if (!Number.isFinite(y) || y < yMin - ySpan || y > yMax + ySpan) continue;
      pts.push(`${pts.length === 0 ? "M" : "L"}${X(x).toFixed(1)},${Y(y).toFixed(1)}`);
    }
    return pts.join(" ");
  };

  // user state for matchLine: "m,c" — plotPoint: "x,y"
  const userParts = value.split(",").map((s) => Number(s.trim()));
  const userM = Number.isFinite(userParts[0]) ? userParts[0] : 1;
  const userC = Number.isFinite(userParts[1]) ? userParts[1] : 0;

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!interactive || mode !== "plotPoint" || disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const gx = Math.round(min + ((e.clientX - rect.left) / rect.width) * span);
    const gy = Math.round(yMin + ((rect.bottom - e.clientY) / rect.height) * ySpan);
    onChange(`${gx},${gy}`);
  };

  const gridLines: React.ReactElement[] = [];
  for (let i = Math.ceil(min); i <= Math.floor(max); i++) {
    gridLines.push(<line key={`v${i}`} x1={X(i)} y1={0} x2={X(i)} y2={SIZE} stroke="#1e3a5f" strokeWidth={i === 0 ? 1.5 : 0.5} />);
  }
  for (let j = Math.ceil(yMin); j <= Math.floor(yMax); j += Math.max(1, Math.round(ySpan / 12))) {
    gridLines.push(<line key={`h${j}`} x1={0} y1={Y(j)} x2={SIZE} y2={Y(j)} stroke="#1e3a5f" strokeWidth={j === 0 ? 1.5 : 0.5} />);
  }

  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label="Trajectory plot"
        className={`rounded border border-cyan-700/50 bg-[#050b16] ${mode === "plotPoint" && interactive ? "cursor-crosshair" : ""}`}
        onClick={handleClick}
      >
        {gridLines}
        {/* axes emphasised when zero is on screen */}
        {min <= 0 && max >= 0 && <line x1={X(0)} y1={0} x2={X(0)} y2={SIZE} stroke="#38bdf8" strokeWidth={1.2} />}
        {yMin <= 0 && yMax >= 0 && <line x1={0} y1={Y(0)} x2={SIZE} y2={Y(0)} stroke="#38bdf8" strokeWidth={1.2} />}

        {(mode === "readLine" || mode === "matchLine" || mode === "intersection") && (
          <path d={fnPath((x) => m * x + c)} fill="none" stroke="#22d3ee" strokeWidth={2} strokeDasharray={mode === "matchLine" ? "6 4" : undefined} />
        )}
        {mode === "intersection" && Number.isFinite(m2) && (
          <path d={fnPath((x) => m2 * x + c2)} fill="none" stroke="#f472b6" strokeWidth={2} />
        )}
        {mode === "quadratic" && <path d={fnPath((x) => a * x * x * -1 + m * x + c)} fill="none" stroke="#22d3ee" strokeWidth={2} />}
        {mode === "piecewise" && Number.isFinite(breakX) && (
          <path d={`${fnPath((x) => m * x, min, breakX)} L${X(max)},${Y(m * breakX)}`} fill="none" stroke="#22d3ee" strokeWidth={2} />
        )}
        {mode === "exponential" && <path d={fnPath((x) => start * Math.pow(0.5, x), Math.max(min, 0))} fill="none" stroke="#22d3ee" strokeWidth={2} />}
        {mode === "reciprocal" && <path d={fnPath((x) => k / x, Math.max(min, 0.4))} fill="none" stroke="#22d3ee" strokeWidth={2} />}

        {mode === "matchLine" && (
          <path d={fnPath((x) => userM * x + userC)} fill="none" stroke="#fbbf24" strokeWidth={2.5} />
        )}
        {Number.isFinite(markX) && (
          <line x1={X(markX)} y1={0} x2={X(markX)} y2={SIZE} stroke="#fbbf24" strokeWidth={1} strokeDasharray="4 4" />
        )}
        {mode === "readPoint" && Number.isFinite(px) && (
          <circle cx={X(px)} cy={Y(py)} r={5} fill="#fbbf24" />
        )}
        {mode === "plotPoint" && value && Number.isFinite(userParts[0]) && (
          <circle cx={X(userParts[0])} cy={Y(userParts[1] ?? 0)} r={6} fill="#fbbf24" stroke="#fff" />
        )}
      </svg>
      <div className="text-[11px] text-slate-400">
        {yLabel && <span className="mr-3">↑ {yLabel}</span>}
        {xLabel && <span>→ {xLabel}</span>}
      </div>
      {mode === "matchLine" && interactive && (
        <div className="flex flex-col items-center gap-1">
          <label className="flex items-center gap-2 text-xs text-cyan-200">
            gradient m: <span className="w-8 font-bold text-amber-300">{userM}</span>
            <input type="range" min={-6} max={6} step={1} value={userM} disabled={disabled}
              aria-label="Gradient m" className="w-40 accent-amber-400"
              onChange={(e) => onChange(`${e.target.value},${userC}`)} />
          </label>
          <label className="flex items-center gap-2 text-xs text-cyan-200">
            intercept c: <span className="w-8 font-bold text-amber-300">{userC}</span>
            <input type="range" min={-6} max={6} step={1} value={userC} disabled={disabled}
              aria-label="Intercept c" className="w-40 accent-amber-400"
              onChange={(e) => onChange(`${userM},${e.target.value}`)} />
          </label>
        </div>
      )}
      {mode === "plotPoint" && interactive && (
        <div className="text-xs text-amber-300" aria-live="polite">
          {value ? `registered at (${value})` : "click the grid to register the point"}
        </div>
      )}
    </div>
  );
}
