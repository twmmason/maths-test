import type { WidgetProps } from "./types";
import { cfgNum, cfgStr } from "./types";

/** Standard-form dual readout: ordinary ↔ A × 10^n with steppers for A and n. */
export default function StandardFormWidget({ task, value, onChange, disabled }: WidgetProps) {
  const mode = cfgStr(task, "mode", "read");
  const a = cfgNum(task, "a", 1);
  const n = cfgNum(task, "n", 0);
  const target = cfgNum(task, "targetOrdinary", NaN);

  // build mode state parsed from value "A × 10^n"
  const mth = value.match(/(-?[\d.]+)\s*[×x]\s*10\^(-?\d+)/);
  const curA = mth ? Number(mth[1]) : 1.0;
  const curN = mth ? Number(mth[2]) : 0;
  const set = (na: number, nn: number) => onChange(`${Math.round(na * 10) / 10} × 10^${nn}`);

  if (mode === "read") {
    return (
      <div className="flex flex-col items-center gap-1 py-2">
        <div className="rounded-lg border border-emerald-500/50 bg-black/70 px-6 py-3 font-mono text-2xl text-emerald-300">
          {a} × 10<sup>{n}</sup>
        </div>
        <div className="text-[11px] text-slate-400">spectrometer readout — standard form</div>
      </div>
    );
  }

  const Stepper = ({ label, val, onDown, onUp }: { label: string; val: string; onDown: () => void; onUp: () => void }) => (
    <div className="flex items-center gap-2">
      <span className="w-24 text-right text-xs text-cyan-200">{label}</span>
      <button type="button" disabled={disabled} onClick={onDown} aria-label={`decrease ${label}`}
        className="h-8 w-8 rounded border border-cyan-600/60 text-cyan-200 hover:bg-cyan-500/20">−</button>
      <span className="w-12 text-center font-mono text-amber-300">{val}</span>
      <button type="button" disabled={disabled} onClick={onUp} aria-label={`increase ${label}`}
        className="h-8 w-8 rounded border border-cyan-600/60 text-cyan-200 hover:bg-cyan-500/20">+</button>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-2 py-2">
      {Number.isFinite(target) && (
        <div className="text-[11px] text-slate-400">ordinary reading: <span className="font-mono text-cyan-200">{target}</span></div>
      )}
      <div className="rounded-lg border border-emerald-500/50 bg-black/70 px-6 py-3 font-mono text-2xl text-emerald-300">
        {Math.round(curA * 10) / 10} × 10<sup>{curN}</sup>
      </div>
      <Stepper label="leading digit A" val={String(Math.round(curA * 10) / 10)}
        onDown={() => set(Math.max(1, curA - 0.1), curN)} onUp={() => set(Math.min(9.9, curA + 0.1), curN)} />
      <Stepper label="power n" val={String(curN)}
        onDown={() => set(curA, curN - 1)} onUp={() => set(curA, curN + 1)} />
    </div>
  );
}
