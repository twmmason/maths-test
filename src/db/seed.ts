import { db, type Profile } from "./db";
import { DEFAULT_DESIGN } from "../three/rocketDesign";

export const PROFILE_ID = "artie";

export function defaultProfile(): Profile {
  return {
    id: PROFILE_ID,
    name: "Commander Artie",
    xp: 0,
    launchStreak: 0,
    lastPlayedAt: Date.now(),
    lastLaunchDay: "",
    rocketDesign: { ...DEFAULT_DESIGN, installedParts: {} },
    launchSiteId: "canaveral",
    partLevels: {
      noseCone: 1, hull: 1, fuelTank: 1, engine: 1,
      fins: 1, payloadBay: 1, electronics: 1, booster: 1,
    },
    patches: [],
  };
}

/** Ensure the single local profile exists; returns it. */
export async function ensureSeeded(): Promise<Profile> {
  const existing = await db.profiles.get(PROFILE_ID);
  if (existing) return existing;
  const profile = defaultProfile();
  await db.profiles.put(profile);
  return profile;
}