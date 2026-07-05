import { describe, expect, it } from "vitest";
import { getDailyAverage, getDailyAverageFromDailyStats } from "../routes/TodayPage";
import type { DailyStats, MealRecord } from "../../shared/models";

// Helper to create a dummy MealRecord
function mockMeal(loggedAt: string, calories: number): MealRecord {
  return {
    id: Math.random().toString(),
    source: "manual_ai",
    mealTitle: "Mock Meal",
    summary: "Mock summary",
    loggedAt,
    calories,
    macros: { protein: 0, carbs: 0, fat: 0, fiber: 0 },
    items: [],
    confidence: 80,
    assumptions: [],
    percentOfDailySpend: 0,
    favorite: false,
    servings: 1,
    baseSnapshot: { calories, macros: { protein: 0, carbs: 0, fat: 0, fiber: 0 }, items: [] },
  };
}

describe("getDailyAverage statistics helper", () => {
  it("returns zeros if no meals exist before the selected date", () => {
    const meals: MealRecord[] = [];
    const avg = getDailyAverage(meals, "2026-05-25", 7);
    expect(avg).toEqual({ calories: 0, meals: 0 });
  });

  it("calculates average over past active days, ignoring the selected day and future entries", () => {
    const meals: MealRecord[] = [
      mockMeal("2026-05-20T10:00:00Z", 500), // Active Day 1
      mockMeal("2026-05-20T14:00:00Z", 700), // Active Day 1 (Total: 1200 kcal, 2 meals)
      mockMeal("2026-05-22T08:00:00Z", 1500), // Active Day 2 (Total: 1500 kcal, 1 meal)
      // 2026-05-21 is completely empty (forgotten day)
      mockMeal("2026-05-25T12:00:00Z", 3000), // Selected day (should be ignored for past averages)
      mockMeal("2026-05-26T12:00:00Z", 2000), // Future day (should be ignored when selectedDayKey is 2026-05-25)
    ];

    // For selected day 2026-05-25, only 2026-05-20 and 2026-05-22 are active.
    // Divisor should be 2.
    // Total calories = 1200 + 1500 = 2700. Average = 1350.
    // Total meals = 3. Average = 1.5.
    const avg = getDailyAverage(meals, "2026-05-25", 7);
    expect(avg).toEqual({ calories: 1350, meals: 1.5 });
  });

  it("limits calculation to the specified number of active days", () => {
    // Generate 5 active days of meals
    const meals: MealRecord[] = [
      mockMeal("2026-05-10T12:00:00Z", 1000), // Active Day 5 (oldest)
      mockMeal("2026-05-11T12:00:00Z", 1000), // Active Day 4
      mockMeal("2026-05-12T12:00:00Z", 1500), // Active Day 3
      mockMeal("2026-05-13T12:00:00Z", 2000), // Active Day 2
      mockMeal("2026-05-14T12:00:00Z", 2500), // Active Day 1 (most recent)
    ];

    // Limit is 3 active days. Should only take 05-14, 05-13, and 05-12.
    // Sum = 2500 + 2000 + 1500 = 6000. Divisor = 3. Average = 2000.
    // Meals = 3. Average = 1.0.
    const avg = getDailyAverage(meals, "2026-05-15", 3);
    expect(avg).toEqual({ calories: 2000, meals: 1 });
  });
});

describe("getDailyAverageFromDailyStats statistics helper", () => {
  function stats(dayKey: string, calories: number, mealCount = 1): DailyStats {
    return {
      id: dayKey,
      dayKey,
      mealCount,
      calories,
      macros: { protein: 0, carbs: 0, fat: 0, fiber: 0 },
    };
  }

  it("uses compact daily documents instead of requiring all meal records", () => {
    const dailyStats = [
      stats("2026-05-10", 1000),
      stats("2026-05-11", 1200, 3),
      stats("2026-05-12", 0, 0),
      stats("2026-05-13", 1800, 2),
    ];

    expect(getDailyAverageFromDailyStats(dailyStats, "2026-05-14", 3)).toEqual({
      calories: 1333,
      meals: 2,
    });
  });
});
