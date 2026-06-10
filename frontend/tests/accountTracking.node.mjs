import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTrendWeightSeries,
  calculateTrendWeight
} from "../src/lib/account.js";
import {
  buildMeasurementCadenceGroups,
  buildMeasurementDueState,
  getMeasurementCadence
} from "../src/lib/measurementCadence.js";

test("classifies measurement fields into cadence tiers", () => {
  const groups = buildMeasurementCadenceGroups();

  assert.equal(getMeasurementCadence("weight"), "daily");
  assert.equal(getMeasurementCadence("waistCircumference"), "weekly");
  assert.equal(getMeasurementCadence("height"), "monthly");
  assert.equal(getMeasurementCadence("wristCircumference"), "monthly");
  assert.equal(getMeasurementCadence("ankleCircumference"), "monthly");
  assert.equal(getMeasurementCadence("sex"), "profile");
  assert.deepEqual(groups.daily.map((field) => field.name), ["weight"]);
  assert.ok(groups.weekly.some((field) => field.name === "bideltoidCircumference"));
  assert.ok(groups.monthly.some((field) => field.name === "biacromialWidth"));
  assert.ok(groups.monthly.some((field) => field.name === "ankleCircumference"));
});

test("calculates cadence due state from local check-ins", () => {
  const now = Date.parse("2026-06-10T12:00:00.000Z");
  const dueState = buildMeasurementDueState(
    [
      {
        type: "daily-weight",
        weight: 82,
        createdAt: "2026-06-10T06:00:00.000Z"
      },
      {
        type: "weekly-measurements",
        measurements: { waistCircumference: 80 },
        createdAt: "2026-06-02T12:00:00.000Z"
      }
    ],
    now
  );

  assert.equal(dueState.daily.isDue, false);
  assert.equal(dueState.weekly.isDue, true);
  assert.equal(dueState.monthly.isDue, false);
  assert.ok(dueState.weekly.fields.every((field) => field.cadence === "weekly"));
});

test("builds sorted raw and smoothed trend weight series", () => {
  const checkIns = [
    { id: "late", type: "daily-weight", weight: 98, createdAt: "2026-06-03T00:00:00.000Z" },
    { id: "early", type: "daily-weight", weight: 100, createdAt: "2026-06-01T00:00:00.000Z" },
    { id: "mid", type: "daily-weight", weight: 99, createdAt: "2026-06-02T00:00:00.000Z" },
    { id: "weekly", type: "weekly-measurements", measurements: {}, createdAt: "2026-06-04T00:00:00.000Z" }
  ];

  const series = buildTrendWeightSeries(checkIns, 0.25);
  const trend = calculateTrendWeight(checkIns, 0.25);

  assert.deepEqual(series.map((point) => point.id), ["early", "mid", "late"]);
  assert.deepEqual(series.map((point) => point.raw), [100, 99, 98]);
  assert.deepEqual(series.map((point) => point.trend), [100, 99.75, 99.31]);
  assert.deepEqual(trend, { value: 99.3, delta: -0.4, count: 3 });
});
