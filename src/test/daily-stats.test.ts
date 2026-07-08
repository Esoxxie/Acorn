import { describe, expect, it } from "vitest";
import type { MealRecord } from "../../shared/models";
import { buildDailyStatsFromMeals, mergeDailyStatsByDay, mergeMealsById } from "../lib/daily-stats";

function meal(id: string, loggedAt: string, calories: number): MealRecord {
  return {
    id,
    source: "manual_ai",
    mealTitle: id,
    summary: id,
    items: [],
    calories,
    macros: { protein: 10, carbs: 20, fat: 5, fiber: 2 },
    confidence: 80,
    assumptions: [],
    loggedAt,
    percentOfDailySpend: 0,
    favorite: false,
  };
}

describe("daily stats helpers", () => {
  it("keeps older history pages instead of replacing the loaded meal list", () => {
    const recentMeals = Array.from({ length: 90 }, (_, index) =>
      meal(`recent-${index}`, `2026-06-${String(30 - Math.floor(index / 6)).padStart(2, "0")}T12:00:00.000Z`, 400),
    );
    const olderMeal = meal("older-than-ninety", "2026-05-10T12:00:00.000Z", 650);

    const merged = mergeMealsById(recentMeals, [olderMeal]);

    expect(merged).toHaveLength(91);
    expect(merged.some((currentMeal) => currentMeal.id === "older-than-ninety")).toBe(true);
    expect(merged[merged.length - 1].id).toBe("older-than-ninety");
  });

  it("aggregates meals into one small document per active local day", () => {
    const stats = buildDailyStatsFromMeals([
      meal("breakfast", "2026-06-02T08:00:00.000Z", 300),
      meal("lunch", "2026-06-02T12:00:00.000Z", 700),
      meal("dinner", "2026-06-03T19:00:00.000Z", 900),
    ]);

    expect(stats).toHaveLength(2);
    expect(stats.find((day) => day.dayKey === "2026-06-02")).toMatchObject({
      mealCount: 2,
      calories: 1000,
      macros: { protein: 20, carbs: 40, fat: 10, fiber: 4 },
    });
  });

  it("prefers remote aggregate documents when they exist", () => {
    const merged = mergeDailyStatsByDay(
      [
        {
          id: "2026-06-02",
          dayKey: "2026-06-02",
          mealCount: 3,
          calories: 1200,
          macros: { protein: 50, carbs: 120, fat: 30, fiber: 10 },
        },
      ],
      buildDailyStatsFromMeals([meal("local", "2026-06-02T08:00:00.000Z", 300)]),
    );

    expect(merged[0].calories).toBe(1200);
    expect(merged[0].mealCount).toBe(3);
  });
});
