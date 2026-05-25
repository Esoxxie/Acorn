import { Heart, Minus, PencilLine, Plus, Repeat2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { MealRecord } from "../../shared/models";
import { formatCalories, formatMacro, formatTimeLabel } from "../lib/format";
import { uiCopy } from "../lib/copy";
import { getFoodIcon, getFoodIconTone } from "../lib/food-icons";
import { resolveStorageUrl } from "../lib/storage";
import { ConfidencePill } from "./NutritionVisuals";
import "../styles/meal-surfaces.css";

type MealCardProps = {
  meal: MealRecord;
  expanded?: boolean;
  onToggleExpand?: (meal: MealRecord) => void;
  onEdit?: (meal: MealRecord) => void;
  onFavorite: (meal: MealRecord) => Promise<void>;
  onDelete: (meal: MealRecord) => Promise<void>;
  onRelog?: (meal: MealRecord) => Promise<void>;
  onUpdateServings?: (meal: MealRecord, servings: number) => Promise<void>;
};

function MacroTile({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "protein" | "carbs" | "fat";
  value: number;
}) {
  return (
    <div className={`meal-card__macro-tile meal-card__macro-tile--${tone}`}>
      <strong>{formatMacro(value)}</strong>
      <span>{label}</span>
    </div>
  );
}

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
    const Icon = getFoodIcon([meal.mealTitle, meal.summary, meal.items.map((item) => item.name).join(" ")]);
    const tone = getFoodIconTone([meal.mealTitle, meal.summary, meal.items.map((item) => item.name).join(" ")]);

    return (
      <div className={`meal-card__thumb meal-card__thumb--icon meal-card__thumb--${tone}`}>
        <Icon aria-hidden="true" size={22} />
      </div>
    );
  }

  return <img alt={meal.mealTitle} className="meal-card__thumb" src={url} />;
}

function getPortionLabel(meal: MealRecord) {
  const firstPortion = meal.items[0]?.portion?.trim();
  if (firstPortion) {
    return firstPortion;
  }

  const servings = meal.servings ?? 1;
  return servings === 1 ? "1 Portion" : `${servings} Portionen`;
}

function getPercentLabel(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toFixed(rounded % 1 === 0 ? 0 : 1)}%`;
}

export function MealCard({
  meal,
  expanded = false,
  onToggleExpand,
  onEdit,
  onDelete,
  onFavorite,
  onRelog,
  onUpdateServings,
}: MealCardProps) {
  const canDecrement = (meal.servings ?? 1) > 1;
  const percentWidth = Math.max(0, Math.min(100, meal.percentOfDailySpend));
  const portionLabel = getPortionLabel(meal);

  return (
    <article className={`meal-card meal-card--interactive ${expanded ? "is-expanded" : ""}`}>
      <button
        aria-expanded={expanded}
        className="meal-card__summary"
        onClick={() => onToggleExpand?.(meal)}
        type="button"
      >
        <div className="meal-card__summary-row">
          <MealThumb meal={meal} />

          <div className="meal-card__title-block">
            <h3>{meal.mealTitle}</h3>
            <div className="meal-card__meta-line">
              <span>{portionLabel}</span>
              <span aria-hidden="true" className="meal-card__meta-dot" />
              <span>{formatTimeLabel(meal.loggedAt)}</span>
            </div>
          </div>

          <div className="meal-card__kcal-block">
            <strong>{Math.round(meal.calories)}</strong>
            <span>{uiCopy.mealCard.kcal}</span>
          </div>
        </div>

        <div className="meal-card__progress-row">
          <div className="meal-card__progress-track" aria-hidden="true">
            <span className="meal-card__progress-fill" style={{ width: `${percentWidth}%` }} />
          </div>
          <span className="meal-card__progress-value">{getPercentLabel(meal.percentOfDailySpend)}</span>
        </div>

        <div className="meal-card__macro-grid">
          <MacroTile label={uiCopy.mealCard.protein} tone="protein" value={meal.macros.protein} />
          <MacroTile label={uiCopy.mealCard.carbsShort} tone="carbs" value={meal.macros.carbs} />
          <MacroTile label={uiCopy.mealCard.fat} tone="fat" value={meal.macros.fat} />
        </div>
      </button>

      <div className="meal-card__actions meal-card__actions--footer">
        {onRelog ? (
          <>
            <button
              aria-label={`${meal.mealTitle} erneut hinzufügen`}
              className="meal-card__action-button"
              onClick={() => void onRelog(meal)}
              type="button"
            >
              <Repeat2 size={16} />
            </button>
            <span aria-hidden="true" className="meal-card__action-divider" />
          </>
        ) : null}
        <button
          aria-label={meal.favorite ? `${meal.mealTitle} aus Favoriten entfernen` : `${meal.mealTitle} als Favorit merken`}
          className={`meal-card__action-button ${meal.favorite ? "is-active" : ""}`}
          onClick={() => void onFavorite(meal)}
          type="button"
        >
          <Heart fill={meal.favorite ? "currentColor" : "none"} size={16} />
        </button>
        <span aria-hidden="true" className="meal-card__action-divider" />
        <button
          aria-label={uiCopy.mealCard.edit}
          className="meal-card__action-button"
          onClick={() => onEdit?.(meal)}
          type="button"
        >
          <PencilLine size={16} />
        </button>
        <span aria-hidden="true" className="meal-card__action-divider" />
        <button
          aria-label={uiCopy.mealCard.delete}
          className="meal-card__action-button meal-card__action-button--danger"
          onClick={() => void onDelete(meal)}
          type="button"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {expanded ? (
        <div className="meal-card__details">
          {meal.summary ? <p className="meal-card__detail-note">{meal.summary}</p> : null}

          <div className="meal-card__detail-row">
            <div>
              <span className="meal-card__detail-label">{uiCopy.mealCard.quantity}</span>
              <strong className="meal-card__detail-value">{meal.servings ?? 1}x</strong>
            </div>
            <div className="serving-stepper">
              <button
                aria-label={`${meal.mealTitle} Menge verringern`}
                className="icon-button"
                disabled={!canDecrement}
                onClick={() => void onUpdateServings?.(meal, Math.max(1, (meal.servings ?? 1) - 1))}
                type="button"
              >
                <Minus size={16} />
              </button>
              <strong>{meal.servings ?? 1}</strong>
              <button
                aria-label={`${meal.mealTitle} Menge erhoehen`}
                className="icon-button"
                onClick={() => void onUpdateServings?.(meal, (meal.servings ?? 1) + 1)}
                type="button"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="meal-card__detail-row meal-card__detail-row--assessment">
            <ConfidencePill confidence={meal.confidence} />
          </div>

          <div className="meal-card__items">
            {meal.items.map((item) => (
              <div className="meal-card__item" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.portion}</span>
                </div>
                <span>{formatCalories(item.calories)}</span>
              </div>
            ))}
          </div>

          {meal.assumptions.length ? (
            <section className="meal-card__assumptions">
              <h4>{uiCopy.mealCard.assumptions}</h4>
              <ul>
                {meal.assumptions.map((assumption) => (
                  <li key={assumption}>{assumption}</li>
                ))}
              </ul>
            </section>
          ) : null}

        </div>
      ) : null}
    </article>
  );
}
