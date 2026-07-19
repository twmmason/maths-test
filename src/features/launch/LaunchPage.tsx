import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import RocketScene, { VEHICLE_SCALE } from "../../three/RocketScene";
import Rocket3D from "../../three/Rocket3D";
import { useRocketState } from "../../mission/useRocketState";
import { SITE_BY_ID } from "../../mission/launchSites";
import { DESTINATION_BY_ID } from "../../mission/destinations";
import { simulateFlight } from "../../physics/simulateFlight";
import { recordMission } from "../../mission/recordMission";
import { sfx } from "../../mission/sound";
import { ExplosionFX, shatterObject, type Shard } from "../../three/ExplosionFX";
import TimeOfDaySlider from "../../components/TimeOfDaySlider";
import MissionCamera from "../../components/MissionCamera";
import { useEffect as useEffectOnce } from "react";
import type { FlightResult } from "../../physics/types";
import type { RocketDesign } from "../../three/rocketDesign";

import type { RocketPart } from "../../curriculum/types";

/** Altitude-driven time-warp (like real launch broadcasts skipping ahead):
 *  near the pad the replay runs ~real time; higher up it fast-forwards, and
 *  the HUD shows the warp factor so the T+ clock and altitude stay honest. */
function warpFor(altKm: number): number {
  if (altKm < 2) return 1;
  if (altKm < 15) return 3;
  if (altKm < 80) return 8;
  if (altKm < 400) return 20;
  return 60;
}

type Phase = "ready" | "countdown" | "flight" | "done" | "abort";

