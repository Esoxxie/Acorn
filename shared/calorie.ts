import type { ActivityLevel, EstimateItem, MealEstimate, MacroSnapshot, SavedFood, UserProfile } from "./models";

export type MealSnapshot = {
  calories: number;
  macros: MacroSnapshot;
  items: EstimateItem[];
};

const activityMultipliers: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function roundKcal(value: number): number {
  return Math.max(0, Math.round(value));
}

export function roundMacro(value: number): number {
  return Math.max(0, Math.round(value * 10) / 10);
}

function cloneMealItems(items: MealSnapshot["items"]): MealSnapshot["items"] {
  return items.map((item) => ({
    ...item,
    macros: {
      protein: item.macros.protein,
      carbs: item.macros.carbs,
      fat: item.macros.fat,
      fiber: item.macros.fiber ?? null,
    },
  }));
}

export function createMealSnapshot(source: Pick<MealEstimate, "calories" | "macros" | "items">): MealSnapshot {
  return {
    calories: roundKcal(source.calories),
    macros: {
      protein: roundMacro(source.macros.protein),
      carbs: roundMacro(source.macros.carbs),
      fat: roundMacro(source.macros.fat),
      fiber: source.macros.fiber == null ? null : roundMacro(source.macros.fiber),
    },
    items: cloneMealItems(source.items),
  };
}

export function scaleMealSnapshot(snapshot: MealSnapshot, servings: number): MealSnapshot {
  const safeServings = Math.max(1, servings);

  return {
    calories: roundKcal(snapshot.calories * safeServings),
    macros: {
      protein: roundMacro(snapshot.macros.protein * safeServings),
      carbs: roundMacro(snapshot.macros.carbs * safeServings),
      fat: roundMacro(snapshot.macros.fat * safeServings),
      fiber: snapshot.macros.fiber == null ? null : roundMacro(snapshot.macros.fiber * safeServings),
    },
    items: snapshot.items.map((item) => ({
      ...item,
      calories: roundKcal(item.calories * safeServings),
      macros: {
        protein: roundMacro(item.macros.protein * safeServings),
        carbs: roundMacro(item.macros.carbs * safeServings),
        fat: roundMacro(item.macros.fat * safeServings),
        fiber: item.macros.fiber == null ? null : roundMacro(item.macros.fiber * safeServings),
      },
      portion: safeServings === 1 ? item.portion : `${item.portion} x${safeServings}`,
    })),
  };
}

export function calculateBmr(profile: UserProfile): number | null {
  if (!profile.age || !profile.heightCm || !profile.weightKg || !profile.sex) {
    return null;
  }

  const sexAdjustment = profile.sex === "male" ? 5 : -161;
  return 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + sexAdjustment;
}

export function calculateTdee(profile: UserProfile): number | null {
  const bmr = calculateBmr(profile);
  if (!bmr || !profile.activityLevel) {
    return null;
  }

  return roundKcal(bmr * activityMultipliers[profile.activityLevel]);
}

export function computeDailyCoverage(calories: number, dailySpendKcal?: number | null): number {
  if (!dailySpendKcal || dailySpendKcal <= 0) {
    return 0;
  }

  return Math.max(0, Math.round((calories / dailySpendKcal) * 1000) / 10);
}

export function scaleEstimate(estimate: MealEstimate, multiplier: number): MealEstimate {
  const safeMultiplier = Math.max(0.25, multiplier);

  return {
    ...estimate,
    calories: roundKcal(estimate.calories * safeMultiplier),
    macros: {
      protein: roundMacro(estimate.macros.protein * safeMultiplier),
      carbs: roundMacro(estimate.macros.carbs * safeMultiplier),
      fat: roundMacro(estimate.macros.fat * safeMultiplier),
      fiber: estimate.macros.fiber == null ? null : roundMacro(estimate.macros.fiber * safeMultiplier),
    },
    items: estimate.items.map((item) => ({
      ...item,
      calories: roundKcal(item.calories * safeMultiplier),
      macros: {
        protein: roundMacro(item.macros.protein * safeMultiplier),
        carbs: roundMacro(item.macros.carbs * safeMultiplier),
        fat: roundMacro(item.macros.fat * safeMultiplier),
        fiber: item.macros.fiber == null ? null : roundMacro(item.macros.fiber * safeMultiplier),
      },
      portion: `${item.portion} x${safeMultiplier}`,
    })),
  };
}

export function savedFoodToEstimate(savedFood: SavedFood): MealEstimate {
  return {
    mealTitle: savedFood.title,
    summary: savedFood.summary,
    items: savedFood.items,
    calories: savedFood.calories,
    macros: savedFood.macros,
    confidence: 94,
    assumptions: ["Aus einem Favoriten-Preset uebernommen."],
    refinementQuestions: [],
  };
}
