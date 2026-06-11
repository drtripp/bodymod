import assert from "node:assert/strict";
import test from "node:test";
import {
  POPULATION_METRICS,
  aggregateGenderScore,
  buildPopulationMetrics,
  buildGenderScoreRows,
  buildScatterPoints,
  clampMetricValue,
  genderScoreLabel,
  getPopulationMetric,
  metricSexScore,
  normalPdf,
  populationMetricValue
} from "../src/lib/populationCharts.js";

test("resolves known and fallback population metrics", () => {
  assert.equal(getPopulationMetric("height").label, "Height");
  assert.equal(getPopulationMetric("unknown-metric").key, POPULATION_METRICS[0].key);
  assert.ok(POPULATION_METRICS.some((metric) => metric.key === "ankleCircumference"));
  assert.ok(POPULATION_METRICS.some((metric) => metric.key === "frameIndex"));
});

test("clamps user values to metric domains", () => {
  const height = getPopulationMetric("height");

  assert.equal(clampMetricValue(120, height), height.min);
  assert.equal(clampMetricValue(300, height), height.max);
  assert.equal(clampMetricValue(180, height), 180);
  assert.equal(clampMetricValue(Number.NaN, height), height.min);
});

test("builds population metrics from backend reference data", () => {
  const metrics = buildPopulationMetrics({
    version: 1,
    datasetId: "test-reference",
    label: "Test reference",
    reference: "Test reference label",
    source: "Test source",
    fields: {
      height: {
        label: "Stature",
        unit: "cm",
        min: 100,
        max: 250,
        male: { mean: 180, sd: 8, n: 100 },
        female: { mean: 166, sd: 7, n: 120 },
        datasetId: "test-backed-source",
        reference: "Test source adults",
        sourceTable: "Table 1",
        isVetted: true
      }
    }
  });

  const height = getPopulationMetric("height", metrics);
  assert.equal(height.label, "Stature");
  assert.equal(height.male.mean, 180);
  assert.equal(height.male.n, 100);
  assert.equal(height.datasetId, "test-backed-source");
  assert.equal(height.isVetted, true);
  assert.match(height.note, /Test source adults/);
  assert.ok(metrics.some((metric) => metric.key === "waistHipRatio"));
});

test("builds deterministic sex-coded scatter points", () => {
  const points = buildScatterPoints("height", "weight");

  assert.equal(points.length, 16);
  assert.equal(points.filter((point) => point.sex === "female").length, 8);
  assert.equal(points.filter((point) => point.sex === "male").length, 8);
  assert.deepEqual(points, buildScatterPoints("height", "weight"));

  for (const point of points) {
    assert.ok(point.x >= getPopulationMetric("height").min);
    assert.ok(point.x <= getPopulationMetric("height").max);
    assert.ok(point.y >= getPopulationMetric("weight").min);
    assert.ok(point.y <= getPopulationMetric("weight").max);
  }
});

test("normal density peaks at the mean", () => {
  const metric = getPopulationMetric("waistCircumference");
  const peak = normalPdf(metric.male.mean, metric.male.mean, metric.male.sd);
  const offMean = normalPdf(metric.male.mean + metric.male.sd * 2, metric.male.mean, metric.male.sd);

  assert.ok(peak > offMean);
  assert.ok(peak > 0);
});

test("computes signed gender score rows", () => {
  const measurements = {
    height: 176,
    weight: 84,
    sex: "male",
    headCircumference: 57,
    neckCircumference: 39,
    biacromialWidth: 40,
    bideltoidWidth: 50,
    waistCircumference: 99,
    bideltoidCircumference: 116,
    armpitCircumference: 98,
    nippleCircumference: 96,
    underbustCircumference: 92,
    pantWaistCircumference: 96,
    hipCircumference: 106,
    upperThighCircumference: 59,
    midThighCircumference: 52,
    calfCircumference: 39,
    bicepCircumference: 34,
    upperForearmCircumference: 29,
    wristCircumference: 17,
    ankleCircumference: 23
  };
  const rows = buildGenderScoreRows(measurements);

  assert.equal(rows.length, POPULATION_METRICS.length);
  assert.ok(rows.length > 20);
  assert.ok(rows.some((row) => row.key === "ffmi"));
  assert.ok(rows.some((row) => row.key === "frameIndex"));
  assert.equal(populationMetricValue(measurements, getPopulationMetric("waistHipRatio")), 0.93);
  assert.equal(populationMetricValue(measurements, getPopulationMetric("frameIndex")), 22.73);
  assert.ok(metricSexScore(116, getPopulationMetric("bideltoidCircumference")) < 0);
  assert.ok(metricSexScore(106, getPopulationMetric("hipCircumference")) > 0);
  assert.ok(
    aggregateGenderScore({
      ...measurements,
      hipCircumference: 102,
    }) < 0
  );
  assert.equal(genderScoreLabel(0), "Androgynous range");
  assert.equal(genderScoreLabel(1), "Female-leaning");
  assert.equal(genderScoreLabel(-1), "Male-leaning");
});
