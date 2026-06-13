import assert from "node:assert/strict";
import test from "node:test";

import { createMemoryStorageAdapter } from "../src/lib/storageAdapter.js";
import {
  createTranslator,
  loadLocalePreference,
  LOCALE_STORAGE_KEY,
  localeOptions,
  messageCatalog,
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
  assert.equal(translate("es", "onboarding.title"), "Primer uso");
  assert.equal(translate("es", "measurement.title"), "Medidas");
  assert.equal(translate("es", "measurement.field.waistCircumference.label"), "Cintura");
  assert.equal(translate("es", "diet.title"), "Dieta");
  assert.equal(translate("es", "diet.search.button"), "Buscar comida");
  assert.equal(
    translate("es", "diet.target.line", { target: 3400, unit: "mg", percent: 14 }),
    "Objetivo 3400 mg / 14%"
  );
  assert.equal(
    translate("es", "diet.status.foundFoods", { count: 1 }),
    "1 alimento(s) encontrado(s)."
  );
  assert.equal(translate("es", "strategy.title"), "Explorador de estrategias");
  assert.equal(
    translate("es", "strategy.loadedSummary", { outcomes: 8, sources: 0, caseLogs: 4 }),
    "8 resultado(s) cargado(s) con 0 enlace(s) de fuente revisada(s) y 4 caso(s)."
  );
  assert.equal(
    translate("es", "strategy.point.aria", {
      name: "Entrada",
      efficacy: 51,
      risk: 22,
      confidence: "confianza mixta"
    }),
    "Entrada: eficacia 51, riesgo 22, confianza mixta"
  );
  assert.equal(translate("bad-locale", "nav.buildPlan"), "Build Plan");
  assert.equal(translate("es", "missing.key"), "missing.key");
  assert.equal(
    translate(
      "es",
      "onboarding.completion.text",
      { completeCount: 2, totalCount: 5 },
      "{completeCount} of {totalCount}"
    ),
    "2 de 5 campos basicos confirmados"
  );
  assert.equal(
    translate("es", "missing.{name}", { name: "Taylor" }, "Fallback {name}"),
    "Fallback Taylor"
  );

  const t = createTranslator("es");
  assert.equal(t("nav.section.diet"), "Dieta");
  assert.equal(t("measurement.unit.metric"), "Metrico");
  assert.equal(translate("en", "hello.{name}", { name: "Taylor" }), "hello.Taylor");
});

test("builds locale option labels for the active locale", () => {
  assert.deepEqual(translatedLocaleOptions("es"), [
    { id: "en", label: "English" },
    { id: "es", label: "Espanol" }
  ]);
});

test("keeps Spanish message coverage aligned with English keys", () => {
  const englishKeys = Object.keys(messageCatalog.en).sort();
  const spanishKeys = Object.keys(messageCatalog.es).sort();

  assert.deepEqual(spanishKeys, englishKeys);
});
