import { describe, expect, it } from "vitest";
import { createSeededDemoData } from "../lib/demo-data";

describe("demo data", () => {
  it("seeds a complete local profile and sample history", () => {
    const seeded = createSeededDemoData("Acorn Demo", "demo@acorn.local");

    expect(seeded.profile.dailySpendKcal).toBeGreaterThan(0);
    expect(seeded.meals).toHaveLength(3);
    expect(seeded.savedFoods.length).toBeGreaterThan(0);
    expect(new Set(seeded.meals.map((meal) => meal.loggedAt.slice(0, 10))).size).toBeGreaterThan(1);
  });
});
