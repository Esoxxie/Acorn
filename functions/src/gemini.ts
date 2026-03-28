import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { AnalyzeEntryInput, MealEstimate } from "../../shared/models";

const nullableNumberJsonSchema = {
  type: ["number", "null"],
} as const;

const nullableStringJsonSchema = {
  type: ["string", "null"],
} as const;

const macroJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["protein", "carbs", "fat", "fiber"],
  properties: {
    protein: { type: "number" },
    carbs: { type: "number" },
    fat: { type: "number" },
    fiber: nullableNumberJsonSchema,
  },
} as const;

const geminiResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["mealTitle", "summary", "calories", "confidence", "assumptions", "macros", "items", "refinementQuestions"],
  properties: {
    mealTitle: { type: "string" },
    summary: { type: "string" },
    calories: { type: "number" },
    confidence: { type: "number" },
    assumptions: {
      type: "array",
      items: { type: "string" },
    },
    macros: macroJsonSchema,
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "portion", "calories", "macros"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          portion: { type: "string" },
          calories: { type: "number" },
          macros: macroJsonSchema,
          confidence: nullableNumberJsonSchema,
          notes: nullableStringJsonSchema,
        },
      },
    },
    refinementQuestions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "helperText", "options"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          helperText: nullableStringJsonSchema,
          options: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["id", "label", "detail"],
              properties: {
                id: { type: "string" },
                label: { type: "string" },
                detail: nullableStringJsonSchema,
              },
            },
          },
        },
      },
    },
  },
} as const;

const rawMacroSchema = z.object({
  protein: z.number().min(0).max(500).optional(),
  carbs: z.number().min(0).max(500).optional(),
  fat: z.number().min(0).max(300).optional(),
  fiber: z.number().min(0).max(200).nullable().optional(),
});

const macroSchema = z.object({
  protein: z.number().min(0).max(500),
  carbs: z.number().min(0).max(500),
  fat: z.number().min(0).max(300),
  fiber: z.number().min(0).max(200).nullable().optional(),
});

const compatibilityEstimateSchema = z.object({
  mealTitle: z.string().min(1).max(80).optional(),
  title: z.string().min(1).max(80).optional(),
  summary: z.string().min(1).max(220).optional(),
  description: z.string().min(1).max(220).optional(),
  calories: z.number().min(0).max(6000).optional(),
  totalCalories: z.number().min(0).max(6000).optional(),
  confidence: z.number().min(0).max(100),
  macros: rawMacroSchema.optional(),
  totalProtein: z.number().min(0).max(500).optional(),
  totalCarbs: z.number().min(0).max(500).optional(),
  totalFat: z.number().min(0).max(300).optional(),
  totalFiber: z.number().min(0).max(200).nullable().optional(),
  assumptions: z.array(z.string().min(1).max(160)).max(4),
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(60).optional(),
        name: z.string().min(1).max(80).optional(),
        title: z.string().min(1).max(80).optional(),
        portion: z.string().min(1).max(80).optional(),
        serving: z.string().min(1).max(80).optional(),
        calories: z.number().min(0).max(4000).optional(),
        kcal: z.number().min(0).max(4000).optional(),
        macros: rawMacroSchema.optional(),
        protein: z.number().min(0).max(500).optional(),
        carbs: z.number().min(0).max(500).optional(),
        fat: z.number().min(0).max(300).optional(),
        fiber: z.number().min(0).max(200).nullable().optional(),
        confidence: z.number().min(0).max(100).nullable().optional(),
        notes: z.string().max(160).nullable().optional(),
      }),
    )
    .max(8),
  refinementQuestions: z
    .array(
      z.object({
        id: z.string().min(1).max(60).optional(),
        label: z.string().min(1).max(120).optional(),
        question: z.string().min(1).max(120).optional(),
        helperText: z.string().max(160).nullable().optional(),
        detail: z.string().max(160).nullable().optional(),
        options: z
          .array(
            z.union([
              z.string().min(1).max(80),
              z.object({
                id: z.string().min(1).max(60).optional(),
                label: z.string().min(1).max(80).optional(),
                text: z.string().min(1).max(80).optional(),
                value: z.string().min(1).max(80).optional(),
                detail: z.string().max(120).nullable().optional(),
              }),
            ]),
          )
          .min(2)
          .max(4),
      }),
    )
    .max(3),
});

