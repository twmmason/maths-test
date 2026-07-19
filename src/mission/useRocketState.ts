import { create } from "zustand";
import type { RocketPart } from "../curriculum/types";
import { emptyDesign, type RocketDesign } from "../three/rocketDesign";
import { db, attemptsFor, type Profile, type Attempt } from "../db/db";
import { loadActiveProfile, getActiveProfileId, clearActiveProfileId } from "../db/seed";
import { xpForAttempt, computeMastery, masteryPercent } from "../engine/mastery";
import { planPart, type PartPlan } from "./runPlanner";
import { VARIANT_BY_ID, type PartVariant } from "./partsCatalog";
import type { FlightResult } from "../physics/types";

export interface RocketState {
  ready: boolean;
  profile: Profile | null;
  design: RocketDesign;
  destinationId: string;
  selectedPart: RocketPart | null;
  /** Planned criteria per attached part. */
  partPlans: Partial<Record<RocketPart, PartPlan>>;
  /** Completed criterion codes per part. */
  completedTasks: Partial<Record<RocketPart, string[]>>;
  tasksCorrect: number;
  tasksTotal: number;
  masteryPct: number;
  lastFlight: (FlightResult & { screenshot?: string }) | null;
  lastMissionId: number | null;
  lastNewPatches: string[];

  init: () => Promise<void>;
  setDestination: (id: string) => void;
  setLaunchSite: (id: string) => Promise<void>;
  selectPart: (part: RocketPart | null) => void;
  attachPart: (variantId: string, radialCount?: 2 | 3 | 4) => Promise<void>;
  detachPart: (part: RocketPart) => Promise<void>;
  updateDesign: (patch: Partial<RocketDesign>) => void;
  applyEffect: (property: string, value: number) => void;
  recordAttempt: (criterionCode: string, tier: number, correct: boolean, hintsUsed: number) => Promise<void>;
  completeTask: (part: RocketPart, code: string, firstTry: boolean) => Promise<void>;
  refreshMastery: () => Promise<void>;
  setLastFlight: (f: (FlightResult & { screenshot?: string }) | null) => void;
  setLastMission: (id: number | null, patches: string[]) => void;
  resetBuild: () => Promise<void>;
  /** Called once a commander has been picked/created — loads their world. */
  activateProfile: (profile: Profile) => Promise<void>;
  /** Log out to the commander picker. */
  switchProfile: () => void;
}

async function persistDesign(design: RocketDesign) {
  const id = getActiveProfileId();
  if (!id) return;
  const profile = await db.profiles.get(id);
  if (profile) await db.profiles.put({ ...profile, rocketDesign: design, lastPlayedAt: Date.now() });
}

async function persistMission(state: Pick<RocketState, "destinationId" | "design" | "completedTasks" | "tasksCorrect" | "tasksTotal">) {
  const id = getActiveProfileId();
  if (!id) return;
  await db.savedMissions.put({
    id,
    destinationId: state.destinationId,
    design: state.design,
    completedTasks: state.completedTasks as Record<string, string[]>,
    tasksCorrect: state.tasksCorrect,
    tasksTotal: state.tasksTotal,
    updatedAt: Date.now(),
  });
}

