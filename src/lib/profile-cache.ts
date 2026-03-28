import type { UserProfile } from "../../shared/models";

const PROFILE_CACHE_PREFIX = "acorn.profile";

export function getProfileCacheKey(uid: string): string {
  return `${PROFILE_CACHE_PREFIX}:${uid}`;
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

export function clearCachedProfile(uid: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getProfileCacheKey(uid));
}
