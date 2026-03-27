import type { ActivityLevel, MealEstimate, SavedFood, UserProfile } from "./models";

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
    assumptions: ["Logged from a saved food preset."],
    refinementQuestions: [],
  };
}
