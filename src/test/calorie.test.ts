import { describe, expect, it } from "vitest";
import { calculateBmr, calculateTdee, computeDailyCoverage, scaleEstimate } from "../../shared/calorie";

describe("calorie helpers", () => {
  it("calculates BMR and TDEE for a metric profile", () => {
    const profile = {
      units: "metric" as const,
      age: 30,
      sex: "male" as const,
      heightCm: 180,
      weightKg: 78,
      activityLevel: "moderate" as const,
    };

    expect(calculateBmr(profile)).toBe(1760);
    expect(calculateTdee(profile)).toBe(2728);
  });

  it("calculates meal coverage as a percentage of daily spend", () => {
    expect(computeDailyCoverage(680, 2400)).toBe(28.3);
    expect(computeDailyCoverage(400, null)).toBe(0);
  });

  it("scales a saved estimate cleanly", () => {
    const estimate = {
      mealTitle: "Greek yogurt bowl",
      summary: "Yogurt, berries and honey.",
      calories: 320,
      confidence: 92,
      assumptions: [],
      macros: { protein: 22, carbs: 34, fat: 8, fiber: 4 },
      items: [
        {
          id: "yogurt",
          name: "Greek yogurt",
          portion: "1 bowl",
          calories: 320,
          confidence: 92,
          notes: null,
          macros: { protein: 22, carbs: 34, fat: 8, fiber: 4 },
        },
      ],
      refinementQuestions: [],
    };

    const scaled = scaleEstimate(estimate, 1.5);
    expect(scaled.calories).toBe(480);
    expect(scaled.macros.protein).toBe(33);
  });
});
