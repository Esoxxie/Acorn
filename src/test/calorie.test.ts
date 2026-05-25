import { describe, expect, it } from "vitest";
import {
  calculateBmr,
  calculateTdee,
  computeDailyCoverage,
  createMealSnapshot,
  createMealSnapshotFromItems,
  scaleEstimate,
  scaleMealSnapshot,
} from "../../shared/calorie";

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
    expect(scaleEstimate(estimate, 1).items[0].portion).toBe("1 bowl");
  });

  it("creates and scales meal snapshots for servings changes", () => {
    const snapshot = createMealSnapshot({
      calories: 250,
      macros: { protein: 12.2, carbs: 20.7, fat: 8.4, fiber: 3.5 },
      items: [
        {
          id: "base",
          name: "Test item",
          portion: "1 bowl",
          calories: 250,
          confidence: 91,
          notes: null,
          macros: { protein: 12.2, carbs: 20.7, fat: 8.4, fiber: 3.5 },
        },
      ],
    });

    const scaled = scaleMealSnapshot(snapshot, 3);

    expect(scaled.calories).toBe(750);
    expect(scaled.macros.protein).toBe(36.6);
    expect(scaled.items[0].portion).toBe("1 bowl x3");
  });

  it("creates meal snapshots from edited items", () => {
    const snapshot = createMealSnapshotFromItems([
      {
        id: "rice",
        name: "Rice",
        portion: "120 g",
        calories: 155.4,
        macros: { protein: 3.2, carbs: 34.6, fat: 0.4, fiber: 1.1 },
      },
      {
        id: "tofu",
        name: "Tofu",
        portion: "150 g",
        calories: 210.2,
        macros: { protein: 22.4, carbs: 2.1, fat: 12.7, fiber: null },
      },
    ]);

    expect(snapshot.calories).toBe(365);
    expect(snapshot.macros).toEqual({ protein: 25.6, carbs: 36.7, fat: 13.1, fiber: 1.1 });
  });
});
