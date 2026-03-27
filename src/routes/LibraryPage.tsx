import { useState } from "react";
import type { MealRecord } from "../../shared/models";
import { useAppData } from "../app/contexts";
import { MealCard } from "../components/MealCard";
import { formatCalories, formatDateLabel } from "../lib/format";

type FilterMode = "all" | "saved";

function matchesFilter(meal: MealRecord, filter: FilterMode) {
  return filter === "all" ? true : meal.favorite;
}

export function LibraryPage() {
  const { meals, savedFoods, quickLogSavedFood, toggleMealFavorite, deleteMeal } = useAppData();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
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
          <h1>Library</h1>
        </div>
        <div className="toolbar">
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search"
            type="search"
            value={search}
          />
          <div className="chip-wrap">
            {(["all", "saved"] as FilterMode[]).map((mode) => (
              <button
                className={`chip ${filter === mode ? "chip--selected" : ""}`}
                key={mode}
                onClick={() => setFilter(mode)}
                type="button"
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="section-card">
        <div className="section-card__header">
          <h2>Saved</h2>
        </div>
        {savedFoods.length ? (
          <div className="saved-food-grid">
            {savedFoods.map((savedFood) => (
              <article className="saved-food-card" key={savedFood.id}>
                <div>
                  <h3>{savedFood.title}</h3>
                  <p>{formatCalories(savedFood.calories)}</p>
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
            ))}
          </div>
        ) : (
          <div className="empty-state">No saved foods.</div>
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
                  key={meal.id}
                  meal={meal}
                  onDelete={deleteMeal}
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
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
