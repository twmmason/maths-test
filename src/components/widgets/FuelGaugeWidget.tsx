import type { WidgetProps } from "./types";
import { cfgNum, cfgBool, cfgStr } from "./types";

/** Translucent tank with a liquid level; interactive fill slider. */
export default function FuelGaugeWidget({ task, value, onChange, disabled }: WidgetProps) {
  const capacity = cfgNum(task, "capacity", 1);
  const level = cfgNum(task, "level", 0);
  const compareLevel = cfgNum(task, "compareLevel", NaN);
  const readOnly = cfgBool(task, "readOnly") || !cfgBool(task, "interactive");
  const unit = cfgStr(task, "unit", capacity <= 1 ? "" : "L");
  const asFraction = cfgBool(task, "asFraction");

  const currentRaw = value ? Number(value) : readOnly ? level : 0;
  const frac = capacity <= 1 ? Math.max(0, Math.min(1, currentRaw)) : Math.max(0, Math.min(1, currentRaw / capacity));

  const Tank = ({ fillFrac, label }: { fillFrac: number; label?: string }) => (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-40 rounded-b-xl rounded-t-md border-2 border-cyan-400/60 bg-cyan-400/5 overflow-hidden">
        <div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-orange-500 to-amber-400 transition-all duration-300"
          style={{ height: `${fillFrac * 100}%` }}
        />
        {[0.25, 0.5, 0.75].map((m) => (
          <div key={m} className="absolute left-0 w-3 border-t border-cyan-300/60" style={{ bottom: `${m * 100}%` }} />
        ))}
      </div>
      {label && <div className="text-xs text-cyan-300/80">{label}</div>}
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <div className="flex gap-6 items-end">
        <Tank fillFrac={frac} label={Number.isNaN(compareLevel) ? undefined : "Port"} />
        {!Number.isNaN(compareLevel) && <Tank fillFrac={compareLevel} label="Starboard" />}
      </div>
      <div className="text-sm text-amber-300 font-semibold" aria-live="polite">
        {readOnly
          ? asFraction
            ? "Gauge reading shown"
            : `${Math.round(level)}${unit ? ` ${unit}` : ""} shown`
          : capacity <= 1
            ? `${Math.round(frac * 100)}% full`
            : `${Math.round(currentRaw)} ${unit}`}
      </div>
      {!readOnly && (
        <input
          type="range"
          min={0}
          max={capacity <= 1 ? 1 : capacity}
          step={capacity <= 1 ? 0.01 : Math.max(1, Math.round(capacity / 100))}
          value={currentRaw}
          disabled={disabled}
          aria-label="Fuel fill slider"
          className="w-56 accent-amber-400"
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}