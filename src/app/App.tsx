import { useEffect } from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import { useRocketState } from "../mission/useRocketState";
import { soundEnabled, setSoundEnabled } from "../mission/sound";
import HangarPage from "../features/hangar/HangarPage";
import VABPage from "../features/vab/VABPage";
import LaunchPage from "../features/launch/LaunchPage";
import ReportPage from "../features/report/ReportPage";
import FlightLogPage from "../features/flightlog/FlightLogPage";
import SandboxPage from "../features/sandbox/SandboxPage";
import DevStatusPage from "../features/dev/DevStatusPage";
import { useState } from "react";

const links = [
  { to: "/", label: "🏠 Hangar" },
  { to: "/vab", label: "🏗️ VAB" },
  { to: "/launch", label: "🚀 Launch" },
  { to: "/flightlog", label: "📡 Flight Log" },
  { to: "/sandbox", label: "🧪 Sandbox" },
];

export default function App() {
  const init = useRocketState((s) => s.init);
  const ready = useRocketState((s) => s.ready);
  const profile = useRocketState((s) => s.profile);
  const [sound, setSound] = useState(soundEnabled());

  useEffect(() => {
    void init();
  }, [init]);

  if (!ready) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-cyan-300 neon animate-pulse text-xl">Powering up Mission Control…</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <nav className="flex items-center gap-2 px-4 py-2 border-b border-cyan-500/20 bg-space-900/70 backdrop-blur z-20">
        <span className="text-lg font-bold neon text-cyan-300 mr-2">🚀 Artie's Rocket Lab</span>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/"}
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                isActive ? "bg-cyan-500/20 text-cyan-200 shadow-glow" : "text-slate-300 hover:text-cyan-200 hover:bg-cyan-500/10"
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
        <div className="ml-auto flex items-center gap-3 text-sm">
          <button
            className="btn-ghost !px-2 !py-1 text-xs"
            onClick={() => {
              setSoundEnabled(!sound);
              setSound(!sound);
            }}
            aria-label="Toggle sound"
          >
            {sound ? "🔊 Sound on" : "🔇 Sound off"}
          </button>
          <span className="text-amber-300">⭐ {profile?.xp ?? 0} XP</span>
          <span className="text-orange-300">🔥 {profile?.launchStreak ?? 0} day streak</span>
        </div>
      </nav>
      <main className="flex-1 min-h-0 overflow-auto">
        <Routes>
          <Route path="/" element={<HangarPage />} />
          <Route path="/vab" element={<VABPage />} />
          <Route path="/launch" element={<LaunchPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/flightlog" element={<FlightLogPage />} />
          <Route path="/sandbox" element={<SandboxPage />} />
          <Route path="/dev/status" element={<DevStatusPage />} />
        </Routes>
      </main>
    </div>
  );
}