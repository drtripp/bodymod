import assert from "node:assert/strict";
import test from "node:test";
import {
  parseDietCsvImport,
  summarizeDietCsvImport
} from "../src/lib/dietImport.js";

test("parses MyFitnessPal-style diet CSV rows", () => {
  const raw = [
    "Date,Meal,Food,Calories,Carbs (g),Fat (g),Protein (g),Sodium (mg),Sugar (g)",
    "2026-06-01,Breakfast,Greek yogurt,140,10,1,20,60,7",
    "2026-06-01,Lunch,Chicken rice bowl,520,58,11,43,620,2"
  ].join("\n");
  const result = parseDietCsvImport(raw);

  assert.equal(result.entries.length, 2);
  assert.equal(result.entries[0].name, "Greek yogurt");
  assert.equal(result.entries[0].meal, "Breakfast");
  assert.equal(result.entries[0].source, "Diet CSV import");
  assert.equal(result.entries[0].macros.calories, 140);
  assert.equal(result.entries[0].macros.protein, 20);
  assert.equal(result.entries[0].micros.sodium, 60);
  assert.equal(result.entries[0].micros.sugar, 7);
  assert.equal(summarizeDietCsvImport(result), "Imported 2 food log(s).");
});

test("parses Cronometer-style diet CSV rows with expanded micronutrients", () => {
  const raw = [
    "Date,Group,Food Name,Amount,Energy (kcal),Protein (g),Carbs (g),Fat (g),Fiber (g),Potassium (mg),Magnesium (mg),Vitamin D (mcg),Vitamin B12 (mcg)",
    "06/02/2026,Dinner,Salmon plate,1 plate,610,44,35,28,8,920,110,12.5,4.1"
  ].join("\n");
  const result = parseDietCsvImport(raw);
  const [entry] = result.entries;

  assert.equal(entry.name, "Salmon plate");
  assert.equal(entry.brand, "Dinner");
  assert.equal(entry.serving, "1 plate");
  assert.equal(entry.macros.carbs, 35);
  assert.equal(entry.micros.fiber, 8);
  assert.equal(entry.micros.potassium, 920);
  assert.equal(entry.micros.magnesium, 110);
  assert.equal(entry.micros.vitaminD, 12.5);
  assert.equal(entry.micros.vitaminB12, 4.1);
});

test("skips duplicate imported foods against existing entries", () => {
  const raw = [
    "Date,Meal,Food,Calories,Protein,Carbs,Fat",
    "2026-06-01,Breakfast,Greek yogurt,140,20,10,1",
    "2026-06-01,Breakfast,Greek yogurt,140,20,10,1"
  ].join("\n");
  const first = parseDietCsvImport(raw);
  const second = parseDietCsvImport(raw, { existingEntries: first.entries });

  assert.equal(first.entries.length, 1);
  assert.equal(first.duplicateRows, 1);
  assert.equal(second.entries.length, 0);
  assert.equal(second.duplicateRows, 2);
});

test("reports missing required diet CSV columns and invalid rows", () => {
  const missingColumns = parseDietCsvImport("Food,Calories\nGreek yogurt,140");
  const invalidRows = parseDietCsvImport("Date,Food,Calories\nnot-a-date,Greek yogurt,140");

  assert.equal(missingColumns.entries.length, 0);
  assert.match(missingColumns.invalidRows[0].reason, /date and food/);
  assert.equal(invalidRows.entries.length, 0);
  assert.match(invalidRows.invalidRows[0].reason, /Missing valid date/);
});
