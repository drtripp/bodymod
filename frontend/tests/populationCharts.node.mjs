import assert from "node:assert/strict";
import test from "node:test";
import {
  POPULATION_METRICS,
  aggregateGenderScore,
  buildGenderScoreRows,
  buildScatterPoints,
  clampMetricValue,
  genderScoreLabel,
  getPopulationMetric,
  metricSexScore,
  normalPdf
} from "../src/lib/populationCharts.js";

test("resolves known and fallback population metrics", () => {
  assert.equal(getPopulationMetric("height").label, "Height");
  assert.equal(getPopulationMetric("unknown-metric").key, POPULATION_METRICS[0].key);
});

test("clamps user values to metric domains", () => {
  const height = getPopulationMetric("height");

  assert.equal(clampMetricValue(120, height), height.min);
  assert.equal(clampMetricValue(230, height), height.max);
  assert.equal(clampMetricValue(180, height), 180);
  assert.equal(clampMetricValue(Number.NaN, height), height.min);
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
  const rows = buildGenderScoreRows({
    height: 176,
    weight: 84,
    waistCircumference: 99,
    bideltoidCircumference: 116,
    hipCircumference: 106
  });

  assert.equal(rows.length, POPULATION_METRICS.length);
  assert.ok(metricSexScore(116, getPopulationMetric("bideltoidCircumference")) < 0);
  assert.ok(metricSexScore(106, getPopulationMetric("hipCircumference")) > 0);
  assert.ok(
    aggregateGenderScore({
      height: 176,
      weight: 84,
      waistCircumference: 99,
      bideltoidCircumference: 116,
      hipCircumference: 102
    }) < 0
  );
  assert.equal(genderScoreLabel(0), "Androgynous range");
  assert.equal(genderScoreLabel(1), "Female-leaning");
  assert.equal(genderScoreLabel(-1), "Male-leaning");
});
