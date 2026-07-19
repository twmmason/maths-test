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
import { useEffect as useEffectOnce } from "react";
import type { FlightResult } from "../../physics/types";
import type { RocketDesign } from "../../three/rocketDesign";
import type { RocketPart } from "../../curriculum/types";

const PLAYBACK_SPEED = 4; // sim-seconds per real second (slower = more dramatic)
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
  clockRef: React.MutableRefObject<{ t: number; altKm: number; y: number }>;
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
    clockRef.current.t = Math.min(clockRef.current.t + dt * PLAYBACK_SPEED, flight.samples[flight.samples.length - 1]?.t ?? flight.apogeeT);
    const t = clockRef.current.t;
    // Lerp between flight samples for smooth motion (no snapping)
    let alt = 0;
    const samps = flight.samples;
    const idx = samps.findIndex((s) => s.t >= t);
    if (idx <= 0) {
      alt = samps[0]?.altitude ?? 0;
    } else {
      const a = samps[idx - 1], b = samps[idx];
      const frac = b.t > a.t ? (t - a.t) / (b.t - a.t) : 0;
      alt = a.altitude + (b.altitude - a.altitude) * frac;
    }
    clockRef.current.altKm = alt;
    // Scene y: log-ish scaling so the rocket visibly climbs then leaves frame
    const y = Math.min(180, alt * 3 + t * 0.4);
    clockRef.current.y = y;
    // Camera shake: strong rumble during burn, fading after cutoff
    const burnPhase = t < flight.burnoutT ? 1 : Math.max(0, 1 - (t - flight.burnoutT) * 0.5);
    const shakeAmt = burnPhase * (t < 3 ? 0.12 : 0.05); // extra violent at ignition
    shake.current = (Math.sin(t * 47) * 0.6 + Math.sin(t * 113) * 0.4) * shakeAmt;
    const shakeZ = (Math.sin(t * 71) * 0.5 + Math.cos(t * 97) * 0.5) * shakeAmt * 0.7;
    group.current.position.set(shake.current, y, shakeZ);
    const wantStaged = !!stagingEvent && t >= stagingEvent.t;
    if (wantStaged !== staged) setStaged(wantStaged);
    // Flame: ramp up at ignition, full during burn, rapid fade at cutoff
    const flameTarget = t < 0.5 ? t * 2 : t < flight.burnoutT ? 1 : Math.max(0, 1 - (t - flight.burnoutT) * 3);
    setFlame(flameTarget);
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

export const SHOT_NAMES = ["📺 Pad Cam", "📺 Tower Cam", "📺 Tracking Cam", "📺 Chase Cam", "📺 Orbit Cam"] as const;

/** Launch director: pick the shot from the rocket's ACTUAL simulated state —
 *  slow ascents naturally hold each shot longer (altitude-driven cuts). */
function directShot(t: number, y: number): number {
  if (t < 2 || y < 4) return 0; // pad cam — countdown + ignition
  if (y < 22) return 1; // tower cam — clearing the gantry
  if (y < 80) return 2; // ground tracking telephoto
  if (y < 150) return 3; // chase cam through the clouds
  return 4; // orbit reveal
}

/** Multi-shot cinematic camera (§6a-ii): every shot looks at the rocket's
 *  simulated position each frame; moves are damped, never snapped. */
