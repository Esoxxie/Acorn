import { describe, expect, it, vi } from "vitest";
import { applyThemePreference, resolveThemePreference } from "../lib/theme";

describe("theme helpers", () => {
  it("resolves system theme from matchMedia", () => {
    vi.stubGlobal("window", {
      matchMedia: vi.fn().mockReturnValue({ matches: true }),
    });

    expect(resolveThemePreference("system")).toBe("dark");
    expect(resolveThemePreference("light")).toBe("light");
  });

  it("applies the resolved theme to the document", () => {
    applyThemePreference("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
