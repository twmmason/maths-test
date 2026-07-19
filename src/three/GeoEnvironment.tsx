/**
 * GeoEnvironment — real-world launch-site environment built on
 * @takram/three-atmosphere (Bruneton precomputed atmospheric scattering),
 * @takram/three-clouds (volumetric clouds) and Google Photorealistic 3D
 * Tiles via 3d-tiles-renderer. Adapted from Gaudi's GeospatialEnvironment.
 *
 * THE CRITICAL TRICK — WORLD ORIGIN REBASING: the takram atmosphere is fixed
 * to the ECEF reference frame. Our scene is a rocket at metre scale near the
 * origin, so we rebase the ellipsoid instead of the scene: the Atmosphere's
 * `worldToECEFMatrix` is set to the North-Up-East frame at the launch site's
 * geodetic position, which places the world origin on the Earth's surface at
 * the pad with Three.js's Y axis pointing up.
 *
 * Degrades gracefully: no Maps key / tile failure → the stylised terrain
 * fallback still renders (error path, not the default).
 */

import React, { Component, useCallback, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import * as THREE from "three";
import {
  Atmosphere,
  Sky,
  Stars as AtmosphereStars,
  SunLight,
  SkyLight,
  AerialPerspective,
  type AtmosphereApi,
} from "@takram/three-atmosphere/r3f";
import { Ellipsoid, Geodetic, radians } from "@takram/three-geospatial";
import { Clouds, CloudLayer } from "@takram/three-clouds/r3f";
import { LensFlare, Dithering } from "@takram/three-geospatial-effects/r3f";
import { EffectComposer, Bloom, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { TilesRenderer, TilesPlugin } from "3d-tiles-renderer/r3f";
import { GoogleCloudAuthPlugin, ReorientationPlugin } from "3d-tiles-renderer/plugins";
import type { LaunchSite } from "../mission/launchSites";

export const GOOGLE_MAPS_API_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ?? "";
export const HAS_MAPS_KEY = GOOGLE_MAPS_API_KEY.length > 0;

/** Convert a 0–24 local solar hour to a Date for the site's longitude. */
function dateFromSolarHour(hour: number, longitudeDeg: number, dayOfYear = 172): Date {
  const utcHours = hour - longitudeDeg / 15;
  const base = Date.UTC(new Date().getUTCFullYear(), 0, 1, 0, 0, 0);
  return new Date(base + (dayOfYear - 1) * 86_400_000 + utcHours * 3_600_000);
}



/** Error boundary: a tiles crash silently unmounts + retries, never takes
 *  down the whole Canvas. */
class TilesErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; retryKey: number }
> {
  state = { hasError: false, retryKey: 0 };
  private timer: ReturnType<typeof setTimeout> | null = null;
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.warn("[tiles] 3D tiles crashed — retrying in 3s:", error.message);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(
      () => this.setState((s) => ({ hasError: false, retryKey: s.retryKey + 1 })),
      3000,
    );
  }
  componentWillUnmount() {
    if (this.timer) clearTimeout(this.timer);
  }
  render() {
    if (this.state.hasError) return null;
    return <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>;
  }
}

const CLEAR_RADIUS = 14; // metres of real-world tiles cleared around the pad
const FADE_BAND = 6;

/** Google Photorealistic 3D Tiles reoriented so the launch site sits at the
 *  scene origin (Three.js +Y up), relit for the takram sun/sky and with a
 *  dither-faded disc cleared around the launchpad. */
