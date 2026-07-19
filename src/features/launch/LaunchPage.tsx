import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import RocketScene from "../../three/RocketScene";
import Rocket3D from "../../three/Rocket3D";
import { useRocketState } from "../../mission/useRocketState";
import { SITE_BY_ID } from "../../mission/launchSites";
import { DESTINATION_BY_ID } from "../../mission/destinations";
import { simulateFlight } from "../../physics/simulateFlight";
import { recordMission } from "../../mission/recordMission";
import { sfx } from "../../mission/sound";
import type { FlightResult } from "../../physics/types";
import type { RocketDesign } from "../../three/rocketDesign";
import type { RocketPart } from "../../curriculum/types";

const PLAYBACK_SPEED = 6; // sim-seconds per real second
const MAX_PLAY_SECONDS = 18;

type Phase = "ready" | "countdown" | "flight" | "done";

/** Rocket that follows the simulated trajectory. */
function FlyingRocket({
  design,
  flight,
  playing,
  clockRef,
  partLevels,
}: {
  design: RocketDesign;
  flight: FlightResult;
  playing: boolean;
  clockRef: React.MutableRefObject<{ t: number; altKm: number }>;
  partLevels?: Partial<Record<RocketPart, 1 | 2 | 3>>;
}) {
  const group = useRef<THREE.Group>(null);
  const shake = useRef(0);
  const [staged, setStaged] = useState(false);
  const stagingEvent = flight.events.find((e) => e.label.toLowerCase().includes("staging") || e.label.toLowerCase().includes("booster"));
  const [flame, setFlame] = useState(0);

  useFrame((_, dt) => {
    if (!group.current) return;
    if (!playing) {
      group.current.position.y = 0;
      return;
    }
    clockRef.current.t = Math.min(clockRef.current.t + dt * PLAYBACK_SPEED, flight.apogeeT);
    const t = clockRef.current.t;
    // Find altitude at t
    const i = flight.samples.findIndex((s) => s.t >= t);
    const s = flight.samples[Math.max(0, i)] ?? flight.samples[flight.samples.length - 1];
    clockRef.current.altKm = s?.altitude ?? 0;
    // Scene y: log-ish scaling so the rocket visibly climbs then leaves frame
    const y = Math.min(180, (s?.altitude ?? 0) * 3 + t * 0.4);
    shake.current = t < 4 ? Math.sin(t * 60) * 0.03 : 0;
    group.current.position.set(shake.current, y, shake.current * 0.7);
    const wantStaged = !!stagingEvent && t >= stagingEvent.t;
    if (wantStaged !== staged) setStaged(wantStaged);
    const wantFlame = t < flight.burnoutT ? 1 : 0;
    if (wantFlame !== flame) setFlame(wantFlame);
  });

  return (
    <group ref={group}>
      <Rocket3D
        design={design}
        complete
        engineFlame={playing ? flame : 0}
        hideBoosters={staged}
        partLevels={partLevels}
      />
    </group>
  );
}

