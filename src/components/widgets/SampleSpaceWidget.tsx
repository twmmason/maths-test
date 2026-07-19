import type { WidgetProps } from "./types";
import { cfgStr } from "./types";

/** Sample-space grid for combined events (e.g. two redundant switches). */
export default function SampleSpaceWidget({ task }: WidgetProps) {
  const rows = cfgStr(task, "rows", "ON,OFF").split(",");
  const cols = cfgStr(task, "cols", "ON,OFF").split(",");
  const rowName = cfgStr(task, "rowName", "switch A");
  const colName = cfgStr(task, "colName", "switch B");
  const highlight = cfgStr(task, "highlight"); // e.g. "ON" — cells containing it glow

  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <table className="border-collapse text-xs" aria-label="Sample space grid">
        <thead>
          <tr>
            <th className="p-1 text-slate-500">{rowName} \ {colName}</th>
            {cols.map((c) => (
              <th key={c} className="border border-cyan-800/60 p-1.5 text-cyan-300">{c.trim()}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r}>
              <th className="border border-cyan-800/60 p-1.5 text-cyan-300">{r.trim()}</th>
              {cols.map((c) => {
                const combo = `${r.trim()}-${c.trim()}`;
                const hot = highlight && combo.includes(highlight);
                return (
                  <td key={c} className={`border border-cyan-800/60 p-1.5 text-center font-mono ${hot ? "bg-amber-500/20 text-amber-300" : "text-slate-300"}`}>
                    {combo}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-[11px] text-slate-400">every equally-likely outcome, one cell each</div>
    </div>
  );
}
