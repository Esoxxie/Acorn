import { describe, expect, it } from "vitest";
import { getCallableErrorMessage } from "../lib/callable-error";

describe("getCallableErrorMessage", () => {
  it("prefers callable details over a generic internal message", () => {
    expect(
      getCallableErrorMessage({
        message: "internal",
        details: {
          message: "The estimator rejected our response format.",
        },
      }),
    ).toBe("The estimator rejected our response format.");
  });

  it("uses string details directly", () => {
    expect(
      getCallableErrorMessage({
        message: "internal",
        details: "Daily analysis limit reached.",
      }),
    ).toBe("Daily analysis limit reached.");
  });

  it("falls back to a friendly message for bare internal errors", () => {
    expect(getCallableErrorMessage(new Error("internal"), "Friendly fallback")).toBe("Friendly fallback");
  });

  it("keeps a specific error message when one exists", () => {
    expect(getCallableErrorMessage(new Error("Network request failed."))).toBe("Network request failed.");
  });
});
