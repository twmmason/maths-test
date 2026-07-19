import { useTimeOfDay } from "../mission/useTimeOfDay";

function labelFor(h: number): string {
  if (h < 5.5 || h >= 20.5) return "🌙 Night";
  if (h < 7.5) return "🌅 Dawn";
  if (h < 11) return "🌤 Morning";
  if (h < 15) return "☀️ Midday";
  if (h < 18.5) return "🌞 Afternoon";
  return "🌇 Golden hour";
}

/** Compact HUD slider that drives the real sun position in every geo scene. */
export default function TimeOfDaySlider() {
  const hour = useTimeOfDay((s) => s.hour);
  const setHour = useTimeOfDay((s) => s.setHour);
  const hh = Math.floor(hour);
  const mm = Math.round((hour - hh) * 60);
  return (
    <div className="hud-panel px-3 py-2 w-56">
      <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1">
        <span>{labelFor(hour)}</span>
        <span className="tabular-nums text-cyan-200">{String(hh).padStart(2, "0")}:{String(mm).padStart(2, "0")}</span>
      </div>
      <input
        type="range"
        min={5}
        max={21}
        step={0.25}
        value={hour}
        onChange={(e) => setHour(Number(e.target.value))}
        className="w-full accent-cyan-400"
        aria-label="Time of day"
      />
    </div>
  );
}