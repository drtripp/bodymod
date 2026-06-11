import { readJsonSync, writeJsonSync } from "./storageAdapter.js";

export const LOCALE_STORAGE_KEY = "bodymod:locale:v1";

export const localeOptions = [
  {
    id: "en",
    label: "English"
  },
  {
    id: "es",
    label: "Espanol"
  }
];

const messages = {
  en: {
    "skip.main": "Skip to main content",
    "nav.section.aria": "Body or diet section",
    "nav.section.body": "Body",
    "nav.section.diet": "Diet",
    "nav.actions.aria": "Account and planning actions",
    "nav.theme.aria": "Theme",
    "nav.theme.cafe": "Cafe",
    "nav.theme.graphite": "Graphite",
    "nav.locale.aria": "Language",
    "locale.en": "English",
    "locale.es": "Espanol",
    "nav.account.aria": "User profile",
    "nav.share.aria": "Share current measurements",
    "nav.buildPlan": "Build Plan",
    "share.copied": "Share link copied.",
    "share.copyFailed": "Copy failed. Select the URL manually.",
    "tabs.aria": "Result and comparison views",
    "tabs.result": "Result",
    "tabs.target": "vs Target",
    "tabs.population": "Gender",
    "strategy.dialog.aria": "Strategy corpus explorer",
    "strategy.close.aria": "Close strategy explorer"
  },
  es: {
    "skip.main": "Saltar al contenido principal",
    "nav.section.aria": "Seccion de cuerpo o dieta",
    "nav.section.body": "Cuerpo",
    "nav.section.diet": "Dieta",
    "nav.actions.aria": "Acciones de cuenta y plan",
    "nav.theme.aria": "Tema",
    "nav.theme.cafe": "Cafe",
    "nav.theme.graphite": "Grafito",
    "nav.locale.aria": "Idioma",
    "locale.en": "English",
    "locale.es": "Espanol",
    "nav.account.aria": "Perfil de usuario",
    "nav.share.aria": "Compartir medidas actuales",
    "nav.buildPlan": "Crear plan",
    "share.copied": "Enlace copiado.",
    "share.copyFailed": "No se pudo copiar. Selecciona la URL manualmente.",
    "tabs.aria": "Vistas de resultado y comparacion",
    "tabs.result": "Resultado",
    "tabs.target": "vs Objetivo",
    "tabs.population": "Genero",
    "strategy.dialog.aria": "Explorador de estrategias",
    "strategy.close.aria": "Cerrar explorador de estrategias"
  }
};

export function normalizeLocale(value) {
  return localeOptions.some((option) => option.id === value) ? value : "en";
}

export function loadLocalePreference(adapter) {
  const storedLocale = readJsonSync(LOCALE_STORAGE_KEY, "en", adapter);
  return normalizeLocale(storedLocale);
}

export function persistLocalePreference(locale, adapter) {
  writeJsonSync(LOCALE_STORAGE_KEY, normalizeLocale(locale), adapter);
}

export function translate(locale, key, values = {}) {
  const normalizedLocale = normalizeLocale(locale);
  const template = messages[normalizedLocale]?.[key] || messages.en[key] || key;

  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template
  );
}

export function createTranslator(locale) {
  return (key, values) => translate(locale, key, values);
}

export function translatedLocaleOptions(locale) {
  const t = createTranslator(locale);

  return localeOptions.map((option) => ({
    ...option,
    label: t(`locale.${option.id}`, {}) || option.label
  }));
}
