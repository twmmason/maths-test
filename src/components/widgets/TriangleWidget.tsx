import type { WidgetProps } from "./types";
import { cfgStr } from "./types";

/** Right-angled strut triangle with labelled sides for Pythagoras/trig. */
export default function TriangleWidget({ task }: WidgetProps) {
  const baseLabel = cfgStr(task, "baseLabel", "a");
  const heightLabel = cfgStr(task, "heightLabel", "b");
  const hypLabel = cfgStr(task, "hypLabel", "c");
  const angleLabel = cfgStr(task, "angleLabel");
  const mark = cfgStr(task, "mark"); // which side is unknown

  const hl = (side: string, text: string) =>
    mark === side ? <tspan fill="#fbbf24" fontWeight="bold">{text} ?</tspan> : <tspan fill="#a5f3fc">{text}</tspan>;

  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <svg width={240} height={170} viewBox="0 0 240 170" role="img" aria-label="Right-angled triangle">
        <polygon points="30,150 210,150 210,30" fill="rgba(34,211,238,0.08)" stroke="#22d3ee" strokeWidth={2} />
        {/* right-angle marker */}
        <path d="M196,150 L196,136 L210,136" fill="none" stroke="#22d3ee" strokeWidth={1.5} />
        <text x={120} y={166} textAnchor="middle" fontSize="12">{hl("base", baseLabel)}</text>
        <text x={228} y={94} textAnchor="middle" fontSize="12">{hl("height", heightLabel)}</text>
        <text x={104} y={84} textAnchor="middle" fontSize="12" transform="rotate(-34 104 84)">{hl("hyp", hypLabel)}</text>
        {angleLabel && (
          <>
            <path d="M60,150 A30,30 0 0 0 54,134" fill="none" stroke="#fbbf24" strokeWidth={1.5} />
            <text x={70} y={138} fontSize="11" fill="#fbbf24">{angleLabel}</text>
          </>
        )}
      </svg>
      <div className="text-[11px] text-slate-400">tracking geometry — not to scale</div>
    </div>
  );
}
