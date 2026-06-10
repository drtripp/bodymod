import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTrendWeightSeries,
  calculateTrendWeight
} from "../src/lib/account.js";
import {
  buildCheckInHeatmap,
  buildCheckInInsights,
  buildMilestones,
  buildWeeklyDigest,
  buildWeeklyStreak
} from "../src/lib/checkInLoop.js";
import {
  buildReliabilityPauseSummary
} from "../src/lib/reliabilityEvents.js";
import {
  buildLimbSymmetryCheckIn,
  formatLimbSymmetryItem,
  latestLimbSymmetryCheckIn,
  parseLimbSymmetryInput,
  summarizeLimbSymmetrySplits
} from "../src/lib/limbSymmetry.js";
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

test("parses optional left/right limb split logs and summarizes asymmetry", () => {
  const parsed = parseLimbSymmetryInput({
    bicepLeft: "34",
    bicepRight: "36",
    forearmLeft: "",
    forearmRight: "",
    upperThighLeft: "58",
    upperThighRight: "57",
    calfLeft: "38",
    calfRight: "38.2"
  });
  const summary = summarizeLimbSymmetrySplits(parsed.splits);

  assert.equal(parsed.isValid, true);
  assert.deepEqual(
    parsed.splits.map((split) => [split.field, split.average]),
    [
      ["bicepCircumference", 35],
      ["upperThighCircumference", 57.5],
      ["calfCircumference", 38.1]
    ]
  );
  assert.equal(summary.status, "watch");
  assert.equal(summary.largest.field, "bicepCircumference");
  assert.equal(formatLimbSymmetryItem(summary.largest), "Bicep right +2.0 cm (5.7%)");
});

test("builds dated limb symmetry check-ins without making split fields required", () => {
  const empty = buildLimbSymmetryCheckIn({});
  const invalidPair = buildLimbSymmetryCheckIn({ bicepLeft: "35" });
  const valid = buildLimbSymmetryCheckIn(
    {
      bicepLeft: "35",
      bicepRight: "35.2"
    },
    "Even enough for this block."
  );
  const latest = latestLimbSymmetryCheckIn([
    {
      id: "older",
      type: "limb-symmetry",
      createdAt: "2026-06-01T00:00:00.000Z",
      splits: [{ field: "bicepCircumference", label: "Bicep", left: 34, right: 35 }]
    },
    {
      id: "newer",
      type: "limb-symmetry",
      createdAt: "2026-06-05T00:00:00.000Z",
      splits: valid.checkIn.splits
    }
  ]);

  assert.equal(empty.checkIn, null);
  assert.equal(empty.errors.form, "Enter at least one left/right pair.");
  assert.equal(invalidPair.checkIn, null);
  assert.equal(invalidPair.errors.bicepRight, "Enter a number");
  assert.equal(valid.checkIn.type, "limb-symmetry");
  assert.deepEqual(valid.checkIn.measurements, { bicepCircumference: 35.1 });
  assert.equal(valid.checkIn.note, "Even enough for this block.");
  assert.equal(latest.id, "newer");
});

test("pauses affected trend inference inside reliability event windows", () => {
  const checkIns = [
    {
      id: "baseline",
      type: "daily-weight",
      weight: 100,
      createdAt: "2026-06-01T00:00:00.000Z"
    },
    {
      id: "procedure",
      type: "life-event",
      eventMode: "procedure",
      affectedFields: ["weight", "waistCircumference"],
      durationDays: 3,
      createdAt: "2026-06-02T00:00:00.000Z"
    },
    {
      id: "swollen",
      type: "daily-weight",
      weight: 105,
      createdAt: "2026-06-03T00:00:00.000Z"
    },
    {
      id: "after-window",
      type: "daily-weight",
      weight: 101,
      createdAt: "2026-06-06T00:00:00.000Z"
    }
  ];
  const dailyEntries = checkIns.filter((checkIn) => checkIn.type === "daily-weight");
  const series = buildTrendWeightSeries(checkIns, 0.25);
  const trend = calculateTrendWeight(checkIns, 0.25);
  const pause = buildReliabilityPauseSummary({
    checkIns,
    fieldName: "weight",
    entries: dailyEntries,
    now: Date.parse("2026-06-03T12:00:00.000Z")
  });

  assert.deepEqual(series.map((point) => point.id), ["baseline", "after-window"]);
  assert.deepEqual(series.map((point) => point.trend), [100, 100.25]);
  assert.deepEqual(trend, { value: 100.3, delta: 0.3, count: 2 });
  assert.equal(pause.pausedEntryCount, 1);
  assert.equal(pause.isPaused, true);
});

