import assert from "node:assert/strict";
import test from "node:test";

import { createMemoryStorageAdapter } from "../src/lib/storageAdapter.js";
import {
  applyThemePreference,
  loadThemePreference,
  normalizeTheme,
  persistThemePreference,
  THEME_STORAGE_KEY
} from "../src/lib/theme.js";

test("normalizes theme choices to the cafe default", () => {
  assert.equal(normalizeTheme("cafe"), "cafe");
  assert.equal(normalizeTheme("graphite"), "graphite");
  assert.equal(normalizeTheme("unknown"), "cafe");
  assert.equal(normalizeTheme(undefined), "cafe");
});

test("loads and persists theme preference through the storage adapter", () => {
  const adapter = createMemoryStorageAdapter();

  assert.equal(loadThemePreference(adapter), "cafe");

  persistThemePreference("graphite", adapter);
  assert.equal(loadThemePreference(adapter), "graphite");
  assert.equal(adapter.dump()[THEME_STORAGE_KEY], JSON.stringify("graphite"));

  persistThemePreference("not-a-theme", adapter);
  assert.equal(loadThemePreference(adapter), "cafe");
});

test("applies normalized theme data to a document root", () => {
  const root = {
    dataset: {},
    style: {}
  };

  assert.equal(applyThemePreference("graphite", root), "graphite");
  assert.equal(root.dataset.theme, "graphite");
  assert.equal(root.style.colorScheme, "dark");

  assert.equal(applyThemePreference("bad-theme", root), "cafe");
  assert.equal(root.dataset.theme, "cafe");
  assert.equal(root.style.colorScheme, "light");
});
