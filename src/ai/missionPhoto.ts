import { getClient, rotateKey, isRateLimit, withTimeout, IMAGE_MODEL_FAST, IMAGE_MODEL_QUALITY } from "./gemini";

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
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;
  const model = quality === "fast" ? IMAGE_MODEL_FAST : IMAGE_MODEL_QUALITY;
  // Resize the screenshot to max 768px before sending — dramatically faster API response
  const resized = await resizeDataUrl(screenshotDataUrl, 768);
  const base64 = resized.split(",")[1];
  if (!base64) return null;

  const prompt = `Repaint this 3D render of a child's rocket on the launch pad at ${siteName} as a ${style.replace("-", " ")} photograph. Keep the rocket's shape, parts and colours exactly as shown.`;

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