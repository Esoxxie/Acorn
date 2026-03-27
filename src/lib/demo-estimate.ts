import type { AnalyzeEntryInput, EstimateItem, MealEstimate } from "../../shared/models";

const foodLibrary: Record<
  string,
  { calories: number; protein: number; carbs: number; fat: number; portion: string }
> = {
  egg: { calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3, portion: "1 egg" },
  eggs: { calories: 156, protein: 12.6, carbs: 1.2, fat: 10.6, portion: "2 eggs" },
  toast: { calories: 110, protein: 4, carbs: 20, fat: 2, portion: "2 slices" },
  bread: { calories: 140, protein: 5, carbs: 27, fat: 1.6, portion: "2 slices" },
  rice: { calories: 205, protein: 4.3, carbs: 45, fat: 0.4, portion: "1 cup" },
  chicken: { calories: 220, protein: 35, carbs: 0, fat: 7, portion: "1 serving" },
  salmon: { calories: 240, protein: 25, carbs: 0, fat: 14, portion: "1 fillet" },
  avocado: { calories: 160, protein: 2, carbs: 9, fat: 15, portion: "1/2 avocado" },
  yogurt: { calories: 170, protein: 17, carbs: 8, fat: 4, portion: "1 bowl" },
  oats: { calories: 190, protein: 7, carbs: 32, fat: 4, portion: "1 bowl" },
  pasta: { calories: 330, protein: 12, carbs: 63, fat: 4, portion: "1 plate" },
  burger: { calories: 620, protein: 28, carbs: 42, fat: 36, portion: "1 burger" },
  salad: { calories: 120, protein: 4, carbs: 12, fat: 7, portion: "1 bowl" },
  potato: { calories: 170, protein: 4, carbs: 37, fat: 0.2, portion: "1 serving" },
  coffee: { calories: 45, protein: 2, carbs: 4, fat: 2, portion: "1 cup" },
  milk: { calories: 60, protein: 3, carbs: 5, fat: 3, portion: "1 splash" },
  protein: { calories: 130, protein: 24, carbs: 3, fat: 2, portion: "1 scoop" },
  banana: { calories: 105, protein: 1.3, carbs: 27, fat: 0.4, portion: "1 banana" },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function keywordItems(text: string): EstimateItem[] {
  const tokens = text.toLowerCase();
  const entries = Object.entries(foodLibrary).filter(([keyword]) => tokens.includes(keyword));

  if (!entries.length) {
    return [
      {
        id: "meal",
        name: "Mixed meal",
        portion: "1 serving",
        calories: 520,
        confidence: 62,
        notes: "Demo estimate based on a generic mixed meal.",
        macros: {
          protein: 24,
          carbs: 49,
          fat: 20,
          fiber: 6,
        },
      },
    ];
  }

  return entries.map(([keyword, values], index) => ({
    id: `${keyword}-${index + 1}`,
    name: keyword.charAt(0).toUpperCase() + keyword.slice(1),
    portion: values.portion,
    calories: values.calories,
    confidence: 70,
    notes: null,
    macros: {
      protein: values.protein,
      carbs: values.carbs,
      fat: values.fat,
      fiber: 2,
    },
  }));
}

function scaleFromRefinement(answers?: Record<string, string>) {
  const portion = answers?.portion_size;
  if (portion === "smaller") {
    return 0.82;
  }
  if (portion === "larger") {
    return 1.22;
  }

  const extras = answers?.extras_level;
  if (extras === "loaded") {
    return 1.16;
  }
  if (extras === "light") {
    return 0.92;
  }

  return 1;
}

export function createDemoEstimate(input: AnalyzeEntryInput): MealEstimate {
  const descriptiveText = [input.manualText, input.userContext].filter(Boolean).join(" ").trim();
  const items = keywordItems(descriptiveText);
  const multiplier = scaleFromRefinement(input.refinementAnswers);
  const calories = Math.round(items.reduce((sum, item) => sum + item.calories, 0) * multiplier);
  const macros = items.reduce(
    (totals, item) => ({
      protein: totals.protein + item.macros.protein,
      carbs: totals.carbs + item.macros.carbs,
      fat: totals.fat + item.macros.fat,
      fiber: (totals.fiber ?? 0) + (item.macros.fiber ?? 0),
    }),
    { protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );

  return {
    mealTitle:
      input.mode === "photo"
        ? descriptiveText
          ? `Photo meal with ${descriptiveText.split(" ").slice(0, 2).join(" ")}`
          : "Camera meal estimate"
        : descriptiveText
          ? descriptiveText.split(",").slice(0, 2).join(" & ")
          : "Quick added meal",
    summary:
      input.mode === "photo"
        ? "Demo estimate from the captured meal, tuned by your optional context."
        : "Demo estimate from the typed quick-add description.",
    items: items.map((item) => ({
      ...item,
      calories: Math.round(item.calories * multiplier),
      macros: {
        protein: Math.round(item.macros.protein * multiplier * 10) / 10,
        carbs: Math.round(item.macros.carbs * multiplier * 10) / 10,
        fat: Math.round(item.macros.fat * multiplier * 10) / 10,
        fiber: Math.round((item.macros.fiber ?? 0) * multiplier * 10) / 10,
      },
    })),
    calories,
    macros: {
      protein: Math.round(macros.protein * multiplier * 10) / 10,
      carbs: Math.round(macros.carbs * multiplier * 10) / 10,
      fat: Math.round(macros.fat * multiplier * 10) / 10,
      fiber: Math.round((macros.fiber ?? 0) * multiplier * 10) / 10,
    },
    confidence: clamp(input.priorEstimate ? 84 : 68, 1, 99),
    assumptions: [
      "Local demo mode is active, so this estimate is generated on-device for testing.",
      input.userContext ? "Your typed or spoken context was used to shape the estimate." : "No extra context was supplied.",
    ],
    refinementQuestions: input.priorEstimate
      ? []
      : [
          {
            id: "portion_size",
            label: "How big was the portion?",
            helperText: "This is usually the fastest way to tighten the estimate.",
            options: [
              { id: "smaller", label: "Smaller" },
              { id: "regular", label: "Regular" },
              { id: "larger", label: "Larger" },
            ],
          },
          {
            id: "extras_level",
            label: "How much oil, sauce, or extras were involved?",
            helperText: null,
            options: [
              { id: "light", label: "Light" },
              { id: "regular", label: "Regular" },
              { id: "loaded", label: "Loaded" },
            ],
          },
        ],
  };
}
