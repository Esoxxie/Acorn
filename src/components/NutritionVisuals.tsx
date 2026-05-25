import { useId } from "react";
import type { MacroSnapshot } from "../../shared/models";
import { uiCopy } from "../lib/copy";
import { formatCalories, formatMacro } from "../lib/format";
import {
  buildMacroProgressRows,
  deriveMacroTargets,
  getCalorieProgress,
  getConfidenceDetails,
  type MacroGoalSnapshot,
  type MacroProgressRow,
} from "../lib/nutrition-visuals";
import "../styles/nutrition-visuals.css";

type RadialGoalRingProps = {
  currentCalories: number;
  goalCalories: number | null;
  className?: string;
};

type MacroProgressListProps = {
  macroTotals: MacroSnapshot;
  macroTargets: MacroGoalSnapshot | null;
};

type ConfidencePillProps = {
  confidence: number;
};

type DailySummaryCardProps = {
  currentCalories: number;
  goalCalories: number | null;
  mealCount: number;
  macroTotals: MacroSnapshot;
  missingProfileFields: string[];
  title?: string;
};

function ringMetrics(percentage: number) {
  const size = 220;
  const radius = 88;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;
  const progress = (circumference * percentage) / 100;

  return {
    size,
    radius,
    strokeWidth,
    circumference,
    progress,
  };
}

function clampToCanvas(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function RadialGoalRing({ currentCalories, goalCalories, className }: RadialGoalRingProps) {
  const ringId = useId();
  const progress = getCalorieProgress(currentCalories, goalCalories);
  const metrics = ringMetrics(clampToCanvas(progress.percent));
  const overGoal = Boolean(progress.overflowCalories && progress.overflowCalories > 0);
  const remaining = progress.hasGoal
    ? overGoal
      ? `+${formatCalories(progress.overflowCalories ?? 0)} über Ziel`
      : `${formatCalories(progress.remainingCalories ?? 0)} übrig`
    : null;

  return (
    <section className={["nutrition-ring", className].filter(Boolean).join(" ")}>
      <svg
        aria-hidden="true"
        className="nutrition-ring__svg"
        viewBox={`0 0 ${metrics.size} ${metrics.size}`}
      >
        <defs>
          <linearGradient id={`${ringId}-progress`} x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="var(--nutrition-ring-start)" />
            <stop offset="100%" stopColor="var(--nutrition-ring-end)" />
          </linearGradient>
          <linearGradient id={`${ringId}-overflow`} x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="var(--nutrition-fat)" />
            <stop offset="100%" stopColor="var(--nutrition-carbs)" />
          </linearGradient>
        </defs>
        <circle
          className="nutrition-ring__track"
          cx={metrics.size / 2}
          cy={metrics.size / 2}
          r={metrics.radius}
          strokeWidth={metrics.strokeWidth}
        />
        <circle
          className="nutrition-ring__progress"
          cx={metrics.size / 2}
          cy={metrics.size / 2}
          r={metrics.radius}
          stroke={overGoal ? `url(#${ringId}-overflow)` : `url(#${ringId}-progress)`}
          strokeDasharray={`${metrics.circumference} ${metrics.circumference}`}
          strokeDashoffset={metrics.circumference - metrics.progress}
          strokeWidth={metrics.strokeWidth}
        />
      </svg>
      <div className="nutrition-ring__center">
        <strong>{formatCalories(currentCalories)}</strong>
        {goalCalories ? (
          <span>von {formatCalories(goalCalories)}</span>
        ) : (
          <span>{uiCopy.summary.missingGoal}</span>
        )}
        {remaining ? <p>{remaining}</p> : null}
      </div>
    </section>
  );
}

export function MacroProgressList({ macroTotals, macroTargets }: MacroProgressListProps) {
  const rows = buildMacroProgressRows(macroTotals, macroTargets);

  return (
    <div className="macro-progress-list">
      {rows.map((row) => (
        <MacroProgressRow key={row.key} row={row} />
      ))}
    </div>
  );
}

function MacroProgressRow({ row }: { row: MacroProgressRow }) {
  const targetLabel = row.target ? `${Math.round(row.target)}g` : uiCopy.summary.noTarget;
  const currentLabel = formatMacro(row.current);
  const fillWidth = clampToCanvas(row.percent ?? 0);

  return (
    <article className="macro-progress-row">
      <div className="macro-progress-row__top">
        <span className="macro-progress-row__label" style={{ color: row.color }}>
          {row.label}
        </span>
        <span className="macro-progress-row__values">
          {currentLabel}
          {row.target ? <span className="macro-progress-row__goal"> / {targetLabel}</span> : null}
        </span>
      </div>
      <div className="macro-progress-row__track" aria-hidden="true">
        <span className="macro-progress-row__fill" style={{ background: row.color, width: `${fillWidth}%` }} />
      </div>
    </article>
  );
}

export function ConfidencePill({ confidence }: ConfidencePillProps) {
  const details = getConfidenceDetails(confidence);

  return (
    <span className={["confidence-pill", `confidence-pill--${details.tone}`].join(" ")}>
      {details.label}
    </span>
  );
}

export function DailySummaryCard({
  currentCalories,
  goalCalories,
  mealCount,
  macroTotals,
  missingProfileFields,
  title = uiCopy.summary.title,
}: DailySummaryCardProps) {
  const macroTargets = deriveMacroTargets(goalCalories);
  const subtitle = goalCalories
    ? `${formatCalories(currentCalories)} in ${mealCount} ${mealCount === 1 ? "Eintrag" : "Einträgen"}`
    : missingProfileFields.length
      ? `Ergänze ${missingProfileFields.join(", ")} im Profil.`
      : "Vervollständige dein Profil.";

  return (
    <section className="section-card daily-summary-card">
      <div className="daily-summary-card__header">
        <div className="daily-summary-card__titles">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {goalCalories ? (
          <div className="daily-summary-card__badge">
            {uiCopy.summary.targetPrefix} {formatCalories(goalCalories)}
          </div>
        ) : null}
      </div>

      <RadialGoalRing
        className="daily-summary-card__ring"
        currentCalories={currentCalories}
        goalCalories={goalCalories}
      />

      <MacroProgressList macroTargets={macroTargets} macroTotals={macroTotals} />
    </section>
  );
}
