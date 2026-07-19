import { GoogleGenAI } from "@google/genai";

const primary = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const keys = [primary].filter((k): k is string => !!k && k !== "your-gemini-api-key");

let keyIndex = 0;
let warned = false;

export const MODEL = "gemini-3-flash-preview";
export const IMAGE_MODEL_FAST = "gemini-3.1-flash-lite-image";
export const IMAGE_MODEL_QUALITY = "gemini-3-pro-image-preview";

export function hasKey(): boolean {
  return keys.length > 0;
}

export function getClient(): GoogleGenAI | null {
  if (!keys.length) {
    if (!warned) {
      warned = true;
      console.warn("[rocket-lab] No Gemini API key set — Flight Director running in fallback mode.");
    }
    return null;
  }
  return new GoogleGenAI({ apiKey: keys[keyIndex] });
}

/** Rotate to the next key after a 429/quota error (no-op with a single key). */
export function rotateKey(): void {
  keyIndex = (keyIndex + 1) % Math.max(keys.length, 1);
}

/** Run a Gemini text call with a hard timeout, one 429 retry and null on any failure. */
export async function generateText(prompt: string, system: string, timeoutMs = 4000): Promise<string | null> {
  const client = getClient();
  if (!client) return null;
  const call = async (c: GoogleGenAI) => {
    const res = await c.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { systemInstruction: system, temperature: 0.7 },
    });
    return res.text ?? null;
  };
  try {
    return await withTimeout(call(client), timeoutMs);
  } catch (err) {
    if (isRateLimit(err)) {
      rotateKey();
      const retry = getClient();
      if (retry) {
        try {
          return await withTimeout(call(retry), timeoutMs);
        } catch {
          return null;
        }
      }
    }
    return null;
  }
}

export function isRateLimit(err: unknown): boolean {
  const msg = String((err as Error)?.message ?? err ?? "");
  return msg.includes("429") || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("rate");
}

export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}