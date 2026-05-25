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

  it("accepts manual text and user context up to 2,000 characters", () => {
    const longText = "a".repeat(2_000);
    const parsed = analyzeEntryInputSchema.safeParse({
      mode: "manual_ai",
      manualText: longText,
      userContext: longText,
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects manual text over 2,000 characters", () => {
    const parsed = analyzeEntryInputSchema.safeParse({
      mode: "manual_ai",
      manualText: "a".repeat(2_001),
    });

    expect(parsed.success).toBe(false);
  });
});
