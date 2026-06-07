import { describe, expect, it } from "vitest";
import { buildMacroProgressRows } from "../lib/nutrition-visuals";

describe("buildMacroProgressRows", () => {
  it("keeps macro percentages above 100 for the displayed value", () => {
    const rows = buildMacroProgressRows(
      { protein: 60, fat: 30, carbs: 120, fiber: 0 },
      { protein: 50, fat: 60, carbs: 100 },
    );

    expect(rows.find((row) => row.key === "protein")?.percent).toBe(120);
    expect(rows.find((row) => row.key === "fat")?.percent).toBe(50);
    expect(rows.find((row) => row.key === "carbs")?.percent).toBe(120);
  });
});