function SiteTiles({ site }: { site: LaunchSite }) {
  const [disabled, setDisabled] = useState(false);
  const height = site.ellipsoidHeight ?? 0;

  // Validate the key up front — the TilesRenderer fails silently otherwise.
  useEffect(() => {
    if (!HAS_MAPS_KEY) return;
    fetch(`https://tile.googleapis.com/v1/3dtiles/root.json?key=${GOOGLE_MAPS_API_KEY}`)
      .then(async (res) => {
        if (res.ok) return;
        const data = await res.json().catch(() => null);
        const msg = data?.error?.message ?? `HTTP ${res.status}`;
        console.error(`[tiles] Google 3D Tiles API error: ${msg}`);
        setDisabled(true);
      })
      .catch(() => console.warn("[tiles] could not validate Maps key (offline?)"));
  }, []);

  // Suppress transient dispose crashes from 3d-tiles-renderer internals.
  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      const msg = event.message || "";
      const src = event.filename || "";
      if (
        (msg.includes("removeEventListener") || msg.includes("loadingState")) &&
        (src.includes("3d-tiles-renderer") || src.includes("tiles"))
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return false;
      }
    };
    const rejection = (event: PromiseRejectionEvent) => {
      const msg = String((event.reason as Error | undefined)?.message ?? event.reason ?? "");
      if (msg.includes("loadingState") || msg.includes("removeEventListener")) event.preventDefault();
    };
    window.addEventListener("error", handler, true);
    window.addEventListener("unhandledrejection", rejection);
    return () => {
      window.removeEventListener("error", handler, true);
      window.removeEventListener("unhandledrejection", rejection);
    };
  }, []);

  // Relight tile materials (baked/unlit → standard) + clear a disc at origin.
  const handleLoadModel = useCallback((event: { scene: THREE.Object3D }) => {
    event.scene.traverse((childObj: THREE.Object3D) => {
      const child = childObj as THREE.Mesh;
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
      const mat = child.material as THREE.MeshBasicMaterial | undefined;
      if (mat && !mat.userData?.__relit) {
        const std = new THREE.MeshStandardMaterial({
          map: mat.map ?? null,
          color: mat.color ? mat.color.clone() : new THREE.Color(0xffffff),
          roughness: 1,
          metalness: 0,
        });
        std.userData.__relit = true;
        std.onBeforeCompile = (shader) => {
          shader.uniforms.uClearRadius = { value: CLEAR_RADIUS };
          shader.uniforms.uFadeBand = { value: FADE_BAND };
          shader.vertexShader = shader.vertexShader.replace(
            "#include <common>",
            "#include <common>\nvarying vec3 vClearWorldPos;",
          );
          shader.vertexShader = shader.vertexShader.replace(
            "#include <worldpos_vertex>",
            "#include <worldpos_vertex>\n" +
              "vec4 _clearLocal = vec4(transformed, 1.0);\n" +
              "#ifdef USE_BATCHING\n  _clearLocal = batchingMatrix * _clearLocal;\n#endif\n" +
              "#ifdef USE_INSTANCING\n  _clearLocal = instanceMatrix * _clearLocal;\n#endif\n" +
              "vClearWorldPos = (modelMatrix * _clearLocal).xyz;\n",
          );
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <common>",
            "#include <common>\nvarying vec3 vClearWorldPos;\nuniform float uClearRadius;\nuniform float uFadeBand;",
          );
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <clipping_planes_fragment>",
            "#include <clipping_planes_fragment>\n" +
              "float _hDist = length(vClearWorldPos.xz);\n" +
              "if (_hDist < uClearRadius - uFadeBand) discard;\n" +
              "if (_hDist < uClearRadius) {\n" +
              "  float _keep = smoothstep(uClearRadius - uFadeBand, uClearRadius, _hDist);\n" +
              "  vec2 _p = mod(gl_FragCoord.xy, 4.0);\n" +
              "  float _bayer = ((_p.y < 2.0)\n" +
              "    ? ((_p.x < 2.0) ? ((_p.x < 1.0 ? 0.0 : 8.0) + (_p.y < 1.0 ? 0.0 : 12.0))\n" +
              "                    : ((_p.x < 3.0 ? 2.0 : 10.0) + (_p.y < 1.0 ? 0.0 : 12.0)))\n" +
              "    : ((_p.x < 2.0) ? ((_p.x < 1.0 ? 3.0 : 11.0) + (_p.y < 3.0 ? 0.0 : 12.0))\n" +
              "                    : ((_p.x < 3.0 ? 1.0 : 9.0) + (_p.y < 3.0 ? 0.0 : 12.0)))) / 16.0;\n" +
              "  if (_keep < _bayer) discard;\n" +
              "}\n",
          );
        };
        child.material = std;
        mat.dispose?.();
      }
    });
  }, []);

  if (!HAS_MAPS_KEY || disabled) return null;
  return (
    <TilesErrorBoundary>
      <group>
        <TilesRenderer errorTarget={12} onLoadModel={handleLoadModel}>
          <TilesPlugin
            plugin={GoogleCloudAuthPlugin}
            args={[{ apiToken: GOOGLE_MAPS_API_KEY, autoRefreshToken: true }]}
          />
          <TilesPlugin
            plugin={ReorientationPlugin}
            args={[
              {
                lat: radians(site.lat),
                lon: radians(site.lon),
                height,
                recenter: true,
              },
            ]}
          />
        </TilesRenderer>
      </group>
    </TilesErrorBoundary>
  );
}