const estimateSchema = z.object({
  mealTitle: z.string().min(1).max(80),
  summary: z.string().min(1).max(220),
  calories: z.number().min(0).max(6000),
  confidence: z.number().min(1).max(99),
  assumptions: z.array(z.string().min(1).max(160)).max(4).default([]),
  macros: macroSchema,
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(60).optional(),
        name: z.string().min(1).max(80),
        portion: z.string().min(1).max(80),
        calories: z.number().min(0).max(4000),
        macros: macroSchema,
        confidence: z.number().min(1).max(99).nullable().optional(),
        notes: z.string().max(160).nullable().optional(),
      }),
    )
    .max(8)
    .default([]),
  refinementQuestions: z
    .array(
      z.object({
        id: z.string().min(1).max(60),
        label: z.string().min(1).max(120),
        helperText: z.string().max(160).nullable().optional(),
        options: z
          .array(
            z.object({
              id: z.string().min(1).max(60),
              label: z.string().min(1).max(80),
              detail: z.string().max(120).nullable().optional(),
            }),
          )
          .min(2)
          .max(4),
      }),
    )
    .max(3)
    .default([]),
});

function slugify(value: string, index: number) {
  const slug = value
    .normalize("NFKD")
    .replace(/ß/g, "ss")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `item-${index + 1}`;
}

function pickFirstString(...values: Array<string | null | undefined>): string | undefined {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim();
}

function pickMeaningfulNumber(primary: number | undefined, fallback: number): number {
  if (typeof primary === "number" && Number.isFinite(primary) && (primary > 0 || fallback <= 0)) {
    return primary;
  }

  return fallback;
}

function normalizeMacros(raw: {
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number | null;
}) {
  return {
    protein: raw.protein ?? 0,
    carbs: raw.carbs ?? 0,
    fat: raw.fat ?? 0,
    fiber: raw.fiber ?? null,
  };
}

function normalizeConfidenceValue(value: number): number {
  const scaled = value > 0 && value <= 1 ? value * 100 : value;
  return Math.max(1, Math.min(99, Math.round(scaled)));
}

function normalizeOptionalConfidenceValue(value: number | null | undefined) {
  if (value == null) {
    return value;
  }

  return normalizeConfidenceValue(value);
}

function createUnrecognizedFoodError() {
  return new Error("Die Schätzung konnte aus diesem Eintrag kein Lebensmittel erkennen.");
}

function parseGeminiJsonResponse(rawText: string): unknown {
  try {
    return JSON.parse(rawText);
  } catch (error) {
    throw new Error(
      `Gemini hat ungültiges JSON zurückgegeben: ${error instanceof Error ? error.message : "unbekannter Analysefehler"}.`,
    );
  }
}

