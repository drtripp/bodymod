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
  assert.equal(translate("es", "account.title"), "Cuenta, registros y objetivos");
  assert.equal(translate("es", "account.create.button"), "Crear cuenta");
  assert.equal(
    translate("es", "account.identity.status.verified", {
      email: "l***@example.com"
    }),
    "Identidad de email verificada para l***@example.com. Los registros locales permanecen en este dispositivo salvo que uses sync cifrado."
  );
  assert.equal(
    translate("es", "account.report.counts", {
      snapshots: 1,
      protocols: 2,
      procedures: 3,
      labs: 4,
      workouts: 5,
      photos: 6,
      faces: 7
    }),
    "1 snapshot(s) / 2 protocolo(s) / 3 procedimiento(s) / 4 resultado(s) lab / 5 entrenamiento(s) / 6 foto(s) / 7 escaneo(s) facial(es)"
  );
  assert.equal(
    translate("es", "account.share.activeLink", {
      url: "https://bodymod.test/?share=abc"
    }),
    "Enlace activo: https://bodymod.test/?share=abc"
  );
  assert.equal(
    translate("es", "account.widget.status.saved", {
      streak: "2 week streak",
      next: "Next check-in Jun 20"
    }),
    "Snapshot de widget guardado: 2 week streak; Next check-in Jun 20."
  );
  assert.equal(
    translate("es", "account.health.status.prepared", { count: 7 }),
    "Preparados 7 item(s) de escritura HealthKit/Health Connect. Los plugins nativos aun no estan configurados, asi que no se escribieron datos."
  );
  assert.equal(
    translate("es", "account.live.versionLatest", { current: "0.1.0", latest: "0.1.1" }),
    "Ejecutando 0.1.0 / ultima 0.1.1"
  );
  assert.equal(
    translate("es", "account.backup.downloadStatus", {
      snapshots: 1,
      checkIns: 2,
      goals: 3,
      protocols: 4,
      procedures: 5,
      labs: 6,
      referrals: 7,
      photos: 8
    }),
    "Backup cifrado descargado: 1 snapshot(s), 2 check-in(s), 3 objetivo(s), 4 protocolo(s), 5 procedimiento(s), 6 resultado(s) de laboratorio, 7 credito(s) de referido y 8 item(s) de manifiesto de fotos."
  );
  assert.equal(
    translate("es", "account.nativeBackup.status.saved", {
      snapshots: 1,
      checkIns: 2,
      photos: 3
    }),
    "Backup nativo cifrado guardado: 1 snapshot(s), 2 check-in(s) y 3 item(s) de manifiesto de fotos."
  );
  assert.equal(
    translate("es", "account.sync.status.created", {
      revision: 3,
      checkIns: 4,
      goals: 5,
      photos: 6
    }),
    "Vault de sync cifrado creado en revision 3. Guarda el token de sync antes de usar otro navegador. Subidos 4 check-in(s), 5 objetivo(s) y 6 item(s) de manifiesto de fotos."
  );
  assert.equal(
    translate("es", "account.autoSync.status.ran", {
      revision: 7,
      restore: "Backup restaurado."
    }),
    "Vista previa de sync automatico ejecutada en revision 7. Backup restaurado."
  );
  assert.equal(
    translate("es", "account.api.status.read", { revision: 8 }),
    "API de datos personales leyo vault de sync cifrado revision 8. No se devolvieron medidas en texto plano."
  );
  assert.equal(
    translate("es", "account.entitlements.status.waitlistSaved", { count: 2 }),
    "Guardado en la waitlist Pro local. 2 registro(s) guardado(s) en este navegador."
  );
  assert.equal(
    translate("es", "account.entitlements.referral.summary", {
      count: 1,
      months: 1
    }),
    "1 credito(s) local(es), 1 mes(es) Pro futuro(s)."
  );
  assert.equal(
    translate("es", "account.entitlements.referral.inviteText", {
      code: "BM-TEST123"
    }),
    "Prueba Body Cafe con mi codigo de referido BM-TEST123. Los creditos Pro futuros son opcionales; el tracking y las exportaciones siguen gratis."
  );
  assert.equal(
    translate("es", "account.explainer.response.risk", { risk: 42 }),
    "riesgo 42"
  );
  assert.equal(
    translate("es", "account.face.status.detected", { count: 478 }),
    "478 landmarks detectados localmente."
  );
  assert.equal(
    translate("es", "account.face.confidence", { confidence: "media" }),
    "confianza media"
  );
  assert.equal(
    translate("es", "account.procedure.status.loaded", { count: 3 }),
    "3 seed(s) de tipos de procedimiento cargados."
  );
  assert.equal(
    translate("es", "account.procedure.caseSummary", {
      label: "Procedimiento",
      fields: "waistCircumference",
      days: 28,
      snapshots: 1,
      photos: 2,
      category: "body"
    }),
    "Procedimiento: waistCircumference pausado(s) por 28 dia(s); 1 snapshot(s), 2 foto(s) de body."
  );
  assert.equal(
    translate("es", "account.bloodwork.status.loaded", { count: 4 }),
    "4 seed(s) de marcadores de laboratorio cargados."
  );
  assert.equal(
    translate("es", "account.workout.status.loaded", { exercises: 6, programs: 2 }),
    "6 seed(s) de ejercicios y 2 programa(s) cargados."
  );
  assert.equal(
    translate("es", "account.photo.status.saved", { category: "body" }),
    "Foto body guardada localmente."
  );
  assert.equal(
    translate("es", "account.photo.streamCount", { category: "Cuerpo", count: 2 }),
    "Cuerpo 2"
  );
  assert.equal(
    translate("es", "account.export.jsonStatus", {
      snapshots: 1,
      checkIns: 2,
      procedures: 3,
      labs: 4,
      referrals: 5,
      diet: 6,
      fluids: 7,
      photos: 8
    }),
    "Exportacion JSON descargada: 1 snapshot(s), 2 check-in(s), 3 procedimiento(s), 4 resultado(s) de laboratorio, 5 credito(s) de referido, 6 registro(s) de dieta, 7 registro(s) de fluidos y 8 item(s) de manifiesto de fotos."
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
