import assert from "node:assert/strict";
import test from "node:test";

import { createMemoryStorageAdapter } from "../src/lib/storageAdapter.js";
import {
  createTranslator,
  loadLocalePreference,
  LOCALE_STORAGE_KEY,
  localeOptions,
  normalizeLocale,
  persistLocalePreference,
  translate,
  translatedLocaleOptions
} from "../src/lib/i18n.js";

test("normalizes locales to the English default", () => {
  assert.equal(normalizeLocale("en"), "en");
  assert.equal(normalizeLocale("es"), "es");
  assert.equal(normalizeLocale("fr"), "en");
  assert.equal(normalizeLocale(undefined), "en");
  assert.deepEqual(localeOptions.map((option) => option.id), ["en", "es"]);
});

test("loads and persists locale preference through the storage adapter", () => {
  const adapter = createMemoryStorageAdapter();

  assert.equal(loadLocalePreference(adapter), "en");

  persistLocalePreference("es", adapter);
  assert.equal(loadLocalePreference(adapter), "es");
  assert.equal(adapter.dump()[LOCALE_STORAGE_KEY], JSON.stringify("es"));

  persistLocalePreference("bad-locale", adapter);
  assert.equal(loadLocalePreference(adapter), "en");
});

test("translates known keys, falls back to English, and interpolates values", () => {
  assert.equal(translate("en", "nav.buildPlan"), "Build Plan");
  assert.equal(translate("es", "nav.buildPlan"), "Crear plan");
  assert.equal(translate("bad-locale", "nav.buildPlan"), "Build Plan");
  assert.equal(translate("es", "missing.key"), "missing.key");

  const t = createTranslator("es");
  assert.equal(t("nav.section.diet"), "Dieta");
  assert.equal(translate("en", "hello.{name}", { name: "Taylor" }), "hello.Taylor");
});

test("builds locale option labels for the active locale", () => {
  assert.deepEqual(translatedLocaleOptions("es"), [
    { id: "en", label: "English" },
    { id: "es", label: "Espanol" }
  ]);
});
