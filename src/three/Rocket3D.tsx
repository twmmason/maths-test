import { useState, useMemo, type ReactElement } from "react";
import * as THREE from "three";
import type { RocketDesign } from "./rocketDesign";
import type { RocketPart } from "../curriculum/types";
import { PART_MATERIALS, levelMaterial, applyMaterial } from "../mission/parts";


export interface RocketLayout {
  hullBottom: number;
  hullTop: number;
  noseTip: number;
  noseHeight: number;
}

export function rocketLayout(design: RocketDesign): RocketLayout {
  const hullBottom = 1.2;
  const hullTop = hullBottom + design.hullHeight;
  const angleRad = (Math.max(15, Math.min(120, design.noseAngle)) * Math.PI) / 180;
  const noseHeight = Math.max(0.7, Math.min(3.2, design.hullRadius / Math.tan(angleRad / 2)));
  return { hullBottom, hullTop, noseTip: hullTop + noseHeight, noseHeight };
}

/** Camera focus height for each part. */
export function focusHeightFor(part: RocketPart, design: RocketDesign): number {
  const l = rocketLayout(design);
  switch (part) {
    case "engine": return 0.8;
    case "booster": return l.hullBottom + 1;
    case "fins": return l.hullBottom + 0.6;
    case "fuelTank": return l.hullBottom + design.hullHeight * 0.3;
    case "hull": return l.hullBottom + design.hullHeight * 0.55;
    case "electronics": return l.hullBottom + design.hullHeight * 0.62;
    case "payloadBay": return l.hullBottom + design.hullHeight * 0.85;
    case "noseCone": return l.hullTop + l.noseHeight * 0.5;
  }
}

interface PartProps {
  part: RocketPart;
  draft?: boolean;
  selected?: boolean;
  level?: 1 | 2 | 3;
  material?: RocketDesign["material"];
  interactive?: boolean;
  onSelect?: (part: RocketPart) => void;
  children: (material: ReactElement) => ReactElement;
}


/** Procedural panel-line normal map via canvas (cached globally). */
const panelNormalMap = (() => {
  if (typeof document === "undefined") return null;
  const size = 256;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#8080ff";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "#7070e0";
  ctx.lineWidth = 1.5;
  for (let y = 0; y < size; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke(); }
  for (let x = 0; x < size; x += 56) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke(); }
  ctx.fillStyle = "#7474e4";
  for (let y = 0; y < size; y += 28) for (let x = 14; x < size; x += 28) { ctx.beginPath(); ctx.arc(x, y, 1.5, 0, 6.28); ctx.fill(); }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 4);
  return tex;
})();

function Part({ part, draft, selected, level = 1, material: finish = "aluminium", interactive, onSelect, children }: PartProps) {
  const [hovered, setHovered] = useState(false);
  const base = PART_MATERIALS[part];
  // Level bumps shininess; the vehicle material re-tints the whole airframe.
  const mat = applyMaterial(levelMaterial(base, level), finish);

  const isTransparent = draft || base.opacity !== undefined;
  const material = (
    <meshPhysicalMaterial
      color={mat.color}
      roughness={mat.roughness}
      metalness={mat.metalness}
      normalMap={panelNormalMap}
      normalScale={new THREE.Vector2(0.35, 0.35)}
      envMapIntensity={1.5}
      clearcoat={isTransparent ? 0 : 1}
      clearcoatRoughness={0.06}
      reflectivity={1}
      ior={1.5}
      transparent={isTransparent}
      opacity={draft ? 0.28 : base.opacity ?? 1}
      emissive={selected ? "#22d3ee" : hovered && interactive ? "#22d3ee" : draft ? "#fbbf24" : "#000000"}
      emissiveIntensity={selected ? 0.45 : hovered && interactive ? 0.3 : draft ? 0.25 : 0}
    />
  );
  return (
    <group
      onClick={interactive ? (e) => { e.stopPropagation(); onSelect?.(part); } : undefined}
      onPointerOver={interactive ? (e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; } : undefined}
      onPointerOut={interactive ? () => { setHovered(false); document.body.style.cursor = "default"; } : undefined}
    >
      {children(material)}
    </group>
  );
}

export interface Rocket3DProps {
  design: RocketDesign;
  /** Render installed parts solid (no draft ghosting). Parts that were never
   *  fitted in the VAB are NEVER shown — the rocket flies exactly as built. */
  complete?: boolean;
  interactive?: boolean;
  selectedPart?: RocketPart | null;
  partLevels?: Partial<Record<RocketPart, 1 | 2 | 3>>;
  onSelectPart?: (part: RocketPart) => void;
  engineFlame?: number; // 0..1 flame intensity for launch
  hideBoosters?: boolean;
}

