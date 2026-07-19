import { getClient, rotateKey, isRateLimit, withTimeout, IMAGE_MODEL_FAST, IMAGE_MODEL_QUALITY } from "./gemini";

/** Rich scene context so the AI prompt matches what the camera actually sees. */
export interface SceneInfo {
  /** What phase the rocket is in. */
  context: "pad" | "in-flight" | "orbit";
  /** Current altitude in km (0 on the pad). */
  altitudeKm: number;
  /** Camera shot description (e.g. "low wide shot from 50 m away", "chase cam alongside"). */
  cameraDesc: string;
  /** Rocket height in metres. */
  rocketHeightM: number;
  /** Site full name + country. */
  siteLabel: string;
  /** Geographic description for the location. */
  locationDesc: string;
  /** Time of day hint. */
  timeOfDay: string;
}

export type RenderStyle = "photorealistic" | "night-launch" | "watercolor" | "concept-art" | "toy-model";

export const RENDER_STYLES: { id: RenderStyle; label: string }[] = [
  { id: "photorealistic", label: "📷 Photoreal" },
  { id: "night-launch", label: "🌙 Night launch" },
  { id: "watercolor", label: "🎨 Watercolour" },
  { id: "concept-art", label: "🖼 Concept art" },
  { id: "toy-model", label: "🧸 Toy model" },
];

/** Resize a dataURL image to fit within maxDim (preserving aspect ratio).
 *  Returns a smaller PNG dataURL — much faster Gemini round-trip. */
async function resizeDataUrl(dataUrl: string, maxDim: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(dataUrl); // fallback: send original
    img.src = dataUrl;
  });
}

/**
 * Repaint a canvas screenshot with a Gemini image model (Mission Camera).
 * Returns a dataURL, or null on any failure (caller falls back to the plain screenshot).
 */
export async function generateMissionPhoto(
  screenshotDataUrl: string,
  quality: "fast" | "quality",
  style: RenderStyle,
  siteName: string,
  terrain?: string,
  /** Hint about the scene context (e.g. "in-flight", "orbit"). When omitted
   *  the prompt defaults to a ground-level pad shot. */
  sceneContext?: "pad" | "in-flight" | "orbit",
  /** Rich scene descriptor for better AI prompts. */
  sceneInfo?: SceneInfo,
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;
  const model = quality === "fast" ? IMAGE_MODEL_FAST : IMAGE_MODEL_QUALITY;
  // Resize the screenshot to max 768px before sending — dramatically faster API response
  const resized = await resizeDataUrl(screenshotDataUrl, 768);
  const base64 = resized.split(",")[1];
  if (!base64) return null;

  const ctx = sceneInfo?.context ?? sceneContext ?? "pad";
  const si = sceneInfo;

  // Location-aware terrain descriptions
  const terrainHint: Record<string, string> = {
    coastal: "on a concrete launch pad near the ocean coast, sea and shoreline in the background, flat scrubland around the pad",
    steppe: "on a concrete launch pad in the middle of a vast flat steppe plain, brown grasslands stretching to the horizon under an enormous sky",
    jungle: "on a concrete launch pad surrounded by dense tropical jungle, lush green canopy visible around the clearing",
    island: "on a concrete launch pad on a coastal island, green cliffs and sea visible, the pad sits on flat ground near the shore",
  };

  // Build a rich, grounded prompt
  const parts: string[] = [];

  // Style + subject
  parts.push(`Repaint this 3D screenshot as a ${style.replace("-", " ")} image.`);

  // Rocket description
  const rocketH = si?.rocketHeightM ?? 10;
  parts.push(`The subject is a rocket approximately ${Math.round(rocketH)} metres tall.`);

  // Scene context
  if (ctx === "orbit") {
    const alt = si?.altitudeKm ?? 400;
    parts.push(`The rocket is coasting in orbit at ${alt.toLocaleString("en-GB")} km altitude. The Earth's curved horizon and the blackness of space are visible. There is no launch pad — the rocket is floating in microgravity.`);
  } else if (ctx === "in-flight") {
    const alt = si?.altitudeKm ?? 5;
    if (alt > 80) {
      parts.push(`The rocket is high in the upper atmosphere at ${Math.round(alt)} km, the sky is nearly black, the ground is far below as a hazy surface. Engine exhaust trails behind. There is no pad visible.`);
    } else if (alt > 10) {
      parts.push(`The rocket is climbing through the atmosphere at about ${Math.round(alt)} km altitude above ${si?.siteLabel ?? siteName}. Clouds may be nearby or below. The ground is distant. Engine exhaust streams behind the rocket.`);
    } else {
      parts.push(`The rocket has just lifted off and is a few hundred metres above the pad at ${si?.siteLabel ?? siteName}. Exhaust and smoke billow below it. The launch pad and surrounding terrain are still visible below.`);
    }
  } else {
    // On the pad
    const loc = si?.locationDesc ?? terrainHint[terrain ?? "coastal"] ?? "on a launch pad";
    parts.push(`The rocket is standing vertically ${loc} at ${si?.siteLabel ?? siteName}. A service tower/gantry stands beside it. The rocket's base sits ON THE GROUND on the concrete pad — the pad must be at ground level, not floating.`);
  }

  // Camera/framing
  if (si?.cameraDesc) {
    parts.push(`The camera angle is: ${si.cameraDesc}.`);
  }

  // Time of day
  if (si?.timeOfDay) {
    parts.push(`The lighting is ${si.timeOfDay}.`);
  }

  // Hard rules
  parts.push("CRITICAL: Keep the rocket's exact shape, proportions, fins, nose cone and colours from the screenshot — only change the rendering style.");
  parts.push("CRITICAL: Match the camera angle, framing and composition exactly as shown in the screenshot.");
  if (ctx !== "pad") {
    parts.push("The rocket is IN FLIGHT — do NOT place it on a pad, pedestal, or podium. Do NOT add ground underneath it.");
  } else {
    parts.push("The launch pad and rocket must be sitting ON the ground at ground level — NOT floating in the air. The pad is a flat concrete surface flush with the terrain.");
  }

  const prompt = parts.join(" ");

  const call = async () => {
    const res = await client.models.generateContent({
      model,
      contents: [
        { inlineData: { mimeType: "image/png", data: base64 } },
        { text: prompt },
      ],
    });
    const parts = res.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        return `data:${part.inlineData.mimeType ?? "image/png"};base64,${part.inlineData.data}`;
      }
    }
    return null;
  };

  try {
    return await withTimeout(call(), quality === "fast" ? 12000 : 35000);
  } catch (err) {
    if (isRateLimit(err)) {
      rotateKey();
      try {
        return await withTimeout(call(), 25000);
      } catch {
        return null;
      }
    }
    return null;
  }
}