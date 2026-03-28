// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildPrompt, buildSystemInstruction, normalizeEstimate, runGeminiMealAnalysis } from "./gemini";

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
  manualText: "Hähnchen-Reis-Bowl",
};

const canonicalEstimate = {
  mealTitle: "Hähnchen-Reis-Bowl",
  summary: "Geschätzte Nährwerte für eine Hähnchen-Reis-Bowl.",
  calories: 640,
  confidence: 84,
  assumptions: ["Die Reisportion wurde als normale Schüssel geschätzt."],
  macros: {
    protein: 39.2,
    carbs: 70.4,
    fat: 18.1,
    fiber: 4.8,
  },
  items: [
    {
      id: "chicken",
      name: "Hähnchen",
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
      name: "Reis",
      portion: "1 Schüssel",
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
      title: "Hähnchen-Reis-Bowl",
      description: "Geschätzte Nährwerte für eine Hähnchen-Reis-Bowl.",
      totalCalories: 640,
      confidence: 84,
      assumptions: ["Die Reisportion wurde als normale Schüssel geschätzt."],
      totalProtein: 39.2,
      totalCarbs: 70.4,
      totalFat: 18.1,
      totalFiber: 4.8,
      items: [
        {
          title: "Hähnchen",
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
          question: "Wie viel Sauce wurde verwendet?",
          detail: "Sauce kann die Kalorien deutlich verändern.",
          options: [
            { value: "light", detail: "Fast keine Sauce." },
            { text: "Normal", detail: null },
          ],
        },
      ],
    });

    expect(estimate.mealTitle).toBe("Hähnchen-Reis-Bowl");
    expect(estimate.summary).toBe("Geschätzte Nährwerte für eine Hähnchen-Reis-Bowl.");
    expect(estimate.items[0]).toMatchObject({
      id: "hahnchen",
      name: "Hähnchen",
      portion: "150 g",
      calories: 280,
    });
    expect(estimate.refinementQuestions[0]).toEqual({
      id: "wie-viel-sauce-wurde-verwendet",
      label: "Wie viel Sauce wurde verwendet?",
      helperText: "Sauce kann die Kalorien deutlich verändern.",
      options: [
        { id: "light", label: "light", detail: "Fast keine Sauce." },
        { id: "normal", label: "Normal", detail: null },
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
    ).toThrow("enthält kein mealTitle");
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

  it("normalizes relaxed confidence values from Gemini", () => {
    const estimate = normalizeEstimate({
      ...canonicalEstimate,
      confidence: 0.84,
      items: [
        {
          ...canonicalEstimate.items[0],
          confidence: 0.51,
        },
        canonicalEstimate.items[1],
      ],
    });

    expect(estimate.confidence).toBe(84);
    expect(estimate.items[0].confidence).toBe(51);
  });

  it("fails clearly when Gemini cannot recognize a food from the entry", () => {
    expect(() =>
      normalizeEstimate({
        mealTitle: "Unklare Mahlzeit",
        summary: "Die angegebene Beschreibung ist kein erkennbares Lebensmittel.",
        calories: 0,
        confidence: 0,
        assumptions: ["Die Eingabe passt zu keinem bekannten Lebensmittel."],
        macros: {
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
        },
        items: [],
        refinementQuestions: [],
      }),
    ).toThrow("kein Lebensmittel erkennen");
  });

  it("sends a structural JSON schema to Gemini", async () => {
    generateContent.mockResolvedValue({
      text: JSON.stringify(canonicalEstimate),
    });

    await runGeminiMealAnalysis(baseInput, { apiKey: "test-key", model: "gemini-2.5-flash" });

    expect(generateContent).toHaveBeenCalledTimes(1);
    const request = generateContent.mock.calls[0]?.[0];
    expect(request.config.responseMimeType).toBe("application/json");
    expect(request.config.responseJsonSchema).toBeTruthy();
    expect(request.config.responseJsonSchema.required).toContain("items");
    expect(request.config.responseJsonSchema.properties.mealTitle.maxLength).toBeUndefined();
    expect(request.config.responseJsonSchema.properties.calories.maximum).toBeUndefined();
    expect(request.config.responseJsonSchema.properties.items.minItems).toBeUndefined();
    expect(request.config.responseJsonSchema.properties.macros.properties.fiber.type).toEqual(["number", "null"]);
    expect(request.config.responseJsonSchema.properties.items.items.properties.notes.type).toEqual(["string", "null"]);
    expect(request.config.responseJsonSchema.properties.refinementQuestions.items.properties.helperText.type).toEqual([
      "string",
      "null",
    ]);
    expect(request.config.responseJsonSchema.properties.refinementQuestions.maxItems).toBeUndefined();
    expect(
      request.config.responseJsonSchema.properties.refinementQuestions.items.properties.options.items.properties.detail.type,
    ).toEqual(["string", "null"]);
  });

  it("rejects empty Gemini responses", async () => {
    generateContent.mockResolvedValue({ text: "" });

    await expect(
      runGeminiMealAnalysis(baseInput, { apiKey: "test-key", model: "gemini-2.5-flash" }),
    ).rejects.toThrow("Gemini hat eine leere Antwort zurückgegeben.");
  });

  it("rejects malformed JSON responses and logs context", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    generateContent.mockResolvedValue({ text: "{not-valid-json" });

    await expect(
      runGeminiMealAnalysis(baseInput, { apiKey: "test-key", model: "gemini-2.5-flash" }),
    ).rejects.toThrow("Gemini hat ungültiges JSON zurückgegeben");

    expect(consoleError).toHaveBeenCalledWith(
      "Die Antwort der Gemini-Mahlzeitenanalyse konnte nicht validiert werden.",
      expect.objectContaining({
        model: "gemini-2.5-flash",
        mode: "manual_ai",
      }),
    );

    consoleError.mockRestore();
  });

  it("builds a system instruction with behavioral rules", () => {
    const system = buildSystemInstruction();

    expect(system).toContain("Du bist Acorn");
    expect(system).toContain("confidence ist ein ganzzahliger Wert von 1 bis 99");
    expect(system).toContain("refinementQuestions");
  });

  it("builds a user prompt with only dynamic context", () => {
    const prompt = buildPrompt(baseInput);

    expect(prompt).toContain("Hähnchen-Reis-Bowl");
    expect(prompt).toContain("Nutzerkontext: keiner");
    expect(prompt).not.toContain("Du bist Acorn");
  });

  it("passes system instruction to Gemini config", async () => {
    generateContent.mockResolvedValue({
      text: JSON.stringify(canonicalEstimate),
    });

    await runGeminiMealAnalysis(baseInput, { apiKey: "test-key", model: "gemini-2.5-flash" });

    const request = generateContent.mock.calls[0]?.[0];
    expect(request.config.systemInstruction).toBe(buildSystemInstruction());
  });
});
