import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";
import { useAppData } from "../app/contexts";
import { BottomSheet } from "../components/BottomSheet";
import { MealCard } from "../components/MealCard";
import { DailySummaryCard, MacroSummaryCard } from "../components/NutritionVisuals";
import type { MacroSnapshot, MealEstimate, MealRecord } from "../../shared/models";
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

export function getDailyAverage(meals: MealRecord[], selectedDayKey: string, daysLimit: number) {
  const mealsByDay = new Map<string, MealRecord[]>();
  for (const meal of meals) {
    const dayKey = getLocalDayKey(meal.loggedAt);
    if (dayKey <= selectedDayKey) {
      const dayMeals = mealsByDay.get(dayKey) || [];
      dayMeals.push(meal);
      mealsByDay.set(dayKey, dayMeals);
    }
  }

  const sortedActiveDays = Array.from(mealsByDay.keys()).sort().reverse();
  const activeDaysInRange = sortedActiveDays.slice(0, daysLimit);

  if (activeDaysInRange.length === 0) {
    return { calories: 0, meals: 0 };
  }

  let totalCalories = 0;
  let totalMeals = 0;
  for (const dayKey of activeDaysInRange) {
    const dayMeals = mealsByDay.get(dayKey) || [];
    totalCalories += dayMeals.reduce((sum, m) => sum + m.calories, 0);
    totalMeals += dayMeals.length;
  }

  const denominator = activeDaysInRange.length;
  return {
    calories: Math.round(totalCalories / denominator),
    meals: Math.round((totalMeals / denominator) * 10) / 10,
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

function AverageDelta({ average, goal }: { average: number; goal: number }) {
  if (!average) return null;
  const delta = average - goal;
  const absVal = Math.abs(Math.round(delta));
  const isOver = delta > 0;
  const Icon = isOver ? TrendingUp : TrendingDown;
  const color = isOver ? "var(--nutrition-fat)" : "var(--nutrition-protein)";
  const sign = isOver ? "+" : "−";

  return (
    <span className="stat-card__delta" style={{ color }}>
      <Icon aria-hidden="true" size={10} />
      {sign}{absVal} kcal
    </span>
  );
}

export function TodayPage() {
  const {
    profile,
    meals,
    savedFoods,
    quickLogSavedFood,
    saveMeal,
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
  const dailySpend = profile?.goalMode === "manual"
    ? (profile.manualCalorieGoal ?? profile.dailySpendKcal ?? null)
    : (profile?.dailySpendKcal ?? null);
  const selectedDateLabel = formatDateLabel(createTimestampForLocalDay(selectedDayKey));
  const missingProfileFields = profile?.goalMode === "manual"
    ? []
    : [
        !profile?.age ? "Alter" : null,
        !profile?.sex ? "Geschlecht" : null,
        !profile?.heightCm ? "Größe" : null,
        !profile?.weightKg ? "Gewicht" : null,
        !profile?.activityLevel ? "Aktivität" : null,
      ].filter(Boolean) as string[];

  function mealToEstimate(meal: MealRecord): MealEstimate {
    return {
      mealTitle: meal.mealTitle,
      summary: meal.summary,
      items: meal.items,
      calories: meal.calories,
      macros: meal.macros,
      confidence: meal.confidence,
      assumptions: meal.assumptions,
      refinementQuestions: [],
    };
  }

  async function relogMeal(meal: MealRecord) {
    const savedFood = meal.savedFoodId
      ? savedFoods.find((currentSavedFood) => currentSavedFood.id === meal.savedFoodId)
      : null;

    if (savedFood) {
      await quickLogSavedFood(savedFood, 1, createTimestampForLocalDay(selectedDayKey));
      return;
    }

    await saveMeal({
      source: "saved_food",
      estimate: mealToEstimate(meal),
      userContext: meal.userContext,
      transcript: meal.transcript,
    });
  }

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

      <div key={selectedDayKey} className="stack day-content-fade">
        <DailySummaryCard
          currentCalories={selectedCalories}
          goalCalories={dailySpend}
          missingProfileFields={missingProfileFields}
          title="Bilanz"
        />

        <MacroSummaryCard
          macroTotals={selectedMacros}
          goalCalories={dailySpend}
          profile={profile}
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
              {dailySpend ? (
                <AverageDelta average={weeklyAverage.calories} goal={dailySpend} />
              ) : null}
            </article>
            <article className="stat-card">
              <span>{uiCopy.today.monthlyAverage}</span>
              <strong>{formatCalories(monthlyAverage.calories)}</strong>
              {dailySpend ? (
                <AverageDelta average={monthlyAverage.calories} goal={dailySpend} />
              ) : null}
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
                {dailySpend ? (
                  <AverageDelta average={weeklyAverage.calories} goal={dailySpend} />
                ) : null}
              </article>
              <article className="stat-card">
                <span>{uiCopy.today.monthlyAverage}</span>
                <strong>{formatCalories(monthlyAverage.calories)}</strong>
                {dailySpend ? (
                  <AverageDelta average={monthlyAverage.calories} goal={dailySpend} />
                ) : null}
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
                  onRelog={relogMeal}
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
    </div>
  );
}
