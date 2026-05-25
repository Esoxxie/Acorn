import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";
import { useAppData } from "../app/contexts";
import { BottomSheet } from "../components/BottomSheet";
import { MealCard } from "../components/MealCard";
import { DailySummaryCard } from "../components/NutritionVisuals";
import type { MacroSnapshot, MealRecord } from "../../shared/models";
import { useLogFlow } from "../features/log/LogFlow";
import { uiCopy } from "../lib/copy";
import { formatCalories, formatDateLabel } from "../lib/format";
import { addDaysToLocalDayKey, createTimestampForLocalDay, getLocalDayKey } from "../../shared/date";
import { getFoodIcon } from "../lib/food-icons";

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

function getMealsForDay(meals: MealRecord[], dayKey: string) {
  return meals.filter((meal) => getLocalDayKey(meal.loggedAt) === dayKey);
}

function getDailyAverage(meals: MealRecord[], selectedDayKey: string, days: number) {
  const dayKeys = new Set(
    Array.from({ length: days }, (_, index) => addDaysToLocalDayKey(selectedDayKey, -index)),
  );
  const mealsInRange = meals.filter((meal) => dayKeys.has(getLocalDayKey(meal.loggedAt)));
  const calories = mealsInRange.reduce((sum, meal) => sum + meal.calories, 0);

  return {
    calories: Math.round(calories / days),
    meals: Math.round((mealsInRange.length / days) * 10) / 10,
  };
}

function getDailySeries(meals: MealRecord[], selectedDayKey: string, days: number) {
  return Array.from({ length: days }, (_, index) => {
    const dayKey = addDaysToLocalDayKey(selectedDayKey, index - days + 1);
    const dayMeals = getMealsForDay(meals, dayKey);

    return {
      calories: dayMeals.reduce((sum, meal) => sum + meal.calories, 0),
      dayKey,
      meals: dayMeals.length,
    };
  });
}

function formatChartDayLabel(dayKey: string) {
  const [, month, day] = dayKey.split("-");
  return `${Number(day)}.${Number(month)}.`;
}

