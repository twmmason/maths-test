import Dexie, { type Table } from "dexie";
import type { RocketPart } from "../curriculum/types";
import type { RocketDesign } from "../three/rocketDesign";

export interface Profile {
  id: string; // slug of the commander's name, e.g. "artie", "walter"
  name: string; // display name, e.g. "Artie", "Walter"
  xp: number;
  launchStreak: number; // consecutive days with >= 1 launch
  lastPlayedAt: number;
  lastLaunchDay: string; // YYYY-MM-DD of most recent launch (for streaks)
  rocketDesign: RocketDesign;
  launchSiteId: string;
  partLevels: Record<RocketPart, 1 | 2 | 3>;
  patches: string[];
  /** "I'm in Year 7+" — opens the Astronaut Academy without grinding KS2. */
  academyUnlocked?: boolean;
  /** Wrench Time spare-part tokens (re-doing an install step costs one). */
  spareParts?: number;
}

export interface Attempt {
  id?: number;
  profileId?: string; // stamped with the active profile at write time
  criterionCode: string;
  tier: number;
  correct: boolean;
  hintsUsed: number;
  missionId?: number;
  createdAt: number;
}

export interface MissionRecord {
  id?: number;
  profileId?: string; // stamped with the active profile at write time
  destinationId: string;
  launchSiteId?: string;
  tasksCorrect: number;
  tasksTotal: number;
  maxAltitudeKm: number;
  reachedDestination: boolean;
  screenshot?: string; // dataURL of the launched rocket
  photos?: string[]; // AI mission photos / posters
  /** Wrench Time flight outcome: nominal | degraded | lostVehicle | padAbort. */
  outcome?: string;
  createdAt: number;
}

/** A saved in-progress mission so a build can resume after a tab close. Keyed by profile id. */
export interface SavedMission {
  id: string; // profile id
  destinationId: string;
  design: RocketDesign;
  completedTasks: Record<string, string[]>; // part -> criterion codes done
  tasksCorrect: number;
  tasksTotal: number;
  updatedAt: number;
}

class RocketLabDB extends Dexie {
  profiles!: Table<Profile, string>;
  attempts!: Table<Attempt, number>;
  missions!: Table<MissionRecord, number>;
  savedMissions!: Table<SavedMission, string>;

  constructor() {
    super("arties-rocket-lab");
    this.version(1).stores({
      profiles: "id",
      attempts: "++id, criterionCode, createdAt",
      missions: "++id, destinationId, createdAt",
      savedMissions: "id",
    });
    // v2: multi-profile — attempts/missions stamped with profileId,
    // saved missions keyed per profile. Existing data belongs to "artie".
    this.version(2)
      .stores({
        profiles: "id",
        attempts: "++id, profileId, criterionCode, createdAt",
        missions: "++id, profileId, destinationId, createdAt",
        savedMissions: "id",
      })
      .upgrade(async (tx) => {
        await tx.table("attempts").toCollection().modify((a: Attempt) => {
          if (!a.profileId) a.profileId = "artie";
        });
        await tx.table("missions").toCollection().modify((m: MissionRecord) => {
          if (!m.profileId) m.profileId = "artie";
        });
        const saved = await tx.table("savedMissions").get("current");
        if (saved) {
          await tx.table("savedMissions").put({ ...saved, id: "artie" });
          await tx.table("savedMissions").delete("current");
        }
        // Existing single profile keeps id "artie" but gets a clean display name.
        const artie = await tx.table("profiles").get("artie");
        if (artie && typeof artie.name === "string") {
          await tx.table("profiles").put({ ...artie, name: artie.name.replace(/^Commander\s+/i, "") });
        }
      });
    // v3: Astronaut Academy — "I'm in Year 7+" toggle on profiles.
    this.version(3)
      .stores({
        profiles: "id",
        attempts: "++id, profileId, criterionCode, createdAt",
        missions: "++id, profileId, destinationId, createdAt",
        savedMissions: "id",
      })
      .upgrade(async (tx) => {
        await tx.table("profiles").toCollection().modify((p: Profile) => {
          if (p.academyUnlocked === undefined) p.academyUnlocked = false;
        });
      });
  }
}

export const db = new RocketLabDB();

/** All attempts belonging to one profile. */
export async function attemptsFor(profileId: string): Promise<Attempt[]> {
  return db.attempts.where("profileId").equals(profileId).toArray();
}

/** All completed missions belonging to one profile. */
export async function missionsFor(profileId: string): Promise<MissionRecord[]> {
  return db.missions.where("profileId").equals(profileId).toArray();
}