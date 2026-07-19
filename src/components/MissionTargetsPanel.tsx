import { useEffect, useMemo, useState } from "react";
import { missionsFor } from "../db/db";
import { targetsForMission, evaluateTargets, medalFor, MEDAL_EMOJI, type MissionTarget } from "../mission/targets";
import { simulateFlight } from "../physics/simulateFlight";
import type { RocketDesign } from "../three/rocketDesign";
import type { FlightResult } from "../physics/types";

/**
 * Mission engineering targets — fresh, deterministic values every mission.
 * mode "next": shown in the VAB with a LIVE prediction from the sim so
 * tuning has a purpose. mode "last": final evaluation for the report.
 */
export default function MissionTargetsPanel({
  profileId,
  destinationId,
  design,
  flight,
  mode,
}: {
  profileId: string;
  destinationId: string;
  design: RocketDesign;
  /** Provide the flown flight for mode "last"; omitted for "next" (predicted). */
  flight?: FlightResult;
  mode: "next" | "last";
}) {
  const [missionIndex, setMissionIndex] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    void missionsFor(profileId).then((ms) => {
      if (live) setMissionIndex(mode === "next" ? ms.length : Math.max(0, ms.length - 1));
    });
    return () => {
      live = false;
    };
  }, [profileId, mode, destinationId]);

  const targets: MissionTarget[] = useMemo(
    () => (missionIndex === null ? [] : targetsForMission(profileId, destinationId, missionIndex)),
    [profileId, destinationId, missionIndex],
  );
  const evalFlight = useMemo(() => flight ?? simulateFlight(design, 1), [flight, design]);
  const results = useMemo(() => evaluateTargets(targets, design, evalFlight), [targets, design, evalFlight]);
  const medal = medalFor(results);

  if (missionIndex === null || targets.length === 0) return null;

  return (
    <div className="hud-panel p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs text-cyan-300 uppercase tracking-widest">
          🎯 Mission targets {mode === "next" ? "— this launch" : "— results"}
        </div>
        <div className="text-sm" title={`Medal: ${medal}`}>
          {MEDAL_EMOJI[medal]}
        </div>
      </div>
      {results.map((r) => (
        <div key={r.target.id} className="flex items-start justify-between gap-2 text-xs">
          <span className={r.met ? "text-emerald-200" : "text-slate-300"}>
            {r.met ? "✅" : mode === "next" ? "⬜" : "❌"} {r.target.label}
          </span>
          <span className={`tabular-nums shrink-0 ${r.met ? "text-emerald-300" : "text-amber-300"}`}>
            {typeof r.actual === "number" ? `${r.actual.toLocaleString("en-GB")}${r.target.unit ? ` ${r.target.unit}` : ""}` : r.actual}
          </span>
        </div>
      ))}
      {mode === "next" && (
        <div className="text-[10px] text-slate-500">
          Live prediction from the deterministic sim — tune the parts until every box ticks. New targets every mission.
        </div>
      )}
    </div>
  );
}