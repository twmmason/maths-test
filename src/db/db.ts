import Dexie, { type Table } from "dexie";
import type { RocketPart } from "../curriculum/types";
import type { RocketDesign } from "../three/rocketDesign";

export interface Profile {
  id: string; // "artie"
  name: string;
  xp: number;
  launchStreak: number; // consecutive days with >= 1 launch
  lastPlayedAt: number;
  lastLaunchDay: string; // YYYY-MM-DD of most recent launch (for streaks)
  rocketDesign: RocketDesign;
  launchSiteId: string;
  partLevels: Record<RocketPart, 1 | 2 | 3>;
  patches: string[];
}

export interface Attempt {
  id?: number;
  criterionCode: string;
  tier: number;
  correct: boolean;
  hintsUsed: number;
  missionId?: number;
  createdAt: number;
}

export interface MissionRecord {
  id?: number;
  destinationId: string;
  launchSiteId?: string;
  tasksCorrect: number;
  tasksTotal: number;
  maxAltitudeKm: number;
  reachedDestination: boolean;
  screenshot?: string; // dataURL of the launched rocket
  photos?: string[]; // AI mission photos / posters
  createdAt: number;
}

/** A saved in-progress mission so a build can resume after a tab close. */
export interface SavedMission {
  id: string; // "current"
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
  }
}

export const db = new RocketLabDB();