export default function Rocket3D({
  design,
  complete = false,
  interactive = false,
  selectedPart,
  partLevels = {},
  onSelectPart,
  engineFlame = 0,
  hideBoosters = false,
}: Rocket3DProps) {
  const layout = rocketLayout(design);
  const r = design.hullRadius;

  const isInstalled = (part: RocketPart) => !!design.installedParts[part];
  const isDraft = (part: RocketPart) => !complete && !!design.installedParts[part] && !design.installedParts[part]!.certified;

  const finPositions = useMemo(() => {
    const count = Math.max(design.finCount, 1);
    return Array.from({ length: count }, (_, i) => (i / count) * Math.PI * 2);
  }, [design.finCount]);

  const boosterPositions = useMemo(() => {
    const count = design.boosterCount;
    return Array.from({ length: count }, (_, i) => (i / Math.max(count, 1)) * Math.PI * 2 + Math.PI / 4);
  }, [design.boosterCount]);

  const engines = Math.min(Math.max(design.engineCount, 1), 6);
  const enginePositions = useMemo(() => {
    if (engines === 1) return [[0, 0]];
    return Array.from({ length: engines }, (_, i) => {
      const a = (i / engines) * Math.PI * 2;
      return [Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5];
    });
  }, [engines, r]);

  const partProps = (part: RocketPart) => ({
    part,
    draft: isDraft(part),
    selected: selectedPart === part,
    level: partLevels[part] ?? 1,
    material: design.material,
    interactive,
    onSelect: onSelectPart,
  });

  // Higher-tier fins/boosters are physically bigger (set by the variant).
  const finSpan = design.finSpan ?? 1;
  const boosterSize = design.boosterSize ?? 1;


  return (
    <group>
      {/* HULL */}
      {isInstalled("hull") && (
        <Part {...partProps("hull")}>
          {(m) => (
            <mesh position={[0, layout.hullBottom + design.hullHeight / 2, 0]} castShadow>
              <cylinderGeometry args={[r * 0.96, r, design.hullHeight, 28]} />
              {m}
            </mesh>
          )}
        </Part>
      )}

      {/* FUEL TANK — translucent band with liquid level */}
      {isInstalled("fuelTank") && (
        <Part {...partProps("fuelTank")}>
          {(m) => (
            <group>
              <mesh position={[0, layout.hullBottom + design.hullHeight * 0.28, 0]}>
                <cylinderGeometry args={[r * 1.02, r * 1.05, design.hullHeight * 0.5, 28]} />
                {m}
              </mesh>
              {/* liquid */}
              <mesh
                position={[0, layout.hullBottom + design.hullHeight * 0.03 + (design.hullHeight * 0.5 * Math.max(0.02, design.tankFill)) / 2, 0]}
              >
                <cylinderGeometry args={[r * 0.9, r * 0.93, Math.max(0.05, design.hullHeight * 0.5 * design.tankFill), 24]} />
                <meshStandardMaterial color="#f97316" transparent opacity={0.85} emissive="#f97316" emissiveIntensity={0.15} />
              </mesh>
            </group>
          )}
        </Part>
      )}

      {/* PAYLOAD BAY */}
      {isInstalled("payloadBay") && (
        <Part {...partProps("payloadBay")}>
          {(m) => (
            <group>
              <mesh position={[0, layout.hullTop - design.hullHeight * 0.14, 0]} castShadow>
                <cylinderGeometry args={[r * 1.04, r * 1.04, design.hullHeight * 0.24, 28]} />
                {m}
              </mesh>
              {Array.from({ length: Math.min(design.payloadPods, 8) }).map((_, i) => {
                const a = (i / Math.min(design.payloadPods, 8)) * Math.PI * 2;
                return (
                  <mesh key={i} position={[Math.cos(a) * r * 0.62, layout.hullTop - design.hullHeight * 0.14, Math.sin(a) * r * 0.62]}>
                    <boxGeometry args={[0.22, 0.22, 0.22]} />
                    <meshStandardMaterial color="#ddd6fe" roughness={0.5} />
                  </mesh>
                );
              })}
            </group>
          )}
        </Part>
      )}

      {/* ELECTRONICS BAY — conformal avionics ring that hugs the hull, with a
          recessed access panel, status LEDs on the curve and a blade antenna
          (a flat breadboard stuck to a round hull looked wrong) */}
      {isInstalled("electronics") && (
        <Part {...partProps("electronics")}>
          {(m) => (
            <group position={[0, layout.hullBottom + design.hullHeight * 0.62, 0]}>
              {/* avionics band wrapping the hull */}
              <mesh castShadow>
                <cylinderGeometry args={[r * 1.035, r * 1.035, 0.55, 28]} />
                {m}
              </mesh>
              {/* ring frames top + bottom */}
              {[0.3, -0.3].map((y) => (
                <mesh key={y} position={[0, y, 0]}>
                  <torusGeometry args={[r * 1.04, 0.028, 8, 28]} />
                  <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.35} />
                </mesh>
              ))}
              {/* recessed dark-grey access panel (curved segment) */}
              <mesh rotation={[0, Math.PI / 2 - 0.55, 0]}>
                <cylinderGeometry args={[r * 1.05, r * 1.05, 0.4, 10, 1, true, 0, 1.1]} />
                <meshStandardMaterial color="#565f6e" metalness={0.65} roughness={0.35} />
              </mesh>
              {/* status LEDs following the hull curve */}
              {Array.from({ length: 6 }).map((_, i) => {
                const a = 0.28 + (i % 3) * 0.27;
                return (
                  <mesh key={i} position={[Math.sin(a) * r * 1.06, i < 3 ? 0.1 : -0.1, Math.cos(a) * r * 1.06]}>
                    <sphereGeometry args={[0.04, 8, 8]} />
                    <meshStandardMaterial
                      color={design.powerBalanced ? "#34d399" : "#fbbf24"}
                      emissive={design.powerBalanced ? "#34d399" : "#fbbf24"}
                      emissiveIntensity={0.9}
                    />
                  </mesh>
                );
              })}
              {/* blade antenna */}
              <mesh position={[0, 0.42, r * 1.0]} castShadow>
                <boxGeometry args={[0.035, 0.42, 0.1]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.3} />
              </mesh>
            </group>
          )}
        </Part>
      )}

      {/* NOSE CONE */}
      {isInstalled("noseCone") && (
        <Part {...partProps("noseCone")}>
          {(m) => (
            <mesh position={[0, layout.hullTop + layout.noseHeight / 2, 0]} castShadow>
              <coneGeometry args={[r * 0.98, layout.noseHeight, 28]} />
              {m}
            </mesh>
          )}
        </Part>
      )}

      {/* FINS */}
      {isInstalled("fins") && (
        <Part {...partProps("fins")}>
          {(m) => (
            <group>
              {finPositions.map((a, i) => (
                <group key={i} rotation={[0, -a, 0]} position={[Math.cos(a) * r * 0.98, layout.hullBottom + 0.7, Math.sin(a) * r * 0.98]} scale={[finSpan, finSpan, 1]}>
                  <mesh castShadow>
                    <extrudeGeometry

                      args={[
                        (() => {
                          const s = new THREE.Shape();
                          s.moveTo(0, -0.7);
                          s.lineTo(0.9, -1.0);
                          s.lineTo(0.9, -0.55);
                          s.lineTo(0, 0.7);
                          s.closePath();
                          return s;
                        })(),
                        { depth: 0.06, bevelEnabled: false },
                      ]}
                    />
                    {m}
                  </mesh>
                </group>
              ))}
            </group>
          )}
        </Part>
      )}

      {/* BOOSTERS */}
      {isInstalled("booster") && design.boosterCount > 0 && !hideBoosters && (
        <Part {...partProps("booster")}>
          {(m) => (
            <group>
              {boosterPositions.map((a, i) => (
                <group
                  key={i}
                  position={[Math.cos(a) * r * (1.5 + (boosterSize - 1) * 0.35), layout.hullBottom + 1.1, Math.sin(a) * r * (1.5 + (boosterSize - 1) * 0.35)]}
                >
                  <mesh castShadow>
                    <cylinderGeometry args={[0.28 * boosterSize, 0.32 * boosterSize, 2.6 * boosterSize, 16]} />
                    {m}
                  </mesh>
                  <mesh position={[0, 1.55 * boosterSize, 0]}>
                    <coneGeometry args={[0.28 * boosterSize, 0.5 * boosterSize, 16]} />
                    {m}
                  </mesh>
                </group>
              ))}

            </group>
          )}
        </Part>
      )}

      {/* ENGINES */}
      {isInstalled("engine") && (
        <Part {...partProps("engine")}>
          {(m) => (
            <group>
              <mesh position={[0, layout.hullBottom - 0.1, 0]}>
                <cylinderGeometry args={[r * 0.9, r * 0.95, 0.25, 24]} />
                {m}
              </mesh>
              {enginePositions.map(([x, z], i) => (
                <group key={i} position={[x, 0.7, z]}>
                  <mesh castShadow>
                    <cylinderGeometry args={[0.12, 0.3, 0.75, 16]} />
                    {m}
                  </mesh>
                  {engineFlame > 0 && (
                    <group position={[0, -0.6, 0]}>
                      {/* Bright core */}
                      <mesh position={[0, -engineFlame * 0.5, 0]} rotation={[Math.PI, 0, 0]}>
                        <coneGeometry args={[0.15, engineFlame * 1.8, 10]} />
                        <meshBasicMaterial color="#fff3c4" transparent opacity={0.95} depthWrite={false} />
                      </mesh>
                      {/* Mid plume */}
                      <mesh position={[0, -engineFlame * 0.9, 0]} rotation={[Math.PI, 0, 0]}>
                        <coneGeometry args={[0.3, engineFlame * 2.8, 12]} />
                        <meshBasicMaterial color="#fb923c" transparent opacity={0.7} depthWrite={false} />
                      </mesh>
                      {/* Outer glow */}
                      <mesh position={[0, -engineFlame * 1.4, 0]} rotation={[Math.PI, 0, 0]}>
                        <coneGeometry args={[0.45, engineFlame * 3.6, 12]} />
                        <meshBasicMaterial color="#7db3ff" transparent opacity={0.18} depthWrite={false} />
                      </mesh>
                      <pointLight position={[0, -1, 0]} intensity={engineFlame * 20} distance={18} decay={2} color="#ffc46b" />
                    </group>
                  )}

                </group>
              ))}
            </group>
          )}
        </Part>
      )}
    </group>
  );
}