export interface GeoEnvironmentProps {
  site: LaunchSite;
  /** 0–24 local solar hour (default: golden hour on the pad). */
  solarHour?: number;
  /** Volumetric cloud layer on/off (reduced-motion turns it off). */
  clouds?: boolean;
  children?: ReactNode;
}

/**
 * Wraps the rocket scene in the takram atmosphere: physically-based sky,
 * atmosphere-driven sun/sky lighting, real 3D Tiles terrain, volumetric
 * clouds + aerial perspective + lens flare post-processing.
 */
export function GeoEnvironment({
  site,
  solarHour = 16.5,
  clouds = true,
  children,
}: GeoEnvironmentProps) {
  const atmosphereRef = useRef<AtmosphereApi>(null);

  // Rebase the atmosphere's ECEF frame onto the launch site + set sun time.
  useEffect(() => {
    const api = atmosphereRef.current;
    if (!api) return;
    const position = new Geodetic(radians(site.lon), radians(site.lat), 0).toECEF(
      new THREE.Vector3(),
    );
    Ellipsoid.WGS84.getNorthUpEastFrame(position, api.worldToECEFMatrix);
    api.updateByDate(dateFromSolarHour(solarHour, site.lon));
  }, [site.lat, site.lon, solarHour]);

  return (
    <Atmosphere ref={atmosphereRef} correctAltitude>
      <Sky />
      <AtmosphereStars />
      <SkyLight intensity={2} />
      {/* fill so shadowed faces don't collapse to black at rocket scale */}
      <hemisphereLight args={["#bcd3ee", "#8a7d68", 0.45]} />
      <ambientLight intensity={0.12} color="#dfe6f0" />
      <SunLight
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={1200}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={220}
        shadow-camera-bottom={-120}
        shadow-bias={-0.0002}
        shadow-normalBias={0.8}
      />
      <SiteTiles site={site} />
      {children}
      <EffectComposer multisampling={0} enableNormalPass>
        {clouds ? (
          <Clouds qualityPreset="low" coverage={0.32} localWeatherVelocity={[0.00005, 0]}>
            <CloudLayer altitude={1400} height={550} />

          </Clouds>
        ) : (
          <></>
        )}
        <AerialPerspective />
        <Bloom intensity={0.35} luminanceThreshold={1.1} mipmapBlur />
        <LensFlare
          intensity={0.1}
          featuresMaterial-ghostAmount={0.1}
          featuresMaterial-haloAmount={0.1}
        />
        <Dithering />
        <SMAA />
        <ToneMapping mode={ToneMappingMode.AGX} />
        <Vignette offset={0.3} darkness={0.3} />
      </EffectComposer>
    </Atmosphere>
  );
}
