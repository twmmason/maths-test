/**
 * MotionBlur — screen-space camera motion blur for the WebGL postprocessing
 * pipeline (the three.js `webgpu_postprocessing_motion_blur` example does the
 * same thing with a WebGPU velocity MRT; here we reconstruct velocity on WebGL).
 *
 * Per pixel: reconstruct world position from the depth buffer, re-project it
 * with the PREVIOUS frame's view-projection matrix to get a screen-space
 * velocity vector, then average several samples along that vector. During a
 * fast launch the streaking world + plume smear convincingly, while a static
 * scene stays sharp (zero velocity → no blur).
 */
import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Effect, EffectAttribute } from "postprocessing";
import * as THREE from "three";

const FRAG = /* glsl */ `
uniform mat4 uInverseViewProjection;   // current frame (clip -> world)
uniform mat4 uPreviousViewProjection;  // previous frame (world -> clip)
uniform float uIntensity;
uniform int uSamples;

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  // Skip the sky/far plane (depth ~1) — nothing to blur, avoids halo artefacts.
  if (depth >= 0.9999) { outputColor = inputColor; return; }

  // Reconstruct world position from depth.
  vec4 clip = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec4 world = uInverseViewProjection * clip;
  world /= world.w;

  // Where was this point on screen last frame?
  vec4 prevClip = uPreviousViewProjection * world;
  vec2 prevUv = (prevClip.xy / prevClip.w) * 0.5 + 0.5;

  // Screen-space velocity, scaled by intensity.
  vec2 velocity = (uv - prevUv) * uIntensity;

  // Deadzone: tiny sub-pixel camera oscillation flips the velocity sign every
  // frame, which reads as an ugly back-and-forth shimmer. Ignore it — only
  // blur genuine motion.
  float len = length(velocity);
  if (len < 0.0015) { outputColor = inputColor; return; }

  // Clamp so huge jumps (warp cuts) don't smear the whole screen.
  float maxLen = 0.08;
  if (len > maxLen) velocity *= maxLen / len;


  vec4 acc = inputColor;
  int samples = uSamples;
  for (int i = 1; i < 16; i++) {
    if (i >= samples) break;
    float t = float(i) / float(samples);
    acc += texture2D(inputBuffer, uv - velocity * t);
  }
  outputColor = acc / float(min(samples, 16));
}
`;

class MotionBlurEffect extends Effect {
  constructor() {
    super("MotionBlurEffect", FRAG, {
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map<string, THREE.Uniform>([
        ["uInverseViewProjection", new THREE.Uniform(new THREE.Matrix4())],
        ["uPreviousViewProjection", new THREE.Uniform(new THREE.Matrix4())],
        ["uIntensity", new THREE.Uniform(1)],
        ["uSamples", new THREE.Uniform(8)],
      ]),
    });
  }
  set intensity(v: number) {
    (this.uniforms.get("uIntensity") as THREE.Uniform).value = v;
  }
  updateMatrices(inverseViewProjection: THREE.Matrix4, previousViewProjection: THREE.Matrix4) {
    (this.uniforms.get("uInverseViewProjection") as THREE.Uniform).value.copy(inverseViewProjection);
    (this.uniforms.get("uPreviousViewProjection") as THREE.Uniform).value.copy(previousViewProjection);
  }
}

export default function MotionBlur({ intensity = 1, samples = 8 }: { intensity?: number; samples?: number }) {
  const { camera } = useThree();
  const effect = useMemo(() => {
    const e = new MotionBlurEffect();
    (e.uniforms.get("uSamples") as THREE.Uniform).value = samples;
    return e;
  }, [samples]);

  // Scratch matrices reused each frame (no per-frame allocation).
  const curViewProj = useMemo(() => new THREE.Matrix4(), []);
  const invViewProj = useMemo(() => new THREE.Matrix4(), []);
  const prevViewProj = useMemo(() => new THREE.Matrix4(), []);
  const hasPrev = useMemo(() => ({ v: false }), []);

  useFrame(() => {
    effect.intensity = intensity;
    camera.updateMatrixWorld();
    // viewProjection = projection * viewMatrix(=matrixWorldInverse)
    curViewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    invViewProj.copy(curViewProj).invert();
    if (!hasPrev.v) {
      prevViewProj.copy(curViewProj);
      hasPrev.v = true;
    }
    effect.updateMatrices(invViewProj, prevViewProj);
    // Stash current as previous for next frame.
    prevViewProj.copy(curViewProj);
  });

  return <primitive object={effect} dispose={null} />;
}
