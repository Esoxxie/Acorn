import type { AnalyzeEntryInput, EstimateItem, MealEstimate } from "../../shared/models";

const foodLibrary: Record<
  string,
  { calories: number; protein: number; carbs: number; fat: number; portion: string; label: string }
> = {
  egg: { calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3, portion: "1 Ei", label: "Ei" },
  eggs: { calories: 156, protein: 12.6, carbs: 1.2, fat: 10.6, portion: "2 Eier", label: "Eier" },
  toast: { calories: 110, protein: 4, carbs: 20, fat: 2, portion: "2 Scheiben", label: "Toast" },
  bread: { calories: 140, protein: 5, carbs: 27, fat: 1.6, portion: "2 Scheiben", label: "Brot" },
  rice: { calories: 205, protein: 4.3, carbs: 45, fat: 0.4, portion: "1 Tasse", label: "Reis" },
  chicken: { calories: 220, protein: 35, carbs: 0, fat: 7, portion: "1 Portion", label: "Hähnchen" },
  salmon: { calories: 240, protein: 25, carbs: 0, fat: 14, portion: "1 Filet", label: "Lachs" },
  avocado: { calories: 160, protein: 2, carbs: 9, fat: 15, portion: "1/2 Avocado", label: "Avocado" },
  yogurt: { calories: 170, protein: 17, carbs: 8, fat: 4, portion: "1 Schale", label: "Joghurt" },
  oats: { calories: 190, protein: 7, carbs: 32, fat: 4, portion: "1 Schale", label: "Haferflocken" },
  pasta: { calories: 330, protein: 12, carbs: 63, fat: 4, portion: "1 Teller", label: "Pasta" },
  burger: { calories: 620, protein: 28, carbs: 42, fat: 36, portion: "1 Burger", label: "Burger" },
  salad: { calories: 120, protein: 4, carbs: 12, fat: 7, portion: "1 Schale", label: "Salat" },
  potato: { calories: 170, protein: 4, carbs: 37, fat: 0.2, portion: "1 Portion", label: "Kartoffel" },
  coffee: { calories: 45, protein: 2, carbs: 4, fat: 2, portion: "1 Tasse", label: "Kaffee" },
  milk: { calories: 60, protein: 3, carbs: 5, fat: 3, portion: "1 Schuss", label: "Milch" },
  protein: { calories: 130, protein: 24, carbs: 3, fat: 2, portion: "1 Messlöffel", label: "Proteinpulver" },
  banana: { calories: 105, protein: 1.3, carbs: 27, fat: 0.4, portion: "1 Banane", label: "Banane" },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatMealTitleText(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function keywordItems(text: string): EstimateItem[] {
  const tokens = text.toLowerCase();
  const entries = Object.entries(foodLibrary).filter(([keyword]) => tokens.includes(keyword));

  if (!entries.length) {
    return [
      {
        id: "meal",
        name: "Gemischte Mahlzeit",
        portion: "1 Portion",
        calories: 520,
        confidence: 62,
        notes: "Demobasierte Schätzung für eine allgemeine gemischte Mahlzeit.",
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
    name: values.label,
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
    mealTitle: (() => {
      const primaryItems = items.slice(0, 2).map((item) => item.name);

      if (input.mode === "photo") {
        if (primaryItems.length > 0) {
          return `Foto-Mahlzeit mit ${primaryItems.join(" und ")}`;
        }

        return descriptiveText ? `Foto-Mahlzeit mit ${formatMealTitleText(descriptiveText.split(" ").slice(0, 2).join(" "))}` : "Kamera-Schätzung";
      }

      if (primaryItems.length > 0) {
        return primaryItems.join(primaryItems.length > 1 ? " und " : "");
      }

      if (descriptiveText) {
        return formatMealTitleText(descriptiveText.split(",").slice(0, 2).join(" · "));
      }

      return "Schnell erfasste Mahlzeit";
    })(),
    summary:
      input.mode === "photo"
        ? "Demobasierte Schätzung aus dem Foto, verfeinert mit deinem optionalen Kontext."
        : "Demobasierte Schätzung aus deiner getippten Schnellbeschreibung.",
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
      "Der Demo-Modus ist aktiv, daher wird die Schätzung lokal auf deinem Gerät erstellt.",
      input.userContext ? "Dein zusätzlicher Kontext wurde für die Schätzung berücksichtigt." : "Es wurde kein zusätzlicher Kontext angegeben.",
    ],
    refinementQuestions: input.priorEstimate
      ? []
      : [
          {
            id: "portion_size",
            label: "Wie groß war die Portion?",
            helperText: "Das ist oft der schnellste Weg zu einer genaueren Schätzung.",
            options: [
              { id: "smaller", label: "Kleiner" },
              { id: "regular", label: "Normal" },
              { id: "larger", label: "Größer" },
            ],
          },
          {
            id: "extras_level",
            label: "Wie viel Öl, Sauce oder Extras waren dabei?",
            helperText: null,
            options: [
              { id: "light", label: "Wenig" },
              { id: "regular", label: "Normal" },
              { id: "loaded", label: "Viel" },
            ],
          },
        ],
  };
}
