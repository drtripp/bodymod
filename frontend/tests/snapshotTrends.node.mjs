import assert from "node:assert/strict";
import test from "node:test";

import {
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
