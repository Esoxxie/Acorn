import { useEffect, useId, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Target, Leaf, Droplet, Wheat } from "lucide-react";
import type { MacroSnapshot } from "../../shared/models";
import { uiCopy } from "../lib/copy";
import { formatCalories } from "../lib/format";
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

const acornRainDrops = Array.from({ length: 60 }, (_, index) => {
  const layer = index % 3; // 0: background, 1: midground, 2: foreground
  let size = 24;
  let duration = "2.5s";
  let opacity = 1.0;
  let blur = "0px";
  let zIndex = 70;

  if (layer === 0) {
    size = 12 + (index % 8); // 12px to 19px
    duration = `${2.8 + (index % 5) * 0.3}s`; // 2.8s to 4.0s
    opacity = 0.55;
    zIndex = 65;
  } else if (layer === 1) {
    size = 22 + (index % 8); // 22px to 29px
    duration = `${2.0 + (index % 5) * 0.2}s`; // 2.0s to 2.8s
    opacity = 0.95;
    zIndex = 70;
  } else {
    size = 34 + (index % 10); // 34px to 43px
    duration = `${1.2 + (index % 4) * 0.15}s`; // 1.2s to 1.65s
    opacity = 0.9;
    blur = "2px";
    zIndex = 80;
  }

  const delay = `${(index * 35) % 1500}ms`;
  const left = `${1 + (index * 17) % 98}%`;
  const rotateStart = `${(index * 47) % 360}deg`;
  const rotateSpeed = `${180 + (index % 3) * 90}deg`;
  const drift = `${(index % 2 === 0 ? 1 : -1) * (15 + (index * 13) % 45)}px`;

  return {
    delay,
    duration,
    left,
    size: `${size}px`,
    opacity,
    blur,
    zIndex,
    rotateStart,
    rotateSpeed,
    drift,
  };
});

function SquirrelAcornStatus({
  currentCalories,
  goalCalories,
}: {
  currentCalories: number;
  goalCalories: number | null;
}) {
  const [rainRun, setRainRun] = useState(0);
  const progress = getCalorieProgress(currentCalories, goalCalories);
  const overGoal = Boolean(progress.overflowCalories && progress.overflowCalories > 0);
  const squirrelSrc = overGoal ? "/mascots/squirrel-chubby.webp" : "/mascots/squirrel-thin.webp";

  useEffect(() => {
    if (!rainRun) {
      return;
    }

    const timeout = window.setTimeout(() => setRainRun(0), 4500);
    return () => window.clearTimeout(timeout);
  }, [rainRun]);

  return (
    <div className="squirrel-container">
      <div className="squirrel-bubble">
        <div className="squirrel-bubble__header">
          <Leaf className="squirrel-bubble__icon" size={14} aria-hidden="true" />
          <span>{overGoal ? "Ziel erreicht!" : "Du machst das super!"}</span>
        </div>
        <p className="squirrel-bubble__text">
          {progress.hasGoal ? (
            overGoal ? (
              <>
                <strong>{formatCalories(progress.overflowCalories ?? 0)}</strong> über deinem Ziel.
              </>
            ) : (
              <>
                Noch <strong>{formatCalories(progress.remainingCalories ?? 0)}</strong> bis zu deinem Ziel.
              </>
            )
          ) : (
            "Trage dein Tagesziel ein, um zu starten."
          )}
        </p>
        <div className="squirrel-bubble__arrow" />
      </div>

      <button
        aria-label={uiCopy.summary.rainAcorns}
        className={["squirrel-status", overGoal ? "squirrel-status--over" : "squirrel-status--under"].join(" ")}
        onClick={() => setRainRun((current) => current + 1)}
        type="button"
      >
        <img
          alt={overGoal ? uiCopy.summary.chubbySquirrel : uiCopy.summary.thinSquirrel}
          className="squirrel-status__image"
          src={squirrelSrc}
        />
      </button>
      {rainRun ? createPortal(
        <span aria-hidden="true" className="acorn-rain" key={rainRun}>
          {acornRainDrops.map((drop, index) => (
            <img
              alt=""
              className="acorn-rain__drop"
              key={`${rainRun}-${index}`}
              src="/mascots/acorn.webp"
              style={
                {
                  "--drop-delay": drop.delay,
                  "--drop-duration": drop.duration,
                  "--drop-left": drop.left,
                  "--drop-size": drop.size,
                  "--drop-opacity": drop.opacity,
                  "--drop-blur": drop.blur,
                  "--drop-zindex": drop.zIndex,
                  "--drop-rotate-start": drop.rotateStart,
                  "--drop-rotate-speed": drop.rotateSpeed,
                  "--drop-drift": drop.drift,
                } as CSSProperties
              }
            />
          ))}
        </span>,
        document.body
      ) : null}
    </div>
  );
}

