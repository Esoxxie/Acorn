import { useAppData } from "../app/contexts";
import { MealCard } from "../components/MealCard";
import { formatCalories, formatPercent } from "../lib/format";

export function TodayPage() {
  const { profile, meals, toggleMealFavorite, deleteMeal } = useAppData();
  const todayKey = new Date().toISOString().slice(0, 10);
  const todaysMeals = meals.filter((meal) => meal.loggedAt.slice(0, 10) === todayKey);
  const todayCalories = todaysMeals.reduce((sum, meal) => sum + meal.calories, 0);
  const dailySpend = profile?.dailySpendKcal ?? 0;
  const progressPercent = dailySpend ? Math.min(100, Math.round((todayCalories / dailySpend) * 1000) / 10) : 0;
  const missingProfileFields = [
    !profile?.age ? "age" : null,
    !profile?.sex ? "sex" : null,
    !profile?.heightCm ? "height" : null,
    !profile?.weightKg ? "weight" : null,
    !profile?.activityLevel ? "activity level" : null,
  ].filter(Boolean);
  const dailyStatus = dailySpend
    ? `${formatPercent(progressPercent)} covered`
    : missingProfileFields.length
      ? `Missing ${missingProfileFields.join(", ")} for TDEE`
      : "Complete your profile to calculate TDEE";

  return (
    <div className="page-stack">
      <section className="stats-grid stats-grid--compact">
        <article className="stat-card">
          <span>Today</span>
          <strong>{formatCalories(todayCalories)}</strong>
          <p>{todaysMeals.length} entries</p>
        </article>
        <article className="stat-card">
          <span>Daily</span>
          <strong>{dailySpend ? formatCalories(dailySpend) : "Set profile"}</strong>
          <p>{dailyStatus}</p>
        </article>
      </section>

      <section className="section-card">
        <div className="section-card__header">
          <h1>Today</h1>
        </div>
        {todaysMeals.length ? (
          <div className="stack">
            {todaysMeals.map((meal) => (
              <MealCard key={meal.id} meal={meal} onDelete={deleteMeal} onFavorite={toggleMealFavorite} />
            ))}
          </div>
        ) : (
          <div className="empty-state">No meals yet.</div>
        )}
      </section>
    </div>
  );
}
