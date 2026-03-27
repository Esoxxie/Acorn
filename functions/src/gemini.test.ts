// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildPrompt, normalizeEstimate, runGeminiMealAnalysis } from "./gemini";

const { generateContent } = vi.hoisted(() => ({
  generateContent: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(function GoogleGenAIMock() {
    return {
      models: {
        generateContent,
      },
    };
  }),
}));

const baseInput = {
  mode: "manual_ai" as const,
  manualText: "Chicken rice bowl",
};

const canonicalEstimate = {
  mealTitle: "Chicken rice bowl",
  summary: "Estimated nutrition for a chicken rice bowl.",
  calories: 640,
  confidence: 84,
  assumptions: ["Rice portion estimated from a standard bowl."],
  macros: {
    protein: 39.2,
    carbs: 70.4,
    fat: 18.1,
    fiber: 4.8,
  },
  items: [
    {
      id: "chicken",
      name: "Chicken",
      portion: "150 g",
      calories: 280,
      macros: {
        protein: 32.4,
        carbs: 0,
        fat: 15.2,
        fiber: 0,
      },
      confidence: 88,
      notes: null,
    },
    {
      id: "rice",
      name: "Rice",
      portion: "1 bowl",
      calories: 360,
      macros: {
        protein: 6.8,
        carbs: 70.4,
        fat: 2.9,
        fiber: 4.8,
      },
      confidence: null,
      notes: null,
    },
  ],
  refinementQuestions: [],
};

describe("Gemini meal estimate contract", () => {
  beforeEach(() => {
    generateContent.mockReset();
  });

  it("normalizes a canonical Gemini response", () => {
    expect(normalizeEstimate(canonicalEstimate)).toEqual(canonicalEstimate);
  });

  it("accepts the small compatibility alias set", () => {
    const estimate = normalizeEstimate({
      title: "Chicken rice bowl",
      description: "Estimated nutrition for a chicken rice bowl.",
      totalCalories: 640,
      confidence: 84,
      assumptions: ["Rice portion estimated from a standard bowl."],
      totalProtein: 39.2,
      totalCarbs: 70.4,
      totalFat: 18.1,
      totalFiber: 4.8,
      items: [
        {
          title: "Chicken",
          serving: "150 g",
          kcal: 280,
          protein: 32.4,
          carbs: 0,
          fat: 15.2,
          fiber: 0,
        },
      ],
      refinementQuestions: [
        {
          question: "How much sauce was used?",
          detail: "Sauce can change calories quite a bit.",
          options: [
            { value: "light", detail: "Barely any sauce." },
            { text: "Regular", detail: null },
          ],
        },
      ],
    });

    expect(estimate.mealTitle).toBe("Chicken rice bowl");
    expect(estimate.summary).toBe("Estimated nutrition for a chicken rice bowl.");
    expect(estimate.items[0]).toMatchObject({
      id: "chicken",
      name: "Chicken",
      portion: "150 g",
      calories: 280,
    });
    expect(estimate.refinementQuestions[0]).toEqual({
      id: "how-much-sauce-was-used",
      label: "How much sauce was used?",
      helperText: "Sauce can change calories quite a bit.",
      options: [
        { id: "light", label: "light", detail: "Barely any sauce." },
        { id: "regular", label: "Regular", detail: null },
      ],
    });
  });

  it("fails clearly when required fields are missing after compatibility coercion", () => {
    expect(() =>
      normalizeEstimate({
        summary: "Estimated nutrition for a chicken rice bowl.",
        calories: 640,
        confidence: 84,
        assumptions: [],
        macros: canonicalEstimate.macros,
        items: canonicalEstimate.items,
        refinementQuestions: [],
      }),
    ).toThrow("missing mealTitle");
  });

  it("rejects invalid refinement question option counts", () => {
    expect(() =>
      normalizeEstimate({
        ...canonicalEstimate,
        refinementQuestions: [
          {
            id: "portion-size",
            label: "How big was the portion?",
            helperText: null,
            options: [{ id: "regular", label: "Regular", detail: null }],
          },
        ],
      }),
    ).toThrow();
  });

  it("sends a strict JSON schema to Gemini", async () => {
    generateContent.mockResolvedValue({
      text: JSON.stringify(canonicalEstimate),
    });

    await runGeminiMealAnalysis(baseInput, { apiKey: "test-key", model: "gemini-2.5-flash" });

    expect(generateContent).toHaveBeenCalledTimes(1);
    const request = generateContent.mock.calls[0]?.[0];
    expect(request.config.responseMimeType).toBe("application/json");
    expect(request.config.responseJsonSchema).toBeTruthy();
    expect(request.config.responseJsonSchema.required).toContain("items");
    expect(request.config.responseJsonSchema.properties.items.minItems).toBe(1);
  });

  it("rejects empty Gemini responses", async () => {
    generateContent.mockResolvedValue({ text: "" });

    await expect(
      runGeminiMealAnalysis(baseInput, { apiKey: "test-key", model: "gemini-2.5-flash" }),
    ).rejects.toThrow("Gemini returned an empty response.");
  });

  it("rejects malformed JSON responses and logs context", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    generateContent.mockResolvedValue({ text: "{not-valid-json" });

    await expect(
      runGeminiMealAnalysis(baseInput, { apiKey: "test-key", model: "gemini-2.5-flash" }),
    ).rejects.toThrow("Gemini returned invalid JSON");

    expect(consoleError).toHaveBeenCalledWith(
      "Gemini meal analysis response validation failed.",
      expect.objectContaining({
        model: "gemini-2.5-flash",
        mode: "manual_ai",
      }),
    );

    consoleError.mockRestore();
  });

  it("builds a prompt that names the exact contract fields", () => {
    const prompt = buildPrompt(baseInput);

    expect(prompt).toContain("mealTitle, summary, calories, confidence, assumptions, macros, items, refinementQuestions");
    expect(prompt).toContain("Do not emit alternate field names");
  });
});
