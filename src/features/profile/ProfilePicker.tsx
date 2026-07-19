import { useEffect, useState } from "react";
import type { Profile } from "../../db/db";
import { listProfiles, createProfile, selectProfile } from "../../db/seed";
import { useRocketState } from "../../mission/useRocketState";

/**
 * Full-screen commander picker shown on load until a profile is chosen.
 * Pick an existing commander card or type a new name — the whole app then
 * becomes "{Name}'s Rocket Lab".
 */
export default function ProfilePicker() {
  const activateProfile = useRocketState((s) => s.activateProfile);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void listProfiles().then((p) => {
      setProfiles(p);
      setLoaded(true);
    });
  }, []);

  const [year7, setYear7] = useState(false);

  const pick = async (id: string) => {
    if (busy) return;
    setBusy(true);
    const profile = await selectProfile(id);
    if (profile) await activateProfile(profile);
    setBusy(false);
  };

  const create = async () => {
    const clean = name.trim();
    if (!clean || busy) return;
    setBusy(true);
    const profile = await createProfile(clean, year7);
    await activateProfile(profile);
    setBusy(false);
  };

  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="hud-panel max-w-lg w-full p-8 text-center">
        <div className="text-5xl mb-3">🚀</div>
        <h1 className="text-3xl font-bold neon text-cyan-300 mb-2">Rocket Lab</h1>
        <p className="text-slate-300 mb-6">Who's on shift at Mission Control today, Commander?</p>

        {loaded && profiles.length > 0 && (
          <div className="mb-6">
            <div className="text-xs uppercase tracking-widest text-cyan-400 mb-2">Returning commanders</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  className="hud-panel !p-4 text-left hover:border-cyan-400/60 hover:shadow-glow transition"
                  onClick={() => void pick(p.id)}
                  disabled={busy}
                >
                  <div className="font-bold text-cyan-200 text-lg">🧑‍🚀 {p.name}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    ⭐ {p.xp} XP · 🏅 {p.patches.length} patches
                  </div>
                </button>
              ))}
            </div>
            <div className="text-xs uppercase tracking-widest text-cyan-400 mt-6 mb-2">…or a new commander</div>
          </div>
        )}

        <div className="flex gap-2 justify-center">
          <input
            className="flex-1 max-w-xs rounded-lg bg-space-800 border border-cyan-500/30 px-4 py-2.5 text-cyan-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            placeholder="Type your name (e.g. Artie, Walter)"
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void create();
            }}
            autoFocus={profiles.length === 0}
            aria-label="Commander name"
          />
          <button className="btn-primary" onClick={() => void create()} disabled={!name.trim() || busy}>
            Start engineering →
          </button>
        </div>
        <label className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={year7}
            onChange={(e) => setYear7(e.target.checked)}
            aria-label="I'm in Year 7 or above — open the Astronaut Academy straight away"
          />
          🎓 I'm in Year 7+ — open the Astronaut Academy straight away
        </label>
        <p className="text-xs text-slate-500 mt-4">
          Each commander gets their own rocket, XP, patches and mission log — all saved on this device.
        </p>
      </div>
    </div>
  );
}