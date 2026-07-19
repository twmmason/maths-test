import type { RocketDesign } from "../three/rocketDesign";
import { computePerformance } from "../physics/computePerformance";
import { DESTINATION_BY_ID } from "../mission/destinations";

function Bar({ frac, warn }: { frac: number; warn?: boolean }) {
  return (
    <div className="stat-bar w-24">
      <div className={`stat-bar-fill ${warn ? "!bg-red-400" : ""}`} style={{ width: `${Math.max(4, Math.min(100, frac * 100))}%` }} />
    </div>
  );
}

export default function PerformancePanel({ design, destinationId }: { design: RocketDesign; destinationId?: string }) {
  const p = computePerformance(design);
  const dest = destinationId ? DESTINATION_BY_ID[destinationId] : undefined;
  const rows: { label: string; value: string; frac: number; warn?: boolean; ok?: boolean }[] = [
    { label: "Total mass", value: `${p.totalMass.toLocaleString("en-GB")} kg`, frac: p.totalMass / 4000 },
    { label: "Total thrust", value: `${p.totalThrust.toLocaleString("en-GB")} kN`, frac: p.totalThrust / 2000 },
    { label: "TWR", value: `${p.twr}`, frac: p.twr / 5, warn: p.twr <= 1.2, ok: p.twr > 1.2 },
    { label: "Δv", value: `${p.deltaV.toLocaleString("en-GB")} m/s`, frac: p.deltaV / 4000 },
    { label: "Drag coeff", value: `${p.dragCoeff}`, frac: p.dragCoeff / 0.5, warn: p.dragCoeff > 0.4 },
    { label: "Stability", value: `${p.stability}`, frac: p.stability / 1.6, warn: p.stability < 0.8, ok: p.stability >= 0.8 },
    { label: "Burn time", value: `${p.burnTime} s`, frac: p.burnTime / 120 },
    { label: "Max altitude", value: `~${p.maxAltitude.toLocaleString("en-GB")} km`, frac: p.maxAltitude / 1600 },
  ];
  return (
    <div className="hud-panel p-3 text-xs space-y-1.5">
      <div className="hud-title mb-1">🚀 Rocket performance</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-2">
          <span className="text-slate-300 w-24">{r.label}</span>
          <Bar frac={r.frac} warn={r.warn} />
          <span className={`w-24 text-right font-semibold ${r.warn ? "text-red-300" : r.ok ? "text-emerald-300" : "text-cyan-200"}`}>
            {r.value} {r.warn ? "⚠️" : r.ok ? "✅" : ""}
          </span>
        </div>
      ))}
      <div className={`pt-1 font-bold ${p.flightReady ? "text-emerald-300" : "text-amber-300"}`}>
        Status: {p.flightReady ? "FLIGHT-READY ✅" : p.stability < 0.8 ? "⚠️ UNSTABLE — add more fins" : p.twr <= 1.2 ? "⚠️ TOO HEAVY — more thrust or less mass" : "⚠️ NEEDS FUEL"}
      </div>
      {dest && (
        <div className="text-cyan-300/70">
          {dest.journey
            ? `Destination: ${dest.name}, ${dest.journey.distance} away (${dest.journey.burnName} needs ${dest.requiredAltitudeKm.toLocaleString("en-GB")} km)`
            : `Destination: ${dest.name} (needs ${dest.requiredAltitudeKm.toLocaleString("en-GB")} km)`}
          {p.maxAltitude >= dest.requiredAltitudeKm ? " — in range ✅" : " — not in range yet"}
        </div>
      )}
    </div>
  );
}