import { describe, expect, it } from "vitest";
import { analyzeEntryInputSchema, normalizeAnalyzeEntryInput } from "../../shared/analyze-entry-input";

describe("analyzeEntryInputSchema", () => {
  it("accepts nullable optional fields from callable requests", () => {
    const parsed = analyzeEntryInputSchema.safeParse({
      mode: "manual_ai",
      imageBase64: null,
      mimeType: null,
      manualText: "test",
      userContext: null,
      refinementAnswers: null,
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }

    expect(normalizeAnalyzeEntryInput(parsed.data)).toEqual({
      mode: "manual_ai",
      imageBase64: undefined,
      mimeType: undefined,
      manualText: "test",
      userContext: undefined,
      priorEstimate: undefined,
      refinementAnswers: undefined,
    });
  });

  it("still rejects empty manual estimates without text or a prior estimate", () => {
    const parsed = analyzeEntryInputSchema.safeParse({
      mode: "manual_ai",
      manualText: null,
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) {
      return;
    }

    expect(parsed.error.issues[0]?.message).toBe("A description is required for manual mode.");
  });
});
