import { micronutrientTargets } from "./diet.js";

const macroAliases = {
  calories: ["calories", "calorie", "energy", "energykcal", "energy kcal", "kcal"],
  protein: ["protein", "protein g", "proteins", "proteins g"],
  carbs: ["carbs", "carb", "carbohydrates", "carbohydrates g", "total carbohydrate"],
  fat: ["fat", "fat g", "total fat"]
};

const microAliases = {
  fiber: ["fiber", "fiber g", "fibre", "fibre g"],
  sugar: ["sugar", "sugars", "sugar g", "sugars g"],
  sodium: ["sodium", "sodium mg"],
  potassium: ["potassium", "potassium mg"],
  calcium: ["calcium", "calcium mg"],
  iron: ["iron", "iron mg"],
  magnesium: ["magnesium", "magnesium mg"],
  zinc: ["zinc", "zinc mg"],
  vitaminC: ["vitamin c", "vitamin c mg", "vitaminc"],
  vitaminD: ["vitamin d", "vitamin d mcg", "vitamind"],
  vitaminB12: ["vitamin b12", "vitamin b12 mcg", "b12", "vitaminb12"]
};

const dateAliases = ["date", "day", "log date", "logged date"];
const mealAliases = ["meal", "group", "meal name"];
const foodAliases = ["food", "food name", "name", "item", "description"];
const brandAliases = ["brand", "source", "database"];
const servingAliases = ["serving", "serving size", "amount", "quantity"];

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCsvRows(rawValue) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < String(rawValue || "").length; index += 1) {
    const character = rawValue[index];
    const nextCharacter = rawValue[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }
      row.push(cell);
      if (row.some((value) => String(value).trim())) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    cell += character;
  }

  row.push(cell);
  if (row.some((value) => String(value).trim())) {
    rows.push(row);
  }

  return rows;
}

function parseNumber(value) {
  const cleaned = String(value || "")
    .trim()
    .replace(/,/g, "")
    .replace(/[^\d.+-]/g, "");
  const numeric = Number(cleaned);

  return Number.isFinite(numeric) ? numeric : 0;
}

function columnIndex(headers, aliases) {
  return aliases
    .map((alias) => headers.indexOf(normalizeHeader(alias)))
    .find((index) => index >= 0);
}

function valueAt(row, index) {
  return index >= 0 ? String(row[index] || "").trim() : "";
}

function dateFromValue(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (!match) {
      return "";
    }
    const [, month, day, year] = match;
    const fullYear = year.length === 2 ? `20${year}` : year;
    const fallback = new Date(`${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T12:00:00`);
    return Number.isNaN(fallback.getTime()) ? "" : fallback.toISOString();
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return new Date(`${text}T12:00:00`).toISOString();
  }

  return parsed.toISOString();
}

function dateKey(isoValue) {
  return isoValue ? isoValue.slice(0, 10) : "";
}

function entryKey(entry) {
  const macros = entry.macros || {};
  return [
    dateKey(entry.loggedAt),
    String(entry.name || "").trim().toLowerCase(),
    Number(macros.calories || 0).toFixed(1),
    Number(macros.protein || 0).toFixed(1),
    Number(macros.carbs || 0).toFixed(1),
    Number(macros.fat || 0).toFixed(1)
  ].join("|");
}

function resolveColumns(headers) {
  return {
    date: columnIndex(headers, dateAliases),
    meal: columnIndex(headers, mealAliases),
    food: columnIndex(headers, foodAliases),
    brand: columnIndex(headers, brandAliases),
    serving: columnIndex(headers, servingAliases),
    macros: Object.fromEntries(
      Object.entries(macroAliases).map(([key, aliases]) => [key, columnIndex(headers, aliases)])
    ),
    micros: Object.fromEntries(
      Object.entries(microAliases).map(([key, aliases]) => [key, columnIndex(headers, aliases)])
    )
  };
}

function hasRequiredColumns(columns) {
  return columns.date >= 0 && columns.food >= 0;
}

export function parseDietCsvImport(rawValue, { existingEntries = [] } = {}) {
  const rows = parseCsvRows(rawValue);

  if (rows.length < 2) {
    return {
      entries: [],
      invalidRows: [{ rowNumber: 1, reason: "CSV needs a header and at least one food row." }],
      duplicateRows: 0
    };
  }

  const headers = rows[0].map(normalizeHeader);
  const columns = resolveColumns(headers);

  if (!hasRequiredColumns(columns)) {
    return {
      entries: [],
      invalidRows: [{ rowNumber: 1, reason: "CSV needs date and food columns." }],
      duplicateRows: 0
    };
  }

  const seen = new Set((existingEntries || []).map(entryKey));
  const entries = [];
  const invalidRows = [];
  let duplicateRows = 0;

  rows.slice(1).forEach((row, index) => {
    const rowNumber = index + 2;
    const loggedAt = dateFromValue(valueAt(row, columns.date));
    const name = valueAt(row, columns.food);

    if (!loggedAt || !name) {
      invalidRows.push({ rowNumber, reason: "Missing valid date or food name." });
      return;
    }

    const macros = Object.fromEntries(
      Object.entries(columns.macros).map(([key, column]) => [key, parseNumber(valueAt(row, column))])
    );
    const micros = Object.fromEntries(
      micronutrientTargets.map((target) => [
        target.id,
        parseNumber(valueAt(row, columns.micros[target.id]))
      ])
    );
    const meal = valueAt(row, columns.meal);
    const importedEntry = {
      id: crypto.randomUUID(),
      loggedAt,
      name,
      brand: valueAt(row, columns.brand) || meal || "Diet CSV",
      serving: valueAt(row, columns.serving) || "Imported row",
      source: "Diet CSV import",
      servings: 1,
      meal,
      macros,
      micros
    };
    const key = entryKey(importedEntry);

    if (seen.has(key)) {
      duplicateRows += 1;
      return;
    }

    seen.add(key);
    entries.push(importedEntry);
  });

  entries.sort((left, right) => new Date(right.loggedAt) - new Date(left.loggedAt));

  return {
    entries,
    invalidRows,
    duplicateRows
  };
}

export function summarizeDietCsvImport(result) {
  const imported = result.entries.length;
  const skippedParts = [];

  if (result.duplicateRows) {
    skippedParts.push(`${result.duplicateRows} duplicate`);
  }
  if (result.invalidRows.length) {
    skippedParts.push(`${result.invalidRows.length} invalid`);
  }

  return skippedParts.length
    ? `Imported ${imported} food log(s). Skipped ${skippedParts.join(" and ")} row(s).`
    : `Imported ${imported} food log(s).`;
}
