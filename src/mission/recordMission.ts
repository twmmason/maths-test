import { db, type MissionRecord, type Profile } from "../db/db";
import { PROFILE_ID } from "../db/seed";
import { evaluatePatches } from "./patches";
import { computeMastery, allPartLevels } from "../engine/mastery";

function dayString(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

/** Save a completed mission, update streaks/patches/part levels. Returns record id + new patches. */
export async function recordMission(
  record: Omit<MissionRecord, "id" | "createdAt">,
  perfect: boolean,
): Promise<{ missionId: number; newPatches: string[] }> {
  const createdAt = Date.now();
  const missionId = (await db.missions.add({ ...record, createdAt })) as number;

  const profile = (await db.profiles.get(PROFILE_ID)) as Profile;
  const today = dayString(createdAt);
  const yesterday = dayString(createdAt - 24 * 60 * 60 * 1000);
  let streak = profile.launchStreak;
  if (profile.lastLaunchDay === today) {
    // same day — streak unchanged
  } else if (profile.lastLaunchDay === yesterday) {
    streak += 1;
  } else {
    streak = 1;
  }

  const missions = await db.missions.toArray();
  const attempts = await db.attempts.toArray();
  const mastery = computeMastery(attempts);

  const updated: Profile = {
    ...profile,
    launchStreak: streak,
    lastLaunchDay: today,
    lastPlayedAt: createdAt,
    partLevels: allPartLevels(mastery),
  };
  const newPatches = evaluatePatches(updated, missions, attempts, {
    destinationId: record.destinationId,
    perfect,
  });
  updated.patches = [...updated.patches, ...newPatches];
  await db.profiles.put(updated);
  // Clear any saved mid-build mission — this one is complete.
  await db.savedMissions.delete("current");
  return { missionId, newPatches };
}