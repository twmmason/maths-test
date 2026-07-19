import { useState } from "react";
import type { WidgetProps } from "./types";
import { cfgNum, cfgBool, cfgStr } from "./types";

/** SVG protractor — displays an angle, or lets Artie set one with a slider. */
export default function ProtractorWidget({ task, value, onChange, disabled }: WidgetProps) {
  const measure = cfgBool(task, "measure"); // read a fixed angle off the scale
  const interactive = cfgBool(task, "interactive") && !disabled && !measure;
  const displayAngle = cfgNum(task, "angle", cfgNum(task, "target", 45));
  const showShape = cfgStr(task, "showShape");
  const [local, setLocal] = useState(interactive ? 45 : displayAngle);
  const shown = interactive ? (value ? Number(value) || local : local) : displayAngle;

  const cx = 130, cy = 120, R = 100;
  const rad = ((180 - shown) * Math.PI) / 180;
  const armX = cx + R * Math.cos(rad);
  const armY = cy - R * Math.sin(rad);

  if (showShape && !cfgBool(task, "interactive")) {
    return (
      <div className="flex flex-col items-center gap-2 py-2">
        <svg width="220" height="130" viewBox="0 0 220 130" aria-label={`Shape: ${showShape}`}>
          <ShapeSketch name={showShape} />
        </svg>
        <div className="text-xs text-cyan-300/70">Workshop scanner view</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <svg width="260" height="140" viewBox="0 0 260 140" aria-label="Protractor">
        <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`} fill="rgba(34,211,238,0.08)" stroke="#22d3ee" strokeWidth="1.5" />
        {Array.from({ length: 19 }).map((_, i) => {
          const a = ((180 - i * 10) * Math.PI) / 180;
          const x1 = cx + (R - (i % 3 === 0 ? 14 : 8)) * Math.cos(a);
          const y1 = cy - (R - (i % 3 === 0 ? 14 : 8)) * Math.sin(a);
          const x2 = cx + R * Math.cos(a);
          const y2 = cy - R * Math.sin(a);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#67e8f9" strokeWidth="1" />;
        })}
        {[0, 30, 60, 90, 120, 150, 180].map((deg) => {
          const a = ((180 - deg) * Math.PI) / 180;
          return (
            <text key={deg} x={cx + (R - 26) * Math.cos(a)} y={cy - (R - 26) * Math.sin(a) + 4} fill="#a5f3fc" fontSize="9" textAnchor="middle">
              {deg}
            </text>
          );
        })}
        {/* baseline arm */}
        <line x1={cx} y1={cy} x2={cx + R} y2={cy} stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
        {/* rotating arm */}
        <line x1={cx} y1={cy} x2={armX} y2={armY} stroke="#f472b6" strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="4" fill="#22d3ee" />
        <text x={cx} y={38} fill="#fbbf24" fontSize="16" fontWeight="bold" textAnchor="middle">
          {interactive ? `${Math.round(shown)}°` : ""}
        </text>
      </svg>
      {interactive && (
        <input
          type="range"
          min={5}
          max={180}
          step={1}
          value={shown}
          disabled={disabled}
          aria-label="Set angle in degrees"
          className="w-56 accent-cyan-400"
          onChange={(e) => {
            setLocal(Number(e.target.value));
            onChange(e.target.value);
          }}
        />
      )}
    </div>
  );
}

function ShapeSketch({ name }: { name: string }) {
  const stroke = "#22d3ee";
  const fill = "rgba(34,211,238,0.12)";
  const n = name.toLowerCase();
  if (n.includes("cone")) return <path d="M110 15 L150 110 L70 110 Z M70 110 Q110 125 150 110" fill={fill} stroke={stroke} strokeWidth="2" />;
  if (n.includes("cylinder")) return <g><ellipse cx="110" cy="25" rx="38" ry="10" fill={fill} stroke={stroke} strokeWidth="2" /><path d="M72 25 V105 M148 25 V105" stroke={stroke} strokeWidth="2" /><ellipse cx="110" cy="105" rx="38" ry="10" fill={fill} stroke={stroke} strokeWidth="2" /></g>;
  if (n.includes("sphere")) return <g><circle cx="110" cy="65" r="45" fill={fill} stroke={stroke} strokeWidth="2" /><ellipse cx="110" cy="65" rx="45" ry="14" fill="none" stroke={stroke} strokeDasharray="4 3" /></g>;
  if (n.includes("cube")) return <g><rect x="75" y="40" width="60" height="60" fill={fill} stroke={stroke} strokeWidth="2" /><path d="M75 40 L95 22 H155 L135 40 M155 22 V82 L135 100" fill="none" stroke={stroke} strokeWidth="2" /></g>;
  if (n.includes("triangle")) return <path d="M110 20 L160 110 L60 110 Z" fill={fill} stroke={stroke} strokeWidth="2" />;
  if (n.includes("square")) return <rect x="70" y="30" width="80" height="80" fill={fill} stroke={stroke} strokeWidth="2" />;
  if (n.includes("pentagon")) return <path d="M110 20 L165 62 L144 118 L76 118 L55 62 Z" fill={fill} stroke={stroke} strokeWidth="2" />;
  if (n.includes("hexagon")) return <path d="M80 30 L140 30 L170 70 L140 110 L80 110 L50 70 Z" fill={fill} stroke={stroke} strokeWidth="2" />;
  if (n.includes("stack")) return <g><path d="M110 12 L140 55 L80 55 Z" fill={fill} stroke={stroke} strokeWidth="2" /><rect x="80" y="58" width="60" height="55" fill={fill} stroke={stroke} strokeWidth="2" /></g>;
  return <circle cx="110" cy="65" r="40" fill={fill} stroke={stroke} strokeWidth="2" />;
}