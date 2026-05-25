import { describe, expect, it } from "vitest";
import { createDemoEstimate } from "../lib/demo-estimate";

describe("createDemoEstimate refinement", () => {
  it("creates a base estimate based on keywords", () => {
    const estimate = createDemoEstimate({
      mode: "manual_ai",
      manualText: "Toast mit Avocado",
    });

    expect(estimate.items).toHaveLength(2);
    expect(estimate.items[0].name).toBe("Toast");
    expect(estimate.items[1].name).toBe("Avocado");
  });

  it("refines estimate by removing items via negative keywords", () => {
    const prior = createDemoEstimate({
      mode: "manual_ai",
      manualText: "Toast mit Avocado und Banana",
    });
    expect(prior.items).toHaveLength(3);

    const refined = createDemoEstimate({
      mode: "manual_ai",
      priorEstimate: prior,
      userContext: "ohne banana",
    });

    expect(refined.items).toHaveLength(2);
    expect(refined.items.some(item => item.name === "Banane")).toBe(false);
    expect(refined.items[0].name).toBe("Toast");
    expect(refined.items[1].name).toBe("Avocado");
  });

  it("refines estimate by adding items via positive keywords", () => {
    const prior = createDemoEstimate({
      mode: "manual_ai",
      manualText: "Toast mit Avocado",
    });
    expect(prior.items).toHaveLength(2);

    const refined = createDemoEstimate({
      mode: "manual_ai",
      priorEstimate: prior,
      userContext: "mit banana",
    });

    expect(refined.items).toHaveLength(3);
    expect(refined.items.some(item => item.name === "Banane")).toBe(true);
  });
});
