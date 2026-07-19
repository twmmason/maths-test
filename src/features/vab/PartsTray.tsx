import { useState } from "react";
import type { RocketPart } from "../../curriculum/types";
import { PART_LABELS, variantsFor, type PartVariant } from "../../mission/partsCatalog";
import { PART_STRANDS } from "../../mission/parts";
import { STAGES } from "../../mission/stages";
import { useRocketState } from "../../mission/useRocketState";
import { sfx } from "../../mission/sound";

export default function PartsTray() {
  const [tab, setTab] = useState<RocketPart>("hull");
  const [radial, setRadial] = useState<2 | 3 | 4>(4);
  const design = useRocketState((s) => s.design);
  const profile = useRocketState((s) => s.profile);
  const attachPart = useRocketState((s) => s.attachPart);
  const detachPart = useRocketState((s) => s.detachPart);

  const installed = design.installedParts[tab];
  // Compute live part level from attempts (not the stale profile.partLevels)
  const level = useRocketState((s) => {
    // This updates after refreshMastery runs
    const stored = s.profile?.partLevels[tab] ?? 1;
    return stored;
  });
  const radialCategory = tab === "fins" || tab === "booster";

  return (
    <div className="h-full flex flex-col hud-panel overflow-hidden">
      <div className="hud-title p-3 pb-2">🧰 Parts catalogue</div>
      {/* Category tabs */}
      <div className="grid grid-cols-4 gap-1 px-2 pb-2">
        {STAGES.map((s) => {
          const inst = design.installedParts[s.part];
          return (
            <button
              key={s.part}
              title={PART_LABELS[s.part].label}
              className={`rounded-lg py-1.5 text-lg transition relative ${
                tab === s.part ? "bg-cyan-500/25 shadow-glow" : "bg-space-800/60 hover:bg-cyan-500/10"
              }`}
              onClick={() => setTab(s.part)}
            >
              {s.emoji}
              {inst && (
                <span className={`absolute -top-1 -right-1 text-[9px] ${inst.certified ? "" : "opacity-80"}`}>
                  {inst.certified ? "✅" : "🟡"}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="px-3 text-xs text-cyan-300/70 pb-1">
        {PART_LABELS[tab].label} · certified by {PART_STRANDS[tab].join(" & ")} maths
      </div>
      {radialCategory && (
        <div className="px-3 pb-2 flex items-center gap-1 text-xs">
          <span className="text-slate-400">Symmetry:</span>
          {([2, 3, 4] as const).map((n) => (
            <button
              key={n}
              className={`px-2 py-0.5 rounded ${radial === n ? "bg-cyan-500/25 text-cyan-200" : "bg-space-800 text-slate-300"}`}
              onClick={() => setRadial(n)}
            >
              ×{n}
            </button>
          ))}
        </div>
      )}
      {/* Variants */}
      <div className="flex-1 overflow-auto px-2 pb-2 space-y-2">
        {variantsFor(tab).map((v) => (
          <VariantCard
            key={v.id}
            variant={v}
            locked={v.unlockLevel > level}
            installed={installed?.variantId === v.id}
            onAttach={() => {
              sfx.snap();
              void attachPart(v.id, radialCategory ? radial : undefined);
            }}
          />
        ))}
        {installed && (
          <button className="w-full btn-ghost !py-1.5 text-xs justify-center" onClick={() => void detachPart(tab)}>
            🗑 Detach {PART_LABELS[tab].label.replace(/s$/, "").toLowerCase()}
          </button>
        )}
      </div>
    </div>
  );
}

function VariantCard({ variant, locked, installed, onAttach }: { variant: PartVariant; locked: boolean; installed: boolean; onAttach: () => void }) {
  const statLines = Object.entries(variant.stats)
    .filter(([k]) => k !== "installedParts")
    .map(([k, v]) => `${statLabel(k)}: ${typeof v === "boolean" ? (v ? "yes" : "no") : v}`);
  return (
    <div
      className={`rounded-xl border p-2.5 transition ${
        installed
          ? "border-emerald-400/60 bg-emerald-500/10"
          : locked
            ? "border-slate-700 bg-space-800/40 opacity-60"
            : "border-cyan-500/25 bg-space-800/60 hover:border-cyan-400/60"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold">
          {variant.emoji} {variant.name}
        </div>
        {locked ? (
          <span className="text-[10px] text-amber-300">🔒 Lv{variant.unlockLevel}</span>
        ) : installed ? (
          <span className="text-[10px] text-emerald-300">fitted</span>
        ) : (
          <button className="btn-primary !px-2 !py-0.5 text-[11px]" onClick={onAttach}>
            Attach
          </button>
        )}
      </div>
      <div className="text-[11px] text-slate-400 mt-0.5">{variant.description}</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {statLines.map((s) => (
          <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300/90">
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function statLabel(key: string): string {
  const map: Record<string, string> = {
    noseAngle: "tip angle°",
    noseHeight: "height m",
    hullHeight: "height m",
    hullRadius: "radius m",
    hullPanels: "panels",
    tankFill: "base fill",
    fuelRatio: "mix ratio",
    engineCount: "engines",
    thrustPerEngine: "thrust kN",
    finCount: "fins",
    finSymmetry: "symmetry",
    payloadPods: "pods",
    payloadPerPod: "kg per pod",
    boosterCount: "boosters",
    circuitsWired: "circuits",
    powerBalanced: "balanced",
  };
  return map[key] ?? key;
}