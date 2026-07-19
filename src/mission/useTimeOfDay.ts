import { create } from "zustand";

const KEY = "rocketlab-solar-hour";

interface TimeOfDayState {
  /** 0–24 local solar hour used by the geo sky sun. */
  hour: number;
  setHour: (h: number) => void;
}

/** Global time-of-day for every 3D scene, persisted across sessions. */
export const useTimeOfDay = create<TimeOfDayState>((set) => ({
  hour: (() => {
    const saved = typeof localStorage !== "undefined" ? Number(localStorage.getItem(KEY)) : NaN;
    return Number.isFinite(saved) && saved > 0 ? saved : 14;
  })(),
  setHour: (h) => {
    set({ hour: h });
    try {
      localStorage.setItem(KEY, String(h));
    } catch {
      /* private mode */
    }
  },
}));