function coerceCompatibilityEstimate(raw: unknown): z.infer<typeof estimateSchema> {
  const parsed = compatibilityEstimateSchema.parse(raw);
  const mealTitle = pickFirstString(parsed.mealTitle, parsed.title);

  if (!mealTitle) {
    throw new Error("Die Gemini-Antwort enthält kein mealTitle.");
  }

  const summary = pickFirstString(parsed.summary, parsed.description);
  if (!summary) {
    throw new Error("Die Gemini-Antwort enthält keine summary.");
  }

  if (parsed.items.length === 0) {
    throw createUnrecognizedFoodError();
  }

  const items = parsed.items.map((item, index) => {
    const name = pickFirstString(item.name, item.title);
    if (!name) {
      throw new Error(`Die Gemini-Antwort enthält bei Position ${index + 1} keinen Namen.`);
    }

    const portion = pickFirstString(item.portion, item.serving);
    if (!portion) {
      throw new Error(`Die Gemini-Antwort enthält bei Position ${index + 1} keine Portionsangabe.`);
    }

    const calories = item.calories ?? item.kcal;
    if (typeof calories !== "number") {
      throw new Error(`Die Gemini-Antwort enthält bei Position ${index + 1} keine Kalorien.`);
    }

    return {
      id: item.id || slugify(name, index),
      name,
      portion,
      calories,
      macros: normalizeMacros({
        protein: item.macros?.protein ?? item.protein,
        carbs: item.macros?.carbs ?? item.carbs,
        fat: item.macros?.fat ?? item.fat,
        fiber: item.macros?.fiber ?? item.fiber,
      }),
      confidence: normalizeOptionalConfidenceValue(item.confidence ?? null),
      notes: item.notes ?? null,
    };
  });

  const fallbackCalories = items.reduce((total, item) => total + item.calories, 0);
  const fallbackMacros = normalizeMacros({
    protein: items.reduce((total, item) => total + item.macros.protein, 0),
    carbs: items.reduce((total, item) => total + item.macros.carbs, 0),
    fat: items.reduce((total, item) => total + item.macros.fat, 0),
    fiber: items.reduce((total, item) => total + (item.macros.fiber ?? 0), 0),
  });
  const caloriesSource = parsed.calories ?? parsed.totalCalories;
  if (typeof caloriesSource !== "number" && fallbackCalories <= 0) {
    throw new Error("Die Gemini-Antwort enthält keine Kalorien.");
  }
  const calories = pickMeaningfulNumber(caloriesSource, fallbackCalories);
  const macros = normalizeMacros({
    protein: pickMeaningfulNumber(parsed.macros?.protein ?? parsed.totalProtein, fallbackMacros.protein),
    carbs: pickMeaningfulNumber(parsed.macros?.carbs ?? parsed.totalCarbs, fallbackMacros.carbs),
    fat: pickMeaningfulNumber(parsed.macros?.fat ?? parsed.totalFat, fallbackMacros.fat),
    fiber: pickMeaningfulNumber(parsed.macros?.fiber ?? parsed.totalFiber ?? undefined, fallbackMacros.fiber ?? 0),
  });
  const refinementQuestions =
    parsed.refinementQuestions.map((question, questionIndex) => {
      const label = pickFirstString(question.label, question.question) ?? `Frage ${questionIndex + 1}`;
      return {
        id: question.id || slugify(label, questionIndex),
        label,
        helperText: question.helperText ?? question.detail ?? null,
        options: (question.options ?? []).map((option, optionIndex) => {
          if (typeof option === "string") {
            return {
              id: slugify(option, optionIndex),
              label: option,
              detail: null,
            };
          }

          const optionLabel = pickFirstString(option.label, option.text, option.value) ?? `Option ${optionIndex + 1}`;
          return {
            id: option.id || slugify(optionLabel, optionIndex),
            label: optionLabel,
            detail: option.detail ?? null,
          };
        }),
      };
    });

  return estimateSchema.parse({
    mealTitle,
    summary,
    calories,
    confidence: normalizeConfidenceValue(parsed.confidence),
    assumptions: parsed.assumptions,
    macros,
    items,
    refinementQuestions,
  });
}

export function normalizeEstimate(raw: unknown): MealEstimate {
  const canonicalResult = estimateSchema.safeParse(raw);
  const parsed = canonicalResult.success ? canonicalResult.data : coerceCompatibilityEstimate(raw);

  if (parsed.items.length === 0 && parsed.calories <= 0) {
    throw createUnrecognizedFoodError();
  }

  return {
    ...parsed,
    calories: Math.round(parsed.calories),
    confidence: normalizeConfidenceValue(parsed.confidence),
    macros: {
      protein: Math.round(parsed.macros.protein * 10) / 10,
      carbs: Math.round(parsed.macros.carbs * 10) / 10,
      fat: Math.round(parsed.macros.fat * 10) / 10,
      fiber: parsed.macros.fiber == null ? null : Math.round(parsed.macros.fiber * 10) / 10,
    },
    items: parsed.items.map((item, index) => ({
      ...item,
      id: item.id || slugify(item.name, index),
      calories: Math.round(item.calories),
      confidence: normalizeOptionalConfidenceValue(item.confidence),
      macros: {
        protein: Math.round(item.macros.protein * 10) / 10,
        carbs: Math.round(item.macros.carbs * 10) / 10,
        fat: Math.round(item.macros.fat * 10) / 10,
        fiber: item.macros.fiber == null ? null : Math.round(item.macros.fiber * 10) / 10,
      },
    })),
  };
}

