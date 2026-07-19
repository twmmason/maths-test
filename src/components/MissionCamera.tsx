import { useEffect, useRef, useState } from "react";
import ViewSwitcher, { type ViewSwitcherHandle } from "./ViewSwitcher";
import type { SceneInfo } from "../ai/missionPhoto";

/**
 * Mission Camera — drop-in wrapper for any 3D view. Renders the
 * Workshop/Photo/Poster pill plus the full-screen photo overlay, and handles
 * the "drag to reframe → re-capture" behaviour. Mount it INSIDE the
 * position:relative container that wraps the RocketScene.
 *
 * `onPhotoModeChange(active)` fires when entering/leaving photo or poster
 * mode — pages use it to pause time (sim clocks, auto-rotate) while the
 * camera is out.
 */
export default function MissionCamera({
  getCanvas,
  siteName,
  siteTerrain,
  sceneContext,
  sceneInfo,
  onPhotoModeChange,
  pillClassName = "absolute bottom-4 right-4 z-30",
}: {
  getCanvas: () => HTMLCanvasElement | null;
  siteName: string;
  siteTerrain?: string;
  /** Scene context hint for the AI photo prompt ("pad" | "in-flight" | "orbit"). */
  sceneContext?: "pad" | "in-flight" | "orbit";
  /** Rich scene descriptor for better AI prompts. */
  sceneInfo?: SceneInfo;
  onPhotoModeChange?: (active: boolean) => void;
  pillClassName?: string;
}) {
  const [photoMode, setPhotoMode] = useState(false);
  const [overlay, setOverlay] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lastPhotoMode = useRef<"fast" | "quality" | null>(null);
  const switcherRef = useRef<ViewSwitcherHandle | null>(null);
  const pillRef = useRef<HTMLDivElement | null>(null);

  // Latest values for the document-level listeners (avoid stale closures).
  const overlayRef = useRef(overlay);
  overlayRef.current = overlay;
  const busyRef = useRef(busy);
  busyRef.current = busy;

  // While in photo mode: dragging the scene dismisses the still, releasing
  // re-captures from the new angle; scrolling re-captures after zoom settles.
  useEffect(() => {
    if (!photoMode) return;
    const insidePill = (e: Event) =>
      e.target instanceof Node && !!pillRef.current && pillRef.current.contains(e.target);
    const recapture = () => {
      setBusy(true);
      setTimeout(() => switcherRef.current?.recapture(), 400);
    };
    const onDown = (e: PointerEvent) => {
      if (insidePill(e)) return;
      if (overlayRef.current) setOverlay(null);
    };
    const onUp = (e: PointerEvent) => {
      if (insidePill(e)) return;
      if (!overlayRef.current && lastPhotoMode.current && !busyRef.current) recapture();
    };
    const onWheel = (e: WheelEvent) => {
      if (insidePill(e)) return;
      if (overlayRef.current) {
        setOverlay(null);
        if (lastPhotoMode.current && !busyRef.current) setTimeout(recapture, 600);
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("wheel", onWheel);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("wheel", onWheel);
    };
  }, [photoMode]);

  return (
    <>
      {busy && (
        <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
          <div className="hud-panel px-4 py-2 text-sm text-cyan-200 animate-pulse">developing photo… 📷</div>
        </div>
      )}
      {overlay && photoMode && !busy && (
        <div className="absolute inset-0 z-20 pointer-events-none">
          <img src={overlay} alt="Mission photo" className="w-full h-full object-cover" />
        </div>
      )}
      <div ref={pillRef} className={pillClassName}>
        <ViewSwitcher
          ref={switcherRef}
          getCanvas={getCanvas}
          siteName={siteName}
          siteTerrain={siteTerrain}
          sceneContext={sceneContext}
          sceneInfo={sceneInfo}
          onModeChange={(m) => {
            const active = m !== "cad";
            setPhotoMode(active);
            onPhotoModeChange?.(active);
            if (!active) {
              setOverlay(null);
              lastPhotoMode.current = null;
            } else {
              setBusy(true);
              lastPhotoMode.current = m as "fast" | "quality";
            }
          }}
          onPhoto={(url) => {
            setOverlay(url);
            setBusy(false);
          }}
        />
      </div>
    </>
  );
}