export const POPULATION_METRICS = [
  {
    key: "height",
    label: "Height",
    unit: "cm",
    min: 145,
    max: 205,
    male: { mean: 176, sd: 7.5 },
    female: { mean: 163, sd: 7 }
  },
  {
    key: "weight",
    label: "Weight",
    unit: "kg",
    min: 40,
    max: 130,
    male: { mean: 84, sd: 17 },
    female: { mean: 72, sd: 15 }
  },
  {
    key: "waistCircumference",
    label: "Waist",
    unit: "cm",
    min: 55,
    max: 125,
    male: { mean: 99, sd: 14 },
    female: { mean: 89, sd: 15 }
  },
  {
    key: "bideltoidCircumference",
    label: "Shoulder mass",
    unit: "cm",
    min: 75,
    max: 150,
    male: { mean: 116, sd: 12 },
    female: { mean: 98, sd: 10 }
  },
  {
    key: "hipCircumference",
    label: "Hip",
    unit: "cm",
    min: 75,
    max: 135,
    male: { mean: 102, sd: 10 },
    female: { mean: 106, sd: 12 }
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