export function buildPrompt(input: AnalyzeEntryInput) {
  const modeInstructions =
    input.mode === "photo"
      ? "Schätze Nährwerte anhand des Essensfotos. Berücksichtige jeden vom Nutzer gelieferten Kontext, wenn er das Bild sinnvoll präzisiert."
      : "Schätze Nährwerte anhand der getippten Lebensmittelsbeschreibung. Erfinde keine zusätzlichen Gerichte, die nicht plausibel angedeutet sind.";

  const contextBlock = input.userContext
    ? `Nutzerkontext: ${input.userContext.trim()}`
    : "Nutzerkontext: keiner";

  const refinementBlock =
    input.priorEstimate && input.refinementAnswers
      ? `Dies ist eine Verfeinerungsanfrage.\nJSON der vorherigen Schätzung: ${JSON.stringify(input.priorEstimate)}\nAusgewählte Antworten: ${JSON.stringify(input.refinementAnswers)}`
      : "Dies ist eine erste Schätzanfrage.";

  const mealText =
    input.mode === "manual_ai"
      ? `Manuelle Beschreibung: ${input.manualText?.trim() ?? ""}`
      : "Das Foto wurde als eingebettete Bilddaten angehängt.";

  return [
    "Du bist Acorn, ein sorgfältiger Kalorien- und Makroschätzer für eine mobile App mit Fokus auf Fotos.",
    modeInstructions,
    mealText,
    contextBlock,
    refinementBlock,
    "Gib ausschließlich JSON zurück, ohne Markdown-Codeblöcke oder Erklärtext.",
    "Gib exakt diese Top-Level-Felder zurück und benenne sie nicht um: mealTitle, summary, calories, confidence, assumptions, macros, items, refinementQuestions.",
    "mealTitle muss kurz und natürlich sein. summary muss genau ein knapper Satz sein.",
    "macros müssen immer protein, carbs, fat und fiber enthalten. Verwende Gramm für alle Makros.",
    "Jeder Eintrag muss id, name, portion, calories und macros enthalten.",
    "Verwende stabile, slugartige ids wie gegrilltes-haehnchen, extra-sauce, portion-gross oder dressing-separat.",
    "assumptions müssen kurz, ehrlich und konkret sein. Nutze ein leeres Array, wenn es keine wichtigen Annahmen gibt.",
    "Wenn es eine relevante Unsicherheit gibt, die Kalorien oder Makros spürbar verändern würde, erstelle 1 bis 3 refinementQuestions mit jeweils 2 bis 4 gut antippbaren Optionen.",
    "Wenn es keine relevante Unsicherheit gibt, gib refinementQuestions als leeres Array zurück.",
    "Wenn dies bereits eine Verfeinerungsanfrage ist, aktualisiere die Schätzung anhand der ausgewählten Antworten und behalte nur solche restlichen refinementQuestions, die noch wichtig sind.",
    "Gib keine alternativen Feldnamen wie title, description, totalCalories, serving, kcal, question, text oder value aus.",
  ].join("\n");
}

export async function runGeminiMealAnalysis(
  input: AnalyzeEntryInput,
  config: { apiKey: string; model: string },
): Promise<MealEstimate> {
  if (!config.apiKey) {
    throw new Error("Fehlender Gemini-API-Schlüssel.");
  }

  const client = new GoogleGenAI({ apiKey: config.apiKey });
  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
    { text: buildPrompt(input) },
  ];

  if (input.mode === "photo" && input.imageBase64 && input.mimeType) {
    parts.push({
      inlineData: {
        mimeType: input.mimeType,
        data: input.imageBase64,
      },
    });
  }

  let response;

  try {
    response = await client.models.generateContent({
      model: config.model,
      contents: [{ role: "user", parts }],
      config: {
        temperature: 0.35,
        responseMimeType: "application/json",
        responseJsonSchema: geminiResponseJsonSchema,
      },
    });
  } catch (error) {
    console.error("Gemini-Mahlzeitenanalyse fehlgeschlagen.", {
      model: config.model,
      mode: input.mode,
      hasPriorEstimate: Boolean(input.priorEstimate),
      error: error instanceof Error ? error.message : String(error),
      status:
        typeof error === "object" && error !== null && "status" in error
          ? (error as { status?: unknown }).status
          : null,
    });
    throw error;
  }

  if (!response.text) {
    throw new Error("Gemini hat eine leere Antwort zurückgegeben.");
  }

  try {
    return normalizeEstimate(parseGeminiJsonResponse(response.text));
  } catch (error) {
    console.error("Die Antwort der Gemini-Mahlzeitenanalyse konnte nicht validiert werden.", {
      model: config.model,
      mode: input.mode,
      hasPriorEstimate: Boolean(input.priorEstimate),
      responsePreview: response.text.slice(0, 500),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