export const useRocketState = create<RocketState>((set, get) => ({
  ready: false,
  profile: null,
  design: emptyDesign(),
  destinationId: "lowOrbit",
  selectedPart: null,
  partPlans: {},
  completedTasks: {},
  tasksCorrect: 0,
  tasksTotal: 0,
  masteryPct: 0,
  lastFlight: null,
  lastMissionId: null,
  lastNewPatches: [],

  init: async () => {
    const profile = await loadActiveProfile();
    if (!profile) {
      // No commander picked yet — App shows the profile picker.
      set({ ready: true, profile: null });
      return;
    }
    const attempts = await attemptsFor(profile.id);
    const saved = await db.savedMissions.get(profile.id);
    const design = saved?.design ?? profile.rocketDesign ?? emptyDesign();
    const partPlans: Partial<Record<RocketPart, PartPlan>> = {};
    for (const part of Object.keys(design.installedParts) as RocketPart[]) {
      partPlans[part] = planPart(part, saved?.destinationId ?? "lowOrbit", attempts);
    }
    set({
      ready: true,
      profile,
      design,
      destinationId: saved?.destinationId ?? "lowOrbit",
      partPlans,
      completedTasks: (saved?.completedTasks as Partial<Record<RocketPart, string[]>>) ?? {},
      tasksCorrect: saved?.tasksCorrect ?? 0,
      tasksTotal: saved?.tasksTotal ?? 0,
      masteryPct: masteryPercent(computeMastery(attempts)),
    });
  },

  setDestination: (id) => {
    set({ destinationId: id });
    void persistMission({ ...get(), destinationId: id });
  },

  setLaunchSite: async (id) => {
    const profile = get().profile;
    if (!profile) return;
    const updated = { ...profile, launchSiteId: id };
    await db.profiles.put(updated);
    set({ profile: updated });
  },

  selectPart: (part) => set({ selectedPart: part }),

  attachPart: async (variantId, radialCount) => {
    const variant: PartVariant | undefined = VARIANT_BY_ID[variantId];
    if (!variant) return;
    const state = get();
    const attempts = state.profile ? await attemptsFor(state.profile.id) : [];
    const design: RocketDesign = {
      ...state.design,
      ...variant.stats,
      installedParts: {
        ...state.design.installedParts,
        [variant.part]: {
          variantId,
          certified: false,
          attachment: variant.part === "fins" || variant.part === "booster" || variant.part === "electronics" ? "radial" : "stack",
          radialCount,
        },
      },
    };
    if (radialCount && variant.part === "fins") design.finCount = radialCount;
    if (radialCount && variant.part === "booster") design.boosterCount = radialCount;
    const partPlans = { ...state.partPlans, [variant.part]: planPart(variant.part, state.destinationId, attempts) };
    const completedTasks = { ...state.completedTasks, [variant.part]: [] };
    set({ design, partPlans, completedTasks, selectedPart: variant.part });
    await persistDesign(design);
    await persistMission({ ...get(), design });
  },

  detachPart: async (part) => {
    const state = get();
    const installedParts = { ...state.design.installedParts };
    delete installedParts[part];
    const design = { ...state.design, installedParts };
    if (part === "booster") design.boosterCount = 0;
    const partPlans = { ...state.partPlans };
    delete partPlans[part];
    const completedTasks = { ...state.completedTasks };
    delete completedTasks[part];
    set({ design, partPlans, completedTasks, selectedPart: state.selectedPart === part ? null : state.selectedPart });
    await persistDesign(design);
    await persistMission({ ...get(), design });
  },

  updateDesign: (patch) => {
    const design = { ...get().design, ...patch };
    set({ design });
    void persistDesign(design);
  },

  applyEffect: (property, value) => {
    const design = { ...get().design } as RocketDesign & Record<string, unknown>;
    if (property in design) {
      if (property === "finSymmetry" || property === "powerBalanced") {
        (design as Record<string, unknown>)[property] = value >= 1;
      } else {
        (design as Record<string, unknown>)[property] = value;
      }
      set({ design: design as RocketDesign });
      void persistDesign(design as RocketDesign);
    }
  },

  recordAttempt: async (criterionCode, tier, correct, hintsUsed) => {
    const profileId = get().profile?.id ?? getActiveProfileId() ?? "commander";
    const attempt: Attempt = { profileId, criterionCode, tier, correct, hintsUsed, createdAt: Date.now() };
    await db.attempts.add(attempt);
    const profile = get().profile;
    if (profile) {
      const xp = profile.xp + xpForAttempt(tier, correct, hintsUsed);
      const updated = { ...profile, xp, lastPlayedAt: Date.now() };
      await db.profiles.put(updated);
      set({ profile: updated });
    }
    await get().refreshMastery();
  },

  completeTask: async (part, code, firstTry) => {
    const state = get();
    const done = new Set(state.completedTasks[part] ?? []);
    done.add(code);
    const completedTasks = { ...state.completedTasks, [part]: [...done] };
    const plan = state.partPlans[part];
    const allDone = plan ? plan.criteria.every((c) => done.has(c.code)) : false;
    let design = state.design;
    if (allDone && design.installedParts[part]) {
      design = {
        ...design,
        installedParts: {
          ...design.installedParts,
          [part]: { ...design.installedParts[part]!, certified: true },
        },
      };
    }
    set({
      completedTasks,
      design,
      tasksTotal: state.tasksTotal + 1,
      tasksCorrect: state.tasksCorrect + (firstTry ? 1 : 0),
    });
    await persistDesign(design);
    await persistMission({ ...get(), design, completedTasks });
  },

  refreshMastery: async () => {
    const profile = get().profile;
    const attempts = profile ? await attemptsFor(profile.id) : [];
    set({ masteryPct: masteryPercent(computeMastery(attempts)) });
  },

  setLastFlight: (f) => set({ lastFlight: f }),
  setLastMission: (id, patches) => set({ lastMissionId: id, lastNewPatches: patches }),

  resetBuild: async () => {
    const design = emptyDesign();
    set({ design, partPlans: {}, completedTasks: {}, tasksCorrect: 0, tasksTotal: 0, selectedPart: null });
    await persistDesign(design);
    const id = getActiveProfileId();
    if (id) await db.savedMissions.delete(id);
  },

  activateProfile: async (profile) => {
    await db.profiles.put({ ...profile, lastPlayedAt: Date.now() });
    set({ ready: false });
    await get().init();
  },

  switchProfile: () => {
    clearActiveProfileId();
    set({
      profile: null,
      design: emptyDesign(),
      destinationId: "lowOrbit",
      selectedPart: null,
      partPlans: {},
      completedTasks: {},
      tasksCorrect: 0,
      tasksTotal: 0,
      masteryPct: 0,
      lastFlight: null,
      lastMissionId: null,
      lastNewPatches: [],
    });
  },
}));
