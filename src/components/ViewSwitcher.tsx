import { useState, useImperativeHandle, forwardRef } from "react";
import { generateMissionPhoto, RENDER_STYLES, type RenderStyle } from "../ai/missionPhoto";
import { hasKey } from "../ai/gemini";

type Mode = "cad" | "fast" | "quality";

interface Props {
  getCanvas: () => HTMLCanvasElement | null;
  siteName: string;
  /** Called with the resulting image (AI repaint, or plain screenshot fallback). */
  onPhoto?: (dataUrl: string) => void;
  /** Called with the current mode so the parent can e.g. stop camera rotation. */
  onModeChange?: (mode: "cad" | "fast" | "quality") => void;
}

export interface ViewSwitcherHandle {
  recapture: () => void;
}

/** Mission Camera pill: Workshop (live 3D) / Photo (fast repaint) / Poster (quality repaint). */
const ViewSwitcher = forwardRef<ViewSwitcherHandle, Props>(function ViewSwitcher({ getCanvas, siteName, onPhoto, onModeChange }, ref) {
  const [mode, setMode] = useState<Mode>("cad");
  const [style, setStyle] = useState<RenderStyle>("photorealistic");
  const [overlay, setOverlay] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useImperativeHandle(ref, () => ({
    recapture: () => {
      if (mode !== "cad") void capture(mode as Exclude<Mode, "cad">);
    },
  }));

  const capture = async (m: Exclude<Mode, "cad">) => {
    const canvas = getCanvas();
    if (!canvas || busy) return;
    setMode(m);
    onModeChange?.(m);
    setBusy(true);
    const screenshot = canvas.toDataURL("image/png");
    const painted = hasKey() ? await generateMissionPhoto(screenshot, m === "fast" ? "fast" : "quality", style, siteName) : null;
    const result = painted ?? screenshot; // no key/network → plain screenshot
    setOverlay(result);
    onPhoto?.(result);
    setBusy(false);
    void overlay; // overlay state kept only for the parent callback
  };

  return (
    <>
      <div className="flex items-center gap-1 hud-panel px-2 py-1">
        <button
          className={`px-2 py-1 rounded text-xs font-semibold ${mode === "cad" ? "bg-cyan-500/25 text-cyan-200" : "text-slate-300"}`}
          onClick={() => {
            setMode("cad");
            setOverlay(null);
            onModeChange?.("cad");
          }}
        >
          🛠 Workshop
        </button>
        <button
          className={`px-2 py-1 rounded text-xs font-semibold ${mode === "fast" ? "bg-cyan-500/25 text-cyan-200" : "text-slate-300"}`}
          onClick={() => void capture("fast")}
        >
          📸 Photo
        </button>
        <button
          className={`px-2 py-1 rounded text-xs font-semibold ${mode === "quality" ? "bg-cyan-500/25 text-cyan-200" : "text-slate-300"}`}
          onClick={() => void capture("quality")}
        >
          🎞 Poster
        </button>
        {mode !== "cad" && (
          <select
            className="ml-1 bg-space-800 border border-cyan-500/30 rounded text-xs px-1 py-0.5"
            value={style}
            onChange={(e) => setStyle(e.target.value as RenderStyle)}
            aria-label="Photo style"
          >
            {RENDER_STYLES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        )}
      </div>

    </>
  );
});

export default ViewSwitcher;