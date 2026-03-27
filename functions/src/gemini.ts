import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { AnalyzeEntryInput, MealEstimate } from "../../shared/models";

const macroSchema = z.object({
  protein: z.number().min(0).max(500),
  carbs: z.number().min(0).max(500),
  fat: z.number().min(0).max(300),
  fiber: z.number().min(0).max(200).nullable().optional(),
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

function normalizeEstimate(raw: unknown): MealEstimate {
  const parsed = estimateSchema.parse(raw);

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

function buildPrompt(input: AnalyzeEntryInput) {
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
    "Keep the meal title short and natural.",
    "Summary should be 1 concise sentence.",
    "Use realistic calories and macros in grams.",
    "Assumptions should be brief, honest, and specific.",
    "If there is meaningful uncertainty, generate up to 3 refinementQuestions that can be answered with 2 to 4 tap-friendly options each.",
    "If this is already a refinement request, update the estimate and only include leftover refinement questions if they still matter.",
    "Never leave items or macros empty if you can estimate them reasonably.",
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
    },
  });

  if (!response.text) {
    throw new Error("Gemini returned an empty response.");
  }

  return normalizeEstimate(JSON.parse(response.text));
}
