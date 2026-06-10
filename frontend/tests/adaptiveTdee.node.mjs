import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAdaptiveTdeeEstimate
} from "../src/lib/adaptiveTdee.js";

function datedLog(index, { weight, calories = 2300, start = "2026-06-01T08:00:00.000Z" }) {
  const date = new Date(start);
  date.setDate(date.getDate() + index);

  return {
    id: `daily-${index}`,
    type: "daily-weight",
    weight,
    calories,
    createdAt: date.toISOString()
  };
}

test("estimates adaptive TDEE from reliable weight and calorie logs", () => {
  const checkIns = Array.from({ length: 15 }, (_, index) =>
    datedLog(index, {
      weight: 80 - index / 14,
      calories: 2300
    })
  );

  const estimate = buildAdaptiveTdeeEstimate(checkIns);

  assert.equal(estimate.status, "ready");
  assert.equal(estimate.entriesUsed, 15);
  assert.equal(estimate.daySpan, 14);
  assert.equal(estimate.weightDeltaKg, -1);
  assert.equal(estimate.averageCalories, 2300);
  assert.equal(estimate.estimatedTdee, 2850);
  assert.equal(estimate.confidence, "medium");
  assert.equal(estimate.rangeLow, 2625);
  assert.equal(estimate.rangeHigh, 3075);
});

test("returns needs-data until there are enough reliable dated logs", () => {
  const estimate = buildAdaptiveTdeeEstimate([
    datedLog(0, { weight: 82, calories: 2400 }),
    datedLog(1, { weight: 81.8, calories: 2350 })
  ]);

  assert.equal(estimate.status, "needs-data");
  assert.equal(estimate.entriesUsed, 2);
  assert.match(estimate.reason, /Needs 4 reliable/);
});

test("excludes logs inside weight reliability windows", () => {
  const checkIns = [
    datedLog(0, { weight: 90, calories: 2600 }),
    {
      id: "procedure",
      type: "life-event",
      eventMode: "procedure",
      affectedFields: ["weight"],
      durationDays: 3,
      createdAt: "2026-06-02T08:00:00.000Z"
    },
    datedLog(1, { weight: 94, calories: 2800 }),
    datedLog(2, { weight: 95, calories: 2900 }),
    datedLog(3, { weight: 93, calories: 2700 }),
    datedLog(5, { weight: 89.5, calories: 2600 }),
    datedLog(6, { weight: 89.3, calories: 2600 }),
    datedLog(7, { weight: 89, calories: 2600 })
  ];

  const estimate = buildAdaptiveTdeeEstimate(checkIns, { minEntries: 4, minDays: 7 });

  assert.equal(estimate.status, "ready");
  assert.equal(estimate.entriesUsed, 4);
  assert.equal(estimate.excludedEntries, 3);
  assert.equal(estimate.startWeight, 90);
  assert.equal(estimate.endWeight, 89);
  assert.equal(estimate.estimatedTdee, 3700);
});
