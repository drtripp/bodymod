import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSnapshotHistoryChart,
  buildSnapshotTrendChart,
  noiseSdForMetric
} from "../src/lib/snapshotTrends.js";

const measurements = {
  height: 180,
  weight: 82,
  sex: "male",
  bideltoidCircumference: 118,
  waistCircumference: 80,
  hipCircumference: 96
};

test("builds snapshot trend chart series with measurement-noise bands", () => {
  const chart = buildSnapshotTrendChart([
    {
      id: "latest",
      createdAt: "2026-06-10T00:00:00.000Z",
      measurements: {
        ...measurements,
        weight: 80,
        waistCircumference: 78,
        bideltoidCircumference: 120
      }
    },
    {
      id: "baseline",
      createdAt: "2026-05-10T00:00:00.000Z",
      measurements
    }
  ]);

  assert.ok(chart);
  assert.equal(chart.width, 360);
  assert.equal(chart.series.length, 4);
  const waist = chart.series.find((series) => series.key === "waistCircumference");
  const weight = chart.series.find((series) => series.key === "weight");

  assert.equal(waist.noiseSd, 1.5);
  assert.equal(waist.noiseLabel, "+/-1.5 cm");
  assert.match(waist.noiseBandPath, /^M /);
  assert.ok(waist.noiseBandPath.endsWith("Z"));
  assert.equal(weight.noiseSd, 0.7);
  assert.equal(weight.latest, 80);
});

test("uses documented fallback and returns null without enough snapshots", () => {
  assert.equal(noiseSdForMetric("unknownMetric"), 1);
  assert.equal(buildSnapshotTrendChart([]), null);
  assert.equal(buildSnapshotTrendChart([{ id: "only", measurements }]), null);
});

test("builds range-filtered single-metric history charts with note annotations", () => {
  const chart = buildSnapshotHistoryChart(
    [
      {
        id: "old",
        label: "Old baseline",
        createdAt: "2025-01-01T00:00:00.000Z",
        measurements: { ...measurements, weight: 90 }
      },
      {
        id: "mid",
        label: "Cut start",
        note: "Started calorie target.",
        createdAt: "2026-05-01T00:00:00.000Z",
        measurements: { ...measurements, weight: 86 }
      },
      {
        id: "latest",
        label: "Latest",
        note: "Travel week.",
        createdAt: "2026-06-10T00:00:00.000Z",
        measurements: { ...measurements, weight: 84 }
      }
    ],
    { metricKey: "weight", rangeId: "90d" }
  );

  assert.ok(chart);
  assert.equal(chart.label, "Weight");
  assert.equal(chart.rangeLabel, "90 days");
  assert.equal(chart.count, 2);
  assert.equal(chart.delta, -2);
  assert.equal(chart.noiseLabel, "+/-0.7 kg");
  assert.deepEqual(
    chart.notePoints.map((point) => `${point.id}:${point.note}`),
    ["mid:Started calorie target.", "latest:Travel week."]
  );
  assert.match(chart.noiseBandPath, /^M /);
  assert.ok(chart.pointString.includes(","));
});
