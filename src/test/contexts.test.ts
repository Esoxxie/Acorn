import { beforeEach, describe, expect, it } from "vitest";
import { buildProfileBootstrapPatch, mergeProfileSources } from "../app/contexts";
import { clearCachedProfile, readCachedProfile, writeCachedProfile } from "../lib/profile-cache";

describe("buildProfileBootstrapPatch", () => {
  it("does not include nullable profile fields that would wipe saved Firestore data", () => {
    const patch = buildProfileBootstrapPatch(
      {
        uid: "user-123",
        displayName: "Stefa",
        email: "stefa@example.com",
      },
      "2026-03-27T20:00:00.000Z",
    );

    expect(patch).toEqual({
      displayName: "Stefa",
      email: "stefa@example.com",
      updatedAt: "2026-03-27T20:00:00.000Z",
      createdAt: "2026-03-27T20:00:00.000Z",
    });
    expect("age" in patch).toBe(false);
    expect("sex" in patch).toBe(false);
    expect("heightCm" in patch).toBe(false);
    expect("weightKg" in patch).toBe(false);
    expect("activityLevel" in patch).toBe(false);
    expect("dailySpendKcal" in patch).toBe(false);
    expect("units" in patch).toBe(false);
    expect("themePreference" in patch).toBe(false);
  });
});

describe("mergeProfileSources", () => {
  const user = {
    uid: "user-123",
    displayName: "Stefa",
    email: "stefa@example.com",
  };

  it("keeps fallback profile fields when a remote snapshot is partial", () => {
    const merged = mergeProfileSources(
      user,
      {
        updatedAt: "2026-03-27T20:10:00.000Z",
      },
      {
        displayName: "Stefa",
        email: "stefa@example.com",
        units: "imperial",
        themePreference: "dark",
        age: 31,
        sex: "male",
        heightCm: 181,
        weightKg: 80,
        activityLevel: "moderate",
        dailySpendKcal: 0,
        createdAt: "2026-03-20T20:00:00.000Z",
        updatedAt: "2026-03-20T20:00:00.000Z",
      },
    );

    expect(merged.units).toBe("imperial");
    expect(merged.themePreference).toBe("dark");
    expect(merged.age).toBe(31);
    expect(merged.weightKg).toBe(80);
    expect(merged.createdAt).toBe("2026-03-20T20:00:00.000Z");
    expect(merged.updatedAt).toBe("2026-03-27T20:10:00.000Z");
    expect(merged.dailySpendKcal).not.toBeNull();
  });

  it("respects explicit nulls from the incoming profile snapshot", () => {
    const merged = mergeProfileSources(
      user,
      {
        age: null,
        weightKg: null,
      },
      {
        displayName: "Stefa",
        email: "stefa@example.com",
        units: "metric",
        themePreference: "system",
        age: 31,
        sex: "male",
        heightCm: 181,
        weightKg: 80,
        activityLevel: "moderate",
        dailySpendKcal: 0,
      },
    );

    expect(merged.age).toBeNull();
    expect(merged.weightKg).toBeNull();
    expect(merged.dailySpendKcal).toBeNull();
  });
});

describe("profile cache", () => {
  const uid = "user-123";
  const profile = {
    displayName: "Stefa",
    email: "stefa@example.com",
    units: "metric" as const,
    themePreference: "dark" as const,
    age: 31,
    sex: "male" as const,
    heightCm: 181,
    weightKg: 80,
    activityLevel: "moderate" as const,
    dailySpendKcal: 2761,
    createdAt: "2026-03-20T20:00:00.000Z",
    updatedAt: "2026-03-27T20:10:00.000Z",
  };

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("reads and clears cached profiles by uid", () => {
    writeCachedProfile(uid, profile);

    expect(readCachedProfile(uid)).toEqual(profile);

    clearCachedProfile(uid);
    expect(readCachedProfile(uid)).toBeNull();
  });
});