export default function LaunchPage() {
  const navigate = useNavigate();
  const profile = useRocketState((s) => s.profile);
  const design = useRocketState((s) => s.design);
  const destinationId = useRocketState((s) => s.destinationId);
  const tasksCorrect = useRocketState((s) => s.tasksCorrect);
  const tasksTotal = useRocketState((s) => s.tasksTotal);
  const setLastFlight = useRocketState((s) => s.setLastFlight);
  const setLastMission = useRocketState((s) => s.setLastMission);
  const refreshProfile = useRocketState((s) => s.init);

  const [phase, setPhase] = useState<Phase>("ready");
  const [count, setCount] = useState(3);
  const [altReadout, setAltReadout] = useState(0);
  const [recording, setRecording] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const clockRef = useRef({ t: 0, altKm: 0 });
  const recorderRef = useRef<MediaRecorder | null>(null);
  const savedRef = useRef(false);

  const site = SITE_BY_ID[profile?.launchSiteId ?? "canaveral"];
  const dest = DESTINATION_BY_ID[destinationId];
  const quality = tasksTotal > 0 ? tasksCorrect / tasksTotal : 1;
  const flight = useMemo(() => simulateFlight(design, quality), [design, quality]);
  const reached = flight.maxAltitudeKm >= (dest?.requiredAltitudeKm ?? 150);

  // Countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count <= 0) {
      sfx.launch();
      setPhase("flight");
      return;
    }
    sfx.countdown();
    const id = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, count]);

  // Flight progress → done
  useEffect(() => {
    if (phase !== "flight") return;
    const readout = setInterval(() => setAltReadout(clockRef.current.altKm), 120);
    const doneAfter = Math.min(MAX_PLAY_SECONDS, flight.apogeeT / PLAYBACK_SPEED + 2) * 1000;
    const id = setTimeout(async () => {
      clearInterval(readout);
      if (!savedRef.current) {
        savedRef.current = true;
        const screenshot = canvasRef.current?.toDataURL("image/png");
        setLastFlight({ ...flight, screenshot });
        const { missionId, newPatches } = await recordMission(
          {
            destinationId,
            launchSiteId: site.id,
            tasksCorrect,
            tasksTotal,
            maxAltitudeKm: flight.maxAltitudeKm,
            reachedDestination: reached,
            screenshot,
            photos: [],
          },
          tasksTotal > 0 && tasksCorrect === tasksTotal,
        );
        setLastMission(missionId, newPatches);
        await refreshProfile();
      }
      setPhase("done");
    }, doneAfter);
    return () => {
      clearTimeout(id);
      clearInterval(readout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const toggleRecording = () => {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const stream = canvas.captureStream(30);
    const rec = new MediaRecorder(stream, { mimeType: "video/webm" });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    rec.onstop = () => {
      const url = URL.createObjectURL(new Blob(chunks, { type: "video/webm" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `launch-film-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    };
    rec.start();
    recorderRef.current = rec;
    setRecording(true);
  };

  const skyColor = phase === "flight" && altReadout > 40 ? "#05060f" : phase === "flight" && altReadout > 10 ? "#101a3f" : "#12204d";

  return (
    <div className="relative h-full">
      <div className="absolute inset-0">
        <RocketScene
          site={site}
          skyColor={skyColor}
          towerRetracted={phase !== "ready"}
          cameraDistance={16}
          onCanvasReady={(c) => (canvasRef.current = c)}
        >
          <FlyingRocket
            design={design}
            flight={flight}
            playing={phase === "flight" || phase === "done"}
            clockRef={clockRef}
            partLevels={profile?.partLevels}
          />
        </RocketScene>
      </div>

      {/* HUD */}
      <div className="absolute top-4 left-4 hud-panel px-4 py-2 text-sm z-10">
        🚀 Mission to {dest?.emoji} {dest?.name} — lifting off from {site.name}
      </div>
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button className={`btn-ghost !px-3 !py-1 text-xs ${recording ? "!border-red-400 !text-red-300" : ""}`} onClick={toggleRecording}>
          {recording ? "⏹ Stop film" : "🎬 Record launch film"}
        </button>
        <button className="btn-ghost !px-3 !py-1 text-xs" onClick={() => navigate("/vab")}>← VAB</button>
      </div>

      {phase === "flight" && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hud-panel px-6 py-2 z-10 text-center">
          <div className="text-2xl font-black text-cyan-200 neon tabular-nums">{altReadout.toFixed(1)} km</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-widest">altitude</div>
        </div>
      )}

      {phase === "ready" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <button
            className="pointer-events-auto text-2xl font-black rounded-2xl px-10 py-5 bg-red-600/80 hover:bg-red-500 border-2 border-red-300 shadow-glow transition"
            onClick={() => {
              setCount(3);
              setPhase("countdown");
            }}
          >
            🔴 LAUNCH
          </button>
        </div>
      )}

      {phase === "countdown" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="text-9xl font-black text-amber-300 neon animate-pulse">{count === 0 ? "🔥" : count}</div>
        </div>
      )}

      {phase === "done" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-space-950/60 backdrop-blur-sm">
          <div className="hud-panel p-6 max-w-md w-full text-center space-y-3">
            <div className="text-5xl">{reached ? dest?.emoji : "🌤"}</div>
            <h2 className="text-xl font-black text-cyan-200 neon">
              {reached ? `${dest?.name} reached, Commander!` : "A mighty climb, Commander!"}
            </h2>
            <p className="text-sm text-slate-300">
              Peak altitude <span className="text-cyan-300 font-bold">{flight.maxAltitudeKm.toLocaleString("en-GB")} km</span>
              {reached
                ? " — destination confirmed. Beautiful engineering."
                : ` — ${dest?.name} needs ${dest?.requiredAltitudeKm.toLocaleString("en-GB")} km. The report shows exactly what to tune next time.`}
            </p>
            {flight.struggledOffPad && <p className="text-xs text-amber-300">The rocket strained off the pad — TWR was low.</p>}
            {flight.tumbled && <p className="text-xs text-amber-300">It tumbled in the wind — more fin stability would help.</p>}
            <button className="btn-primary w-full justify-center" onClick={() => navigate("/report")}>
              📋 After-action report →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}