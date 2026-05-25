import { ArrowLeft, Camera, PencilLine, Plus, Send, Star, Trash2 } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState, type ChangeEvent, type PropsWithChildren } from "react";
import type { EstimateItem, MealEstimate, MealRecord } from "../../../shared/models";
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
import { createMealSnapshot, createMealSnapshotFromItems } from "../../../shared/calorie";
import { resolveStorageUrl } from "../../lib/storage";
import "../../styles/meal-surfaces.css";

type FlowStep = "composer" | "estimate" | "manualEdit";

type EditableItem = {
  id: string;
  name: string;
  portion: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
};

type EditDraft = {
  mealTitle: string;
  summary: string;
  items: EditableItem[];
};

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

function formatDraftNumber(value: number | null | undefined): string {
  if (value == null) {
    return "";
  }

  return String(Math.round(value * 10) / 10);
}

function itemToEditableItem(item: EstimateItem): EditableItem {
  return {
    id: item.id,
    name: item.name,
    portion: item.portion,
    calories: formatDraftNumber(item.calories),
    protein: formatDraftNumber(item.macros.protein),
    carbs: formatDraftNumber(item.macros.carbs),
    fat: formatDraftNumber(item.macros.fat),
    fiber: formatDraftNumber(item.macros.fiber),
  };
}

function estimateToEditDraft(nextEstimate: MealEstimate): EditDraft {
  return {
    mealTitle: nextEstimate.mealTitle,
    summary: nextEstimate.summary,
    items: nextEstimate.items.length ? nextEstimate.items.map(itemToEditableItem) : [createBlankEditableItem()],
  };
}

function createBlankEditableItem(): EditableItem {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `item-${Date.now()}`;

  return {
    id,
    name: "",
    portion: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    fiber: "",
  };
}

