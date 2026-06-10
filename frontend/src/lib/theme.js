import { readJsonSync, writeJsonSync } from "./storageAdapter.js";

export const THEME_STORAGE_KEY = "bodymod:theme:v1";

export const themeOptions = [
  {
    id: "cafe",
    label: "Cafe"
  },
  {
    id: "graphite",
    label: "Graphite"
  }
];

export function normalizeTheme(value) {
  return themeOptions.some((option) => option.id === value) ? value : "cafe";
}

export function loadThemePreference(adapter) {
  const storedTheme = readJsonSync(THEME_STORAGE_KEY, "cafe", adapter);
  return normalizeTheme(storedTheme);
}

export function persistThemePreference(theme, adapter) {
  writeJsonSync(THEME_STORAGE_KEY, normalizeTheme(theme), adapter);
}

export function applyThemePreference(theme, root = globalThis.document?.documentElement) {
  if (!root) {
    return normalizeTheme(theme);
  }

  const normalizedTheme = normalizeTheme(theme);
  root.dataset.theme = normalizedTheme;
  root.style.colorScheme = normalizedTheme === "graphite" ? "dark" : "light";
  return normalizedTheme;
}
