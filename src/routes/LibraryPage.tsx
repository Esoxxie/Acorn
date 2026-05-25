import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { useState } from "react";
import type { MealEstimate, MealRecord } from "../../shared/models";
import { useAppData } from "../app/contexts";
import { MealCard } from "../components/MealCard";
import { useLogFlow } from "../features/log/LogFlow";
import { uiCopy } from "../lib/copy";
import { getFoodIcon } from "../lib/food-icons";
import { formatCalories, formatDateLabel } from "../lib/format";
import { createTimestampForLocalDay, getLocalDayKey } from "../../shared/date";
import "../styles/meal-surfaces.css";

export function LibraryPage() {
  const {
    meals,
    savedFoods,
    quickLogSavedFood,
    saveMeal,
    toggleMealFavorite,
    deleteMeal,
    updateMealServings,
  } = useAppData();
  const { openEditMeal } = useLogFlow();
  const [search, setSearch] = useState("");
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const searchLower = search.toLowerCase();
  const visibleMeals = meals.filter((meal) => {
    return (
      !searchLower ||
      meal.mealTitle.toLowerCase().includes(searchLower) ||
      meal.items.some((item) => item.name.toLowerCase().includes(searchLower))
    );
  });

  const grouped = visibleMeals.reduce<Record<string, MealRecord[]>>((accumulator, meal) => {
    const key = getLocalDayKey(meal.loggedAt);
    accumulator[key] = accumulator[key] ?? [];
    accumulator[key].push(meal);
    return accumulator;
  }, {});

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
      await quickLogSavedFood(savedFood, 1);
      return;
    }

    await saveMeal({
      source: "saved_food",
      estimate: mealToEstimate(meal),
      userContext: meal.userContext,
      transcript: meal.transcript,
    });
  }

  return (
    <div className="page-stack">
      <section className="section-card">
        <div className="section-card__header">
          <h1>{uiCopy.library.heading}</h1>
        </div>
        <label className="search-shell">
          <Search aria-hidden="true" size={16} />
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder={uiCopy.library.searchPlaceholder}
            type="search"
            value={search}
          />
        </label>
      </section>

      {savedFoods.length ? (
        <section className="section-card">
          <button
            className="section-card__header section-card__header--toggle"
            onClick={() => setFavoritesOpen((open) => !open)}
            type="button"
          >
            <h2>Favoriten ({savedFoods.length})</h2>
            {favoritesOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          {favoritesOpen ? (
            <div className="saved-food-grid">
              {savedFoods.map((savedFood) => {
                const Icon = getFoodIcon([savedFood.title, savedFood.summary, savedFood.items.map((item) => item.name).join(" ")]);

                return (
                  <button
                    className="saved-food-card saved-food-card--clickable"
                    key={savedFood.id}
                    onClick={() => void quickLogSavedFood(savedFood, 1)}
                    type="button"
                  >
                    <div className="favorite-card__header">
                      <div className="favorite-card__icon">
                        <Icon aria-hidden="true" size={20} />
                      </div>
                      <div>
                        <h3>{savedFood.title}</h3>
                        <p>{formatCalories(savedFood.calories)}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="stack">
        {Object.entries(grouped).map(([day, dayMeals]) => (
          <section className="section-card" key={day}>
            <div className="section-card__header">
              <h2>{formatDateLabel(createTimestampForLocalDay(day))}</h2>
            </div>
            <div className="stack">
              {dayMeals.map((meal) => (
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
          </section>
        ))}
      </div>
    </div>
  );
}
