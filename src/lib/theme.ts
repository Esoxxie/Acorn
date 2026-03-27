import type { ThemePreference } from "../../shared/models";

export const THEME_STORAGE_KEY = "acorn.theme";

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

export function setStoredThemePreference(themePreference: ThemePreference) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(THEME_STORAGE_KEY, themePreference);
}

export function resolveThemePreference(themePreference: ThemePreference): "light" | "dark" {
  if (themePreference !== "system") {
    return themePreference;
  }

  if (typeof window === "undefined" || !window.matchMedia) {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyThemePreference(themePreference: ThemePreference) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = resolveThemePreference(themePreference);
}
