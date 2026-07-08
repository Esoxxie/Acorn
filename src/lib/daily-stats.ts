import type { DailyStats, MacroSnapshot, MealRecord } from "../../shared/models";
import { getLocalDayKey } from "../../shared/date";

export function emptyMacros(): MacroSnapshot {
  return { protein: 0, carbs: 0, fat: 0, fiber: 0 };
}

export function ensureDailyStats(raw: Partial<DailyStats>, id: string): DailyStats {
  return {
    id,
    dayKey: raw.dayKey ?? id,
    mealCount: Math.max(0, raw.mealCount ?? 0),
    calories: Math.max(0, raw.calories ?? 0),
    macros: {
      protein: Math.max(0, raw.macros?.protein ?? 0),
      carbs: Math.max(0, raw.macros?.carbs ?? 0),
      fat: Math.max(0, raw.macros?.fat ?? 0),
      fiber: Math.max(0, raw.macros?.fiber ?? 0),
    },
    updatedAt: raw.updatedAt ?? null,
  };
}

export function buildDailyStatsFromMeals(meals: MealRecord[]): DailyStats[] {
  const byDay = new Map<string, DailyStats>();

  for (const meal of meals) {
    const dayKey = getLocalDayKey(meal.loggedAt);
    const current = byDay.get(dayKey) ?? {
      id: dayKey,
      dayKey,
      mealCount: 0,
      calories: 0,
      macros: emptyMacros(),
      updatedAt: null,
    };

    byDay.set(dayKey, {
      ...current,
      mealCount: current.mealCount + 1,
      calories: current.calories + meal.calories,
      macros: {
        protein: current.macros.protein + meal.macros.protein,
        carbs: current.macros.carbs + meal.macros.carbs,
        fat: current.macros.fat + meal.macros.fat,
        fiber: (current.macros.fiber ?? 0) + (meal.macros.fiber ?? 0),
      },
      updatedAt: meal.updatedAt ?? current.updatedAt,
    });
  }

  return Array.from(byDay.values()).sort((a, b) => b.dayKey.localeCompare(a.dayKey));
}

export function mergeMealsById(currentMeals: MealRecord[], nextMeals: MealRecord[]) {
  const mealsById = new Map<string, MealRecord>();
  for (const meal of [...currentMeals, ...nextMeals]) {
    mealsById.set(meal.id, meal);
  }

  return Array.from(mealsById.values()).sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
}

export function mergeDailyStatsByDay(remoteStats: DailyStats[], localStats: DailyStats[]) {
  const byDay = new Map<string, DailyStats>();

  for (const stats of [...localStats, ...remoteStats]) {
    byDay.set(stats.dayKey, stats);
  }

  return Array.from(byDay.values()).sort((a, b) => b.dayKey.localeCompare(a.dayKey));
}
