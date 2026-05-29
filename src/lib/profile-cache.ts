import type { UserProfile, MealRecord, SavedFood } from "../../shared/models";

const PROFILE_CACHE_PREFIX = "acorn.profile";
const MEALS_CACHE_PREFIX = "acorn.meals";
const SAVED_FOODS_CACHE_PREFIX = "acorn.savedFoods";

export function getProfileCacheKey(uid: string): string {
  return `${PROFILE_CACHE_PREFIX}:${uid}`;
}

export function getMealsCacheKey(uid: string): string {
  return `${MEALS_CACHE_PREFIX}:${uid}`;
}

export function getSavedFoodsCacheKey(uid: string): string {
  return `${SAVED_FOODS_CACHE_PREFIX}:${uid}`;
}

export function readCachedProfile(uid: string): UserProfile | null {
  if (typeof window === "undefined") {
    return null;
  }

  const cached = window.localStorage.getItem(getProfileCacheKey(uid));
  if (!cached) {
    return null;
  }

  try {
    return JSON.parse(cached) as UserProfile;
  } catch {
    window.localStorage.removeItem(getProfileCacheKey(uid));
    return null;
  }
}

export function writeCachedProfile(uid: string, profile: UserProfile) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getProfileCacheKey(uid), JSON.stringify(profile));
}

export function readCachedMeals(uid: string): MealRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  const cached = window.localStorage.getItem(getMealsCacheKey(uid));
  if (!cached) {
    return [];
  }

  try {
    return JSON.parse(cached) as MealRecord[];
  } catch {
    window.localStorage.removeItem(getMealsCacheKey(uid));
    return [];
  }
}

export function writeCachedMeals(uid: string, meals: MealRecord[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getMealsCacheKey(uid), JSON.stringify(meals));
}

export function clearCachedMeals(uid: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getMealsCacheKey(uid));
}

export function readCachedSavedFoods(uid: string): SavedFood[] {
  if (typeof window === "undefined") {
    return [];
  }

  const cached = window.localStorage.getItem(getSavedFoodsCacheKey(uid));
  if (!cached) {
    return [];
  }

  try {
    return JSON.parse(cached) as SavedFood[];
  } catch {
    window.localStorage.removeItem(getSavedFoodsCacheKey(uid));
    return [];
  }
}

export function writeCachedSavedFoods(uid: string, savedFoods: SavedFood[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getSavedFoodsCacheKey(uid), JSON.stringify(savedFoods));
}

export function clearCachedSavedFoods(uid: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getSavedFoodsCacheKey(uid));
}

export function clearCachedProfile(uid: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getProfileCacheKey(uid));
  window.localStorage.removeItem(getMealsCacheKey(uid));
  window.localStorage.removeItem(getSavedFoodsCacheKey(uid));
}