export function RadialGoalRing({ currentCalories, goalCalories, className }: RadialGoalRingProps) {
  const ringId = useId();
  const progress = getCalorieProgress(currentCalories, goalCalories);
  const metrics = ringMetrics(clampToCanvas(progress.percent));
  const overGoal = Boolean(progress.overflowCalories && progress.overflowCalories > 0);

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
        <strong className="nutrition-ring__eaten-value">{Math.round(currentCalories)}</strong>
        <span className="nutrition-ring__eaten-label">kcal gegessen</span>

        {goalCalories ? (
          <>
            <hr className="nutrition-ring__divider" aria-hidden="true" />
            <span className="nutrition-ring__remaining-value">
              {overGoal
                ? `+${Math.round(progress.overflowCalories ?? 0)} kcal`
                : `${Math.round(progress.remainingCalories ?? 0)} kcal`}
            </span>
            <span className="nutrition-ring__remaining-label">
              {overGoal ? "über Ziel" : "übrig"}
            </span>
          </>
        ) : (
          <>
            <hr className="nutrition-ring__divider" aria-hidden="true" />
            <span className="nutrition-ring__remaining-label">{uiCopy.summary.missingGoal}</span>
          </>
        )}
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
  const fillWidth = clampToCanvas(row.percent ?? 0);

  let Icon = Leaf;
  let iconClass = "macro-progress-row__icon-container--protein";
  if (row.key === "fat") {
    Icon = Droplet;
    iconClass = "macro-progress-row__icon-container--fat";
  } else if (row.key === "carbs") {
    Icon = Wheat;
    iconClass = "macro-progress-row__icon-container--carbs";
  }

  const currentVal = Math.round(row.current * 10) / 10;
  const targetVal = row.target ? Math.round(row.target) : null;
  const percentage = row.percent !== null ? Math.round(row.percent) : null;

  return (
    <article className="macro-progress-row">
      <div className="macro-progress-row__top-card">
        <span className="macro-progress-row__label" style={{ color: row.color }}>
          {row.label}
        </span>
        <div className={["macro-progress-row__icon-container", iconClass].join(" ")}>
          <Icon size={14} aria-hidden="true" />
        </div>
      </div>

      <div className="macro-progress-row__value-section">
        <strong className="macro-progress-row__current-value">
          {currentVal} <span className="macro-progress-row__g-unit">g</span>
        </strong>
        {targetVal ? (
          <div className="macro-progress-row__target-value">
            / {targetVal} g Ziel
          </div>
        ) : null}
      </div>

      <div className="macro-progress-row__progress-section">
        <div className="macro-progress-row__track" aria-hidden="true">
          <span className="macro-progress-row__fill" style={{ background: row.color, width: `${fillWidth}%` }} />
        </div>
        {percentage !== null ? (
          <span className="macro-progress-row__percent" style={{ color: row.color }}>
            {percentage} %
          </span>
        ) : null}
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
    ? `${mealCount} ${mealCount === 1 ? "Eintrag" : "Einträge"}`
    : missingProfileFields.length
      ? `Ergänze ${missingProfileFields.join(", ")} im Profil.`
      : "Vervollständige dein Profil.";

  return (
    <section className="section-card daily-summary-card">
      <div className="daily-summary-card__header">
        <div className="daily-summary-card__titles">
          <div className="daily-summary-card__title-row">
            <h1>{title}</h1>
            <CalendarDays className="daily-summary-card__calendar-icon" size={18} aria-hidden="true" />
          </div>
          <p>{subtitle}</p>
        </div>
        {goalCalories ? (
          <div className="daily-summary-card__badge">
            <Target className="daily-summary-card__badge-icon" size={14} aria-hidden="true" />
            <span>Tagesziel: {formatCalories(goalCalories)}</span>
          </div>
        ) : null}
      </div>

      <div className="daily-summary-card__hero">
        <RadialGoalRing
          className="daily-summary-card__ring"
          currentCalories={currentCalories}
          goalCalories={goalCalories}
        />
        <SquirrelAcornStatus currentCalories={currentCalories} goalCalories={goalCalories} />
      </div>

      <MacroProgressList macroTargets={macroTargets} macroTotals={macroTotals} />
    </section>
  );
}
