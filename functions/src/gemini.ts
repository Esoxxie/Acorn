import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { AnalyzeEntryInput, MealEstimate } from "../../shared/models";

const nullableNumberJsonSchema = {
  anyOf: [{ type: "number" }, { type: "null" }],
} as const;

const macroJsonSchema = {
  type: "object",
  additionalProperties: false,
  propertyOrdering: ["protein", "carbs", "fat", "fiber"],
  required: ["protein", "carbs", "fat", "fiber"],
  properties: {
    protein: { type: "number", minimum: 0, maximum: 500 },
    carbs: { type: "number", minimum: 0, maximum: 500 },
    fat: { type: "number", minimum: 0, maximum: 300 },
    fiber: { ...nullableNumberJsonSchema, minimum: 0, maximum: 200 },
  },
} as const;

const geminiResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  propertyOrdering: [
    "mealTitle",
    "summary",
    "calories",
    "confidence",
    "assumptions",
    "macros",
    "items",
    "refinementQuestions",
  ],
  required: ["mealTitle", "summary", "calories", "confidence", "assumptions", "macros", "items", "refinementQuestions"],
  properties: {
    mealTitle: { type: "string", minLength: 1, maxLength: 80 },
    summary: { type: "string", minLength: 1, maxLength: 220 },
    calories: { type: "number", minimum: 0, maximum: 6000 },
    confidence: { type: "number", minimum: 1, maximum: 99 },
    assumptions: {
      type: "array",
      maxItems: 4,
      items: { type: "string", minLength: 1, maxLength: 160 },
    },
    macros: macroJsonSchema,
    items: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        propertyOrdering: ["id", "name", "portion", "calories", "macros", "confidence", "notes"],
        required: ["id", "name", "portion", "calories", "macros"],
        properties: {
          id: { type: "string", minLength: 1, maxLength: 60 },
          name: { type: "string", minLength: 1, maxLength: 80 },
          portion: { type: "string", minLength: 1, maxLength: 80 },
          calories: { type: "number", minimum: 0, maximum: 4000 },
          macros: macroJsonSchema,
          confidence: { ...nullableNumberJsonSchema, minimum: 1, maximum: 99 },
          notes: {
            anyOf: [{ type: "string", maxLength: 160 }, { type: "null" }],
          },
        },
      },
    },
    refinementQuestions: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        propertyOrdering: ["id", "label", "helperText", "options"],
        required: ["id", "label", "helperText", "options"],
        properties: {
          id: { type: "string", minLength: 1, maxLength: 60 },
          label: { type: "string", minLength: 1, maxLength: 120 },
          helperText: {
            anyOf: [{ type: "string", maxLength: 160 }, { type: "null" }],
          },
          options: {
            type: "array",
            minItems: 2,
            maxItems: 4,
            items: {
              type: "object",
              additionalProperties: false,
              propertyOrdering: ["id", "label", "detail"],
              required: ["id", "label", "detail"],
              properties: {
                id: { type: "string", minLength: 1, maxLength: 60 },
                label: { type: "string", minLength: 1, maxLength: 80 },
                detail: {
                  anyOf: [{ type: "string", maxLength: 120 }, { type: "null" }],
                },
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
  confidence: z.number().min(1).max(99),
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
        confidence: z.number().min(1).max(99).nullable().optional(),
        notes: z.string().max(160).nullable().optional(),
      }),
    )
    .min(1)
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

function parseGeminiJsonResponse(rawText: string): unknown {
  try {
    return JSON.parse(rawText);
  } catch (error) {
    throw new Error(
      `Gemini returned invalid JSON: ${error instanceof Error ? error.message : "unknown parse error"}.`,
    );
  }
}

function coerceCompatibilityEstimate(raw: unknown): z.infer<typeof estimateSchema> {
  const parsed = compatibilityEstimateSchema.parse(raw);
  const mealTitle = pickFirstString(parsed.mealTitle, parsed.title);

  if (!mealTitle) {
    throw new Error("Gemini response is missing mealTitle.");
  }

  const summary = pickFirstString(parsed.summary, parsed.description);
  if (!summary) {
    throw new Error("Gemini response is missing summary.");
  }

  const items = parsed.items.map((item, index) => {
    const name = pickFirstString(item.name, item.title);
    if (!name) {
      throw new Error(`Gemini response item ${index + 1} is missing name.`);
    }

    const portion = pickFirstString(item.portion, item.serving);
    if (!portion) {
      throw new Error(`Gemini response item ${index + 1} is missing portion.`);
    }

    const calories = item.calories ?? item.kcal;
    if (typeof calories !== "number") {
      throw new Error(`Gemini response item ${index + 1} is missing calories.`);
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
      confidence: item.confidence ?? null,
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
    throw new Error("Gemini response is missing calories.");
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
      const label = pickFirstString(question.label, question.question) ?? `Question ${questionIndex + 1}`;
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
    confidence: parsed.confidence,
    assumptions: parsed.assumptions,
    macros,
    items,
    refinementQuestions,
  });
}

export function normalizeEstimate(raw: unknown): MealEstimate {
  const canonicalResult = estimateSchema.safeParse(raw);
  const parsed = canonicalResult.success ? canonicalResult.data : coerceCompatibilityEstimate(raw);

  return {
    ...parsed,
    calories: Math.round(parsed.calories),
    confidence: Math.max(1, Math.min(99, Math.round(parsed.confidence))),
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
      ? "Estimate nutrition from the food photo. Respect any user-provided context if it reasonably clarifies the image."
      : "Estimate nutrition from the user's typed food description. Do not invent extra dishes beyond what is likely implied.";

  const contextBlock = input.userContext
    ? `User context: ${input.userContext.trim()}`
    : "User context: none";

  const refinementBlock =
    input.priorEstimate && input.refinementAnswers
      ? `This is a refinement request.\nPrior estimate JSON: ${JSON.stringify(input.priorEstimate)}\nSelected answers: ${JSON.stringify(input.refinementAnswers)}`
      : "This is an initial estimate request.";

  const mealText =
    input.mode === "manual_ai"
      ? `Manual description: ${input.manualText?.trim() ?? ""}`
      : "Photo input is attached as inline image data.";

  return [
    "You are Acorn, a careful calorie and macro estimator for a photo-first mobile app.",
    modeInstructions,
    mealText,
    contextBlock,
    refinementBlock,
    "Return JSON only with no markdown fences.",
    "Return exactly these top-level fields and do not rename them: mealTitle, summary, calories, confidence, assumptions, macros, items, refinementQuestions.",
    "mealTitle must be short and natural. summary must be exactly 1 concise sentence.",
    "macros must always include protein, carbs, fat, and fiber. Use grams for macros.",
    "Every item must include id, name, portion, calories, and macros.",
    "Use stable slug-like ids such as grilled-chicken, extra-sauce, portion-large, or dressing-on-side.",
    "Assumptions must be brief, honest, and specific. Use an empty array when there are no important assumptions.",
    "If there is meaningful uncertainty that would materially change calories or macros, generate 1 to 3 refinementQuestions with 2 to 4 tap-friendly options each.",
    "If there is not meaningful uncertainty, return refinementQuestions as an empty array.",
    "If this is already a refinement request, update the estimate using the selected answers and only keep leftover refinementQuestions if they still matter.",
    "Do not emit alternate field names like title, description, totalCalories, serving, kcal, question, text, or value.",
  ].join("\n");
}

export async function runGeminiMealAnalysis(
  input: AnalyzeEntryInput,
  config: { apiKey: string; model: string },
): Promise<MealEstimate> {
  if (!config.apiKey) {
    throw new Error("Missing Gemini API key.");
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

  const response = await client.models.generateContent({
    model: config.model,
    contents: [{ role: "user", parts }],
    config: {
      temperature: 0.35,
      responseMimeType: "application/json",
      responseJsonSchema: geminiResponseJsonSchema,
    },
  });

  if (!response.text) {
    throw new Error("Gemini returned an empty response.");
  }

  try {
    return normalizeEstimate(parseGeminiJsonResponse(response.text));
  } catch (error) {
    console.error("Gemini meal analysis response validation failed.", {
      model: config.model,
      mode: input.mode,
      hasPriorEstimate: Boolean(input.priorEstimate),
      responsePreview: response.text.slice(0, 500),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
