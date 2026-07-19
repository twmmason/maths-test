import { useState, useMemo , type ReactElement } from "react";
import * as THREE from "three";
import type { RocketDesign } from "./rocketDesign";
import type { RocketPart } from "../curriculum/types";
import { PART_MATERIALS, levelMaterial } from "../mission/parts";

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
  interactive?: boolean;
  onSelect?: (part: RocketPart) => void;
  children: (material: ReactElement) => ReactElement;
}

function Part({ part, draft, selected, level = 1, interactive, onSelect, children }: PartProps) {
  const [hovered, setHovered] = useState(false);
  const base = PART_MATERIALS[part];
  const mat = levelMaterial(base, level);
  const material = (
    <meshStandardMaterial
      color={mat.color}
      roughness={mat.roughness}
      metalness={mat.metalness}
      transparent={draft || base.opacity !== undefined}
      opacity={draft ? 0.28 : base.opacity ?? 1}
      emissive={selected ? "#22d3ee" : hovered && interactive ? "#22d3ee" : draft ? "#fbbf24" : level >= 3 ? "#22d3ee" : "#000000"}
      emissiveIntensity={selected ? 0.45 : hovered && interactive ? 0.3 : draft ? 0.25 : level >= 3 ? 0.12 : 0}
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
  /** Show every part regardless of assembly state (hangar / launch). */
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

  const isInstalled = (part: RocketPart) => complete || !!design.installedParts[part];
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
    interactive,
    onSelect: onSelectPart,
  });

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

      {/* ELECTRONICS BAY — breadboard panel on the hull */}
      {isInstalled("electronics") && (
        <Part {...partProps("electronics")}>
          {(m) => (
            <group position={[0, layout.hullBottom + design.hullHeight * 0.62, r * 1.02]}>
              <mesh castShadow>
                <boxGeometry args={[0.9, 0.7, 0.12]} />
                {m}
              </mesh>
              {Array.from({ length: 6 }).map((_, i) => (
                <mesh key={i} position={[-0.3 + (i % 3) * 0.3, i < 3 ? 0.16 : -0.16, 0.08]}>
                  <sphereGeometry args={[0.045, 8, 8]} />
                  <meshStandardMaterial
                    color={design.powerBalanced ? "#34d399" : "#fbbf24"}
                    emissive={design.powerBalanced ? "#34d399" : "#fbbf24"}
                    emissiveIntensity={0.9}
                  />
                </mesh>
              ))}
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
                <group key={i} rotation={[0, -a, 0]} position={[Math.cos(a) * r * 0.98, layout.hullBottom + 0.7, Math.sin(a) * r * 0.98]}>
                  <mesh rotation={[0, Math.PI / 2, 0]} castShadow>
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
                <group key={i} position={[Math.cos(a) * r * 1.5, layout.hullBottom + 1.1, Math.sin(a) * r * 1.5]}>
                  <mesh castShadow>
                    <cylinderGeometry args={[0.28, 0.32, 2.6, 16]} />
                    {m}
                  </mesh>
                  <mesh position={[0, 1.55, 0]}>
                    <coneGeometry args={[0.28, 0.5, 16]} />
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
                    <mesh position={[0, -0.8 - engineFlame * 0.7, 0]}>
                      <coneGeometry args={[0.24, 1.4 + engineFlame * 1.6, 12]} />
                      <meshBasicMaterial color={engineFlame > 0.7 ? "#93c5fd" : "#fb923c"} transparent opacity={0.85} />
                    </mesh>
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