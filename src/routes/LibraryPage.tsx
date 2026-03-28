import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { useState } from "react";
import type { MealRecord } from "../../shared/models";
import { useAppData } from "../app/contexts";
import { MealCard } from "../components/MealCard";
import { useLogFlow } from "../features/log/LogFlow";
import { uiCopy } from "../lib/copy";
import { getFoodIcon } from "../lib/food-icons";
import { formatCalories, formatDateLabel } from "../lib/format";
import "../styles/meal-surfaces.css";

export function LibraryPage() {
  const { meals, savedFoods, quickLogSavedFood, toggleMealFavorite, deleteMeal, updateMealServings } = useAppData();
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
