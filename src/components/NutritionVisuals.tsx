import { Flame } from "lucide-react";
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
  title: string;
  subtitle: string;
  className?: string;
};

type CompactProgressDonutProps = {
  percentage: number;
  label: string;
  detail: string;
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

export function RadialGoalRing({ currentCalories, goalCalories, subtitle, title, className }: RadialGoalRingProps) {
  const ringId = useId();
  const progress = getCalorieProgress(currentCalories, goalCalories);
  const metrics = ringMetrics(progress.percent);
  const overGoal = Boolean(progress.overflowCalories && progress.overflowCalories > 0);
  const label = goalCalories ? `${formatCalories(goalCalories)}` : uiCopy.summary.missingGoal;
  const ringSubtitle = progress.hasGoal
    ? progress.overflowCalories && progress.overflowCalories > 0
      ? `${formatCalories(progress.overflowCalories)} ueber dem Ziel`
      : progress.remainingCalories != null
        ? `${formatCalories(progress.remainingCalories)} uebrig`
        : subtitle
    : subtitle;

  return (
    <section className={["nutrition-ring", className].filter(Boolean).join(" ")}>
      <svg
        aria-hidden="true"
        className="nutrition-ring__svg"
        height={metrics.size}
        viewBox={`0 0 ${metrics.size} ${metrics.size}`}
        width={metrics.size}
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
        <div className="nutrition-ring__eyebrow">
          <Flame size={14} />
          <span>{title}</span>
        </div>
        <strong>{formatCalories(currentCalories)}</strong>
        <span>{label}</span>
        <p>{ringSubtitle}</p>
      </div>
    </section>
  );
}

export function CompactProgressDonut({ percentage, detail, label, className }: CompactProgressDonutProps) {
  const ringId = useId();
  const size = 84;
  const radius = 30;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const progress = (circumference * clampToCanvas(percentage)) / 100;

  return (
    <div className={["compact-donut", className].filter(Boolean).join(" ")}>
      <svg aria-hidden="true" className="compact-donut__svg" height={size} viewBox={`0 0 ${size} ${size}`} width={size}>
        <defs>
          <linearGradient id={`${ringId}-donut`} x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="var(--nutrition-ring-start)" />
            <stop offset="100%" stopColor="var(--nutrition-ring-end)" />
          </linearGradient>
        </defs>
        <circle className="compact-donut__track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
        <circle
          className="compact-donut__progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${ringId}-donut)`}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference - progress}
          strokeWidth={strokeWidth}
        />
      </svg>
      <div className="compact-donut__center">
        <strong>{Math.round(percentage)}%</strong>
        <span>{label}</span>
      </div>
      <p className="compact-donut__detail">{detail}</p>
    </div>
  );
}

function clampToCanvas(value: number) {
  return Math.max(0, Math.min(100, value));
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
  const fillWidth = row.percent ?? 0;

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
}: DailySummaryCardProps) {
  const calorieProgress = getCalorieProgress(currentCalories, goalCalories);
  const macroTargets = deriveMacroTargets(goalCalories);
  const explanation = goalCalories
    ? calorieProgress.overflowCalories && calorieProgress.overflowCalories > 0
      ? `${formatCalories(calorieProgress.overflowCalories)} ueber deinem Tagesziel`
      : `${formatCalories(calorieProgress.remainingCalories ?? 0)} bis zum Tagesziel uebrig`
    : missingProfileFields.length
      ? `Ergaenze ${missingProfileFields.join(", ")}, damit wir dein Kalorienziel berechnen koennen`
      : "Vervollstaendige dein Profil, damit wir dein Kalorienziel berechnen koennen.";
  const summaryDetail = goalCalories
    ? `${formatCalories(currentCalories)} in ${mealCount} ${mealCount === 1 ? "Eintrag" : "Eintraegen"}`
    : missingProfileFields.length
      ? `Trage ${missingProfileFields.join(", ")} ein, um dein Kalorienziel freizuschalten.`
      : "Vervollstaendige dein Profil, um dein Kalorienziel freizuschalten.";

  return (
    <section className="section-card daily-summary-card">
      <div className="daily-summary-card__header">
        <div className="daily-summary-card__titles">
          <span className="daily-summary-card__eyebrow">{uiCopy.summary.eyebrow}</span>
          <h1>{uiCopy.summary.title}</h1>
          <p>{summaryDetail}</p>
        </div>
        <div className="daily-summary-card__badge">
          {goalCalories ? `${uiCopy.summary.targetPrefix} ${formatCalories(goalCalories)}` : uiCopy.summary.targetUnavailable}
        </div>
      </div>

      <RadialGoalRing
        className="daily-summary-card__ring"
        currentCalories={currentCalories}
        goalCalories={goalCalories}
        subtitle={explanation}
        title={goalCalories ? uiCopy.summary.consumed : uiCopy.summary.completeProfile}
      />

      <div className="daily-summary-card__story">
        <CompactProgressDonut
          detail={
            goalCalories
              ? `${calorieProgress.percent.toFixed(0)}% deines Budgets sind verbraucht`
              : "Ergaenze dein Profil fuer ein Tagesbudget."
          }
          label={uiCopy.summary.budget}
          percentage={goalCalories ? calorieProgress.percent : 0}
        />
        <div className="daily-summary-card__story-copy">
          <strong>
            {goalCalories
              ? `${formatCalories(currentCalories)} verbraucht`
              : "Alter, Geschlecht, Groesse, Gewicht und Aktivitaet ergaenzen"}
          </strong>
          <p>
            {goalCalories
              ? explanation
              : "Sobald dein Profil vollstaendig ist, berechnen wir automatisch dein Kalorienziel und die Makros."}
          </p>
        </div>
      </div>

      <MacroProgressList macroTargets={macroTargets} macroTotals={macroTotals} />
    </section>
  );
}
