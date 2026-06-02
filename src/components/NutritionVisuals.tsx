import { useEffect, useId, useState, useRef, type CSSProperties } from "react";
import { Target, Leaf, Droplet, Wheat } from "lucide-react";
import type { MacroSnapshot, UserProfile } from "../../shared/models";
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
import { getMascotMessage } from "../lib/mascot-messages";
import { getWinStreakDetails, WIN_STREAK_STAGES, type WinStreakStage } from "../lib/win-streak";
import { BottomSheet } from "./BottomSheet";
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
  missingProfileFields: string[];
  streakDays: number;
  title?: string;
};

function clampToCanvas(value: number) {
  return Math.max(0, Math.min(100, value));
}

function AcornBadgeIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={["win-streak-badge__icon", className].filter(Boolean).join(" ")}
      viewBox="0 0 48 48"
    >
      <circle className="win-streak-badge__halo" cx="24" cy="24" r="21.5" />
      <path
        className="win-streak-badge__frame"
        d="M24 4.5 40.9 14.2v19.6L24 43.5 7.1 33.8V14.2L24 4.5Z"
      />
      <path
        className="win-streak-badge__facet"
        d="M24 9.4 36.7 16.7v14.6L24 38.6 11.3 31.3V16.7L24 9.4Z"
      />
      <path
        className="win-streak-badge__cap"
        d="M16.4 22c.9-5.2 4.2-8.4 7.6-8.4s6.7 3.2 7.6 8.4c-3.2 1.6-6.1 1.8-7.6 1.8s-4.4-.2-7.6-1.8Z"
      />
      <path
        className="win-streak-badge__nut"
        d="M15.8 23.5c0-2 3.6-3.5 8.2-3.5s8.2 1.5 8.2 3.5c0 5.8-3.4 12.4-8.2 12.4s-8.2-6.6-8.2-12.4Z"
      />
      <path
        className="win-streak-badge__stem"
        d="M24.2 13.7c-.4-2.2.4-3.8 2.4-4.8"
      />
      <path className="win-streak-badge__shine" d="M18.8 25.4c1.6 1 4.7 1.2 7.7.4" />
    </svg>
  );
}

function CompactWinStreakBadge({
  badgeText,
  className,
  stage,
  progressPercent,
}: {
  badgeText: string;
  className?: string;
  stage: WinStreakStage;
  progressPercent: number;
}) {
  return (
    <div
      className={["win-streak", `win-streak--${stage.key}`, className].filter(Boolean).join(" ")}
      style={{ "--win-streak-progress": `${progressPercent}%` } as CSSProperties}
    >
      <div className="win-streak__copy">
        <strong className="win-streak__badge-text">{badgeText}</strong>
        <div className="win-streak__track" aria-hidden="true">
          <span className="win-streak__fill" />
        </div>
      </div>
      <AcornBadgeIcon />
    </div>
  );
}

