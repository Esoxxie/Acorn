import { Heart, Search } from "lucide-react";
import { useState } from "react";
import type { MealRecord } from "../../shared/models";
import { useAppData } from "../app/contexts";
import { MealCard } from "../components/MealCard";
import { useLogFlow } from "../features/log/LogFlow";
import { uiCopy } from "../lib/copy";
import { getFoodIcon } from "../lib/food-icons";
import { formatCalories, formatDateLabel } from "../lib/format";
import "../styles/meal-surfaces.css";

type FilterMode = "all" | "favorites";

function matchesFilter(meal: MealRecord, filter: FilterMode) {
  return filter === "all" ? true : meal.favorite;
}

export function LibraryPage() {
  const { meals, savedFoods, quickLogSavedFood, toggleMealFavorite, deleteMeal, updateMealServings } = useAppData();
  const { openEditMeal } = useLogFlow();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);
  const searchLower = search.toLowerCase();
  const visibleMeals = meals.filter((meal) => {
    const matchesSearch =
      !searchLower ||
      meal.mealTitle.toLowerCase().includes(searchLower) ||
      meal.items.some((item) => item.name.toLowerCase().includes(searchLower));

    return matchesSearch && matchesFilter(meal, filter);
  });

  const grouped = visibleMeals.reduce<Record<string, MealRecord[]>>((accumulator, meal) => {
    const key = meal.loggedAt.slice(0, 10);
    accumulator[key] = accumulator[key] ?? [];
    accumulator[key].push(meal);
    return accumulator;
  }, {});

  return (
    <div className="page-stack">
      <section className="section-card">
        <div className="section-card__header">
          <h1>{uiCopy.library.heading}</h1>
          <p>{uiCopy.library.subheading}</p>
        </div>
        <div className="library-toolbar">
          <label className="search-shell">
            <Search aria-hidden="true" size={18} />
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder={uiCopy.library.searchPlaceholder}
              type="search"
              value={search}
            />
          </label>
          <div className="chip-wrap">
            {(["all", "favorites"] as FilterMode[]).map((mode) => (
              <button
                className={`chip ${filter === mode ? "chip--selected" : ""}`}
                key={mode}
                onClick={() => setFilter(mode)}
                type="button"
              >
                {mode === "all" ? uiCopy.library.all : uiCopy.library.favorites}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="section-card">
        <div className="section-card__header">
          <h2>Favoriten</h2>
        </div>
        {savedFoods.length ? (
          <div className="saved-food-grid">
            {savedFoods.map((savedFood) => {
              const Icon = getFoodIcon([savedFood.title, savedFood.summary, savedFood.items.map((item) => item.name).join(" ")]);

              return (
                <article className="saved-food-card" key={savedFood.id}>
                  <div className="favorite-card__header">
                    <div className="favorite-card__icon">
                      <Icon aria-hidden="true" size={22} />
                    </div>
                    <div>
                      <h3>{savedFood.title}</h3>
                      <p>{formatCalories(savedFood.calories)}</p>
                    </div>
                  </div>
                  <div className="favorite-card__meta">
                    <span className="chip">
                      <Heart aria-hidden="true" fill="currentColor" size={14} />
                      {uiCopy.library.usedCount(savedFood.usageCount)}
                    </span>
                  </div>
                  <div className="favorite-card__macro-grid">
                    <div className="meal-card__macro-tile meal-card__macro-tile--protein">
                      <strong>{Math.round(savedFood.macros.protein)}g</strong>
                      <span>Protein</span>
                    </div>
                    <div className="meal-card__macro-tile meal-card__macro-tile--carbs">
                      <strong>{Math.round(savedFood.macros.carbs)}g</strong>
                      <span>Kohlenh.</span>
                    </div>
                    <div className="meal-card__macro-tile meal-card__macro-tile--fat">
                      <strong>{Math.round(savedFood.macros.fat)}g</strong>
                      <span>Fett</span>
                    </div>
                  </div>
                  <div className="chip-wrap">
                    {[1, 2].map((multiplier) => (
                      <button
                        className="chip"
                        key={multiplier}
                        onClick={() => void quickLogSavedFood(savedFood, multiplier)}
                        type="button"
                      >
                        {multiplier}x
                      </button>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">{uiCopy.library.emptyFavorites}</div>
        )}
      </section>

      <div className="stack">
        {Object.entries(grouped).map(([day, dayMeals]) => (
          <section className="section-card" key={day}>
            <div className="section-card__header">
              <h2>{formatDateLabel(`${day}T00:00:00.000Z`)}</h2>
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
                  onRelog={
                    meal.savedFoodId
                      ? async () => {
                          const match = savedFoods.find((savedFood) => savedFood.id === meal.savedFoodId);
                          if (match) {
                            await quickLogSavedFood(match, 1);
                          }
                        }
                      : undefined
                  }
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
