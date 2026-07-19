import { db, type Profile } from "./db";
import { DEFAULT_DESIGN } from "../three/rocketDesign";
import { setCommanderName } from "../ai/commander";

const ACTIVE_KEY = "rocketlab.activeProfileId";

/** Id of the currently selected commander profile (null = show the picker). */
export function getActiveProfileId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function setActiveProfileId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    /* private mode etc — picker will just reappear */
  }
}

export function clearActiveProfileId(): void {
  try {
    localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* noop */
  }
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "commander";
}

export function defaultProfile(id: string, name: string): Profile {
  return {
    id,
    name,
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

/** All commander profiles, most recently played first. */
export async function listProfiles(): Promise<Profile[]> {
  const all = await db.profiles.toArray();
  return all.sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
}

/** Create (or reuse) a profile for the given name and make it active. */
export async function createProfile(name: string): Promise<Profile> {
  const clean = name.trim().slice(0, 24);
  let id = slugify(clean);
  const existing = await db.profiles.get(id);
  if (existing) {
    // Same name already exists — treat it as that commander logging back in.
    setActiveProfileId(id);
    setCommanderName(existing.name);
    return existing;
  }
  const profile = defaultProfile(id, clean);
  await db.profiles.put(profile);
  setActiveProfileId(id);
  setCommanderName(clean);
  return profile;
}

/** Select an existing profile as the active commander. */
export async function selectProfile(id: string): Promise<Profile | null> {
  const profile = await db.profiles.get(id);
  if (!profile) return null;
  setActiveProfileId(id);
  setCommanderName(profile.name);
  return profile;
}

/**
 * Load the active profile if one is selected. Returns null when no profile is
 * active (first visit or after "switch commander") — the app shows the picker.
 */
export async function loadActiveProfile(): Promise<Profile | null> {
  const id = getActiveProfileId();
  if (!id) return null;
  const profile = await db.profiles.get(id);
  if (!profile) {
    clearActiveProfileId();
    return null;
  }
  setCommanderName(profile.name);
  return profile;
}