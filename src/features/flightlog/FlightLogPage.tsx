import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, type MissionRecord, type Attempt } from "../../db/db";
import { useRocketState } from "../../mission/useRocketState";
import { computeMastery, masteryPercent, type CriterionMastery } from "../../engine/mastery";
import { CRITERIA, STRANDS } from "../../curriculum/criteria";
import { PATCHES } from "../../mission/patches";
import { DESTINATION_BY_ID } from "../../mission/destinations";
import { SITE_BY_ID } from "../../mission/launchSites";

function CoverageMap({ mastery, attempts }: { mastery: Map<string, CriterionMastery>; attempts: Attempt[] }) {
  const attempted = new Set(attempts.map((a) => a.criterionCode));
  return (
    <div className="space-y-2">
      {STRANDS.map((strand) => {
        const items = CRITERIA.filter((c) => c.strand === strand.id);
        return (
          <div key={strand.id} className="flex items-center gap-2">
            <div className="w-40 shrink-0 text-xs text-slate-400">{strand.label}</div>
            <div className="flex flex-wrap gap-1">
              {items.map((c) => {
                const m = mastery.get(c.code);
                const cls = m?.mastered
                  ? "bg-emerald-400/80 border-emerald-300"
                  : attempted.has(c.code)
                    ? "bg-amber-400/60 border-amber-300"
                    : "bg-space-700 border-slate-600";
                return (
                  <div
                    key={c.code}
                    title={`${c.code} — ${c.description}${m?.mastered ? " ✅ mastered" : attempted.has(c.code) ? " · in progress" : ""}`}
                    className={`w-4 h-4 rounded-sm border ${cls}`}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="flex gap-4 text-[10px] text-slate-500 pt-1">
        <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-400/80 mr-1" />mastered</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-400/60 mr-1" />in progress</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-space-700 border border-slate-600 mr-1" />not yet flown</span>
      </div>
    </div>
  );
}

export default function FlightLogPage() {
  const navigate = useNavigate();
  const profile = useRocketState((s) => s.profile);
  const [missions, setMissions] = useState<MissionRecord[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  useEffect(() => {
    void db.missions.orderBy("createdAt").reverse().toArray().then(setMissions);
    void db.attempts.toArray().then(setAttempts);
  }, []);

  const mastery = computeMastery(attempts);
  const pct = Math.round(masteryPercent(mastery) * 100);
  const correct = attempts.filter((a) => a.correct).length;

  return (
    <div className="h-full overflow-auto p-4">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-cyan-200 neon">📡 Flight Log — Telemetry Console</h1>
          <button className="btn-ghost !px-3 !py-1 text-xs" onClick={() => navigate("/")}>← Hangar</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Missions flown", value: missions.length, emoji: "🚀" },
            { label: "XP", value: profile?.xp ?? 0, emoji: "⭐" },
            { label: "Launch streak", value: `${profile?.launchStreak ?? 0} days`, emoji: "🔥" },
            { label: "Curriculum mastered", value: `${pct}%`, emoji: "🧠" },
          ].map((s) => (
            <div key={s.label} className="hud-panel p-3 text-center">
              <div className="text-2xl">{s.emoji}</div>
              <div className="text-xl font-black text-cyan-200 tabular-nums">{s.value}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Coverage map */}
        <div className="hud-panel p-4">
          <div className="text-xs text-slate-400 uppercase tracking-widest mb-3">
            🗺 Maths coverage map — {correct} engineering tasks locked in
          </div>
          <CoverageMap mastery={mastery} attempts={attempts} />
        </div>

        {/* Patches */}
        <div className="hud-panel p-4">
          <div className="text-xs text-slate-400 uppercase tracking-widest mb-3">🏅 Mission patches</div>
          <div className="flex flex-wrap gap-2">
            {PATCHES.map((p) => {
              const earned = profile?.patches.includes(p.id);
              return (
                <div
                  key={p.id}
                  title={p.description}
                  className={`text-xs rounded-full px-3 py-1.5 border ${
                    earned ? "bg-amber-500/15 border-amber-400/50 text-amber-200" : "bg-space-800/60 border-slate-700 text-slate-600"
                  }`}
                >
                  {p.emoji} {p.name}
                </div>
              );
            })}
          </div>
        </div>

        {/* Mission scrapbook */}
        <div className="hud-panel p-4">
          <div className="text-xs text-slate-400 uppercase tracking-widest mb-3">📔 Mission scrapbook</div>
          {missions.length === 0 ? (
            <p className="text-sm text-slate-500">No launches yet, Commander — the pad is waiting.</p>
          ) : (
            <div className="space-y-3">
              {missions.map((m) => {
                const dest = DESTINATION_BY_ID[m.destinationId];
                const site = m.launchSiteId ? SITE_BY_ID[m.launchSiteId] : undefined;
                return (
                  <div key={m.id} className="flex gap-3 items-start border border-slate-700/60 rounded-xl p-3 bg-space-900/40">
                    {m.screenshot && <img src={m.screenshot} alt="" className="w-24 h-16 object-cover rounded-lg shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-cyan-200">
                        {dest?.emoji} {dest?.name ?? m.destinationId}
                        {site ? <span className="text-slate-400 font-normal"> from {site.name}</span> : null}
                        {m.reachedDestination ? " ✅" : " 🌤"}
                      </div>
                      <div className="text-xs text-slate-400">
                        {new Date(m.createdAt).toLocaleDateString("en-GB")} · peak {Math.round(m.maxAltitudeKm).toLocaleString("en-GB")} km ·
                        tasks {m.tasksCorrect}/{m.tasksTotal}
                      </div>
                      {m.photos && m.photos.length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {m.photos.map((p, i) => (
                            <img key={i} src={p} alt="mission photo" className="w-20 h-14 object-cover rounded-md border border-cyan-500/20" />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}