function WinStreakBadgeGrid({
  selectedStageKey,
  setSelectedStageKey,
  streakDays,
}: {
  selectedStageKey: string;
  setSelectedStageKey: (stageKey: string) => void;
  streakDays: number;
}) {
  return (
    <div className="win-streak-grid" aria-label="Win-Streak Badges">
      {WIN_STREAK_STAGES.map((stage) => {
        const unlocked = streakDays >= stage.days;
        const selected = selectedStageKey === stage.key;

        return (
          <button
            aria-label={`${stage.title}, ${stage.days} Tage${unlocked ? "" : ", noch nicht freigeschaltet"}`}
            className={[
              "win-streak-grid__item",
              `win-streak--${stage.key}`,
              unlocked ? "is-unlocked" : "is-locked",
              selected ? "is-selected" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            key={stage.key}
            onClick={() => setSelectedStageKey(stage.key)}
            type="button"
          >
            <AcornBadgeIcon className="win-streak-grid__icon" />
          </button>
        );
      })}
    </div>
  );
}

function getStageProgress(streakDays: number, stage: WinStreakStage) {
  return Math.max(0, Math.min(1, streakDays / stage.days));
}

function getStageProgressText(streakDays: number, stage: WinStreakStage) {
  if (streakDays >= stage.days) {
    return "Freigeschaltet";
  }

  const missingDays = stage.days - streakDays;
  return `Noch ${missingDays} ${missingDays === 1 ? "Tag" : "Tage"}`;
}

function WinStreakBadge({ streakDays }: { streakDays: number }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const details = getWinStreakDetails(streakDays);
  const [selectedStageKey, setSelectedStageKey] = useState<string | null>(null);

  if (!details.currentStage || !details.badgeText) {
    return null;
  }

  const progressPercent = Math.round(details.progress * 100);
  const nextStageText = details.nextStage ? `Nächste Stufe: ${details.nextStage.days} Tage.` : "Höchste Stufe erreicht.";
  const selectedKey = selectedStageKey ?? details.currentStage.key;
  const selectedStage = WIN_STREAK_STAGES.find((stage) => stage.key === selectedKey) ?? details.currentStage;
  const selectedStageProgress = Math.round(getStageProgress(streakDays, selectedStage) * 100);
  const selectedStageProgressText = getStageProgressText(streakDays, selectedStage);

  return (
    <>
      <button
        aria-label={`Win-Streak öffnen. ${streakDays} Tage in Folge. ${details.badgeText}. ${nextStageText}`}
        className="win-streak-trigger"
        onClick={() => {
          setSelectedStageKey(details.currentStage!.key);
          setSheetOpen(true);
        }}
        type="button"
      >
        <CompactWinStreakBadge
          badgeText={details.badgeText}
          progressPercent={progressPercent}
          stage={details.currentStage}
        />
      </button>

      <BottomSheet
        onClose={() => setSheetOpen(false)}
        open={sheetOpen}
        title="Win-Streak"
      >
        <div className="win-streak-sheet">
          <div className={`win-streak-sheet__selected win-streak--${selectedStage.key}`}>
            <AcornBadgeIcon className="win-streak-sheet__selected-icon" />
            <div className="win-streak-sheet__selected-copy">
              <span>{selectedStage.title}</span>
              <strong>{selectedStage.days} Tage</strong>
              <div className="win-streak-sheet__selected-progress" aria-hidden="true">
                <span style={{ width: `${selectedStageProgress}%` }} />
              </div>
              <small>{selectedStageProgressText}</small>
            </div>
          </div>
          <WinStreakBadgeGrid
            selectedStageKey={selectedKey}
            setSelectedStageKey={setSelectedStageKey}
            streakDays={streakDays}
          />
        </div>
      </BottomSheet>
    </>
  );
}


function SquirrelAcornStatus({
  currentCalories,
  goalCalories,
}: {
  currentCalories: number;
  goalCalories: number | null;
}) {
  const [rainRun, setRainRun] = useState(0);
  const [messageSeed, setMessageSeed] = useState(() => Math.floor(Math.random() * 100));
  const [acorns, setAcorns] = useState<Array<{ id: number; left: number; size: number }>>([]);

  const intervalRef = useRef<number | null>(null);
  const stopTimeoutRef = useRef<number | null>(null);
  const nextIdRef = useRef(0);

  const progress = getCalorieProgress(currentCalories, goalCalories);
  const overGoal = Boolean(progress.overflowCalories && progress.overflowCalories > 0);
  const message = getMascotMessage(currentCalories, goalCalories, messageSeed);
  const squirrelSrc = overGoal ? "/mascots/squirrel-chubby.webp" : "/mascots/squirrel-thin.webp";

  useEffect(() => {
    if (!rainRun) {
      return;
    }

    if (intervalRef.current) window.clearInterval(intervalRef.current);
    if (stopTimeoutRef.current) window.clearTimeout(stopTimeoutRef.current);

    const spawnAcorn = () => {
      const id = nextIdRef.current++;
      const left = 20 + Math.random() * 60; // 20% to 80%
      const size = 1 + Math.random() * 1; // 1rem to 2rem
      setAcorns((prev) => [...prev, { id, left, size }]);

      window.setTimeout(() => {
        setAcorns((prev) => prev.filter((a) => a.id !== id));
      }, 800);
    };

    spawnAcorn();
    intervalRef.current = window.setInterval(spawnAcorn, 80);

    stopTimeoutRef.current = window.setTimeout(() => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, 3200);

    const mainTimeout = window.setTimeout(() => setRainRun(0), 3900);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (stopTimeoutRef.current) window.clearTimeout(stopTimeoutRef.current);
      window.clearTimeout(mainTimeout);
    };
  }, [rainRun]);

  const percent = progress.hasGoal && goalCalories ? (currentCalories / goalCalories) * 100 : 0;
  let headerClass = "mascot-message__header";
  if (percent > 115) {
    headerClass += " mascot-message__header--danger";
  } else if (percent > 102) {
    headerClass += " mascot-message__header--warning";
  }

  return (
    <div className="mascot-layout">
      {/* 1. Speech bubble at the top (full-width) */}
      <div className="mascot-bubble">
        <div className="mascot-message">
          <div className={headerClass}>
            <Leaf className="mascot-message__icon" size={13} aria-hidden="true" />
            <span>{message.header}</span>
          </div>
          <p className="mascot-message__text">
            {message.fullText ? (
              message.fullText
            ) : (
              <>
                {message.prefix}
                <strong>{message.boldText}</strong>
                {message.suffix}
              </>
            )}
          </p>
        </div>
        <div className="mascot-bubble__arrow" />
      </div>

      {/* 2. Bottom row: ring on the left, squirrel on the right */}
      <div className="mascot-bottom-row">
        <div className="mascot-ring-wrapper">
          <RadialGoalRing
            className="daily-summary-card__ring"
            currentCalories={currentCalories}
            goalCalories={goalCalories}
          />
        </div>

        <div className="mascot-character-wrapper">
          <button
            aria-label={uiCopy.summary.rainAcorns}
            className={[
              "squirrel-status",
              overGoal ? "squirrel-status--over" : "squirrel-status--under",
              rainRun ? "squirrel-status--celebrating" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => {
              setRainRun((current) => current + 1);
              setMessageSeed((current) => current + 1);
            }}
            type="button"
          >
            <img
              alt={overGoal ? uiCopy.summary.chubbySquirrel : uiCopy.summary.thinSquirrel}
              className="squirrel-status__image"
              src={squirrelSrc}
            />
          </button>

          {acorns.map((a) => (
            <img
              key={a.id}
              src="/mascots/acorn.webp"
              alt=""
              className="animate-acorn"
              style={{
                left: `${a.left}%`,
                width: `${a.size}rem`,
                height: "auto",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function RadialGoalRing({ currentCalories, goalCalories, className }: RadialGoalRingProps) {
  const ringId = useId();
  const progress = getCalorieProgress(currentCalories, goalCalories);
  const size = 220;
  const strokeWidth = 14;
  const squirclePerimeter = 659.292;
  const progressPercent = clampToCanvas(progress.percent);
  const progressOffset = squirclePerimeter - (squirclePerimeter * progressPercent) / 100;
  const overGoal = Boolean(progress.overflowCalories && progress.overflowCalories > 0);

  return (
    <section className={["nutrition-ring", className].filter(Boolean).join(" ")}>
      <svg
        aria-hidden="true"
        className="nutrition-ring__svg"
        viewBox={`0 0 ${size} ${size}`}
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
        <path
          className="nutrition-ring__track"
          d="M 110 16 L 150 16 A 54 54 0 0 1 204 70 L 204 150 A 54 54 0 0 1 150 204 L 70 204 A 54 54 0 0 1 16 150 L 16 70 A 54 54 0 0 1 70 16 Z"
          strokeWidth={strokeWidth}
        />
        <path
          className="nutrition-ring__progress"
          d="M 110 16 L 150 16 A 54 54 0 0 1 204 70 L 204 150 A 54 54 0 0 1 150 204 L 70 204 A 54 54 0 0 1 16 150 L 16 70 A 54 54 0 0 1 70 16 Z"
          stroke={overGoal ? `url(#${ringId}-overflow)` : `url(#${ringId}-progress)`}
          strokeDasharray={`${squirclePerimeter} ${squirclePerimeter}`}
          strokeDashoffset={progressOffset}
          strokeWidth={strokeWidth}
        />
      </svg>
      <div className="nutrition-ring__center">
        <strong className="nutrition-ring__eaten-value">{Math.round(currentCalories)}</strong>
        <span className="nutrition-ring__eaten-label">kcal gegessen</span>

        {goalCalories ? (
          <>
            <hr className="nutrition-ring__divider" aria-hidden="true" />
            <span className={`nutrition-ring__remaining-value ${overGoal ? "is-over" : ""}`}>
              {overGoal
                ? `+${Math.round(progress.overflowCalories ?? 0)}`
                : `${Math.round(progress.remainingCalories ?? 0)}`}
            </span>
            <span className="nutrition-ring__remaining-label">
              {overGoal ? "kcal drüber" : "kcal übrig"}
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
  if (row.key === "fat") {
    Icon = Droplet;
  } else if (row.key === "carbs") {
    Icon = Wheat;
  }

  const currentVal = Math.round(row.current * 10) / 10;
  const targetVal = row.target ? Math.round(row.target) : null;
  const percentage = row.percent !== null ? Math.round(row.percent) : null;

  return (
    <article className="macro-progress-row">
      <div className="macro-progress-row__top-card">
        <Icon size={13} style={{ color: row.color }} aria-hidden="true" />
        <span className="macro-progress-row__label" style={{ color: row.color }}>
          {row.label}
        </span>
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
          <span className={`macro-progress-row__fill macro-progress-row__fill--${row.key}`} style={{ width: `${fillWidth}%` }} />
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
  missingProfileFields,
  streakDays,
  title = uiCopy.summary.title,
}: Omit<DailySummaryCardProps, "macroTotals">) {
  const subtitle = goalCalories
    ? null
    : missingProfileFields.length
      ? `Ergänze ${missingProfileFields.join(", ")} im Profil.`
      : "Vervollständige dein Profil.";

  return (
    <section className="section-card daily-summary-card">
      <div className="daily-summary-card__header">
        <div className="daily-summary-card__titles">
          <div className="daily-summary-card__title-row">
            <h1>{title}</h1>
          </div>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {goalCalories ? (
          <div className="daily-summary-card__badge">
            <Target className="daily-summary-card__badge-icon" size={14} aria-hidden="true" />
            <span>Tagesziel: {formatCalories(goalCalories)}</span>
          </div>
        ) : null}
      </div>

      <WinStreakBadge streakDays={streakDays} />

      <div className="daily-summary-card__hero">
        <SquirrelAcornStatus currentCalories={currentCalories} goalCalories={goalCalories} />
      </div>
    </section>
  );
}

export function MacroSummaryCard({
  macroTotals,
  goalCalories,
  profile,
}: {
  macroTotals: MacroSnapshot;
  goalCalories: number | null;
  profile?: UserProfile | null;
}) {
  const macroTargets = deriveMacroTargets(goalCalories, profile);
  return (
    <section className="section-card macro-summary-card">
      <MacroProgressList macroTargets={macroTargets} macroTotals={macroTotals} />
    </section>
  );
}