/** Rocket that follows the simulated trajectory. */
function FlyingRocket({
  design,
  flight,
  playing,
  paused = false,
  clockRef,
  partLevels,
  orbit = false,
  orbitAltKm = 0,
}: {
  design: RocketDesign;
  flight: FlightResult;
  playing: boolean;
  /** Photo/poster mode: freeze the sim clock so time stands still mid-shot. */
  paused?: boolean;
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
  const [boomState, setBoomState] = useState<{ y: number; drift: number; shards: Shard[] } | null>(null);

  const orbitProg = useRef(0);
  const orbitStartY = useRef<number | null>(null);

  useFrame((state, dt) => {
    // Photo/poster mode: hold everything exactly where it is.
    if (paused) return;
    // Orbit coast: ease from the ascent's last height up to true altitude
    // (metres) inside the one world scene — sky fades to black, the limb
    // appears, all from the same atmosphere.
    if (orbit) {
      if (!group.current) return;
      if (orbitStartY.current === null) orbitStartY.current = clockRef.current.y;
      orbitProg.current = Math.min(1, orbitProg.current + dt / 8);
      const p = orbitProg.current;
      const e = p * p * (3 - 2 * p); // smoothstep
      const yEnd = Math.min(1200, Math.max(120, orbitAltKm)) * 1000;
      const y = orbitStartY.current + (yEnd - orbitStartY.current) * e;
      const a = state.clock.elapsedTime * 0.06;
      const r = 30 * VEHICLE_SCALE * e;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      // clockRef carries WORLD coords; the group lives inside the scaled rig.
      group.current.position.set(x / VEHICLE_SCALE, y / VEHICLE_SCALE, z / VEHICLE_SCALE);
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
      if (group.current) group.current.position.y = 0;
      return;
    }
    // Time-warp drops to REAL TIME just before and after a catastrophe so the
    // explosion always plays at normal speed, never fast-forwarded.
    const nearBoom = !!catastrophe && clockRef.current.t >= catastrophe.t - 1.5;
    const warp = exploded || nearBoom ? 1 : warpFor(clockRef.current.altKm);
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
    // Lateral drift (gimbal / CG veer) — same interpolation as altitude.
    let drift = 0;
    if (idx > 0) {
      const a = samps[idx - 1], b = samps[idx];
      const frac = b.t > a.t ? (t - a.t) / (b.t - a.t) : 0;
      drift = (a.driftX ?? 0) + ((b.driftX ?? 0) - (a.driftX ?? 0)) * frac;
    }
    // TRUE-SCALE mapping: the geo world is in metres and the rocket rig is
    // scaled by VEHICLE_SCALE, so rig-y = metres / VEHICLE_SCALE. The HUD's
    // km readout and the rocket's height above the real buildings now agree.
    const driftScene = (drift * 1000) / VEHICLE_SCALE;
    const y = (alt * 1000) / VEHICLE_SCALE + t * 0.5;
    // Catastrophic moment: swap the rocket for the explosion + debris.
    // NOTE: the sim clock KEEPS running after the boom (the ExplosionFX
    // animates off clockRef.t) — but altitude/camera targets freeze at the
    // blast point so the shot holds on the fireball, not empty sky.
    if (catastrophe && t >= catastrophe.t) {
      if (!exploded) {
        // Shatter the ACTUAL rocket meshes before unmounting them — the
        // debris is the rocket the player built, not generic chunks.
        const shards = group.current ? shatterObject(group.current) : [];
        setExploded(true);
        setBoomState({ y, drift: driftScene, shards });
        if (flame !== 0) setFlame(0);
      }
      return;
    }
    clockRef.current.altKm = alt;
    clockRef.current.y = y * VEHICLE_SCALE; // world-space (rocket rig is scaled)
    if (!group.current) return;
    // Camera shake: strong rumble during burn, fading after cutoff
    const burnPhase = t < flight.burnoutT ? 1 : Math.max(0, 1 - (t - flight.burnoutT) * 0.5);
    const shakeAmt = burnPhase * (t < 3 ? 0.12 : 0.05); // extra violent at ignition
    shake.current = (Math.sin(t * 47) * 0.6 + Math.sin(t * 113) * 0.4) * shakeAmt;
    const shakeZ = (Math.sin(t * 71) * 0.5 + Math.cos(t * 97) * 0.5) * shakeAmt * 0.7;
    group.current.position.set(shake.current + driftScene, y, shakeZ);
    clockRef.current.x = driftScene * VEHICLE_SCALE;
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
        <ExplosionFX
          y={boomState.y}
          drift={boomState.drift}
          startT={catastrophe.t}
          clockRef={clockRef}
          shards={boomState.shards}
        />
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
    const orbR = 42 * VEHICLE_SCALE;
    const target = new THREE.Vector3(rx + Math.cos(a) * orbR, y + 10 * VEHICLE_SCALE, rz + Math.sin(a) * orbR);
    const k = 1 - Math.exp(-1.6 * dt);
    cam.position.lerp(target, k);
    // Look slightly below the rocket so the Earth's limb rides the frame.
    cam.lookAt(rx, y - 8 * VEHICLE_SCALE, rz);
    cam.fov += (48 - cam.fov) * k;
    cam.updateProjectionMatrix();
  });
  return null;
}

// NOTE: module-local (not exported) so Vite Fast Refresh keeps working —
// mixing component and non-component exports breaks HMR for this file.
const SHOT_NAMES = ["📺 Pad Cam", "📺 Tower Cam", "📺 Tracking Cam", "📺 Chase Cam", "📺 Orbit Cam", "🎥 Free Cam (drag to look)"] as const;
const FREE_CAM = 5;

/** Launch director: pick the shot from the rocket's ACTUAL simulated state —
 *  slow ascents naturally hold each shot longer (altitude-driven cuts). */
function directShot(t: number, y: number): number {
  // y is WORLD height; the vehicle rig is scaled by VEHICLE_SCALE.
  if (t < 2 || y < 4 * VEHICLE_SCALE) return 0; // pad cam — countdown + ignition
  if (y < 22 * VEHICLE_SCALE) return 1; // tower cam — clearing the gantry
  if (y < 80 * VEHICLE_SCALE) return 2; // ground tracking telephoto
  if (y < 150 * VEHICLE_SCALE) return 3; // chase cam through the clouds
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
    const rocketMid = new THREE.Vector3(0, y + 4 * VEHICLE_SCALE, 0);
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
    const S = VEHICLE_SCALE;
    switch (shot) {
      case 0: // pad cam — low wide shot
        targetPos = new THREE.Vector3(15 * S, 2 * S, 18 * S);
        targetFov = 45;
        break;
      case 1: // tower cam — close pass at the gantry
        targetPos = new THREE.Vector3(6 * S, 11 * S, 7 * S);
        targetFov = 42;
        break;
      case 2: // ground tracking telephoto — planted press-site shot
        targetPos = new THREE.Vector3(42 * S, 2.5 * S, 48 * S);
        targetFov = Math.max(10, 34 - (y / S) * 0.18);
        break;
      case 3: // chase cam — alongside through the cloud layer
        targetPos = new THREE.Vector3(8 * S, y + 1 * S, 10 * S);
        targetFov = 45;
        break;
      default: // orbit reveal — pull back as the sky turns black
        targetPos = new THREE.Vector3(38 * S, y + 14 * S, 46 * S);
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
    camLook.current.y += Math.min(6 * S, 1.5 * S + y * 0.03) * k;
    // Never sink the camera below the pad apron.
    camPos.current.y = Math.max(1.2 * S, camPos.current.y);
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
  const [destruct, setDestruct] = useState<{ t: number; altKm: number } | null>(null);
  const [photoPaused, setPhotoPaused] = useState(false);
  const photoPausedRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const savedRef = useRef(false);

  const site = SITE_BY_ID[profile?.launchSiteId ?? "canaveral"];
  const dest = DESTINATION_BY_ID[destinationId];
  const quality = tasksTotal > 0 ? tasksCorrect / tasksTotal : 1;
  const liveFlight = useMemo(() => {
    const f = simulateFlight(design, quality);
    // Dev/preview flag: `?fly` forces a clean nominal ascent (regardless of
    // the current design) so flight-time UI like SELF-DESTRUCT can be tested.
    if (typeof window !== "undefined" && (window.location.search.includes("fly") || window.location.hash.includes("fly"))) {
      // Realistic pacing: ~1.3 g off the pad building up — ≈40 m at T+5 s.
      const samples = Array.from({ length: 81 }, (_, i) => {
        const t = i * 0.5;
        return { t, altitude: (t * t * (1 + t / 30)) / 1000, driftX: 0 };
      }) as unknown as typeof f.samples;
      return { ...f, samples, burnoutT: 30, apogeeT: 40, maxAltitudeKm: 4, outcome: "nominal" as const, failures: [], events: [], struggledOffPad: false, tumbled: false };
    }
    // Dev/preview flag: `?boom` forces a mid-air catastrophe so the explosion
    // FX can be checked without mis-building a rocket. Cosmetic only.
    if (typeof window !== "undefined" && (window.location.search.includes("boom") || window.location.hash.includes("boom"))) {
      const ev = { t: 5, label: "TEST RANGE — DELIBERATE FIREBALL (dev preview)", severity: "catastrophic" as const };
      const lastT = f.samples[f.samples.length - 1]?.t ?? 0;
      const samples =
        lastT > 8
          ? f.samples
          : (Array.from({ length: 25 }, (_, i) => ({ t: i * 0.5, altitude: 0.02 * (i * 0.5) ** 2, driftX: 0 })) as unknown as typeof f.samples);
      return { ...f, samples, burnoutT: Math.max(f.burnoutT, 8), apogeeT: Math.max(f.apogeeT, 12), outcome: "lostVehicle" as const, failures: [ev], events: [ev] };
    }
    return f;
  }, [design, quality]);
  // Freeze the flight once the countdown starts: refreshing the profile after
  // recording the mission must NOT re-simulate and rewrite the outcome shown.
  const frozenFlightRef = useRef<FlightResult | null>(null);
  if (phase === "ready") frozenFlightRef.current = null;
  else if (!frozenFlightRef.current) frozenFlightRef.current = liveFlight;
  const baseFlight = frozenFlightRef.current ?? liveFlight;
  // Range Safety: the player can command flight termination mid-ascent.
  // It injects a deterministic catastrophic event at the commanded instant —
  // same shatter + fireball pipeline as a genuine failure.
  const flight = useMemo<FlightResult>(() => {
    if (!destruct) return baseFlight;
    const ev = {
      t: destruct.t,
      label: "RANGE SAFETY — FLIGHT TERMINATION SYSTEM FIRED (your command, Commander)",
      severity: "catastrophic" as const,
    };
    return {
      ...baseFlight,
      outcome: "lostVehicle" as const,
      maxAltitudeKm: Math.min(baseFlight.maxAltitudeKm, Math.max(0, Math.round(destruct.altKm))),
      failures: [...baseFlight.failures, ev],
      events: [...baseFlight.events, ev],
    };
  }, [baseFlight, destruct]);
  // Effects capture `flight` at phase-change time; the ref always carries the
  // latest (e.g. after a commanded destruct) for save/report.
  const flightRef = useRef(flight);
  flightRef.current = flight;
  const reached = flight.maxAltitudeKm >= (dest?.requiredAltitudeKm ?? 150) && flight.outcome !== "lostVehicle";
  // Earliest scheduled catastrophe (Infinity if the flight is clean). The
  // FTS button stays available right up until that moment.
  const boomT = flight.failures.reduce((m, f) => (f.severity === "catastrophic" ? Math.min(m, f.t) : m), Infinity);

  const selfDestruct = () => {
    if (destruct || clockRef.current.t >= boomT) return;
    const t = clockRef.current.t + 0.05;
    setDestruct({ t, altKm: clockRef.current.altKm });
    firedEvents.current.add(t);
    setCaption("RANGE SAFETY — FLIGHT TERMINATION SYSTEM FIRED (your command, Commander)");
    sfx.explosion();
    sfx.rso("Flight termination commanded. The range is clear, the crew capsule is safely away — that button is very satisfying, Commander.");
    setFlash(true);
    setTimeout(() => setFlash(false), 350);
    setTimeout(() => setCaption(null), 5000);
  };

  // Countdown (holds while the mission camera has time paused)
  useEffect(() => {
    if (phase !== "countdown" || photoPaused) return;
    if (count <= 0) {
      sfx.launch();
    // Cheers shortly after liftoff
    setTimeout(() => sfx.cheers(), 4000);
      setPhase("flight");
      return;
    }
    sfx.countdown(count);
    // 1.4 s cadence: each spoken digit fully lands before the next appears
    // (the voice also hard-interrupts, so digits can never overlap/drift).
    const id = setTimeout(() => setCount((c) => c - 1), 1400);
    return () => clearTimeout(id);
  }, [phase, count, photoPaused]);

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
            // The RSO explains WHY the vehicle was lost — the caption carries
            // the deterministic cause (part, value vs spec).
            const cause = e.label
              .replace(/°/g, " degrees")
              .replace(/[—–]/g, ",")
              .replace(/[()]/g, ",")
              .replace(/\s+/g, " ")
              .trim();
            sfx.rso(`We've lost the vehicle. Telemetry says: ${cause}. Crew capsule is safely away.`);
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
        // Read through the ref: a commanded self-destruct rewrites the flight
        // AFTER this effect's closure was captured.
        const f = flightRef.current;
        const r = f.maxAltitudeKm >= (dest?.requiredAltitudeKm ?? 150) && f.outcome !== "lostVehicle";
        const screenshot = canvasRef.current?.toDataURL("image/png");
        setLastFlight({ ...f, screenshot });
        const { missionId, newPatches } = await recordMission(
          {
            destinationId,
            launchSiteId: site.id,
            tasksCorrect,
            tasksTotal,
            maxAltitudeKm: f.maxAltitudeKm,
            reachedDestination: r,
            screenshot,
            photos: [],
            outcome: f.outcome,
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
      if (photoPausedRef.current) return; // time is paused for a photo
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
            paused={photoPaused}
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

      {/* Mission camera pill + photo overlay (time pauses in photo/poster) */}
      <MissionCamera
        getCanvas={() => canvasRef.current}
        siteName={site.name}
        siteTerrain={site.terrain}
        pillClassName="absolute bottom-20 right-4 z-30"
        onPhotoModeChange={(active) => {
          setPhotoPaused(active);
          photoPausedRef.current = active;
        }}
      />

      {/* HUD */}
      <div className="absolute top-4 left-4 hud-panel px-4 py-2 text-sm z-10">
        🚀 Mission to {dest?.emoji} {dest?.name} — lifting off from {site.name}
      </div>
      {phase === "ready" && (
        <div className="absolute bottom-6 left-4 z-10">
          <TimeOfDaySlider />
        </div>
      )}
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

      {phase === "flight" && !destruct && tPlus < boomT - 0.05 && (
        <button
          className="absolute bottom-6 right-4 z-10 rounded-xl px-4 py-3 font-black text-sm bg-red-700/80 hover:bg-red-600 border-2 border-red-300 text-red-100 shadow-glow animate-pulse"
          onClick={selfDestruct}
          title="Range Safety flight termination — ends the flight in a fireball. The crew capsule always escapes."
        >
          💥 SELF-DESTRUCT
        </button>
      )}

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
                // Critical fault on the pad: klaxons, no launch — aborts save rockets.
                sfx.klaxon();
                const abortCause = (flight.failures[0]?.label ?? "Guidance bus fault")
                  .replace(/[—–]/g, ",")
                  .replace(/\s+/g, " ")
                  .toLowerCase();
                sfx.rso(`Hold hold hold. ${abortCause}. The range is safe — nice catch by the pad computer.`);
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
            <h2 className="text-xl font-black text-red-300 neon">{flight.failures[0]?.label ?? "HOLD HOLD HOLD — PAD ABORT"}</h2>
            <p className="text-sm text-slate-300">
              The range safety officer stopped the count.
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