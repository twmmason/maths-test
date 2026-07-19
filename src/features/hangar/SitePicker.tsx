import { LAUNCH_SITES } from "../../mission/launchSites";
import { useRocketState } from "../../mission/useRocketState";

export default function SitePicker({ onClose }: { onClose: () => void }) {
  const profile = useRocketState((s) => s.profile);
  const setLaunchSite = useRocketState((s) => s.setLaunchSite);

  return (
    <div className="fixed inset-0 z-40 bg-space-950/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <div className="hud-panel p-5 max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-cyan-200 neon">🌍 Choose your launch site</h2>
          <button className="btn-ghost !px-3 !py-1 text-sm" onClick={onClose}>✕</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {LAUNCH_SITES.map((site) => {
            const active = profile?.launchSiteId === site.id;
            return (
              <button
                key={site.id}
                className={`text-left rounded-xl border p-3 transition ${
                  active ? "border-cyan-400 bg-cyan-500/15 shadow-glow" : "border-cyan-500/20 bg-space-800/60 hover:border-cyan-400/60"
                }`}
                onClick={async () => {
                  await setLaunchSite(site.id);
                  onClose();
                }}
              >
                <div className="text-sm font-bold text-slate-100">{site.country.split(" ")[0]} {site.name}</div>
                <div className="text-[11px] text-cyan-300/70 mt-0.5">{site.country.split(" ").slice(1).join(" ")}</div>
                <div className="text-xs text-slate-300 mt-1">{site.description}</div>
                {active && <div className="text-[11px] text-emerald-300 mt-1">✓ Current spaceport</div>}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-400 mt-3">
          The site changes your view from the pad — it never changes the engineering tasks.
        </p>
      </div>
    </div>
  );
}