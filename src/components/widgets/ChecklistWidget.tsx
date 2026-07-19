import type { WidgetProps } from "./types";
import { cfgStr } from "./types";

const SYSTEM_ICONS: Record<string, string> = {
  guidance: "🧭",
  lifeSupport: "🫁",
  comms: "📡",
  power: "🔋",
  navigation: "🛰️",
  fuel: "⛽",
};

/** Rapid-fire system check header. */
export default function ChecklistWidget({ task }: WidgetProps) {
  const system = cfgStr(task, "system", "guidance");
  return (
    <div className="py-2 flex items-center justify-center gap-3">
      <div className="text-3xl">{SYSTEM_ICONS[system] ?? "✅"}</div>
      <div className="text-xs text-cyan-300/80 uppercase tracking-widest">Pre-flight system check</div>
    </div>
  );
}