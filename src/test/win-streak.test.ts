import { describe, expect, it } from "vitest";
import type { MealRecord } from "../../shared/models";
import { getWinStreakDays, getWinStreakDetails } from "../lib/win-streak";

function mockMeal(dayKey: string): MealRecord {
  return {
    id: dayKey,
    source: "manual_ai",
    mealTitle: "Mock Meal",
    summary: "Mock summary",
    loggedAt: `${dayKey}T12:00:00.000Z`,
    calories: 500,
    macros: { protein: 0, carbs: 0, fat: 0, fiber: 0 },
    items: [],
    confidence: 80,
    assumptions: [],
    percentOfDailySpend: 0,
    favorite: false,
    servings: 1,
    baseSnapshot: { calories: 500, macros: { protein: 0, carbs: 0, fat: 0, fiber: 0 }, items: [] },
  };
}

describe("win streak helpers", () => {
  it("counts consecutive logged days ending on the selected day", () => {
    const meals = [
      mockMeal("2026-05-30"),
      mockMeal("2026-05-31"),
      mockMeal("2026-06-01"),
      mockMeal("2026-06-02"),
    ];

    expect(getWinStreakDays(meals, "2026-06-02")).toBe(4);
  });

  it("keeps yesterday's streak visible while the selected day has no entries yet", () => {
    const meals = [
      mockMeal("2026-05-28"),
      mockMeal("2026-05-29"),
      mockMeal("2026-05-30"),
      mockMeal("2026-05-31"),
      mockMeal("2026-06-01"),
    ];

    expect(getWinStreakDays(meals, "2026-06-02")).toBe(5);
  });

  it("stops at the first missed day", () => {
    const meals = [
      mockMeal("2026-05-29"),
      mockMeal("2026-05-31"),
      mockMeal("2026-06-01"),
    ];

    expect(getWinStreakDays(meals, "2026-06-02")).toBe(2);
  });

  it("returns the current badge and next threshold", () => {
    const details = getWinStreakDetails(5);

    expect(details.badgeText).toBe("Flinke Pfoten · 5 Tage");
    expect(details.currentStage?.tier).toBe("Eichelbronze");
    expect(details.nextStage?.days).toBe(7);
    expect(details.progress).toBeCloseTo(5 / 7);
  });
});
