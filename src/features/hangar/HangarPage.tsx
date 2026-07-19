import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import RocketScene from "../../three/RocketScene";
import Rocket3D from "../../three/Rocket3D";
import { useRocketState } from "../../mission/useRocketState";
import { DESTINATIONS } from "../../mission/destinations";
import { SITE_BY_ID } from "../../mission/launchSites";
import { PATCH_BY_ID } from "../../mission/patches";
import SitePicker from "./SitePicker";
import MissionCamera from "../../components/MissionCamera";
import TimeOfDaySlider from "../../components/TimeOfDaySlider";

export default function HangarPage() {
  const navigate = useNavigate();
  const profile = useRocketState((s) => s.profile);
  const design = useRocketState((s) => s.design);
  const destinationId = useRocketState((s) => s.destinationId);
  const setDestination = useRocketState((s) => s.setDestination);
  const masteryPct = useRocketState((s) => s.masteryPct);
  const masteryProgressPct = useRocketState((s) => s.masteryProgressPct);
  const ks3MasteryPct = useRocketState((s) => s.ks3MasteryPct);
  const academyOpen = useRocketState((s) => s.academyOpen);
  const [showSites, setShowSites] = useState(false);
  const [photoMode, setPhotoMode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // First visit: pick the launch site.
  useEffect(() => {
    if (profile && !localStorage.getItem("rocketlab-site-picked")) {
      setShowSites(true);
      localStorage.setItem("rocketlab-site-picked", "1");
    }
  }, [profile]);

  const site = SITE_BY_ID[profile?.launchSiteId ?? "canaveral"];

  return (
    <div className="relative h-full">
      <div className="absolute inset-0">
        <RocketScene site={site} autoRotate={!photoMode} onCanvasReady={(c) => (canvasRef.current = c)}>
          <Rocket3D design={design} complete partLevels={profile?.partLevels} />
        </RocketScene>
      </div>

      {/* Left HUD: mission destination */}
      <div className="absolute left-4 top-4 w-72 space-y-3 z-10">
        <div className="hud-panel p-4">
          <div className="hud-title mb-2">Mission destination</div>
          <div className="space-y-2">
            {DESTINATIONS.map((d) => {
              const isAcademy = d.keyStage === "ks3";
              const locked = isAcademy
                ? !academyOpen || ks3MasteryPct < d.unlockMastery
                : masteryPct < d.unlockMastery;
              const active = destinationId === d.id;
              return (
                <button
                  key={d.id}
                  disabled={locked}
                  className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition ${
                    active
                      ? "border-cyan-400 bg-cyan-500/15 shadow-glow"
                      : locked
                        ? "border-slate-700 bg-space-800/40 opacity-50"
                        : "border-cyan-500/20 bg-space-800/60 hover:border-cyan-400/60"
                  }`}
                  onClick={() => setDestination(d.id)}
                >
                  <div className="font-bold">
                    {d.emoji} {d.name}
                    {isAcademy && !locked && <span className="text-[10px] text-violet-300 ml-2">🎓 Academy</span>}
                    {locked && (
                      <span className="text-[10px] text-amber-300 ml-2">
                        {isAcademy && !academyOpen
                          ? "🎓 Academy opens at 60% KS2 mastery (or Year 7+ toggle)"
                          : `🔒 ${Math.round(d.unlockMastery * 100)}% ${isAcademy ? "KS3 " : ""}mastery`}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">{d.blurb}</div>
                </button>
              );
            })}
          </div>
          <button className="btn-primary w-full mt-3 justify-center" onClick={() => navigate("/vab")}>
            🏗️ Enter the VAB
          </button>
        </div>
      </div>

      {/* Right HUD: site + commander stats */}
      <div className="absolute right-4 top-4 w-64 space-y-3 z-10">
        <div className="hud-panel p-4">
          <div className="hud-title mb-1">Launch site</div>
          <div className="text-sm font-bold">{site.country.split(" ")[0]} {site.name}</div>
          <div className="text-[11px] text-slate-400">{site.description}</div>
          <button className="btn-ghost w-full mt-2 !py-1 text-xs justify-center" onClick={() => setShowSites(true)}>
            🌍 Change site
          </button>
        </div>
        <div className="hud-panel p-4">
          <div className="hud-title mb-1">Commander {profile?.name?.replace("Commander ", "")}</div>
          <div className="text-xs text-slate-300 space-y-1">
            <div>⭐ {profile?.xp ?? 0} XP</div>
            <div>🔥 {profile?.launchStreak ?? 0} day launch streak</div>
            <div>🎯 {masteryProgressPct > 0 ? Math.max(1, Math.round(masteryProgressPct * 100)) : 0}% curriculum progress</div>
          </div>
          {profile && profile.patches.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {profile.patches.slice(0, 8).map((id) => (
                <span key={id} title={PATCH_BY_ID[id]?.name} className="text-lg">
                  {PATCH_BY_ID[id]?.emoji ?? "🏅"}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Time of day */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
        <TimeOfDaySlider />
      </div>

      {/* Mission camera pill + photo overlay */}
      <MissionCamera
        getCanvas={() => canvasRef.current}
        siteName={site.name}
        siteTerrain={site.terrain}
        onPhotoModeChange={setPhotoMode}
      />

      {showSites && <SitePicker onClose={() => setShowSites(false)} />}
    </div>
  );
}