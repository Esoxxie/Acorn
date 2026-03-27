import { describe, expect, it } from "vitest";
import { buildProfileBootstrapPatch } from "../app/contexts";

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
