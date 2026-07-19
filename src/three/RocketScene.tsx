import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, OrbitControls, Stars } from "@react-three/drei";
import { Suspense, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { ACESFilmicToneMapping } from "three";
import type { LaunchSite } from "../mission/launchSites";
import { TERRAIN_COLORS } from "../mission/launchSites";
import { GeoEnvironment, HAS_MAPS_KEY } from "./GeoEnvironment";

/** Gantry + pad. Retracts the tower when `towerRetracted`. */
export function Launchpad({ site, towerRetracted = false, ground = true }: { site?: LaunchSite; towerRetracted?: boolean; ground?: boolean }) {
  const towerRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!towerRef.current) return;
    const target = towerRetracted ? -Math.PI / 3 : 0;
    towerRef.current.rotation.z += (target - towerRef.current.rotation.z) * Math.min(1, dt * 1.5);
  });
  const terrain = TERRAIN_COLORS[site?.terrain ?? "coastal"];
  return (
    <group>
      {/* Ground (stylised fallback — hidden when real 3D Tiles terrain is live) */}
      {ground && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.31, 0]} receiveShadow>
          <circleGeometry args={[120, 48]} />
          <meshStandardMaterial color={terrain.ground} roughness={1} />
        </mesh>
      )}
      {/* Concrete pad + blast deflector */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <cylinderGeometry args={[6, 6.5, 0.3, 32]} />
        <meshStandardMaterial color="#7d8497" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <cylinderGeometry args={[2.2, 2.5, 0.25, 24]} />
        <meshStandardMaterial color="#4a5066" roughness={0.8} metalness={0.2} />
      </mesh>
      {/* Service tower — industrial lattice with cross-bracing */}
      <group ref={towerRef} position={[3.8, 0, 0]}>
        {/* Four corner columns */}
        {[[-0.4, -0.4], [-0.4, 0.4], [0.4, -0.4], [0.4, 0.4]].map(([x, z], i) => (
          <mesh key={`col${i}`} position={[x, 5.5, z]} castShadow>
            <boxGeometry args={[0.15, 11, 0.15]} />
            <meshStandardMaterial color="#5a5a5a" roughness={0.5} metalness={0.6} />
          </mesh>
        ))}
        {/* Horizontal platforms */}
        {[0, 2.5, 5, 7.5, 10].map((y) => (
          <mesh key={`plat${y}`} position={[0, y, 0]} castShadow>
            <boxGeometry args={[1.0, 0.08, 1.0]} />
            <meshStandardMaterial color="#666" roughness={0.7} metalness={0.4} />
          </mesh>
        ))}
        {/* Cross-bracing (X pattern on each face) */}
        {[0, Math.PI / 2].map((rot) =>
          [0, 2.5, 5, 7.5].map((y) => (
            <group key={`brace${rot}-${y}`} rotation={[0, rot, 0]}>
              <mesh position={[0, y + 1.25, 0.4]} rotation={[0, 0, 0.46]} castShadow>
                <boxGeometry args={[0.06, 2.8, 0.06]} />
                <meshStandardMaterial color="#d45500" roughness={0.5} metalness={0.4} />
              </mesh>
              <mesh position={[0, y + 1.25, 0.4]} rotation={[0, 0, -0.46]} castShadow>
                <boxGeometry args={[0.06, 2.8, 0.06]} />
                <meshStandardMaterial color="#d45500" roughness={0.5} metalness={0.4} />
              </mesh>
            </group>
          ))
        )}
        {/* Crew access arm (swings away at launch) */}
        <mesh position={[-1.6, 7, 0]} castShadow>
          <boxGeometry args={[2.8, 0.2, 0.5]} />
          <meshStandardMaterial color="#888" roughness={0.5} metalness={0.5} />
        </mesh>
        {/* Lightning rod */}
        <mesh position={[0, 11.5, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 2, 6]} />
          <meshStandardMaterial color="#aaa" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Warning stripes at base */}
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[1.2, 0.3, 1.2]} />
          <meshStandardMaterial color="#e8c020" roughness={0.6} />
        </mesh>
      </group>
      {/* Distant hills (stylised fallback only) */}
      {ground && [[-40, 18, -60], [50, 14, -70], [-65, 10, 20], [60, 16, 40]].map(([x, r, z], i) => (
        <mesh key={i} position={[x, -r * 0.55, z]}>
          <sphereGeometry args={[r, 16, 12]} />
          <meshStandardMaterial color={terrain.horizon} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/** Smoothly flies the camera toward a focus height ONLY when focusY is set
 *  (a part was clicked in the VAB). When focusY is null the camera is fully
 *  user-controlled — no lerp, no override. This prevents the camera from
 *  snapping back after the user zooms out. */
function CameraRig({ focusY, distance = 12 }: { focusY: number | null; distance?: number }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 4, 0));
  const prevFocusY = useRef<number | null>(null);
  const animating = useRef(false);
  const progress = useRef(0);

  useFrame((_, dt) => {
    // Start animating only when focusY changes to a non-null value
    if (focusY !== prevFocusY.current) {
      prevFocusY.current = focusY;
      if (focusY !== null) {
        animating.current = true;
        progress.current = 0;
      } else {
        animating.current = false;
      }
    }
    if (!animating.current || focusY === null) return;

    progress.current = Math.min(1, progress.current + dt * 2);
    const t = progress.current;
    const wantY = focusY;
    const wantDist = Math.max(6, distance * 0.6);
    target.current.lerp(new THREE.Vector3(0, wantY, 0), Math.min(1, dt * 3));
    const dir = new THREE.Vector3(camera.position.x, 0, camera.position.z).normalize();
    const wantPos = new THREE.Vector3(dir.x * wantDist, wantY + 2, dir.z * wantDist);
    camera.position.lerp(wantPos, Math.min(1, dt * 2.5));
    camera.lookAt(target.current);

    // Stop animating once we're close enough (don't fight the user)
    if (t >= 1) animating.current = false;
  });
  return null;
}

export interface RocketSceneProps {
  children: ReactNode;
  site?: LaunchSite;
  skyColor?: string;
  focusY?: number | null;
  autoRotate?: boolean;
  towerRetracted?: boolean;
  showPad?: boolean;
  cameraDistance?: number;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
  /** Real takram sky/clouds + Google 3D Tiles terrain at the site (network-first). */
  geo?: boolean;
  /** 0–24 local solar hour for the geo sun (launch can shift it). */
  solarHour?: number;
  /** Disable OrbitControls + CameraRig — the launch director drives the camera. */
  controlsEnabled?: boolean;
  /** Volumetric exhaust smoke at pad level (launch mode). */
  exhaustSmoke?: boolean;
}

export default function RocketScene({
  children,
  site,
  skyColor = "#0a1128",
  focusY = null,
  autoRotate = false,
  towerRetracted = false,
  showPad = true,
  cameraDistance = 13,
  onCanvasReady,
  geo = true,
  solarHour,
  controlsEnabled = true,
}: RocketSceneProps) {
  const reducedMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const geoActive = geo && HAS_MAPS_KEY && Boolean(site);
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, preserveDrawingBuffer: true }}
      camera={{ position: [9, 6, 11], fov: 40, near: 0.5, far: 80000 }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (e) => e.preventDefault());
        onCanvasReady?.(gl.domElement);
      }}
    >
      {geoActive && site ? (
        <Suspense fallback={null}>
          <GeoEnvironment site={site} solarHour={solarHour} clouds={!reducedMotion}>
            {showPad && <Launchpad site={site} towerRetracted={towerRetracted} ground={false} />}
            {children}
          </GeoEnvironment>
        </Suspense>
      ) : (
        <>
          <color attach="background" args={[skyColor]} />
          <fog attach="fog" args={[skyColor, 60, 160]} />
          <Stars radius={100} depth={60} count={3000} factor={4} saturation={0} fade speed={reducedMotion ? 0 : 0.6} />
          <ambientLight intensity={0.45} />
          <hemisphereLight intensity={0.35} color="#bfd8ff" groundColor="#33405e" />
          <directionalLight position={[12, 18, 8]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} />
          <Environment preset="dawn" background={false} environmentIntensity={0.6} />
          <Suspense fallback={null}>
            {showPad && <Launchpad site={site} towerRetracted={towerRetracted} />}
            {children}
          </Suspense>
        </>
      )}
      {controlsEnabled && <CameraRig focusY={focusY} distance={cameraDistance} />}
      {controlsEnabled && (
        <OrbitControls
          enablePan={false}
          maxPolarAngle={Math.PI / 2 - 0.04}
          minDistance={5}
          maxDistance={45}
          autoRotate={autoRotate && !reducedMotion}
          autoRotateSpeed={0.6}
          target={[0, 4, 0]}
        />
      )}
    </Canvas>
  );
}