export function TodayPage() {
  const {
    profile,
    meals,
    savedFoods,
    quickLogSavedFood,
    toggleMealFavorite,
    deleteMeal,
    updateMealServings,
  } = useAppData();
  const { openEditMeal } = useLogFlow();
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState(() => getLocalDayKey(new Date()));
  const [statsOpen, setStatsOpen] = useState(false);
  const selectedMeals = useMemo(() => getMealsForDay(meals, selectedDayKey), [meals, selectedDayKey]);
  const selectedCalories = selectedMeals.reduce((sum, meal) => sum + meal.calories, 0);
  const selectedMacros = sumMacros(selectedMeals);
  const weeklyAverage = useMemo(() => getDailyAverage(meals, selectedDayKey, 7), [meals, selectedDayKey]);
  const monthlyAverage = useMemo(() => getDailyAverage(meals, selectedDayKey, 30), [meals, selectedDayKey]);
  const chartSeries = useMemo(() => getDailySeries(meals, selectedDayKey, 30), [meals, selectedDayKey]);
  const chartMaxCalories = Math.max(1, ...chartSeries.map((day) => day.calories));
  const dailySpend = profile?.dailySpendKcal ?? null;
  const selectedDateLabel = formatDateLabel(createTimestampForLocalDay(selectedDayKey));
  const missingProfileFields = [
    !profile?.age ? "Alter" : null,
    !profile?.sex ? "Geschlecht" : null,
    !profile?.heightCm ? "Größe" : null,
    !profile?.weightKg ? "Gewicht" : null,
    !profile?.activityLevel ? "Aktivität" : null,
  ].filter(Boolean) as string[];

  async function addSavedFoodToSelectedDay(savedFoodId: string) {
    const savedFood = savedFoods.find((currentSavedFood) => currentSavedFood.id === savedFoodId);
    if (!savedFood) {
      return;
    }

    await quickLogSavedFood(savedFood, 1, createTimestampForLocalDay(selectedDayKey));
  }

  return (
    <div className="page-stack">
      <section className="section-card day-switcher-card">
        <button
          aria-label={uiCopy.today.previousDay}
          className="icon-button"
          onClick={() => {
            setSelectedDayKey((current) => addDaysToLocalDayKey(current, -1));
            setExpandedMealId(null);
          }}
          type="button"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="day-switcher-card__label">
          <CalendarDays aria-hidden="true" size={18} />
          <strong>{selectedDateLabel}</strong>
        </div>
        <button
          aria-label={uiCopy.today.nextDay}
          className="icon-button"
          onClick={() => {
            setSelectedDayKey((current) => addDaysToLocalDayKey(current, 1));
            setExpandedMealId(null);
          }}
          type="button"
        >
          <ChevronRight size={18} />
        </button>
      </section>

      <DailySummaryCard
        currentCalories={selectedCalories}
        goalCalories={dailySpend}
        macroTotals={selectedMacros}
        mealCount={selectedMeals.length}
        missingProfileFields={missingProfileFields}
        title={selectedDateLabel}
      />

      <section
        aria-label={uiCopy.today.openStats}
        className="section-card stats-section-card"
        onClick={() => setStatsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setStatsOpen(true);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div className="section-card__header">
          <h2>{uiCopy.today.averages}</h2>
          <BarChart3 aria-hidden="true" size={18} />
        </div>
        <div className="stats-grid stats-grid--compact">
          <article className="stat-card">
            <span>{uiCopy.today.weeklyAverage}</span>
            <strong>{formatCalories(weeklyAverage.calories)}</strong>
            <p>{weeklyAverage.meals}/Tag</p>
          </article>
          <article className="stat-card">
            <span>{uiCopy.today.monthlyAverage}</span>
            <strong>{formatCalories(monthlyAverage.calories)}</strong>
            <p>{monthlyAverage.meals}/Tag</p>
          </article>
        </div>
      </section>

      <BottomSheet
        onClose={() => setStatsOpen(false)}
        open={statsOpen}
        subtitle={selectedDateLabel}
        title={uiCopy.today.statsTitle}
      >
        <div className="stats-sheet">
          <div className="stats-grid stats-grid--compact">
            <article className="stat-card">
              <span>{uiCopy.today.weeklyAverage}</span>
              <strong>{formatCalories(weeklyAverage.calories)}</strong>
              <p>{weeklyAverage.meals}/Tag</p>
            </article>
            <article className="stat-card">
              <span>{uiCopy.today.monthlyAverage}</span>
              <strong>{formatCalories(monthlyAverage.calories)}</strong>
              <p>{monthlyAverage.meals}/Tag</p>
            </article>
          </div>

          <section className="calorie-chart" aria-label={uiCopy.today.chartLabel}>
            <div className="calorie-chart__plot">
              {chartSeries.map((day) => {
                const height = Math.max(4, Math.round((day.calories / chartMaxCalories) * 100));

                return (
                  <div className="calorie-chart__bar-wrap" key={day.dayKey}>
                    <span
                      aria-label={`${formatChartDayLabel(day.dayKey)} ${formatCalories(day.calories)}`}
                      className={`calorie-chart__bar ${day.calories ? "" : "calorie-chart__bar--empty"}`}
                      style={{ "--bar-height": `${height}%` } as CSSProperties}
                      title={`${formatChartDayLabel(day.dayKey)} ${formatCalories(day.calories)}`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="calorie-chart__axis">
              <span>{formatChartDayLabel(chartSeries[0]?.dayKey ?? selectedDayKey)}</span>
              <span>{uiCopy.today.todayMarker}</span>
            </div>
          </section>
        </div>
      </BottomSheet>

      {savedFoods.length ? (
        <section className="section-card">
          <div className="section-card__header">
            <h2>{uiCopy.today.addFromLibrary}</h2>
          </div>
          <div className="saved-food-rail">
            {savedFoods.map((savedFood) => {
              const Icon = getFoodIcon([
                savedFood.title,
                savedFood.summary,
                savedFood.items.map((item) => item.name).join(" "),
              ]);

              return (
                <button
                  className="saved-food-chip"
                  key={savedFood.id}
                  onClick={() => void addSavedFoodToSelectedDay(savedFood.id)}
                  type="button"
                >
                  <span className="favorite-card__icon">
                    <Icon aria-hidden="true" size={18} />
                  </span>
                  <span>
                    <strong>{savedFood.title}</strong>
                    <small>{formatCalories(savedFood.calories)}</small>
                  </span>
                  <Plus aria-hidden="true" size={16} />
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="section-card">
        <div className="section-card__header">
          <h1>{uiCopy.today.entries}</h1>
        </div>
        {selectedMeals.length ? (
          <div className="stack">
            {selectedMeals.map((meal) => (
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