test("builds weekly streak, heatmap, milestones, insights, and digest", () => {
  const now = Date.parse("2026-06-17T12:00:00.000Z");
  const checkIns = [
    {
      id: "daily-1",
      type: "daily-weight",
      weight: 82,
      createdAt: "2026-06-16T12:00:00.000Z"
    },
    {
      id: "weekly-1",
      type: "weekly-measurements",
      createdAt: "2026-06-03T12:00:00.000Z",
      measurements: {
        waistCircumference: 84,
        hipCircumference: 100,
        bideltoidCircumference: 118
      }
    },
    {
      id: "weekly-2",
      type: "weekly-measurements",
      createdAt: "2026-06-10T12:00:00.000Z",
      measurements: {
        waistCircumference: 82,
        hipCircumference: 99,
        bideltoidCircumference: 119
      }
    }
  ];

  const streak = buildWeeklyStreak(checkIns, now);
  const heatmap = buildCheckInHeatmap(checkIns, now, 14);
  const milestones = buildMilestones({
    checkIns,
    snapshots: [{ id: "snap" }],
    protocols: [{ id: "protocol" }],
    now
  });
  const insights = buildCheckInInsights({
    checkIns,
    trendWeight: { value: 81.8, delta: -0.2, count: 3 },
    goals: [{ id: "goal" }],
    protocols: [{ status: "active" }],
    snapshots: [{ id: "first" }, { id: "second" }]
  });
  const digest = buildWeeklyDigest({
    checkIns,
    trendWeight: { value: 81.8, delta: -0.2, count: 3 },
    weeklyStreak: streak,
    protocols: [{ status: "active" }],
    milestones
  });

  assert.equal(streak.status, "current");
  assert.equal(streak.current, 2);
  assert.equal(heatmap.find((day) => day.date === "2026-06-10").count, 1);
  assert.equal(milestones.find((item) => item.id === "first-weekly-snapshot").achieved, true);
  assert.ok(insights.some((insight) => insight.includes("Weekly deltas")));
  assert.ok(insights.some((insight) => insight.includes("Snapshot comparison unlocked")));
  assert.ok(digest.some((line) => line.startsWith("Tea: trend weight")));
});

test("suppresses affected weekly deltas during reliability windows", () => {
  const checkIns = [
    {
      id: "weekly-1",
      type: "weekly-measurements",
      createdAt: "2026-06-01T12:00:00.000Z",
      measurements: {
        waistCircumference: 84,
        hipCircumference: 100,
        bideltoidCircumference: 118
      }
    },
    {
      id: "procedure",
      type: "life-event",
      eventMode: "procedure",
      affectedFields: ["waistCircumference", "hipCircumference", "bideltoidCircumference"],
      durationDays: 10,
      createdAt: "2026-06-02T12:00:00.000Z"
    },
    {
      id: "weekly-2",
      type: "weekly-measurements",
      createdAt: "2026-06-08T12:00:00.000Z",
      measurements: {
        waistCircumference: 91,
        hipCircumference: 104,
        bideltoidCircumference: 117
      }
    }
  ];

  const insights = buildCheckInInsights({ checkIns });

  assert.ok(
    insights.some((insight) => insight.includes("Reliability pause covers waist, hip, bideltoid"))
  );
  assert.ok(!insights.some((insight) => insight.startsWith("Weekly deltas")));
  assert.ok(!insights.some((insight) => insight.startsWith("Latest weekly check-in saved waist")));
});