function parseDraftNumber(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function normalizeEditableItems(items: EditableItem[]): EstimateItem[] | null {
  const normalizedItems = items.map((item) => {
    const calories = parseDraftNumber(item.calories);
    const protein = parseDraftNumber(item.protein) ?? 0;
    const carbs = parseDraftNumber(item.carbs) ?? 0;
    const fat = parseDraftNumber(item.fat) ?? 0;
    const fiber = parseDraftNumber(item.fiber);

    if (!item.name.trim() || !item.portion.trim() || calories == null) {
      return null;
    }

    return {
      id: item.id,
      name: item.name.trim(),
      portion: item.portion.trim(),
      calories,
      macros: {
        protein,
        carbs,
        fat,
        fiber,
      },
      confidence: null,
      notes: null,
    };
  });

  if (normalizedItems.some((item) => item == null)) {
    return null;
  }

  return normalizedItems as EstimateItem[];
}

export function LogFlowProvider({ children }: PropsWithChildren) {
  const { saveMeal, updateMeal } = useAppData();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<MealRecord | null>(null);
  const [step, setStep] = useState<FlowStep>("composer");
  const [file, setFile] = useState<File | null>(null);
  const [preparedAssets, setPreparedAssets] = useState<PreparedImageAssets | null>(null);
  const [instantPreviewUrl, setInstantPreviewUrl] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [entryText, setEntryText] = useState("");
  const [estimate, setEstimate] = useState<MealEstimate | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refineText, setRefineText] = useState("");
  const [refining, setRefining] = useState(false);
  const instantPreviewUrlRef = useRef<string | null>(null);
  const imagePreparationIdRef = useRef(0);
  const imagePreparationPromiseRef = useRef<Promise<PreparedImageAssets> | null>(null);

  useEffect(() => {
    return () => {
      releasePreparedImageAssets(preparedAssets);
    };
  }, [preparedAssets]);

  useEffect(() => {
    return () => {
      if (instantPreviewUrlRef.current) {
        URL.revokeObjectURL(instantPreviewUrlRef.current);
      }
    };
  }, []);

  function replaceInstantPreviewUrl(nextUrl: string | null) {
    if (instantPreviewUrlRef.current) {
      URL.revokeObjectURL(instantPreviewUrlRef.current);
    }

    instantPreviewUrlRef.current = nextUrl;
    setInstantPreviewUrl(nextUrl);
  }

  function resetState() {
    imagePreparationIdRef.current += 1;
    imagePreparationPromiseRef.current = null;
    releasePreparedImageAssets(preparedAssets);
    replaceInstantPreviewUrl(null);
    setEditingMeal(null);
    setStep("composer");
    setFile(null);
    setPreparedAssets(null);
    setExistingPhotoUrl(null);
    setEntryText("");
    setEstimate(null);
    setEditDraft(null);
    setAnalyzing(false);
    setSaving(false);
    setError(null);
    setRefineText("");
    setRefining(false);
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
    setEditDraft({
      mealTitle: meal.mealTitle,
      summary: meal.summary,
      items: meal.items.length ? meal.items.map(itemToEditableItem) : [createBlankEditableItem()],
    });
    setStep("manualEdit");
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
        assets = assets ?? (imagePreparationPromiseRef.current ? await imagePreparationPromiseRef.current : await prepareImageAssets(file));
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

  async function refineCurrentEstimate() {
    if (!refineText.trim()) {
      setError(uiCopy.logFlow.refineError);
      return;
    }
    if (!estimate) {
      return;
    }

    setRefining(true);
    setError(null);

    try {
      const response = await getEstimate({
        mode: file ? "photo" : "manual_ai",
        imageBase64: preparedAssets?.imageBase64,
        mimeType: preparedAssets?.mimeType,
        manualText: file ? undefined : entryText.trim(),
        userContext: refineText.trim(),
        priorEstimate: estimate,
      }, appEnv.usingDemoConfig || Boolean(user?.isDemo));

      setEstimate(response.data);
      setRefineText("");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setRefining(false);
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

  async function saveManualEdit() {
    if (!editDraft) {
      return;
    }

    const normalizedItems = normalizeEditableItems(editDraft.items);
    const mealTitle = editDraft.mealTitle.trim();
    if (!mealTitle || !normalizedItems?.length) {
      setError(uiCopy.logFlow.manualEditError);
      return;
    }

    const baseSnapshot = createMealSnapshotFromItems(normalizedItems);
    setSaving(true);
    setError(null);

    try {
      if (editingMeal) {
        await updateMeal(editingMeal, {
          mealTitle,
          summary: editDraft.summary.trim(),
          transcript: entryText.trim() || null,
          baseSnapshot,
        });
      } else {
        await saveMeal({
          source: file ? "photo" : "manual_ai",
          estimate: {
            mealTitle,
            summary: editDraft.summary.trim(),
            items: baseSnapshot.items,
            calories: baseSnapshot.calories,
            macros: baseSnapshot.macros,
            confidence: estimate?.confidence ?? 80,
            assumptions: estimate?.assumptions ?? [],
            refinementQuestions: [],
          },
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
    const preparationId = imagePreparationIdRef.current + 1;
    imagePreparationIdRef.current = preparationId;
    imagePreparationPromiseRef.current = null;

    releasePreparedImageAssets(preparedAssets);
    replaceInstantPreviewUrl(null);
    setPreparedAssets(null);
    setFile(nextFile);
    setError(null);

    if (!nextFile) {
      event.target.value = "";
      return;
    }

    replaceInstantPreviewUrl(URL.createObjectURL(nextFile));

    try {
      const preparationPromise = prepareImageAssets(nextFile);
      imagePreparationPromiseRef.current = preparationPromise;
      const assets = await preparationPromise;

      if (imagePreparationIdRef.current !== preparationId) {
        releasePreparedImageAssets(assets);
        return;
      }

      setPreparedAssets(assets);
      replaceInstantPreviewUrl(null);
    } catch (caughtError) {
      if (imagePreparationIdRef.current === preparationId) {
        imagePreparationPromiseRef.current = null;
        setFile(null);
        replaceInstantPreviewUrl(null);
        setError(getErrorMessage(caughtError));
      }
    } finally {
      if (imagePreparationIdRef.current === preparationId) {
        imagePreparationPromiseRef.current = null;
      }
      event.target.value = "";
    }
  }

  function renderComposer() {
    const previewUrl = preparedAssets?.previewUrl ?? instantPreviewUrl ?? existingPhotoUrl;

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

    const previewUrl = preparedAssets?.previewUrl ?? instantPreviewUrl ?? existingPhotoUrl;

    return (
      <div className="stack">
        {previewUrl ? (
          <img alt={uiCopy.logFlow.mealPreview} className="estimate-hero" src={previewUrl} />
        ) : null}

        <section className="estimate-card estimate-card--review">
          <div
            className="estimate-card__header estimate-card__header--review estimate-item--clickable"
            onClick={() => {
              setEditDraft(estimateToEditDraft(estimate));
              setStep("manualEdit");
            }}
          >
            <div className="estimate-card__title">
              <h3>{estimate.mealTitle}</h3>
              <p>{estimate.summary}</p>
            </div>
            <div className="estimate-card__kcal">
              <strong>{Math.round(estimate.calories)}</strong>
              <span>kcal</span>
            </div>
          </div>

          <div className="macro-row macro-row--compact">
            <span className="macro-pill macro-pill--protein">P {formatMacro(estimate.macros.protein)}</span>
            <span className="macro-pill macro-pill--carbs">C {formatMacro(estimate.macros.carbs)}</span>
            <span className="macro-pill macro-pill--fat">F {formatMacro(estimate.macros.fat)}</span>
            <ConfidencePill confidence={estimate.confidence} />
          </div>

          {estimate.assumptions.length ? (
            <div className="estimate-assumptions">
              {estimate.assumptions.map((assumption) => (
                <p key={assumption}>{assumption}</p>
              ))}
            </div>
          ) : null}

          <div className="estimate-card__items">
            {estimate.items.map((item) => (
              <div
                className="estimate-item estimate-item--clickable"
                key={item.id}
                onClick={() => {
                  setEditDraft(estimateToEditDraft(estimate));
                  setStep("manualEdit");
                }}
              >
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.portion}</span>
                </div>
                <span>{formatCalories(item.calories)}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="refine-field">
          <textarea
            disabled={refining || saving}
            onChange={(event) => setRefineText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void refineCurrentEstimate();
              }
            }}
            placeholder={uiCopy.logFlow.refinePlaceholder}
            rows={1}
            value={refineText}
          />
          <button
            className="refine-submit-btn"
            disabled={refining || saving || !refineText.trim()}
            onClick={() => void refineCurrentEstimate()}
            type="button"
          >
            {refining ? (
              uiCopy.logFlow.updating
            ) : (
              <>
                <Send size={14} />
                <span>{uiCopy.logFlow.refineAction}</span>
              </>
            )}
          </button>
        </div>

        <div className="sheet__actions">
          <button className="secondary-button" disabled={refining || saving} onClick={() => setStep("composer")} type="button">
            <ArrowLeft size={18} />
            <span>{uiCopy.logFlow.back}</span>
          </button>
          <button
            className="secondary-button"
            disabled={refining || saving}
            onClick={() => {
              setEditDraft(estimateToEditDraft(estimate));
              setStep("manualEdit");
            }}
            type="button"
          >
            <PencilLine size={18} />
            <span>{uiCopy.logFlow.editShort}</span>
          </button>
          <button className="primary-button" disabled={refining || saving} onClick={() => void saveCurrentMeal()} type="button">
            <Star size={18} />
            <span>{saving ? uiCopy.logFlow.saving : uiCopy.logFlow.save}</span>
          </button>
        </div>
      </div>
    );
  }

  function updateEditableItem(itemId: string, patch: Partial<EditableItem>) {
    setEditDraft((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
          }
        : current,
    );
  }

  function renderManualEditStep() {
    if (!editDraft) {
      return null;
    }

    const normalizedItems = normalizeEditableItems(editDraft.items);
    const snapshot = normalizedItems?.length ? createMealSnapshotFromItems(normalizedItems) : null;

    return (
      <div className="stack">
        <section className="estimate-card manual-edit-card">
          <div className="form-grid">
            <label>
              <span>{uiCopy.logFlow.mealTitle}</span>
              <input
                onChange={(event) =>
                  setEditDraft((current) => (current ? { ...current, mealTitle: event.target.value } : current))
                }
                value={editDraft.mealTitle}
              />
            </label>
            <label>
              <span>{uiCopy.logFlow.mealSummary}</span>
              <textarea
                onChange={(event) =>
                  setEditDraft((current) => (current ? { ...current, summary: event.target.value } : current))
                }
                rows={2}
                value={editDraft.summary}
              />
            </label>
          </div>
        </section>

        {snapshot ? (
          <section className="estimate-card manual-edit-total">
            <div>
              <span>{uiCopy.summary.consumed}</span>
              <strong>{formatCalories(snapshot.calories)}</strong>
            </div>
            <div className="macro-row">
              <span>P {formatMacro(snapshot.macros.protein)}</span>
              <span>C {formatMacro(snapshot.macros.carbs)}</span>
              <span>F {formatMacro(snapshot.macros.fat)}</span>
            </div>
          </section>
        ) : null}

        <div className="manual-item-list">
          {editDraft.items.map((item, index) => (
            <section className="estimate-card manual-item-card" key={item.id}>
              <div className="manual-item-card__header">
                <h3>{`#${index + 1}`}</h3>
                <button
                  aria-label={uiCopy.logFlow.removeItem}
                  className="icon-button"
                  disabled={editDraft.items.length <= 1}
                  onClick={() =>
                    setEditDraft((current) =>
                      current
                        ? {
                            ...current,
                            items: current.items.filter((currentItem) => currentItem.id !== item.id),
                          }
                        : current,
                    )
                  }
                  type="button"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="manual-item-grid">
                <label className="manual-item-grid__wide">
                  <span>{uiCopy.logFlow.itemName}</span>
                  <input onChange={(event) => updateEditableItem(item.id, { name: event.target.value })} value={item.name} />
                </label>
                <label className="manual-item-grid__wide">
                  <span>{uiCopy.logFlow.itemPortion}</span>
                  <input
                    onChange={(event) => updateEditableItem(item.id, { portion: event.target.value })}
                    value={item.portion}
                  />
                </label>
                <label>
                  <span>{uiCopy.logFlow.itemCalories}</span>
                  <input
                    inputMode="decimal"
                    onChange={(event) => updateEditableItem(item.id, { calories: event.target.value })}
                    value={item.calories}
                  />
                </label>
                <label>
                  <span>{uiCopy.logFlow.itemProtein}</span>
                  <input
                    inputMode="decimal"
                    onChange={(event) => updateEditableItem(item.id, { protein: event.target.value })}
                    value={item.protein}
                  />
                </label>
                <label>
                  <span>{uiCopy.logFlow.itemCarbs}</span>
                  <input
                    inputMode="decimal"
                    onChange={(event) => updateEditableItem(item.id, { carbs: event.target.value })}
                    value={item.carbs}
                  />
                </label>
                <label>
                  <span>{uiCopy.logFlow.itemFat}</span>
                  <input
                    inputMode="decimal"
                    onChange={(event) => updateEditableItem(item.id, { fat: event.target.value })}
                    value={item.fat}
                  />
                </label>
                <label>
                  <span>{uiCopy.logFlow.itemFiber}</span>
                  <input
                    inputMode="decimal"
                    onChange={(event) => updateEditableItem(item.id, { fiber: event.target.value })}
                    value={item.fiber}
                  />
                </label>
              </div>
            </section>
          ))}
        </div>

        <div className="sheet__actions">
          {!editingMeal ? (
            <button className="secondary-button" onClick={() => setStep("estimate")} type="button">
              {uiCopy.logFlow.back}
            </button>
          ) : null}
          <button
            className="secondary-button"
            onClick={() =>
              setEditDraft((current) =>
                current ? { ...current, items: [...current.items, createBlankEditableItem()] } : current,
              )
            }
            type="button"
          >
            <Plus size={18} />
            {uiCopy.logFlow.addItem}
          </button>
          <button className="primary-button" disabled={saving} onClick={() => void saveManualEdit()} type="button">
            <Star size={18} />
            {saving ? uiCopy.logFlow.saving : uiCopy.logFlow.save}
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
            ? step === "manualEdit"
              ? uiCopy.logFlow.manualEdit
              : step === "composer"
              ? uiCopy.logFlow.editEntry
              : uiCopy.logFlow.reviewEdit
            : step === "composer"
              ? uiCopy.logFlow.addEntry
              : step === "manualEdit"
                ? uiCopy.logFlow.manualEdit
              : uiCopy.logFlow.estimate
        }
      >
        {error ? <div className="inline-error">{error}</div> : null}
        {step === "composer" ? renderComposer() : null}
        {step === "estimate" ? renderEstimateStep() : null}
        {step === "manualEdit" ? renderManualEditStep() : null}
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
