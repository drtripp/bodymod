import assert from "node:assert/strict";
import test from "node:test";

import {
  loadUserCheckIns,
  persistUserCheckIns
} from "../src/lib/account.js";
import {
  parseHistoricalWeightCsv,
  summarizeHistoricalWeightImport
} from "../src/lib/historyImport.js";

function installLocalStorageMock() {
  const entries = new Map();
  globalThis.window = {
    localStorage: {
      getItem(key) {
        return entries.has(key) ? entries.get(key) : null;
      },
      setItem(key, value) {
        entries.set(key, String(value));
      },
      removeItem(key) {
        entries.delete(key);
      }
    }
  };
}

test("parses historical CSV with pounds, calories, notes, and duplicate dates", () => {
  const existingCheckIns = [
    {
      type: "daily-weight",
      createdAt: "2026-06-02T12:00:00.000Z",
      weight: 86
    }
  ];
  const csv = [
    "Date,Weight (lbs),Calories,Notes",
    '2026-06-01,190.2,2400,"scale import"',
    "2026-06-02,189.8,2350,already logged",
    "06/03/2026,189,not-a-number,"
  ].join("\n");

  const result = parseHistoricalWeightCsv(csv, { existingCheckIns });

  assert.equal(result.importedCount, 2);
  assert.equal(result.duplicateRows, 1);
  assert.equal(result.invalidRows.length, 0);
  assert.deepEqual(
    result.entries.map((entry) => entry.createdAt.slice(0, 10)),
    ["2026-06-03", "2026-06-01"]
  );
  assert.equal(result.entries[0].weight, 85.73);
  assert.equal(result.entries[0].calories, null);
  assert.equal(result.entries[1].weight, 86.27);
  assert.equal(result.entries[1].calories, 2400);
  assert.equal(result.entries[1].note, "CSV import: scale import");
  assert.equal(
    summarizeHistoricalWeightImport(result),
    "Imported 2 historical log(s); 1 duplicate date(s) skipped."
  );
});

test("parses semicolon-delimited kg exports with decimal commas", () => {
  const csv = ["date;weight_kg;kcal", "2026-06-01;82,4;2312"].join("\n");

  const result = parseHistoricalWeightCsv(csv);

  assert.equal(result.importedCount, 1);
  assert.equal(result.entries[0].weight, 82.4);
  assert.equal(result.entries[0].calories, 2312);
});

test("reports missing required columns and invalid rows", () => {
  const missing = parseHistoricalWeightCsv("date,kcal\n2026-06-01,2400");
  assert.equal(missing.importedCount, 0);
  assert.equal(missing.invalidRows[0].reason, "Missing required weight column.");

  const invalid = parseHistoricalWeightCsv("date,weight\nnope,82\n2026-06-01,0");
  assert.equal(invalid.importedCount, 0);
  assert.deepEqual(
    invalid.invalidRows.map((row) => row.reason),
    ["Invalid date.", "Invalid weight."]
  );
});

test("bulk persistence stores imported check-ins newest first and filters by account", () => {
  installLocalStorageMock();

  const imported = parseHistoricalWeightCsv(
    ["date,weight", "2026-06-01,82.2", "2026-06-03,81.8"].join("\n")
  );
  const accountCheckIns = persistUserCheckIns("account-1", imported.entries);
  persistUserCheckIns("account-2", [
    {
      type: "daily-weight",
      createdAt: "2026-06-04T12:00:00.000Z",
      weight: 90,
      measurements: { weight: 90 }
    }
  ]);

  assert.deepEqual(
    accountCheckIns.map((checkIn) => checkIn.createdAt.slice(0, 10)),
    ["2026-06-03", "2026-06-01"]
  );
  assert.deepEqual(
    loadUserCheckIns("account-1").map((checkIn) => checkIn.weight),
    [81.8, 82.2]
  );
});
