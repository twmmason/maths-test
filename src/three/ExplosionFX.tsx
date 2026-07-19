/**
 * ExplosionFX — cinematic rocket destruction in two techniques the sim
 * borrows from the wider r3f community:
 *
 * 1. MESH SHATTER (à la wass08/r3f-objects-explode): the ACTUAL rocket meshes
 *    are split into triangle-cluster shards at the moment of loss. Each shard
 *    keeps the source material, so the fins that fly past the camera are the
 *    fins the player installed — nothing is faked with generic boxes.
 *
 * 2. PROCEDURAL FIRE (à la Domenicobrz/R3F-IP-Meteor-Impact): the fireball is
 *    a ShaderMaterial — simplex-FBM noise displaces the sphere and drives a
 *    black-body colour ramp, so the fire boils and licks rather than being a
 *    scaling emissive ball.
 *
 * Everything is timed off the deterministic sim clock (no RNG in physics;
 * hashed values give per-shard cosmetic variation only).
 */

import { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Deterministic 0..1 hash for cosmetic variation (no RNG deciding physics). */
const h01 = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/* ------------------------------------------------------------------ */
/* 1. Mesh shatter                                                     */
/* ------------------------------------------------------------------ */

export interface Shard {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  /** Shard centroid in explosion-group space (where it starts). */
  position: THREE.Vector3;
  dir: THREE.Vector3;
  speed: number;
  spinX: number;
  spinZ: number;
  burns: boolean;
  size: number;
}

const triCentroid = (pos: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, tri: number, out: THREE.Vector3) => {
  const i = tri * 3;
  return out.set(
    (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3,
    (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3,
    (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3,
  );
};

/**
 * Split every mesh under `root` into triangle-cluster shards (in `root`'s
 * local space). Call at the moment of the catastrophe, BEFORE unmounting the
 * rocket, then hand the result to <ExplosionFX shards={...}>.
 */
export function shatterObject(root: THREE.Object3D, maxShards = 64): Shard[] {
  root.updateWorldMatrix(true, true);
  const rootInv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.visible && m.geometry) meshes.push(m);
  });
  if (meshes.length === 0) return [];
  const perMesh = Math.max(2, Math.floor(maxShards / meshes.length));
  const shards: Shard[] = [];
  const c = new THREE.Vector3();

  meshes.forEach((mesh, mi) => {
    let geom: THREE.BufferGeometry;
    try {
      geom = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    } catch {
      return;
    }
    // Bake the mesh's transform relative to the rocket root, so shard
    // coordinates line up exactly with where the parts were.
    const rel = new THREE.Matrix4().multiplyMatrices(rootInv, mesh.matrixWorld);
    geom.applyMatrix4(rel);

    const pos = geom.getAttribute("position");
    if (!pos) return;
    const triCount = Math.floor(pos.count / 3);
    if (triCount === 0) return;
    const k = Math.min(perMesh, Math.max(1, Math.floor(triCount / 2)));

    // Seed points = centroids of hashed-pick triangles (k-means-lite, 1 pass).
    const seeds: THREE.Vector3[] = [];
    for (let s = 0; s < k; s++) {
      seeds.push(triCentroid(pos, Math.floor(h01(mi * 31 + s, 7) * triCount), new THREE.Vector3()).clone());
    }
    const buckets: number[][] = seeds.map(() => []);
    for (let t = 0; t < triCount; t++) {
      triCentroid(pos, t, c);
      let best = 0;
      let bestD = Infinity;
      for (let s = 0; s < seeds.length; s++) {
        const d = c.distanceToSquared(seeds[s]);
        if (d < bestD) {
          bestD = d;
          best = s;
        }
      }
      buckets[best].push(t);
    }

    const normal = geom.getAttribute("normal");
    const uv = geom.getAttribute("uv");
    const srcMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;

    buckets.forEach((tris, bi) => {
      if (tris.length === 0) return;
      const n = tris.length * 3;
      const p = new Float32Array(n * 3);
      const nn = normal ? new Float32Array(n * 3) : null;
      const uu = uv ? new Float32Array(n * 2) : null;
      tris.forEach((t, ti) => {
        for (let v = 0; v < 3; v++) {
          const src = t * 3 + v;
          const dst = ti * 3 + v;
          p[dst * 3] = pos.getX(src);
          p[dst * 3 + 1] = pos.getY(src);
          p[dst * 3 + 2] = pos.getZ(src);
          if (nn && normal) {
            nn[dst * 3] = normal.getX(src);
            nn[dst * 3 + 1] = normal.getY(src);
            nn[dst * 3 + 2] = normal.getZ(src);
          }
          if (uu && uv) {
            uu[dst * 2] = uv.getX(src);
            uu[dst * 2 + 1] = uv.getY(src);
          }
        }
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(p, 3));
      if (nn) g.setAttribute("normal", new THREE.BufferAttribute(nn, 3));
      if (uu) g.setAttribute("uv", new THREE.BufferAttribute(uu, 2));
      g.computeBoundingSphere();
      const centroid = g.boundingSphere?.center.clone() ?? new THREE.Vector3();
      g.translate(-centroid.x, -centroid.y, -centroid.z);
      const size = Math.max(0.15, g.boundingSphere?.radius ?? 0.4);

      const id = mi * 97 + bi;
      const mat = (srcMat?.clone() ?? new THREE.MeshStandardMaterial({ color: "#cfd6e4" })) as THREE.Material;
      const std = mat as THREE.MeshStandardMaterial;
      const burns = h01(id, 21) > 0.3;
      if (std.isMeshStandardMaterial) {
        std.emissive = new THREE.Color("#ff5a1e");
        std.emissiveIntensity = burns ? 1.6 : 0.3;
        std.side = THREE.DoubleSide;
      }
      // Fly outward from the blast, biased by where the shard sat on the stack.
      const dir = centroid
        .clone()
        .setY(centroid.y * 0.25)
        .normalize()
        .add(new THREE.Vector3((h01(id, 3) - 0.5) * 0.9, 0.35 + h01(id, 4) * 0.7, (h01(id, 5) - 0.5) * 0.9))
        .normalize();
      shards.push({
        geometry: g,
        material: mat,
        position: centroid,
        dir,
        speed: 14 + h01(id, 6) * 30,
        spinX: (h01(id, 7) - 0.5) * 14,
        spinZ: (h01(id, 8) - 0.5) * 14,
        burns,
        size,
      });
    });
    geom.dispose();
  });
  return shards;
}

/* ------------------------------------------------------------------ */
/* 2. Procedural FBM fire shader (meteor-impact style)                 */
/* ------------------------------------------------------------------ */

const NOISE_GLSL = /* glsl */ `
// Ashima simplex 3D noise (public domain)
vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
float fbm(vec3 p){
  float f = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    f += a * snoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return f;
}`;

const FIRE_VERT = /* glsl */ `
uniform float uTime;
uniform float uSeed;
uniform float uDisplace;
varying vec3 vPos;
${NOISE_GLSL}
void main() {
  vPos = position;
  // FBM licks: displace the sphere along its normal so the fire boils.
  float n = fbm(normalize(position) * 2.2 + vec3(uSeed, -uTime * 1.4, uTime * 0.7));
  vec3 p = position * (1.0 + uDisplace * n);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const FIRE_FRAG = /* glsl */ `
uniform float uTime;
uniform float uSeed;
uniform float uFade;
varying vec3 vPos;
${NOISE_GLSL}
void main() {
  vec3 dir = normalize(vPos);
  // Two octave-shifted FBM samples scrolling upward = rising flame tongues.
  float n1 = fbm(dir * 3.0 + vec3(uSeed, -uTime * 1.8, uTime * 0.9));
  float n2 = fbm(dir * 6.5 + vec3(-uTime * 0.8, uSeed, uTime * 1.3));
  float heat = clamp(0.55 + 0.5 * n1 + 0.25 * n2, 0.0, 1.0);
  // Black-body-ish ramp: deep red -> orange -> white-hot.
  vec3 col = mix(vec3(0.35, 0.01, 0.0), vec3(1.0, 0.38, 0.03), smoothstep(0.15, 0.7, heat));
  col = mix(col, vec3(1.0, 0.93, 0.72), smoothstep(0.72, 0.98, heat));
  // Noise-eroded alpha so the rim breaks into licks, not a smooth ball.
  float alpha = uFade * smoothstep(0.22, 0.6, heat);
  gl_FragColor = vec4(col * 2.4, alpha);
}`;

function useFireMaterial(seed: number, displace: number) {
  return useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSeed: { value: seed },
          uFade: { value: 1 },
          uDisplace: { value: displace },
        },
        vertexShader: FIRE_VERT,
        fragmentShader: FIRE_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [seed, displace],
  );
}

/* ------------------------------------------------------------------ */
/* 3. The composed effect                                              */
/* ------------------------------------------------------------------ */

export function ExplosionFX({
  y,
  drift,
  startT,
  clockRef,
  shards,
}: {
  y: number;
  drift: number;
  startT: number;
  clockRef: React.MutableRefObject<{ t: number; altKm: number; y: number }>;
  /** Real rocket fragments from shatterObject(). Empty array → fire only. */
  shards: Shard[];
}) {
  const fire1 = useRef<THREE.Mesh>(null);
  const fire2 = useRef<THREE.Mesh>(null);
  const flash = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const column = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const shardGroup = useRef<THREE.Group>(null);
  const sparks = useRef<THREE.Group>(null);
  const smoke = useRef<THREE.Group>(null);

  const fireMatA = useFireMaterial(3.7, 0.45);
  const fireMatB = useFireMaterial(9.1, 0.3);

  // Fire centre: mean of shard positions (the rocket's actual body), or a
  // sensible default when there are no shards.
  const fireCenter = useMemo(() => {
    if (shards.length === 0) return new THREE.Vector3(0, 3, 0);
    const c = new THREE.Vector3();
    shards.forEach((s) => c.add(s.position));
    return c.multiplyScalar(1 / shards.length);
  }, [shards]);

  const [streaks] = useState(() =>
    Array.from({ length: 70 }, (_, i) => {
      const dir = new THREE.Vector3(
        Math.sin(i * 0.79) + (h01(i, 8) - 0.5),
        h01(i, 9) * 1.4 - 0.15,
        Math.cos(i * 1.13) + (h01(i, 10) - 0.5),
      ).normalize();
      return {
        dir,
        quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir),
        speed: 14 + h01(i, 11) * 26,
        len: 0.5 + h01(i, 12) * 1.3,
        life: 0.45 + h01(i, 13) * 0.55,
      };
    }),
  );
  const [puffs] = useState(() =>
    Array.from({ length: 18 }, (_, i) => ({
      dir: new THREE.Vector3(Math.sin(i * 1.9), 0.35 + h01(i, 14) * 0.8, Math.cos(i * 2.3)).normalize(),
      speed: 1.5 + h01(i, 15) * 2.6,
      size: 1.4 + h01(i, 16) * 1.6,
      delay: h01(i, 17) * 0.5,
    })),
  );
  // Per-shard flame-trail orientation (points back along the velocity).
  const trailQuats = useMemo(
    () =>
      shards.map((s) => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), s.dir.clone().negate())),
    [shards],
  );

  useFrame(() => {
    const age = Math.max(0, clockRef.current.t - startT);
    const s = Math.min(1, age / 1.5);
    const wob = 1 + Math.sin(age * 31) * 0.06 + Math.sin(age * 57 + 1.3) * 0.05;

    // FBM fireballs: grow fast, boil (shader), fade out.
    const fireLife = Math.max(0, 1 - age / 2.4);
    if (fire1.current) {
      fire1.current.scale.setScalar((1.2 + s * 11) * wob);
      fireMatA.uniforms.uTime.value = age;
      fireMatA.uniforms.uFade.value = fireLife;
    }
    if (fire2.current) {
      const s2 = Math.max(0, Math.min(1, (age - 0.25) / 1.2));
      fire2.current.scale.setScalar((0.6 + s2 * 16) / wob);
      fireMatB.uniforms.uTime.value = age * 1.3 + 5.0;
      fireMatB.uniforms.uFade.value = s2 > 0 ? Math.max(0, 0.9 - s2) : 0;
    }
    // White-hot core flash (first ~0.3 s).
    if (flash.current) {
      const f = Math.max(0, 1 - age / 0.35);
      flash.current.scale.setScalar(0.5 + (1 - f) * 6);
      (flash.current.material as THREE.MeshBasicMaterial).opacity = f;
    }
    if (ring.current) {
      ring.current.scale.setScalar(0.5 + s * 38);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.55 - s * 0.6);
    }
    if (column.current) {
      const cs = Math.min(1, age / 0.9);
      column.current.scale.set(1 + cs * 2.5, 1 + cs * 6, 1 + cs * 2.5);
      column.current.position.y = fireCenter.y - 6 + cs * 3;
      (column.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.7 - age * 0.45);
    }
    if (light.current)
      light.current.intensity = Math.max(0, 150 * (1 - s)) + Math.sin(age * 41) * 12 * (1 - s) + 40 * fireLife;

    // REAL shards: ballistic arcs + tumble + shrinking flame trails.
    if (shardGroup.current) {
      shardGroup.current.children.forEach((c, i) => {
        const k = shards[i];
        if (!k) return;
        const g = c as THREE.Group;
        g.position.set(
          k.position.x + k.dir.x * k.speed * age,
          k.position.y + k.dir.y * k.speed * age - 2.2 * age * age,
          k.position.z + k.dir.z * k.speed * age,
        );
        g.rotation.x += 0.016 * k.spinX;
        g.rotation.z += 0.016 * k.spinZ;
        const trail = g.children[1] as THREE.Mesh | undefined;
        if (trail) {
          const burn = k.burns ? Math.max(0, 1 - age / 2.6) : 0;
          trail.scale.set(burn * (0.8 + Math.sin(age * 43 + i) * 0.25), burn * (1.6 + Math.sin(age * 37 + i * 2) * 0.5), burn);
          (trail.material as THREE.MeshBasicMaterial).opacity = burn * 0.9;
        }
      });
    }
    // Sparks: fast, short-lived white-hot streaks.
    if (sparks.current) {
      sparks.current.children.forEach((c, i) => {
        const k = streaks[i];
        const f = Math.max(0, 1 - age / k.life);
        c.position.set(
          fireCenter.x + k.dir.x * k.speed * age,
          fireCenter.y + k.dir.y * k.speed * age - 5 * age * age,
          fireCenter.z + k.dir.z * k.speed * age,
        );
        ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = f;
        c.scale.set(f, 1 + age * 2, f);
      });
    }
    // Smoke: dark billowing puffs that grow and linger ~8 s.
    if (smoke.current) {
      smoke.current.children.forEach((c, i) => {
        const p = puffs[i];
        const sAge = Math.max(0, age - 0.15 - p.delay);
        const fade = Math.max(0, 1 - sAge / 8);
        c.position.set(
          fireCenter.x + p.dir.x * p.speed * sAge,
          fireCenter.y + p.dir.y * p.speed * sAge + sAge * 1.1,
          fireCenter.z + p.dir.z * p.speed * sAge,
        );
        c.scale.setScalar(p.size * (0.3 + sAge * 1.3));
        ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.6 * fade;
      });
    }
  });

  return (
    <group position={[drift, y, 0]}>
      {/* FBM shader fireballs */}
      <mesh ref={fire1} position={fireCenter} material={fireMatA}>
        <icosahedronGeometry args={[1, 5]} />
      </mesh>
      <mesh ref={fire2} position={fireCenter} material={fireMatB}>
        <icosahedronGeometry args={[1, 4]} />
      </mesh>
      {/* white-hot core flash */}
      <mesh ref={flash} position={fireCenter}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={1} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* shockwave */}
      <mesh ref={ring} position={fireCenter} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1.15, 64]} />
        <meshBasicMaterial color="#ffe9c4" transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* rising fire column */}
      <mesh ref={column} position={[fireCenter.x, fireCenter.y - 6, fireCenter.z]}>
        <coneGeometry args={[1.4, 4, 16, 1, true]} />
        <meshBasicMaterial color="#ff7a1e" transparent opacity={0.7} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
      <pointLight ref={light} position={fireCenter} color="#ffaa55" intensity={150} distance={260} decay={2} />
      {/* smoke */}
      <group ref={smoke}>
        {puffs.map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[1, 10, 10]} />
            <meshStandardMaterial color={i % 3 === 0 ? "#17171b" : "#2e2e34"} transparent opacity={0.6} depthWrite={false} />
          </mesh>
        ))}
      </group>
      {/* sparks */}
      <group ref={sparks}>
        {streaks.map((k, i) => (
          <mesh key={i} quaternion={k.quat}>
            <boxGeometry args={[0.05, k.len, 0.05]} />
            <meshBasicMaterial color={i % 4 === 0 ? "#ffffff" : "#ffcf6b"} transparent opacity={1} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        ))}
      </group>
      {/* the REAL rocket, in pieces — group scaled up so debris reads clearly
          against the (much larger) fireball and from broadcast distances */}
      <group ref={shardGroup} scale={2.2}>
        {shards.map((k, i) => (
          <group key={i} position={k.position}>
            <mesh geometry={k.geometry} material={k.material} castShadow />
            <mesh quaternion={trailQuats[i]}>
              <coneGeometry args={[0.5 * k.size, 3.6 * k.size, 8, 1, true]} />
              <meshBasicMaterial color="#ff9a2e" transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}