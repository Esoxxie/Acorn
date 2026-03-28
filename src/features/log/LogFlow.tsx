import { Camera, Star, Wand2 } from "lucide-react";
import { createContext, useContext, useEffect, useState, type ChangeEvent, type PropsWithChildren } from "react";
import type { MealEstimate, MealRecord } from "../../../shared/models";
import { useAppData, useAuth } from "../../app/contexts";
import { BottomSheet } from "../../components/BottomSheet";
import { ConfidencePill } from "../../components/NutritionVisuals";
import { uiCopy } from "../../lib/copy";
import { appEnv } from "../../lib/env";
import { getCallableErrorMessage } from "../../lib/callable-error";
import { analyzeEntry } from "../../lib/firebase";
import { createDemoEstimate } from "../../lib/demo-estimate";
import { formatCalories, formatMacro } from "../../lib/format";
import { prepareImageAssets, releasePreparedImageAssets, type PreparedImageAssets } from "../../lib/image";
import { createMealSnapshot } from "../../../shared/calorie";
import { resolveStorageUrl } from "../../lib/storage";
import "../../styles/meal-surfaces.css";

type FlowStep = "composer" | "estimate" | "refine";

type LogFlowContextValue = {
  openLogFlow: () => void;
  openEditMeal: (meal: MealRecord) => void;
};

const LogFlowContext = createContext<LogFlowContextValue | null>(null);

async function getEstimate(input: {
  mode: "photo" | "manual_ai";
  imageBase64?: string;
  mimeType?: string;
  manualText?: string;
  userContext?: string;
  priorEstimate?: MealEstimate;
  refinementAnswers?: Record<string, string>;
}, useDemoEstimator: boolean) {
  if (useDemoEstimator) {
    return { data: createDemoEstimate(input) };
  }

  return analyzeEntry(input);
}

function getErrorMessage(error: unknown): string {
  return getCallableErrorMessage(
    error,
    uiCopy.logFlow.genericError,
  );
}

function mealToEstimate(meal: MealRecord): MealEstimate {
  return {
    mealTitle: meal.mealTitle,
    summary: meal.summary,
    items: meal.items,
    calories: meal.calories,
    macros: meal.macros,
    confidence: meal.confidence,
    assumptions: meal.assumptions,
    refinementQuestions: [],
  };
}

