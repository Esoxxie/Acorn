import type { MealRecord } from "../../shared/models";
import { addDaysToLocalDayKey, getLocalDayKey } from "../../shared/date";

export type WinStreakStage = {
  days: number;
  title: string;
  tier: string;
  key: string;
};

export const WIN_STREAK_STAGES: WinStreakStage[] = [
  { days: 2, title: "Erste Nuss", tier: "Haselnuss", key: "hazelnut" },
  { days: 3, title: "Kleiner Vorrat", tier: "Kastanie", key: "chestnut" },
  { days: 5, title: "Flinke Pfoten", tier: "Eichelbronze", key: "acorn-bronze" },
  { days: 7, title: "Wochen-Sammler:in", tier: "Waldsilber", key: "forest-silver" },
  { days: 10, title: "Nuss-Routine", tier: "Silbergrau", key: "silver-gray" },
  { days: 14, title: "Zweigläufer:in", tier: "Goldene Eichel", key: "golden-acorn" },
  { days: 21, title: "Baumkrone", tier: "Kronengold", key: "crown-gold" },
  { days: 30, title: "Monatsvorrat", tier: "Platin-Eichel", key: "platinum-acorn" },
  { days: 45, title: "Tiefe Wurzeln", tier: "Moosplatin", key: "moss-platinum" },
  { days: 60, title: "Fester Bau", tier: "Smaragdblatt", key: "emerald-leaf" },
  { days: 90, title: "Wintervorrat", tier: "Rubinbeere", key: "ruby-berry" },
  { days: 120, title: "Waldmeister:in", tier: "Saphirpfote", key: "sapphire-paw" },
  { days: 180, title: "Halbes Eicheljahr", tier: "Diamantnuss", key: "diamond-nut" },
  { days: 270, title: "Alte Eiche", tier: "Obsidianrinde", key: "obsidian-bark" },
  { days: 365, title: "Legendärer Vorrat", tier: "Sterneneichel", key: "star-acorn" },
];

export function getWinStreakDays(meals: MealRecord[], selectedDayKey: string) {
  const activeDays = new Set(meals.map((meal) => getLocalDayKey(meal.loggedAt)));
  let cursor = activeDays.has(selectedDayKey) ? selectedDayKey : addDaysToLocalDayKey(selectedDayKey, -1);
  let streakDays = 0;

  while (activeDays.has(cursor)) {
    streakDays += 1;
    cursor = addDaysToLocalDayKey(cursor, -1);
  }

  return streakDays;
}

export function getWinStreakDetails(streakDays: number) {
  const currentStage = WIN_STREAK_STAGES.reduce<WinStreakStage | null>(
    (current, stage) => (streakDays >= stage.days ? stage : current),
    null,
  );
  const nextStage = WIN_STREAK_STAGES.find((stage) => streakDays < stage.days) ?? null;
  const progress = nextStage ? Math.max(0, Math.min(1, streakDays / nextStage.days)) : 1;

  return {
    badgeText: currentStage ? `${currentStage.title} · ${currentStage.days} Tage` : null,
    currentStage,
    nextStage,
    progress,
    streakDays,
  };
}
