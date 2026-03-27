import { calculateTdee, computeDailyCoverage } from "../../shared/calorie";
import type { MealRecord, SavedFood, UserProfile } from "../../shared/models";

type DemoData = {
  profile: UserProfile;
  meals: MealRecord[];
  savedFoods: SavedFood[];
};

function svgMealThumb(background: string, foreground: string, label: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${background}" />
          <stop offset="100%" stop-color="${foreground}" />
        </linearGradient>
      </defs>
      <rect width="320" height="320" rx="56" fill="url(#g)" />
      <circle cx="160" cy="170" r="90" fill="rgba(255,255,255,0.18)" />
      <circle cx="160" cy="170" r="68" fill="rgba(255,255,255,0.34)" />
      <text x="160" y="180" text-anchor="middle" font-size="28" fill="#fffaf3" font-family="Manrope, Arial, sans-serif">${label}</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function isoAt(daysAgo: number, hour: number, minute: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

export function createSeededDemoData(userName: string | null, email: string | null): DemoData {
  const profile: UserProfile = {
    displayName: userName ?? "Acorn Demo",
    email: email ?? "demo@acorn.local",
    units: "metric",
    themePreference: "system",
    age: 29,
    sex: "male",
    heightCm: 181,
    weightKg: 79,
    activityLevel: "moderate",
    dailySpendKcal: null,
  };

  profile.dailySpendKcal = calculateTdee(profile);

  const avocadoPhoto = svgMealThumb("#b97843", "#355f42", "Toast");
  const pastaPhoto = svgMealThumb("#91552c", "#5d2f1d", "Pasta");

  const meals: MealRecord[] = [
    {
      id: "demo-meal-avocado-toast",
      source: "photo",
      mealTitle: "Avocado toast",
      summary: "Sourdough, avocado, egg",
      items: [
        {
          id: "toast",
          name: "Sourdough toast",
          portion: "2 slices",
          calories: 210,
          macros: { protein: 7, carbs: 38, fat: 3, fiber: 3 },
        },
        {
          id: "avocado",
          name: "Avocado",
          portion: "1/2 avocado",
          calories: 160,
          macros: { protein: 2, carbs: 9, fat: 15, fiber: 7 },
        },
        {
          id: "egg",
          name: "Egg",
          portion: "1 egg",
          calories: 78,
          macros: { protein: 6.3, carbs: 0.6, fat: 5.3, fiber: 0 },
        },
      ],
      calories: 448,
      macros: { protein: 15.3, carbs: 47.6, fat: 23.3, fiber: 10 },
      confidence: 86,
      assumptions: [],
      loggedAt: isoAt(0, 8, 20),
      createdAt: isoAt(0, 8, 20),
      updatedAt: isoAt(0, 8, 20),
      photo: { storagePath: avocadoPhoto, thumbPath: avocadoPhoto },
      userContext: "Coffee on the side not included.",
      transcript: "Avocado toast with egg",
      percentOfDailySpend: computeDailyCoverage(448, profile.dailySpendKcal),
      favorite: true,
      savedFoodId: "demo-saved-avocado-toast",
    },
    {
      id: "demo-meal-yogurt",
      source: "manual_ai",
      mealTitle: "Greek yogurt bowl",
      summary: "Yogurt, berries, granola",
      items: [
        {
          id: "yogurt",
          name: "Greek yogurt",
          portion: "1 bowl",
          calories: 170,
          macros: { protein: 17, carbs: 8, fat: 4, fiber: 0 },
        },
        {
          id: "berries",
          name: "Mixed berries",
          portion: "1 handful",
          calories: 60,
          macros: { protein: 1, carbs: 14, fat: 0.3, fiber: 4 },
        },
        {
          id: "granola",
          name: "Granola",
          portion: "40 g",
          calories: 185,
          macros: { protein: 4, carbs: 28, fat: 6, fiber: 3 },
        },
      ],
      calories: 415,
      macros: { protein: 22, carbs: 50, fat: 10.3, fiber: 7 },
      confidence: 88,
      assumptions: [],
      loggedAt: isoAt(0, 13, 5),
      createdAt: isoAt(0, 13, 5),
      updatedAt: isoAt(0, 13, 5),
      photo: null,
      userContext: null,
      transcript: "Greek yogurt with berries and granola",
      percentOfDailySpend: computeDailyCoverage(415, profile.dailySpendKcal),
      favorite: true,
      savedFoodId: "demo-saved-yogurt",
    },
    {
      id: "demo-meal-pasta",
      source: "photo",
      mealTitle: "Tomato pasta",
      summary: "Pasta with parmesan",
      items: [
        {
          id: "pasta",
          name: "Pasta",
          portion: "1 plate",
          calories: 330,
          macros: { protein: 12, carbs: 63, fat: 4, fiber: 4 },
        },
        {
          id: "sauce",
          name: "Tomato sauce",
          portion: "1 ladle",
          calories: 110,
          macros: { protein: 2, carbs: 15, fat: 4, fiber: 3 },
        },
        {
          id: "parmesan",
          name: "Parmesan",
          portion: "15 g",
          calories: 62,
          macros: { protein: 5.5, carbs: 0.4, fat: 4.1, fiber: 0 },
        },
      ],
      calories: 502,
      macros: { protein: 19.5, carbs: 78.4, fat: 12.1, fiber: 7 },
      confidence: 82,
      assumptions: [],
      loggedAt: isoAt(1, 19, 35),
      createdAt: isoAt(1, 19, 35),
      updatedAt: isoAt(1, 19, 35),
      photo: { storagePath: pastaPhoto, thumbPath: pastaPhoto },
      userContext: "Small amount of parmesan.",
      transcript: "Tomato pasta",
      percentOfDailySpend: computeDailyCoverage(502, profile.dailySpendKcal),
      favorite: false,
      savedFoodId: null,
    },
  ];

  const savedFoods: SavedFood[] = [
    {
      id: "demo-saved-avocado-toast",
      title: "Avocado toast",
      summary: "Sourdough, avocado, egg",
      items: meals[0].items,
      calories: meals[0].calories,
      macros: meals[0].macros,
      defaultServingLabel: "1 plate",
      usageCount: 4,
      lastUsedAt: meals[0].loggedAt,
      linkedMealId: meals[0].id,
      favorite: true,
    },
    {
      id: "demo-saved-yogurt",
      title: "Greek yogurt bowl",
      summary: "Yogurt, berries, granola",
      items: meals[1].items,
      calories: meals[1].calories,
      macros: meals[1].macros,
      defaultServingLabel: "1 bowl",
      usageCount: 6,
      lastUsedAt: meals[1].loggedAt,
      linkedMealId: meals[1].id,
      favorite: true,
    },
  ];

  return { profile, meals, savedFoods };
}
