import { Camera, Star, Wand2 } from "lucide-react";
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import type { MealEstimate } from "../../../shared/models";
import { useAppData } from "../../app/contexts";
import { BottomSheet } from "../../components/BottomSheet";
import { appEnv } from "../../lib/env";
import { analyzeEntry } from "../../lib/firebase";
import { createDemoEstimate } from "../../lib/demo-estimate";
import { formatCalories, formatMacro } from "../../lib/format";
import { prepareImageAssets, releasePreparedImageAssets, type PreparedImageAssets } from "../../lib/image";

type FlowStep = "composer" | "estimate" | "refine";

type LogFlowContextValue = {
  openLogFlow: () => void;
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
}) {
  if (appEnv.usingDemoConfig) {
    return { data: createDemoEstimate(input) };
  }

  return analyzeEntry(input);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export function LogFlowProvider({ children }: PropsWithChildren) {
  const { saveMeal } = useAppData();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<FlowStep>("composer");
  const [file, setFile] = useState<File | null>(null);
  const [preparedAssets, setPreparedAssets] = useState<PreparedImageAssets | null>(null);
  const [entryText, setEntryText] = useState("");
  const [estimate, setEstimate] = useState<MealEstimate | null>(null);
  const [refinementAnswers, setRefinementAnswers] = useState<Record<string, string>>({});
  const [favoriteOnSave, setFavoriteOnSave] = useState(false);
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
    setStep("composer");
    setFile(null);
    setPreparedAssets(null);
    setEntryText("");
    setEstimate(null);
    setRefinementAnswers({});
    setFavoriteOnSave(false);
    setAnalyzing(false);
    setSaving(false);
    setError(null);
  }

  function openLogFlow() {
    resetState();
    setOpen(true);
  }

  function closeLogFlow() {
    setOpen(false);
    resetState();
  }

  async function analyzeCurrentEntry() {
    if (!file && !entryText.trim()) {
      setError("Add a photo or write what you ate.");
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
      });

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
      });

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
      await saveMeal({
        source: file ? "photo" : "manual_ai",
        estimate,
        photoAssets: preparedAssets,
        userContext: file ? entryText.trim() || null : null,
        transcript: entryText.trim() || null,
        favorite: favoriteOnSave,
      });
      closeLogFlow();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setSaving(false);
    }
  }

  function renderComposer() {
    return (
      <div className="stack">
        <label className="photo-picker">
          {preparedAssets?.previewUrl ? (
            <img alt="Meal preview" className="photo-picker__image" src={preparedAssets.previewUrl} />
          ) : (
            <div className="photo-picker__placeholder">
              <Camera size={28} />
              <span>Add photo</span>
            </div>
          )}
          <input
            accept="image/*"
            capture="environment"
            hidden
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;
              releasePreparedImageAssets(preparedAssets);
              setPreparedAssets(null);
              setFile(nextFile);
              setError(null);
            }}
            type="file"
          />
        </label>

        <div className="context-field">
          <textarea
            id="entry-text"
            onChange={(event) => setEntryText(event.target.value)}
            placeholder="Type or dictate what you ate"
            rows={4}
            value={entryText}
          />
        </div>

        <div className="sheet__actions">
          <button className="primary-button" disabled={analyzing} onClick={() => void analyzeCurrentEntry()} type="button">
            {analyzing ? "Estimating..." : "Estimate"}
          </button>
        </div>
      </div>
    );
  }

  function renderEstimateStep() {
    if (!estimate) {
      return null;
    }

    return (
      <div className="stack">
        {preparedAssets?.previewUrl ? (
          <img alt="Meal preview" className="estimate-hero" src={preparedAssets.previewUrl} />
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
            <span>{formatMacro(estimate.macros.protein)} protein</span>
            <span>{formatMacro(estimate.macros.carbs)} carbs</span>
            <span>{formatMacro(estimate.macros.fat)} fat</span>
          </div>

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

          <label className="favorite-toggle">
            <input
              checked={favoriteOnSave}
              onChange={(event) => setFavoriteOnSave(event.target.checked)}
              type="checkbox"
            />
            Save food
          </label>
        </section>

        <div className="sheet__actions">
          <button className="secondary-button" onClick={() => setStep("composer")} type="button">
            Back
          </button>
          {estimate.refinementQuestions.length ? (
            <button className="secondary-button" onClick={() => setStep("refine")} type="button">
              <Wand2 size={18} />
              Refine
            </button>
          ) : null}
          <button className="primary-button" disabled={saving} onClick={() => void saveCurrentMeal()} type="button">
            <Star size={18} />
            {saving ? "Saving..." : "Save"}
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
            Back
          </button>
          <button className="primary-button" disabled={analyzing} onClick={() => void applyRefinement()} type="button">
            {analyzing ? "Updating..." : "Update"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <LogFlowContext.Provider value={{ openLogFlow }}>
      {children}
      <BottomSheet
        onClose={closeLogFlow}
        open={open}
        title={step === "composer" ? "Add food" : step === "refine" ? "Refine" : "Estimate"}
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
