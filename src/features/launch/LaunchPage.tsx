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

/** Altitude-driven time-warp (like real launch broadcasts skipping ahead):
 *  near the pad the replay runs ~real time; higher up it fast-forwards, and
 *  the HUD shows the warp factor so the T+ clock and altitude stay honest. */
function warpFor(altKm: number): number {
  if (altKm < 2) return 2;
  if (altKm < 15) return 8;
  if (altKm < 80) return 16;
  if (altKm < 400) return 40;
  return 120;
}

type Phase = "ready" | "countdown" | "flight" | "done" | "abort";

/** Layered emissive sphere burst + spark particles + tumbling debris made of
 *  simple part-shaped meshes — the cartoon-boom for catastrophic failures. */
function ExplosionFX({ y, drift, startT, clockRef }: { y: number; drift: number; startT: number; clockRef: React.MutableRefObject<{ t: number; altKm: number; y: number }> }) {
  const core = useRef<THREE.Mesh>(null);
  const mid = useRef<THREE.Mesh>(null);
  const outer = useRef<THREE.Mesh>(null);
  const debris = useRef<THREE.Group>(null);
  // Deterministic debris directions (the design decides the failure; this is cosmetic).
  const [chunks] = useState(() =>
    Array.from({ length: 14 }, (_, i) => ({
      dir: new THREE.Vector3(Math.sin(i * 2.4), Math.abs(Math.cos(i * 1.7)) * 0.8 + 0.2, Math.cos(i * 3.1)).normalize(),
      speed: 3 + (i % 5),
      spin: 2 + (i % 3) * 2,
      kind: i % 3, // 0 = panel, 1 = fin, 2 = cone
    })),
  );
  useFrame(() => {
    const age = Math.max(0, clockRef.current.t - startT);
    const s = Math.min(1, age / 1.2);
    if (core.current) {
      core.current.scale.setScalar(0.5 + s * 6);
      (core.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - s * 1.1);
    }
    if (mid.current) {
      mid.current.scale.setScalar(0.3 + s * 9);
      (mid.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.7 - s * 0.8);
    }
    if (outer.current) {
      outer.current.scale.setScalar(0.2 + s * 13);
      (outer.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.35 - s * 0.4);
    }
    if (debris.current) {
      debris.current.children.forEach((c, i) => {
        const k = chunks[i];
        c.position.set(k.dir.x * k.speed * age, k.dir.y * k.speed * age - 2 * age * age, k.dir.z * k.speed * age);
        c.rotation.x += 0.05 * k.spin;
        c.rotation.z += 0.04 * k.spin;
      });
    }
  });
  return (
    <group position={[drift, y + 3, 0]}>
      <mesh ref={core}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#fff7cc" transparent opacity={1} />
      </mesh>
      <mesh ref={mid}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#ffb347" transparent opacity={0.7} />
      </mesh>
      <mesh ref={outer}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#ff5d2e" transparent opacity={0.35} />
      </mesh>
      <pointLight color="#ffaa55" intensity={30} distance={60} decay={2} />
      <group ref={debris}>
        {chunks.map((k, i) => (
          <mesh key={i}>
            {k.kind === 0 ? <boxGeometry args={[0.5, 0.7, 0.06]} /> : k.kind === 1 ? <boxGeometry args={[0.05, 0.9, 0.6]} /> : <coneGeometry args={[0.3, 0.7, 8]} />}
            <meshStandardMaterial color={k.kind === 1 ? "#e5484d" : "#cfd6e4"} emissive="#ff7733" emissiveIntensity={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Rocket that follows the simulated trajectory. */
function FlyingRocket({
  design,
  flight,
  playing,
  clockRef,
  partLevels,
  orbit = false,
  orbitAltKm = 0,
}: {
  design: RocketDesign;
  flight: FlightResult;
  playing: boolean;
  clockRef: React.MutableRefObject<{ t: number; altKm: number; y: number; x?: number; z?: number; warp?: number }>;
  partLevels?: Partial<Record<RocketPart, 1 | 2 | 3>>;
  /** After a successful orbital flight: coast the rocket up to REAL altitude
   *  in the SAME world scene — the takram atmosphere handles space itself. */
  orbit?: boolean;
  orbitAltKm?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const shake = useRef(0);
  const [staged, setStaged] = useState(false);
  const stagingEvent = flight.events.find((e) => e.label.toLowerCase().includes("staging") || e.label.toLowerCase().includes("booster"));
  const [flame, setFlame] = useState(0);
  const catastrophe = flight.failures.find((e) => e.severity === "catastrophic");
  const [exploded, setExploded] = useState(false);
  const [boomState, setBoomState] = useState<{ y: number; drift: number } | null>(null);

  const orbitProg = useRef(0);
  const orbitStartY = useRef<number | null>(null);

  useFrame((state, dt) => {
    if (!group.current) return;
    // Orbit coast: ease from the ascent's last height up to true altitude
    // (metres) inside the one world scene — sky fades to black, the limb
    // appears, all from the same atmosphere.
    if (orbit) {
      if (orbitStartY.current === null) orbitStartY.current = clockRef.current.y;
      orbitProg.current = Math.min(1, orbitProg.current + dt / 8);
      const p = orbitProg.current;
      const e = p * p * (3 - 2 * p); // smoothstep
      const yEnd = Math.min(1200, Math.max(120, orbitAltKm)) * 1000;
      const y = orbitStartY.current + (yEnd - orbitStartY.current) * e;
      const a = state.clock.elapsedTime * 0.06;
      const r = 30 * e;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      group.current.position.set(x, y, z);
      // gentle pitch-over to orbital attitude
      group.current.rotation.z = -0.9 * e;
      clockRef.current.y = y;
      clockRef.current.x = x;
      clockRef.current.z = z;
      clockRef.current.altKm = y / 1000;
      if (flame !== 0) setFlame(0);
      return;
    }
    if (!playing) {
      group.current.position.y = 0;
      return;
    }
    const warp = warpFor(clockRef.current.altKm);
    clockRef.current.warp = warp;
    clockRef.current.t = Math.min(clockRef.current.t + dt * warp, flight.samples[flight.samples.length - 1]?.t ?? flight.apogeeT);
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
    // Lateral drift (gimbal / CG veer) — same interpolation as altitude.
    let drift = 0;
    if (idx > 0) {
      const a = samps[idx - 1], b = samps[idx];
      const frac = b.t > a.t ? (t - a.t) / (b.t - a.t) : 0;
      drift = (a.driftX ?? 0) + ((b.driftX ?? 0) - (a.driftX ?? 0)) * frac;
    }
    const driftScene = drift * 3;
    // Scene y: log-ish scaling so the rocket visibly climbs then leaves frame
    // No cap — the camera director tracks the rocket at any height
    const y = alt * 3 + t * 0.4;
    clockRef.current.y = y;
    // Catastrophic moment: swap the rocket for the explosion + debris.
    if (catastrophe && t >= catastrophe.t && !exploded) {
      setExploded(true);
      setBoomState({ y, drift: driftScene });
    }
    // Camera shake: strong rumble during burn, fading after cutoff
    const burnPhase = t < flight.burnoutT ? 1 : Math.max(0, 1 - (t - flight.burnoutT) * 0.5);
    const shakeAmt = burnPhase * (t < 3 ? 0.12 : 0.05); // extra violent at ignition
    shake.current = (Math.sin(t * 47) * 0.6 + Math.sin(t * 113) * 0.4) * shakeAmt;
    const shakeZ = (Math.sin(t * 71) * 0.5 + Math.cos(t * 97) * 0.5) * shakeAmt * 0.7;
    group.current.position.set(shake.current + driftScene, y, shakeZ);
    // Veering rockets visibly lean into the drift.
    group.current.rotation.z = -Math.min(0.5, Math.abs(drift) * 0.4) * Math.sign(drift);
    const wantStaged = !!stagingEvent && t >= stagingEvent.t;
    if (wantStaged !== staged) setStaged(wantStaged);
    // Flame: ramp up at ignition, full during burn, rapid fade at cutoff
    const flameTarget = t < 0.5 ? t * 2 : t < flight.burnoutT ? 1 : Math.max(0, 1 - (t - flight.burnoutT) * 3);
    setFlame(flameTarget);
  });


  // Pad smoke: billowing exhaust cloud at ground level (animated mesh approach)
  const [smokeParticles] = useState(() => 
    Array.from({ length: 16 }, (_, i) => ({
      id: i,
      angle: (i / 16) * Math.PI * 2 + Math.random() * 0.5,
      delay: i * 0.15 + Math.random() * 0.1,
      speed: 1.2 + Math.random() * 0.8,
      riseSpeed: 0.15 + Math.random() * 0.2,
      maxR: 3 + Math.random() * 2,
      yOff: Math.random() * 0.4,
    }))
  );

  return (
    <>
      {!exploded && (
        <group ref={group}>
          <Rocket3D
            design={design}
            complete
            engineFlame={playing ? flame : 0}
            hideBoosters={staged}
            partLevels={partLevels}
          />
        </group>
      )}
      {exploded && boomState && catastrophe && (
        <ExplosionFX y={boomState.y} drift={boomState.drift} startT={catastrophe.t} clockRef={clockRef} />
      )}
    </>
  );
}

/** Orbit reveal camera — circles the coasting rocket inside the SAME world
 *  scene; the takram atmosphere shows black space + the Earth's limb below. */
function OrbitRevealCam({
  clockRef,
  active,
}: {
  clockRef: React.MutableRefObject<{ t: number; altKm: number; y: number; x?: number; z?: number }>;
  active: boolean;
}) {
  useFrame((state, dt) => {
    if (!active) return;
    const cam = state.camera as THREE.PerspectiveCamera;
    const { y } = clockRef.current;
    const rx = clockRef.current.x ?? 0;
    const rz = clockRef.current.z ?? 0;
    const a = state.clock.elapsedTime * 0.05 + 1.2;
    const target = new THREE.Vector3(rx + Math.cos(a) * 42, y + 10, rz + Math.sin(a) * 42);
    const k = 1 - Math.exp(-1.6 * dt);
    cam.position.lerp(target, k);
    // Look slightly below the rocket so the Earth's limb rides the frame.
    cam.lookAt(rx, y - 8, rz);
    cam.fov += (48 - cam.fov) * k;
    cam.updateProjectionMatrix();
  });
  return null;
}

export const SHOT_NAMES = ["📺 Pad Cam", "📺 Tower Cam", "📺 Tracking Cam", "📺 Chase Cam", "📺 Orbit Cam", "🎥 Free Cam (drag to look)"] as const;
export const FREE_CAM = 5;

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
    const cut = shot !== activeShot.current;
    if (cut) {
      activeShot.current = shot;
      onShot(SHOT_NAMES[shot]);
    }
    // Free Cam: hand control to OrbitControls — the director stands down.
    if (shot === FREE_CAM) return;

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

    // Real broadcasts CUT between cameras (no impossible swooping moves):
    // snap position + framing on a cut, damp only within the shot.
    const k = 1 - Math.exp(-2.6 * dt);
    if (cut) {
      camPos.current.copy(targetPos);
      camLook.current.copy(rocketMid);
    } else {
      camPos.current.lerp(targetPos, k);
      camLook.current.lerp(rocketMid, Math.min(1, k * 2));
    }
    // Rule-of-thirds: bias the framing so the rocket rides the lower third
    // with sky ahead of it — lead increases as it speeds away.
    camLook.current.y += Math.min(6, 1.5 + y * 0.03) * k;
    // Never sink the camera below the pad apron.
    camPos.current.y = Math.max(1.2, camPos.current.y);
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
  const [tPlus, setTPlus] = useState(0);
  const [warpReadout, setWarpReadout] = useState(1);
  const [caption, setCaption] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const firedEvents = useRef(new Set<number>());
  const [recording, setRecording] = useState(false);
  const [shotOverride, setShotOverride] = useState<number | null>(null);
  const [shotLabel, setShotLabel] = useState("📺 Auto director");
  const [userCam, setUserCam] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const clockRef = useRef<{ t: number; altKm: number; y: number; x?: number; z?: number; warp?: number }>({ t: 0, altKm: 0, y: 0 });
  const recorderRef = useRef<MediaRecorder | null>(null);
  const savedRef = useRef(false);

  const site = SITE_BY_ID[profile?.launchSiteId ?? "canaveral"];
  const dest = DESTINATION_BY_ID[destinationId];
  const quality = tasksTotal > 0 ? tasksCorrect / tasksTotal : 1;
  const liveFlight = useMemo(() => simulateFlight(design, quality), [design, quality]);
  // Freeze the flight once the countdown starts: refreshing the profile after
  // recording the mission must NOT re-simulate and rewrite the outcome shown.
  const frozenFlightRef = useRef<FlightResult | null>(null);
  if (phase === "ready") frozenFlightRef.current = null;
  else if (!frozenFlightRef.current) frozenFlightRef.current = liveFlight;
  const flight = frozenFlightRef.current ?? liveFlight;
  const reached = flight.maxAltitudeKm >= (dest?.requiredAltitudeKm ?? 150);

  // Countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count <= 0) {
      sfx.launch();
    // Cheers shortly after liftoff
    setTimeout(() => sfx.cheers(), 4000);
      setPhase("flight");
      return;
    }
    sfx.countdown(count);
    const id = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, count]);

  // Failure captions + explosion audio, driven off the deterministic event list.
  useEffect(() => {
    if (phase !== "flight") return;
    const id = setInterval(() => {
      const t = clockRef.current.t;
      for (const e of flight.events) {
        if ((e.severity === "failure" || e.severity === "catastrophic") && t >= e.t && !firedEvents.current.has(e.t)) {
          firedEvents.current.add(e.t);
          setCaption(e.label);
          if (e.severity === "catastrophic") {
            sfx.explosion();
            sfx.rso("We've lost the vehicle. The crew capsule escape tower worked perfectly, again.");
            setFlash(true);
            setTimeout(() => setFlash(false), 350);
          } else {
            sfx.groan();
          }
          setTimeout(() => setCaption((c) => (c === e.label ? null : c)), 5000);
        }
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Flight progress → done (replay ends when the sim clock reaches the last
  // sample — the warp is variable so this can't be a fixed timeout).
  useEffect(() => {
    if (phase !== "flight") return;
    const endT = flight.samples[flight.samples.length - 1]?.t ?? flight.apogeeT;
    const started = Date.now();
    let finishing = false;
    const finishFlight = async () => {
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
            outcome: flight.outcome,
          },
          tasksTotal > 0 && tasksCorrect === tasksTotal,
        );
        setLastMission(missionId, newPatches);
        await refreshProfile();
      }
      setPhase("done");
    };
    const readout = setInterval(() => {
      setAltReadout(clockRef.current.altKm);
      setTPlus(clockRef.current.t);
      setWarpReadout(clockRef.current.warp ?? 1);
      if (!finishing && (clockRef.current.t >= endT - 0.01 || Date.now() - started > 60_000)) {
        finishing = true;
        setTimeout(() => void finishFlight(), 1500);
      }
    }, 120);
    return () => clearInterval(readout);
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
  // Show the true 3D orbit view only when an orbital altitude was genuinely reached.
  const orbitView = phase === "done" && reached && flight.outcome !== "lostVehicle" && (dest?.requiredAltitudeKm ?? 0) >= 180;

  // Any drag/scroll on the scene hands the camera to the user — even mid-launch.
  // The free cam keeps tracking the rocket, but rotation & zoom are all theirs.
  const takeCamera = () => {
    if (phase === "flight" && shotOverride !== FREE_CAM) {
      setShotOverride(FREE_CAM);
      setShotLabel(SHOT_NAMES[FREE_CAM]);
    }
    if (orbitView && !userCam) setUserCam(true);
  };

  return (
    <div className="relative h-full">
      <div className="absolute inset-0" onPointerDown={takeCamera} onWheel={takeCamera}>
        <RocketScene
          site={site}
          skyColor={skyColor}
          towerRetracted={phase !== "ready"}
          cameraDistance={16}
          controlsEnabled={orbitView ? userCam : phase !== "flight" || shotOverride === FREE_CAM}
          trackTarget={phase === "flight" || phase === "done" ? clockRef : null}
          onCanvasReady={(c) => (canvasRef.current = c)}
        >
          <FlyingRocket
            design={design}
            flight={flight}
            playing={phase === "flight" || phase === "done"}
            clockRef={clockRef}
            partLevels={profile?.partLevels}
            orbit={orbitView}
            orbitAltKm={flight.maxAltitudeKm}
          />
          <LaunchDirector
            clockRef={clockRef}
            active={phase === "flight"}
            shotOverride={shotOverride}
            onShot={(l) => setShotLabel(shotOverride === null ? `${l} (auto)` : l)}
          />
          <OrbitRevealCam clockRef={clockRef} active={orbitView && !userCam} />
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
          <div className="text-2xl font-black text-cyan-200 neon tabular-nums">{altReadout < 1 ? `${Math.round(altReadout * 1000)} m` : `${altReadout.toFixed(1)} km`}</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-widest">altitude</div>
          <div className="text-[11px] text-slate-300 tabular-nums mt-0.5">
            T+ {String(Math.floor(tPlus / 60)).padStart(2, "0")}:{String(Math.floor(tPlus % 60)).padStart(2, "0")}
            {warpReadout > 2 && <span className="ml-2 text-amber-300">⏩ ×{warpReadout}</span>}
          </div>
        </div>
      )}

      {phase === "ready" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <button
            className="pointer-events-auto text-2xl font-black rounded-2xl px-10 py-5 bg-red-600/80 hover:bg-red-500 border-2 border-red-300 shadow-glow transition"
            onClick={() => {
              if (flight.outcome === "padAbort") {
                // Critical guidance fault: klaxons, no launch — aborts save rockets.
                sfx.klaxon();
                sfx.rso("Hold hold hold. Guidance bus fault. The range is safe — nice catch by the pad computer.");
                void (async () => {
                  if (!savedRef.current) {
                    savedRef.current = true;
                    setLastFlight({ ...flight });
                    const { missionId, newPatches } = await recordMission(
                      {
                        destinationId,
                        launchSiteId: site.id,
                        tasksCorrect,
                        tasksTotal,
                        maxAltitudeKm: 0,
                        reachedDestination: false,
                        photos: [],
                        outcome: "padAbort",
                      },
                      false,
                    );
                    setLastMission(missionId, newPatches);
                    await refreshProfile();
                  }
                })();
                setPhase("abort");
                return;
              }
              setCount(3);
              setPhase("countdown");
            }}
          >
            🔴 LAUNCH
          </button>
        </div>
      )}

      {/* Big failure caption banner */}
      {caption && phase === "flight" && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 max-w-2xl px-6 py-3 rounded-xl border-2 border-red-400 bg-red-950/80 text-red-100 font-black text-center text-lg animate-pulse shadow-glow">
          ⚠️ {caption}
        </div>
      )}
      {/* White flash on catastrophic events */}
      {flash && <div className="absolute inset-0 z-30 bg-white/90 pointer-events-none" />}

      {phase === "abort" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-red-950/50 backdrop-blur-sm">
          <div className="hud-panel p-6 max-w-md w-full text-center space-y-3 border-2 border-red-400/70">
            <div className="text-5xl">🚨</div>
            <h2 className="text-xl font-black text-red-300 neon">HOLD HOLD HOLD — PAD ABORT</h2>
            <p className="text-sm text-slate-300">
              The guidance bus failed its power-up self-test and the range safety officer stopped the count.
              No fireworks today — <b className="text-emerald-300">an abort on the pad saves the whole rocket</b>.
            </p>
            <p className="text-xs text-amber-300">The crash investigation shows exactly which wire — and which maths — to fix.</p>
            <button className="btn-primary w-full justify-center" onClick={() => navigate("/report")}>
              📋 Open the investigation →
            </button>
          </div>
        </div>
      )}

      {phase === "countdown" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="text-9xl font-black text-amber-300 neon animate-pulse">{count === 0 ? "🔥" : count}</div>
        </div>
      )}

      {/* Orbit achieved — SAME world scene, the camera simply follows the
          rocket into space (earned by actually reaching orbital altitude) */}
      {orbitView && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 hud-panel px-4 py-1.5 text-xs text-cyan-200">
          🌍 Orbit achieved — same sky, just 400 km higher, Commander
        </div>
      )}

      {phase === "done" && (
        <div
          className={
            orbitView
              ? "absolute bottom-4 right-4 z-10 max-w-md w-full"
              : "absolute inset-0 z-10 flex items-center justify-center bg-space-950/60 backdrop-blur-sm"
          }
        >
          <div className="hud-panel p-6 max-w-md w-full text-center space-y-3">
            <div className="text-5xl">{flight.outcome === "lostVehicle" ? "💥" : reached ? dest?.emoji : "🌤"}</div>
            <h2 className="text-xl font-black text-cyan-200 neon">
              {flight.outcome === "lostVehicle"
                ? "Well… that was spectacular, Commander!"
                : reached
                  ? `${dest?.name} reached, Commander!`
                  : "A mighty climb, Commander!"}
            </h2>
            {flight.outcome === "lostVehicle" && (
              <p className="text-xs text-emerald-300">The crew capsule escape tower worked perfectly, again. Everyone is fine — the rocket, less so.</p>
            )}
            <p className="text-sm text-slate-300">
              Peak altitude <span className="text-cyan-300 font-bold">{flight.maxAltitudeKm.toLocaleString("en-GB")} km</span>
              {reached
                ? " — destination confirmed. Beautiful engineering."
                : ` — ${dest?.name} needs ${dest?.requiredAltitudeKm.toLocaleString("en-GB")} km. The report shows exactly what to tune next time.`}
            </p>
            {flight.struggledOffPad && <p className="text-xs text-amber-300">The rocket strained off the pad — TWR was low.</p>}
            {flight.tumbled && flight.failures.length === 0 && <p className="text-xs text-amber-300">It tumbled in the wind — more fin stability would help.</p>}
            {flight.failures.slice(0, 2).map((f) => (
              <p key={f.t + f.label} className="text-xs text-red-300">⚠️ {f.label}</p>
            ))}
            <button className="btn-primary w-full justify-center" onClick={() => navigate("/report")}>
              {flight.failures.length > 0 ? "🕵️ Crash investigation →" : "📋 After-action report →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}