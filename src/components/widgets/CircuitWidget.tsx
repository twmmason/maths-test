import type { WidgetProps } from "./types";
import { cfgNum, cfgStr } from "./types";

/** Breadboard visual: LEDs, bolts, injectors, boards or batteries. */
export default function CircuitWidget({ task }: WidgetProps) {
  const mode = cfgStr(task, "mode", "leds");

  if (mode === "leds") {
    const total = cfgNum(task, "total", 8);
    const lit = cfgNum(task, "lit", 3);
    return (
      <Board label="Status board">
        <div className="flex gap-2 flex-wrap justify-center">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`w-5 h-5 rounded-full border ${
                i < lit ? "bg-emerald-400 border-emerald-200 shadow-glow" : "bg-space-700 border-slate-500"
              }`}
              aria-label={i < lit ? "LED on" : "LED off"}
            />
          ))}
        </div>
      </Board>
    );
  }

  if (mode === "bolts" || mode === "channels") {
    const total = cfgNum(task, "total", 10);
    const done = cfgNum(task, "done", 4);
    return (
      <Board label={mode === "bolts" ? "Mounting plate" : "Engine bell channels"}>
        <div className="flex gap-1.5 flex-wrap justify-center max-w-[280px]">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border text-[8px] flex items-center justify-center ${
                i < done ? "bg-cyan-400 border-cyan-200" : "bg-space-700 border-slate-500 border-dashed"
              }`}
            />
          ))}
        </div>
      </Board>
    );
  }

  if (mode === "injectors" || mode === "thrust") {
    const groups = cfgNum(task, "groups", 3);
    const perGroup = cfgNum(task, "perGroup", 8);
    const dots = Math.min(perGroup, 12);
    return (
      <Board label={mode === "thrust" ? "Engine cluster" : "Injector rings"}>
        <div className="flex gap-3 flex-wrap justify-center">
          {Array.from({ length: Math.min(groups, 8) }).map((_, g) => (
            <div key={g} className="rounded-full border border-cyan-400/40 p-1.5 grid grid-cols-4 gap-0.5">
              {Array.from({ length: dots }).map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-amber-400/80" />
              ))}
            </div>
          ))}
        </div>
        <div className="text-xs text-cyan-300/70 mt-1 text-center">
          {Math.min(groups, 8)} {mode === "thrust" ? "engines" : "rings"} of {perGroup}
        </div>
      </Board>
    );
  }

  if (mode === "boards") {
    const draws = cfgStr(task, "draws", "").split(",").filter(Boolean);
    const fuse = cfgNum(task, "fuse", 600);
    return (
      <Board label={`Main fuse rated ${fuse} W`}>
        <div className="flex gap-2 justify-center">
          {draws.map((d, i) => (
            <div key={i} className="rounded border border-emerald-400/50 bg-emerald-500/10 px-3 py-2 text-center">
              <div className="text-[10px] text-emerald-300">BOARD {String.fromCharCode(65 + i)}</div>
              <div className="text-sm text-amber-300 font-bold">{d} W</div>
            </div>
          ))}
        </div>
      </Board>
    );
  }

  if (mode === "batteries") {
    const count = cfgNum(task, "count", 6);
    const total = cfgNum(task, "total", 48);
    return (
      <Board label={`Battery bank output ${total} W`}>
        <div className="flex gap-1.5 justify-center flex-wrap">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="w-7 h-11 rounded border border-emerald-400/60 bg-emerald-500/15 flex items-center justify-center text-xs">
              🔋
            </div>
          ))}
        </div>
      </Board>
    );
  }

  // mode === "power"
  const panel = cfgNum(task, "panel", 50);
  const mult = cfgNum(task, "mult", 3);
  return (
    <Board label="Power upgrade options">
      <div className="flex gap-4 justify-center text-center text-xs">
        <div className="rounded border border-cyan-400/50 p-2">
          <div>☀️ Second panel</div>
          <div className="text-amber-300 font-bold mt-1">{panel} W each</div>
        </div>
        <div className="rounded border border-violet-400/50 p-2">
          <div>⚡ Booster module</div>
          <div className="text-amber-300 font-bold mt-1">{mult} times output</div>
        </div>
      </div>
    </Board>
  );
}

function Board({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-2">
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 p-3">{children}</div>
      <div className="text-center text-xs text-emerald-300/70 mt-1">{label}</div>
    </div>
  );
}