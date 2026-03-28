export type BiologicalSex = "female" | "male";
export type UnitSystem = "metric" | "imperial";
export type ThemePreference = "system" | "light" | "dark";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export type MacroSnapshot = {
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number | null;
};

export type EstimateItem = {
  id: string;
  name: string;
  portion: string;
  calories: number;
  macros: MacroSnapshot;
  confidence?: number | null;
  notes?: string | null;
};

export type RefinementOption = {
  id: string;
  label: string;
  detail?: string | null;
};

export type RefinementQuestion = {
  id: string;
  label: string;
  helperText?: string | null;
  options: RefinementOption[];
};

export type MealEstimate = {
  mealTitle: string;
  summary: string;
  items: EstimateItem[];
  calories: number;
  macros: MacroSnapshot;
  confidence: number;
  assumptions: string[];
  refinementQuestions: RefinementQuestion[];
};

export type MealSnapshot = {
  calories: number;
  macros: MacroSnapshot;
  items: EstimateItem[];
};

export type AnalyzeEntryMode = "photo" | "manual_ai";

export type AnalyzeEntryInput = {
  mode: AnalyzeEntryMode;
  imageBase64?: string;
  mimeType?: string;
  manualText?: string;
  userContext?: string;
  priorEstimate?: MealEstimate;
  refinementAnswers?: Record<string, string>;
};

export type MealSource = "photo" | "manual_ai" | "saved_food";

export type UserProfile = {
  displayName?: string | null;
  email?: string | null;
  units: UnitSystem;
  themePreference?: ThemePreference | null;
  age?: number | null;
  sex?: BiologicalSex | null;
  heightCm?: number | null;
  weightKg?: number | null;
  activityLevel?: ActivityLevel | null;
  dailySpendKcal?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type MealPhoto = {
  storagePath: string;
  thumbPath: string;
};

export type MealRecord = {
  id: string;
  source: MealSource;
  mealTitle: string;
  summary: string;
  items: EstimateItem[];
  calories: number;
  macros: MacroSnapshot;
  confidence: number;
  assumptions: string[];
  loggedAt: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  photo?: MealPhoto | null;
  userContext?: string | null;
  transcript?: string | null;
  percentOfDailySpend: number;
  favorite: boolean;
  savedFoodId?: string | null;
  servings?: number;
  baseSnapshot?: MealSnapshot | null;
};

export type SavedFood = {
  id: string;
  title: string;
  summary: string;
  items: EstimateItem[];
  calories: number;
  macros: MacroSnapshot;
  defaultServingLabel: string;
  usageCount: number;
  lastUsedAt?: string | null;
  linkedMealId?: string | null;
  favorite: boolean;
};
