import { calculateBodyComposition } from "./bodyComposition.js";

function round(value, digits = 2) {
  return Number(value.toFixed(digits));
}

export const POPULATION_METRICS = [
  {
    key: "height",
    label: "Height",
    unit: "cm",
    min: 145,
    max: 205,
    male: { mean: 176, sd: 7.5 },
    female: { mean: 163, sd: 7 },
    scoreWeight: 0.8,
    note: "Adult height scaffold"
  },
  {
    key: "weight",
    label: "Weight",
    unit: "kg",
    min: 40,
    max: 130,
    male: { mean: 84, sd: 17 },
    female: { mean: 72, sd: 15 },
    scoreWeight: 0.45,
    note: "Body mass varies strongly with height and composition"
  },
  {
    key: "waistCircumference",
    label: "Waist",
    unit: "cm",
    min: 55,
    max: 125,
    male: { mean: 99, sd: 14 },
    female: { mean: 89, sd: 15 },
    scoreWeight: 0.8,
    note: "Waist circumference scaffold"
  },
  {
    key: "bideltoidCircumference",
    label: "Shoulder mass",
    unit: "cm",
    min: 75,
    max: 150,
    male: { mean: 116, sd: 12 },
    female: { mean: 98, sd: 10 },
    scoreWeight: 1,
    note: "Shoulder circumference proxy"
  },
  {
    key: "hipCircumference",
    label: "Hip",
    unit: "cm",
    min: 75,
    max: 135,
    male: { mean: 102, sd: 10 },
    female: { mean: 106, sd: 12 },
    scoreWeight: 0.9,
    note: "Hip circumference scaffold"
  },
  {
    key: "neckCircumference",
    label: "Neck",
    unit: "cm",
    min: 25,
    max: 55,
    male: { mean: 39, sd: 4.5 },
    female: { mean: 33, sd: 3.5 },
    scoreWeight: 0.6,
    note: "Neck circumference scaffold"
  },
  {
    key: "shoulderWaistRatio",
    label: "Shoulder / waist",
    unit: "ratio",
    min: 0.75,
    max: 1.75,
    male: { mean: 1.18, sd: 0.16 },
    female: { mean: 1.1, sd: 0.14 },
    scoreWeight: 0.85,
    note: "Derived from shoulder circumference and waist"
  },
  {
    key: "waistHipRatio",
    label: "Waist / hip",
    unit: "ratio",
    min: 0.55,
    max: 1.15,
    male: { mean: 0.96, sd: 0.09 },
    female: { mean: 0.84, sd: 0.08 },
    scoreWeight: 0.95,
    note: "Derived waist-to-hip ratio"
  },
  {
    key: "waistHeightRatio",
    label: "Waist / height",
    unit: "ratio",
    min: 0.32,
    max: 0.78,
    male: { mean: 0.56, sd: 0.08 },
    female: { mean: 0.55, sd: 0.09 },
    scoreWeight: 0.4,
    note: "Derived waist-to-height ratio"
  },
  {
    key: "ffmi",
    label: "FFMI",
    unit: "index",
    min: 13,
    max: 28,
    male: { mean: 20.2, sd: 2.1 },
    female: { mean: 16.8, sd: 1.8 },
    scoreWeight: 0.75,
    note: "Derived from weight and estimated body fat"
  },
  {
    key: "frameIndex",
    label: "Frame index",
    unit: "index",
    min: 16,
    max: 30,
    male: { mean: 22.7, sd: 1.7 },
    female: { mean: 22.1, sd: 1.5 },
    scoreWeight: 0.45,
    note: "Wrist plus ankle circumference relative to height"
  }
];

const scatterOffsets = [
  [-1.55, -1.05],
  [-1.05, -0.15],
  [-0.7, 0.85],
  [-0.2, -0.55],
  [0.2, 0.25],
  [0.65, 1.15],
  [1.05, -0.85],
  [1.45, 0.45]
];

export function getPopulationMetric(key) {
  return POPULATION_METRICS.find((metric) => metric.key === key) || POPULATION_METRICS[0];
}

export function populationMetricValue(measurements, metric) {
  if (metric.key === "shoulderWaistRatio") {
    return Number(measurements.waistCircumference) > 0
      ? round(Number(measurements.bideltoidCircumference) / Number(measurements.waistCircumference))
      : Number.NaN;
  }

  if (metric.key === "waistHipRatio") {
    return Number(measurements.hipCircumference) > 0
      ? round(Number(measurements.waistCircumference) / Number(measurements.hipCircumference))
      : Number.NaN;
  }

  if (metric.key === "waistHeightRatio") {
    return Number(measurements.height) > 0
      ? round(Number(measurements.waistCircumference) / Number(measurements.height))
      : Number.NaN;
  }

  if (metric.key === "ffmi") {
    return calculateBodyComposition(measurements).ffmi?.ffmi ?? Number.NaN;
  }

  if (metric.key === "frameIndex") {
    const height = Number(measurements.height);
    if (height <= 0) {
      return Number.NaN;
    }

    return round(
      ((Number(measurements.wristCircumference) + Number(measurements.ankleCircumference)) /
        height) *
        100
    );
  }

  return Number(measurements[metric.key]);
}

export function clampMetricValue(value, metric) {
  if (!Number.isFinite(value)) {
    return metric.min;
  }

  return Math.min(metric.max, Math.max(metric.min, value));
}

export function buildScatterPoints(xKey, yKey) {
  const xMetric = getPopulationMetric(xKey);
  const yMetric = getPopulationMetric(yKey);

  return ["female", "male"].flatMap((sex) =>
    scatterOffsets.map(([xOffset, yOffset], index) => ({
      id: `${sex}-${index}`,
      sex,
      x: clampMetricValue(xMetric[sex].mean + xMetric[sex].sd * xOffset, xMetric),
      y: clampMetricValue(yMetric[sex].mean + yMetric[sex].sd * yOffset, yMetric)
    }))
  );
}

export function normalPdf(x, mean, sd) {
  const variance = sd * sd;
  return Math.exp(-((x - mean) * (x - mean)) / (2 * variance)) / (sd * Math.sqrt(2 * Math.PI));
}

export function metricSexScore(value, metric) {
  const clamped = clampMetricValue(Number(value), metric);
  const midpoint = (metric.male.mean + metric.female.mean) / 2;
  const femaleDirection = (metric.female.mean - metric.male.mean) / 2;

  if (!Number.isFinite(clamped) || femaleDirection === 0) {
    return 0;
  }

  return Math.max(-3, Math.min(3, (clamped - midpoint) / femaleDirection));
}

export function buildGenderScoreRows(measurements) {
  return POPULATION_METRICS.map((metric) => ({
    key: metric.key,
    label: metric.label,
    unit: metric.unit,
    note: metric.note,
    weight: metric.scoreWeight ?? 1,
    value: clampMetricValue(populationMetricValue(measurements, metric), metric),
    score: metricSexScore(populationMetricValue(measurements, metric), metric)
  }));
}

export function aggregateGenderScore(measurements) {
  const rows = buildGenderScoreRows(measurements);
  const weightTotal = rows.reduce((sum, row) => sum + row.weight, 0);
  const total = rows.reduce((sum, row) => sum + row.score * row.weight, 0);

  return weightTotal ? total / weightTotal : 0;
}

export function genderScoreLabel(score) {
  const absScore = Math.abs(score);

  if (absScore < 0.35) {
    return "Androgynous range";
  }

  return score > 0 ? "Female-leaning" : "Male-leaning";
}
