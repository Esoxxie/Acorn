import { useState } from "react";
import { useAppData } from "../app/contexts";
import { MealCard } from "../components/MealCard";
import { DailySummaryCard } from "../components/NutritionVisuals";
import type { MacroSnapshot } from "../../shared/models";
import { useLogFlow } from "../features/log/LogFlow";
import { uiCopy } from "../lib/copy";

function sumMacros(meals: Array<{ macros: MacroSnapshot }>): MacroSnapshot {
  return meals.reduce(
    (totals, meal) => ({
      protein: totals.protein + meal.macros.protein,
      carbs: totals.carbs + meal.macros.carbs,
      fat: totals.fat + meal.macros.fat,
      fiber: (totals.fiber ?? 0) + (meal.macros.fiber ?? 0),
    }),
    { protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
}

export function TodayPage() {
  const { profile, meals, toggleMealFavorite, deleteMeal, updateMealServings } = useAppData();
  const { openEditMeal } = useLogFlow();
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);
  const todayKey = new Date().toISOString().slice(0, 10);
  const todaysMeals = meals.filter((meal) => meal.loggedAt.slice(0, 10) === todayKey);
  const todayCalories = todaysMeals.reduce((sum, meal) => sum + meal.calories, 0);
  const todayMacros = sumMacros(todaysMeals);
  const dailySpend = profile?.dailySpendKcal ?? null;
  const missingProfileFields = [
    !profile?.age ? "Alter" : null,
    !profile?.sex ? "Geschlecht" : null,
    !profile?.heightCm ? "Größe" : null,
    !profile?.weightKg ? "Gewicht" : null,
    !profile?.activityLevel ? "Aktivität" : null,
  ].filter(Boolean) as string[];

  return (
    <div className="page-stack">
      <DailySummaryCard
        currentCalories={todayCalories}
        goalCalories={dailySpend}
        macroTotals={todayMacros}
        mealCount={todaysMeals.length}
        missingProfileFields={missingProfileFields}
      />

      <section className="section-card">
        <div className="section-card__header">
          <h1>{uiCopy.today.heading}</h1>
        </div>
        {todaysMeals.length ? (
          <div className="stack">
            {todaysMeals.map((meal) => (
              <MealCard
                expanded={expandedMealId === meal.id}
                key={meal.id}
                meal={meal}
                onDelete={deleteMeal}
                onEdit={openEditMeal}
                onFavorite={toggleMealFavorite}
                onToggleExpand={(currentMeal) =>
                  setExpandedMealId((activeMealId) => (activeMealId === currentMeal.id ? null : currentMeal.id))
                }
                onUpdateServings={updateMealServings}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">{uiCopy.today.empty}</div>
        )}
      </section>
    </div>
  );
}
