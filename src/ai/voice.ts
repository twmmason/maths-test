/**
 * voice.ts — character voices via Gemini TTS (same approach as scios video
 * narration: one `generateContent` call with `responseModalities: ["AUDIO"]`
 * and a `prebuiltVoiceConfig`, decoupled from everything visual).
 *
 * Local-first rules:
 *  - synthesise on first use, cache the WAV in IndexedDB (own Dexie store),
 *    replay from cache offline forever after;
 *  - no key / no network / API error → fall back to browser speechSynthesis;
 *  - never blocks the launch sequence (fire-and-forget audio).
 */
import Dexie, { type Table } from "dexie";

const GEMINI_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ?? "";

/** Gemini TTS model (see scios `VIDEO_TTS_MODEL_ID`). */
const TTS_MODEL = "gemini-2.5-flash-preview-tts";
/** Gemini TTS returns 24 kHz mono 16-bit PCM. */
const SAMPLE_RATE = 24_000;

export type VoiceRole = "flightDirector" | "rso" | "commander";

/** Single shared voice — every character speaks with the same voice. */
const SHARED_VOICE = "Puck";

/**
 * Voice registry — all roles use the same prebuilt Gemini voice; only the
 * natural-language delivery directive differs per role.
 */
const VOICE_FOR_ROLE: Record<VoiceRole, { voiceName: string; style: string; rate: number }> = {
  flightDirector: { voiceName: SHARED_VOICE, style: "Say like a calm, upbeat NASA launch commentator", rate: 1.0 },
  rso: { voiceName: SHARED_VOICE, style: "Say like a calm, upbeat NASA launch commentator", rate: 1.0 },
  commander: { voiceName: SHARED_VOICE, style: "Say like a calm, upbeat NASA launch commentator", rate: 1.0 },
};

/** Strip characters that read badly aloud (scios `_sanitize_for_tts`). */
function sanitizeForTts(text: string): string {
  return text
    .replace(/[*_`#~^{}\\|<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface VoiceClip {
  key: string; // hash(text|voice)
  mp3: Blob; // field name kept for cache compatibility (contains WAV now)
  createdAt: number;
}

class VoiceDB extends Dexie {
  clips!: Table<VoiceClip, string>;
  constructor() {
    super("rocketlab-voice");
    this.version(1).stores({ clips: "key" });
  }
}
const vdb = new VoiceDB();

function clipKey(text: string, voice: string): string {
  let h = 2166136261;
  const s = `${voice}|${text}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `gem-${voice}-${(h >>> 0).toString(36)}`;
}

/** Wrap raw 16-bit mono PCM in a WAV header so <audio> can play it. */
function pcmToWav(pcm: Uint8Array, sampleRate: number): Blob {
  const header = new ArrayBuffer(44);
  const v = new DataView(header);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  v.setUint32(4, 36 + pcm.length, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  v.setUint32(16, 16, true); // PCM chunk size
  v.setUint16(20, 1, true); // PCM format
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true); // byte rate
  v.setUint16(32, 2, true); // block align
  v.setUint16(34, 16, true); // bits per sample
  writeStr(36, "data");
  v.setUint32(40, pcm.length, true);
  return new Blob([header, pcm.buffer as ArrayBuffer], { type: "audio/wav" });
}

/** One Gemini-TTS generateContent call per line (scios `synthesize_narration`). */
async function synthesise(text: string, role: VoiceRole): Promise<Blob | null> {
  if (!GEMINI_KEY) return null;
  const v = VOICE_FOR_ROLE[role];
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${v.style}: ${sanitizeForTts(text)}` }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: v.voiceName } } },
          },
        }),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> } }>;
    };
    const b64 = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData?.data;
    if (!b64) return null;
    const pcm = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return pcmToWav(pcm, SAMPLE_RATE);
  } catch {
    return null;
  }
}

/** Browser speechSynthesis fallback — same behaviour as before this module. */
function speakFallback(text: string, role: VoiceRole) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = VOICE_FOR_ROLE[role].rate;
  u.pitch = 1;
  u.lang = "en-GB";
  window.speechSynthesis.speak(u);
}

let unlocked = false;
export function unlockVoice() {
  unlocked = true;
}

/**
 * Speak a line in a character voice. Cache-first; synthesises + caches on a
 * miss; falls back to speechSynthesis (then silence/captions) on failure.
 */
export async function speak(text: string, role: VoiceRole = "flightDirector"): Promise<void> {
  try {
    const key = clipKey(text, VOICE_FOR_ROLE[role].voiceName);
    let clip = await vdb.clips.get(key);
    if (!clip) {
      const wav = await synthesise(text, role);
      if (wav) {
        clip = { key, mp3: wav, createdAt: Date.now() };
        await vdb.clips.put(clip);
      }
    }
    if (clip) {
      const url = URL.createObjectURL(clip.mp3);
      const audio = new Audio(url);
      audio.volume = 0.9;
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play().catch(() => {
        URL.revokeObjectURL(url);
        speakFallback(text, role);
      });
      return;
    }
  } catch {
    // fall through to browser voice
  }
  speakFallback(text, role);
}

/** Fixed callouts pre-warmed at app start so they play instantly (and offline). */
const PREWARM_LINES: Array<[string, VoiceRole]> = [
  ["T minus ten", "flightDirector"],
  ["Three", "flightDirector"],
  ["Two", "flightDirector"],
  ["One", "flightDirector"],
  ["Liftoff! We have liftoff!", "flightDirector"],
  ["Max Q", "flightDirector"],
  ["We've lost the vehicle. The crew capsule escape tower worked perfectly, again.", "rso"],
  ["Hold hold hold. Guidance bus fault. The range is safe — nice catch by the pad computer.", "rso"],
];

/** Bounded concurrency like scios `MAX_PARALLEL_TTS_REQUESTS` (default 5). */
const MAX_PARALLEL_TTS_REQUESTS = 5;

export async function prewarmVoices(): Promise<void> {
  if (!GEMINI_KEY) return;
  const misses: Array<[string, VoiceRole, string]> = [];
  for (const [text, role] of PREWARM_LINES) {
    const key = clipKey(text, VOICE_FOR_ROLE[role].voiceName);
    if (!(await vdb.clips.get(key))) misses.push([text, role, key]);
  }
  for (let i = 0; i < misses.length; i += MAX_PARALLEL_TTS_REQUESTS) {
    await Promise.all(
      misses.slice(i, i + MAX_PARALLEL_TTS_REQUESTS).map(async ([text, role, key]) => {
        const wav = await synthesise(text, role);
        if (wav) await vdb.clips.put({ key, mp3: wav, createdAt: Date.now() });
      }),
    );
  }
}

export const voiceReady = () => unlocked;