export function LogFlowProvider({ children }: PropsWithChildren) {
  const { saveMeal, updateMeal } = useAppData();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<MealRecord | null>(null);
  const [step, setStep] = useState<FlowStep>("composer");
  const [file, setFile] = useState<File | null>(null);
  const [preparedAssets, setPreparedAssets] = useState<PreparedImageAssets | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [entryText, setEntryText] = useState("");
  const [estimate, setEstimate] = useState<MealEstimate | null>(null);
  const [refinementAnswers, setRefinementAnswers] = useState<Record<string, string>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      releasePreparedImageAssets(preparedAssets);
    };
  }, [preparedAssets]);

  function resetState() {
    releasePreparedImageAssets(preparedAssets);
    setEditingMeal(null);
    setStep("composer");
    setFile(null);
    setPreparedAssets(null);
    setExistingPhotoUrl(null);
    setEntryText("");
    setEstimate(null);
    setRefinementAnswers({});
    setAnalyzing(false);
    setSaving(false);
    setError(null);
  }

  function openLogFlow() {
    resetState();
    setOpen(true);
  }

  function openEditMeal(meal: MealRecord) {
    resetState();
    setEditingMeal(meal);
    setEntryText(meal.transcript ?? meal.userContext ?? meal.summary ?? meal.mealTitle);
    setEstimate(mealToEstimate(meal));
    setStep("estimate");
    setOpen(true);
  }

  function closeLogFlow() {
    setOpen(false);
    resetState();
  }

  useEffect(() => {
    if (!editingMeal?.photo?.thumbPath) {
      setExistingPhotoUrl(null);
      return;
    }

    let cancelled = false;

    void resolveStorageUrl(editingMeal.photo.thumbPath)
      .then((url) => {
        if (!cancelled) {
          setExistingPhotoUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setExistingPhotoUrl(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [editingMeal?.photo?.thumbPath]);

  async function analyzeCurrentEntry() {
    if (!file && !entryText.trim()) {
      setError(uiCopy.logFlow.emptyEntry);
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      let assets = preparedAssets;
      if (file) {
        assets = assets ?? (await prepareImageAssets(file));
        setPreparedAssets(assets);
      }

      const response = await getEstimate({
        mode: file ? "photo" : "manual_ai",
        imageBase64: assets?.imageBase64,
        mimeType: assets?.mimeType,
        manualText: file ? undefined : entryText.trim(),
        userContext: file ? entryText.trim() || undefined : undefined,
      }, appEnv.usingDemoConfig || Boolean(user?.isDemo));

      setEstimate(response.data);
      setStep("estimate");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setAnalyzing(false);
    }
  }

  async function applyRefinement() {
    if (!estimate) {
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const response = await getEstimate({
        mode: file ? "photo" : "manual_ai",
        imageBase64: preparedAssets?.imageBase64,
        mimeType: preparedAssets?.mimeType,
        manualText: file ? undefined : entryText.trim() || undefined,
        userContext: file ? entryText.trim() || undefined : undefined,
        priorEstimate: estimate,
        refinementAnswers,
      }, appEnv.usingDemoConfig || Boolean(user?.isDemo));

      setEstimate(response.data);
      setStep("estimate");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setAnalyzing(false);
    }
  }

  async function saveCurrentMeal() {
    if (!estimate) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingMeal) {
        await updateMeal(editingMeal, {
          source: file ? "photo" : editingMeal.source ?? "manual_ai",
          mealTitle: estimate.mealTitle,
          summary: estimate.summary,
          confidence: estimate.confidence,
          assumptions: estimate.assumptions,
          photoAssets: file ? preparedAssets : undefined,
          userContext: file ? entryText.trim() || null : null,
          transcript: entryText.trim() || null,
          baseSnapshot: createMealSnapshot(estimate),
        });
      } else {
        await saveMeal({
          source: file ? "photo" : "manual_ai",
          estimate,
          photoAssets: file ? preparedAssets : undefined,
          userContext: file ? entryText.trim() || null : null,
          transcript: entryText.trim() || null,
        });
      }

      closeLogFlow();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;

    releasePreparedImageAssets(preparedAssets);
    setPreparedAssets(null);
    setFile(nextFile);
    setError(null);

    if (!nextFile) {
      return;
    }

    try {
      const assets = await prepareImageAssets(nextFile);
      setPreparedAssets(assets);
    } catch (caughtError) {
      setFile(null);
      setError(getErrorMessage(caughtError));
    } finally {
      event.target.value = "";
    }
  }

  function renderComposer() {
    const previewUrl = preparedAssets?.previewUrl ?? existingPhotoUrl;

    return (
      <div className="stack">
        <div className="photo-picker">
          {previewUrl ? (
            <img alt={uiCopy.logFlow.mealPreview} className="photo-picker__image" src={previewUrl} />
          ) : (
            <div className="photo-picker__placeholder">
              <Camera size={28} />
              <span>{uiCopy.logFlow.addPhoto}</span>
            </div>
          )}
        </div>

        <div className="chip-wrap">
          <label className="pill-button">
            {uiCopy.logFlow.takePhoto}
            <input
              accept="image/*"
              capture="environment"
              hidden
              onChange={(event) => void handlePhotoChange(event)}
              type="file"
            />
          </label>
          <label className="pill-button">
            {uiCopy.logFlow.chooseLibrary}
            <input
              accept="image/*"
              hidden
              onChange={(event) => void handlePhotoChange(event)}
              type="file"
            />
          </label>
        </div>

        <div className="context-field">
          <textarea
            id="entry-text"
            onChange={(event) => setEntryText(event.target.value)}
            placeholder={uiCopy.logFlow.entryPlaceholder}
            rows={4}
            value={entryText}
          />
        </div>

        <div className="sheet__actions">
          <button className="primary-button" disabled={analyzing} onClick={() => void analyzeCurrentEntry()} type="button">
            {analyzing ? uiCopy.logFlow.estimating : uiCopy.logFlow.estimateAction}
          </button>
        </div>
      </div>
    );
  }

  function renderEstimateStep() {
    if (!estimate) {
      return null;
    }

    const previewUrl = preparedAssets?.previewUrl ?? existingPhotoUrl;

    return (
      <div className="stack">
        {previewUrl ? (
          <img alt={uiCopy.logFlow.mealPreview} className="estimate-hero" src={previewUrl} />
        ) : null}

        <section className="estimate-card">
          <div className="estimate-card__header">
            <div>
              <h3>{estimate.mealTitle}</h3>
              <p>{estimate.summary}</p>
            </div>
            <div className="estimate-card__kcal">
              <strong>{formatCalories(estimate.calories)}</strong>
            </div>
          </div>

          <div className="macro-row">
            <span className="macro-pill macro-pill--protein">P {formatMacro(estimate.macros.protein)}</span>
            <span className="macro-pill macro-pill--carbs">C {formatMacro(estimate.macros.carbs)}</span>
            <span className="macro-pill macro-pill--fat">F {formatMacro(estimate.macros.fat)}</span>
          </div>

          <div className="chip-wrap">
            <ConfidencePill confidence={estimate.confidence} />
          </div>

          {estimate.assumptions.length ? (
            <div className="stack">
              <p className="status-text">{uiCopy.logFlow.assumptions}</p>
              {estimate.assumptions.map((assumption) => (
                <div className="estimate-item" key={assumption}>
                  <div>
                    <strong>{assumption}</strong>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="estimate-card__items">
            {estimate.items.map((item) => (
              <div className="estimate-item" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.portion}</span>
                </div>
                <span>{formatCalories(item.calories)}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="sheet__actions">
          <button className="secondary-button" onClick={() => setStep("composer")} type="button">
            {uiCopy.logFlow.back}
          </button>
          {estimate.refinementQuestions.length ? (
            <button className="secondary-button" onClick={() => setStep("refine")} type="button">
              <Wand2 size={18} />
              {uiCopy.logFlow.refine}
            </button>
          ) : null}
          <button className="primary-button" disabled={saving} onClick={() => void saveCurrentMeal()} type="button">
            <Star size={18} />
            {saving ? uiCopy.logFlow.saving : uiCopy.logFlow.save}
          </button>
        </div>
      </div>
    );
  }

  function renderRefineStep() {
    if (!estimate) {
      return null;
    }

    return (
      <div className="stack">
        {estimate.refinementQuestions.map((question) => (
          <section className="section-card" key={question.id}>
            <div className="section-card__header">
              <h3>{question.label}</h3>
            </div>
            <div className="chip-wrap">
              {question.options.map((option) => (
                <button
                  className={`chip ${refinementAnswers[question.id] === option.id ? "chip--selected" : ""}`}
                  key={option.id}
                  onClick={() =>
                    setRefinementAnswers((current) => ({
                      ...current,
                      [question.id]: option.id,
                    }))
                  }
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>
        ))}

        <div className="sheet__actions">
          <button className="secondary-button" onClick={() => setStep("estimate")} type="button">
            {uiCopy.logFlow.back}
          </button>
          <button className="primary-button" disabled={analyzing} onClick={() => void applyRefinement()} type="button">
            {analyzing ? uiCopy.logFlow.updating : uiCopy.logFlow.update}
          </button>
        </div>
      </div>
    );
  }

  return (
    <LogFlowContext.Provider value={{ openLogFlow, openEditMeal }}>
      {children}
      <BottomSheet
        onClose={closeLogFlow}
        open={open}
        title={
          editingMeal
            ? step === "composer"
              ? uiCopy.logFlow.editEntry
              : step === "refine"
                ? uiCopy.logFlow.refine
                : uiCopy.logFlow.reviewEdit
            : step === "composer"
              ? uiCopy.logFlow.addEntry
              : step === "refine"
                ? uiCopy.logFlow.refine
                : uiCopy.logFlow.estimate
        }
      >
        {error ? <div className="inline-error">{error}</div> : null}
        {step === "composer" ? renderComposer() : null}
        {step === "estimate" ? renderEstimateStep() : null}
        {step === "refine" ? renderRefineStep() : null}
      </BottomSheet>
    </LogFlowContext.Provider>
  );
}

export function useLogFlow() {
  const value = useContext(LogFlowContext);
  if (!value) {
    throw new Error("useLogFlow must be used within LogFlowProvider.");
  }

  return value;
}