function LaunchDirector({
  clockRef,
  active,
  shotOverride,
  onShot,
}: {
  clockRef: React.MutableRefObject<{ t: number; altKm: number; y: number }>;
  active: boolean;
  shotOverride: number | null;
  onShot: (label: string) => void;
}) {
  const camPos = useRef(new THREE.Vector3(9, 6, 11));
  const camLook = useRef(new THREE.Vector3(0, 4, 0));
  const activeShot = useRef(-1);
  const reducedMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useFrame((state, dt) => {
    if (!active) return;
    const { t, y } = clockRef.current;
    const rocketMid = new THREE.Vector3(0, y + 4, 0);
    const shot = reducedMotion ? 2 : shotOverride ?? directShot(t, y);
    if (shot !== activeShot.current) {
      activeShot.current = shot;
      onShot(SHOT_NAMES[shot]);
    }

    const cam = state.camera as THREE.PerspectiveCamera;
    let targetPos: THREE.Vector3;
    let targetFov = 40;
    switch (shot) {
      case 0: // pad cam — low wide shot
        targetPos = new THREE.Vector3(15, 2, 18);
        targetFov = 45;
        break;
      case 1: // tower cam — close pass at the gantry
        targetPos = new THREE.Vector3(6, 11, 7);
        targetFov = 42;
        break;
      case 2: // ground tracking telephoto — planted press-site shot
        targetPos = new THREE.Vector3(42, 2.5, 48);
        targetFov = Math.max(10, 34 - y * 0.18);
        break;
      case 3: // chase cam — alongside through the cloud layer
        targetPos = new THREE.Vector3(8, y + 1, 10);
        targetFov = 45;
        break;
      default: // orbit reveal — pull back as the sky turns black
        targetPos = new THREE.Vector3(38, y + 14, 46);
        targetFov = 50;
    }

    const k = 1 - Math.exp(-2.6 * dt);
    camPos.current.lerp(targetPos, k);
    camLook.current.lerp(rocketMid, Math.min(1, k * 2));
    // Camera shake: strong at ignition, medium during burn, off in coast
    const burnRatio = clockRef.current.t < 2 ? 1 : clockRef.current.altKm < 5 ? 0.6 : 0.15;
    const shakeIntensity = t < 2 ? 0.4 : t < clockRef.current.t && clockRef.current.t < 999 ? 0.12 * burnRatio : 0;
    cam.position.set(
      camPos.current.x + (Math.sin(t * 53) * 0.5 + Math.sin(t * 127) * 0.5) * shakeIntensity,
      camPos.current.y + (Math.sin(t * 71) * 0.5 + Math.cos(t * 89) * 0.5) * shakeIntensity,
      camPos.current.z + Math.sin(t * 97) * shakeIntensity * 0.3,
    );
    cam.lookAt(camLook.current);
    cam.fov += (targetFov - cam.fov) * k;
    cam.updateProjectionMatrix();
  });
  return null;
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

  // Ambient pad wind
  useEffect(() => {
    sfx.startWind();
    return () => sfx.stopWind();
  }, []);
  const [count, setCount] = useState(3);
  const [altReadout, setAltReadout] = useState(0);
  const [recording, setRecording] = useState(false);
  const [shotOverride, setShotOverride] = useState<number | null>(null);
  const [shotLabel, setShotLabel] = useState("📺 Auto director");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const clockRef = useRef({ t: 0, altKm: 0, y: 0 });
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
          controlsEnabled={phase !== "flight"}
          onCanvasReady={(c) => (canvasRef.current = c)}
        >
          <FlyingRocket
            design={design}
            flight={flight}
            playing={phase === "flight" || phase === "done"}
            clockRef={clockRef}
            partLevels={profile?.partLevels}
          />
          <LaunchDirector
            clockRef={clockRef}
            active={phase === "flight"}
            shotOverride={shotOverride}
            onShot={(l) => setShotLabel(shotOverride === null ? `${l} (auto)` : l)}
          />
        </RocketScene>
      </div>

      {/* HUD */}
      <div className="absolute top-4 left-4 hud-panel px-4 py-2 text-sm z-10">
        🚀 Mission to {dest?.emoji} {dest?.name} — lifting off from {site.name}
      </div>
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        {phase === "flight" && (
          <button
            className="btn-ghost !px-3 !py-1 text-xs"
            onClick={() =>
              setShotOverride((cur) => {
                const next = cur === null ? 0 : cur + 1;
                if (next >= SHOT_NAMES.length) {
                  setShotLabel("📺 Auto director");
                  return null;
                }
                setShotLabel(SHOT_NAMES[next]);
                return next;
              })
            }
          >
            {shotLabel} — switch
          </button>
        )}
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