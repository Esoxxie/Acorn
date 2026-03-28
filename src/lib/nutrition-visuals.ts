import type { MacroSnapshot } from "../../shared/models";

export type MacroKey = "protein" | "fat" | "carbs";

export type MacroGoalSnapshot = {
  protein: number;
  fat: number;
  carbs: number;
};

export type ConfidenceBand = "high" | "solid" | "rough";

export type ConfidenceDetails = {
  label: string;
  tone: ConfidenceBand;
  hint: string;
};

export type MacroProgressRow = {
  key: MacroKey;
  label: string;
  current: number;
  target: number | null;
  percent: number | null;
  color: string;
};

const macroOrder: Array<{
  key: MacroKey;
  label: string;
  color: string;
}> = [
  { key: "protein", label: "Protein", color: "var(--nutrition-protein)" },
  { key: "fat", label: "Fett", color: "var(--nutrition-fat)" },
  { key: "carbs", label: "Kohlenhydrate", color: "var(--nutrition-carbs)" },
];

export function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function getCalorieProgress(currentCalories: number, goalCalories?: number | null) {
  const hasGoal = typeof goalCalories === "number" && goalCalories > 0;
  const rawPercent = hasGoal ? (currentCalories / goalCalories) * 100 : 0;
  const percent = hasGoal ? clampPercent(rawPercent) : 0;

  return {
    hasGoal,
    percent,
    rawPercent,
    goalCalories: hasGoal ? goalCalories : null,
    remainingCalories: hasGoal ? Math.max(goalCalories - currentCalories, 0) : null,
    overflowCalories: hasGoal ? Math.max(currentCalories - goalCalories, 0) : null,
  };
}

export function deriveMacroTargets(dailyCalories?: number | null): MacroGoalSnapshot | null {
  if (!dailyCalories || dailyCalories <= 0) {
    return null;
  }

  return {
    protein: (dailyCalories * 0.25) / 4,
    fat: (dailyCalories * 0.25) / 9,
    carbs: (dailyCalories * 0.5) / 4,
  };
}

export function buildMacroProgressRows(
  macroTotals: MacroSnapshot,
  macroTargets: MacroGoalSnapshot | null,
): MacroProgressRow[] {
  return macroOrder.map(({ key, label, color }) => {
    const target = macroTargets ? macroTargets[key] : null;
    const current = macroTotals[key];

    return {
      key,
      label,
      current,
      target,
      percent: target && target > 0 ? clampPercent((current / target) * 100) : null,
      color,
    };
  });
}

export function getConfidenceDetails(confidence: number): ConfidenceDetails {
  if (confidence >= 85) {
    return {
      label: "Hohe Sicherheit",
      tone: "high",
      hint: "Die Schaetzung ist fuer einen schnellen Eintrag verlaesslich genug.",
    };
  }

  if (confidence >= 70) {
    return {
      label: "Solide Schaetzung",
      tone: "solid",
      hint: "Gut genug fuer das taegliche Tracking.",
    };
  }

  return {
    label: "Grobe Schaetzung",
    tone: "rough",
    hint: "Zum Protokollieren brauchbar, bei Bedarf aber besser verfeinern.",
  };
}
