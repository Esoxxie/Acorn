import { Heart, Repeat2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { MealRecord } from "../../shared/models";
import { formatCalories, formatMacro, formatPercent, formatTimeLabel } from "../lib/format";
import { resolveStorageUrl } from "../lib/storage";

type MealCardProps = {
  meal: MealRecord;
  onFavorite: (meal: MealRecord) => Promise<void>;
  onDelete: (meal: MealRecord) => Promise<void>;
  onRelog?: (meal: MealRecord) => Promise<void>;
};

function MealThumb({ meal }: Pick<MealCardProps, "meal">) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!meal.photo?.thumbPath) {
      setUrl(null);
      return;
    }

    resolveStorageUrl(meal.photo.thumbPath)
      .then((resolved) => {
        if (!cancelled) {
          setUrl(resolved);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUrl(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [meal.photo?.thumbPath]);

  if (!url) {
    return <div className="meal-card__thumb meal-card__thumb--placeholder">{meal.mealTitle.slice(0, 1)}</div>;
  }

  return <img alt={meal.mealTitle} className="meal-card__thumb" src={url} />;
}

export function MealCard({ meal, onDelete, onFavorite, onRelog }: MealCardProps) {
  return (
    <article className="meal-card">
      <MealThumb meal={meal} />
      <div className="meal-card__content">
        <div className="meal-card__headline">
          <div>
            <p className="meal-card__time">{formatTimeLabel(meal.loggedAt)}</p>
            <h3>{meal.mealTitle}</h3>
          </div>
          <div className="meal-card__kcal">
            <strong>{formatCalories(meal.calories)}</strong>
            <span>{formatPercent(meal.percentOfDailySpend)}</span>
          </div>
        </div>

        <div className="macro-row">
          <span>{formatMacro(meal.macros.protein)} protein</span>
          <span>{formatMacro(meal.macros.carbs)} carbs</span>
          <span>{formatMacro(meal.macros.fat)} fat</span>
        </div>

        <div className="meal-card__actions">
          {onRelog ? (
            <button className="pill-button" onClick={() => void onRelog(meal)} type="button">
              <Repeat2 size={16} />
              Again
            </button>
          ) : null}
          <button
            className={`pill-button ${meal.favorite ? "pill-button--accent" : ""}`}
            onClick={() => void onFavorite(meal)}
            type="button"
          >
            <Heart fill={meal.favorite ? "currentColor" : "none"} size={16} />
            {meal.favorite ? "Saved" : "Save"}
          </button>
          <button className="pill-button" onClick={() => void onDelete(meal)} type="button">
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}
