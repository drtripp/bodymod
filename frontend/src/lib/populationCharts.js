import { calculateBodyComposition } from "./bodyComposition.js";

function round(value, digits = 2) {
  return Number(value.toFixed(digits));
}

export const fallbackPopulationReference = {
  version: 1,
  datasetId: "bodymod-dummy-reference-v1",
  label: "Dummy reference scaffold",
  reference: "Approximate adult reference model, not NHANES-calibrated",
  source: "Frontend fallback copy of the backend dummy reference scaffold.",
  notes: [
    "Prototype-only sex-specific normal distributions.",
    "Replace with vetted reference data before production."
  ],
  fields: {
    height: {
      label: "Height",
      unit: "cm",
      min: 120,
      max: 240,
      male: { mean: 176, sd: 7.5 },
      female: { mean: 164, sd: 7 }
    },
    weight: {
      label: "Weight",
      unit: "kg",
      min: 35,
      max: 250,
      male: { mean: 84, sd: 17 },
      female: { mean: 72, sd: 15 }
    },
    headCircumference: {
      label: "Head Circ",
      unit: "cm",
      min: 45,
      max: 70,
      male: { mean: 57, sd: 2.2 },
      female: { mean: 55, sd: 2 }
    },
    neckCircumference: {
      label: "Neck Circ",
      unit: "cm",
      min: 25,
      max: 65,
      male: { mean: 39, sd: 4.5 },
      female: { mean: 33, sd: 3.5 }
    },
    biacromialWidth: {
      label: "Biacromial Width",
      unit: "cm",
      min: 28,
      max: 65,
      male: { mean: 40, sd: 3 },
      female: { mean: 35, sd: 2.8 }
    },
    bideltoidWidth: {
      label: "Bideltoid Width",
      unit: "cm",
      min: 34,
      max: 85,
      male: { mean: 50, sd: 4.5 },
      female: { mean: 43, sd: 4 }
    },
    bideltoidCircumference: {
      label: "Bideltoid Circ",
      unit: "cm",
      min: 70,
      max: 180,
      male: { mean: 116, sd: 12 },
      female: { mean: 98, sd: 10 }
    },
    armpitCircumference: {
      label: "Armpit Circ",
      unit: "cm",
      min: 50,
      max: 190,
      male: { mean: 98, sd: 13 },
      female: { mean: 88, sd: 12 }
    },
    nippleCircumference: {
      label: "Nipple Circ",
      unit: "cm",
      min: 50,
      max: 190,
      male: { mean: 96, sd: 13 },
      female: { mean: 91, sd: 12 }
    },
    underbustCircumference: {
      label: "Underbust",
      unit: "cm",
      min: 50,
      max: 180,
      male: { mean: 92, sd: 12 },
      female: { mean: 80, sd: 10 }
    },
    waistCircumference: {
      label: "Waist",
      unit: "cm",
      min: 45,
      max: 180,
      male: { mean: 99, sd: 14 },
      female: { mean: 89, sd: 15 }
    },
    pantWaistCircumference: {
      label: "Pant Waist",
      unit: "cm",
      min: 45,
      max: 190,
      male: { mean: 96, sd: 14 },
      female: { mean: 88, sd: 14 }
    },
    hipCircumference: {
      label: "Hip/Buttock Circ",
      unit: "cm",
      min: 60,
      max: 200,
      male: { mean: 102, sd: 10 },
      female: { mean: 106, sd: 12 }
    },
    upperThighCircumference: {
      label: "Upper Thigh Circ",
      unit: "cm",
      min: 30,
      max: 110,
      male: { mean: 59, sd: 7 },
      female: { mean: 56, sd: 7 }
    },
    midThighCircumference: {
      label: "Mid Thigh Circ",
      unit: "cm",
      min: 25,
      max: 95,
      male: { mean: 52, sd: 6 },
      female: { mean: 49, sd: 6 }
    },
    calfCircumference: {
      label: "Calf Circ",
      unit: "cm",
      min: 20,
      max: 70,
      male: { mean: 39, sd: 4.5 },
      female: { mean: 36, sd: 4 }
    },
    ankleCircumference: {
      label: "Ankle Circ",
      unit: "cm",
      min: 14,
      max: 40,
      male: { mean: 23, sd: 2 },
      female: { mean: 21, sd: 1.8 }
    },
    bicepCircumference: {
      label: "Bicep Circ",
      unit: "cm",
      min: 18,
      max: 75,
      male: { mean: 34, sd: 5 },
      female: { mean: 29, sd: 4 }
    },
    upperForearmCircumference: {
      label: "Upper Forearm Circ",
      unit: "cm",
      min: 15,
      max: 55,
      male: { mean: 29, sd: 3.5 },
      female: { mean: 24, sd: 3 }
    },
    wristCircumference: {
      label: "Wrist Circ",
      unit: "cm",
      min: 11,
      max: 30,
      male: { mean: 17.5, sd: 1.4 },
      female: { mean: 15.5, sd: 1.2 }
    }
  }
};

const scoreWeights = {
  height: 0.8,
  weight: 0.45,
  headCircumference: 0.2,
  neckCircumference: 0.6,
  biacromialWidth: 0.75,
  bideltoidWidth: 0.8,
  bideltoidCircumference: 1,
  armpitCircumference: 0.7,
  nippleCircumference: 0.6,
  underbustCircumference: 0.45,
  waistCircumference: 0.8,
  pantWaistCircumference: 0.5,
  hipCircumference: 0.9,
  upperThighCircumference: 0.4,
  midThighCircumference: 0.35,
  calfCircumference: 0.35,
  ankleCircumference: 0.2,
  bicepCircumference: 0.45,
  upperForearmCircumference: 0.35,
  wristCircumference: 0.25
};

const metricNotes = {
  height: "Adult height scaffold",
  weight: "Body mass varies strongly with height and composition",
  bideltoidCircumference: "Shoulder circumference proxy",
  waistCircumference: "Waist circumference scaffold",
  hipCircumference: "Hip circumference scaffold",
  neckCircumference: "Neck circumference scaffold"
};

const metricLabels = {
  headCircumference: "Head",
  neckCircumference: "Neck",
  biacromialWidth: "Biacromial width",
  bideltoidWidth: "Shoulder width",
  bideltoidCircumference: "Shoulder mass",
  armpitCircumference: "Upper chest",
  nippleCircumference: "Chest",
  underbustCircumference: "Underbust",
  waistCircumference: "Waist",
  pantWaistCircumference: "Pant waist",
  hipCircumference: "Hip",
  upperThighCircumference: "Upper thigh",
  midThighCircumference: "Mid thigh",
  calfCircumference: "Calf",
  ankleCircumference: "Ankle",
  bicepCircumference: "Bicep",
  upperForearmCircumference: "Forearm",
  wristCircumference: "Wrist"
};

const derivedMetrics = [
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

function numberOrFallback(value, fallback) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeDistribution(distribution = {}, fallback = {}) {
  return {
    mean: numberOrFallback(distribution.mean, fallback.mean ?? 0),
    sd: Math.max(0.001, numberOrFallback(distribution.sd, fallback.sd ?? 1)),
    n: Number.isFinite(Number(distribution.n)) ? Number(distribution.n) : fallback.n
  };
}

export function normalizePopulationReference(referenceData = fallbackPopulationReference) {
  const fields =
    referenceData?.fields && Object.keys(referenceData.fields).length
      ? referenceData.fields
      : fallbackPopulationReference.fields;

  return {
    ...fallbackPopulationReference,
    ...referenceData,
    fields
  };
}

export function buildPopulationMetrics(referenceData = fallbackPopulationReference) {
  const reference = normalizePopulationReference(referenceData);
  const fallbackFields = fallbackPopulationReference.fields;
  const baseMetrics = Object.entries(reference.fields).map(([key, field]) => {
    const fallbackField = fallbackFields[key] || field;
    const sourceReference = String(field.reference || reference.reference || fallbackPopulationReference.reference);
    const sourceTable = String(field.sourceTable || "");
    const sourceNote = field.isVetted
      ? `${sourceReference}${sourceTable ? ` / ${sourceTable}` : ""}`
      : metricNotes[key] || "Backend dummy reference scaffold";

    return {
      key,
      label: metricLabels[key] || String(field.label || fallbackField.label || key),
      unit: String(field.unit || fallbackField.unit || "cm"),
      min: numberOrFallback(field.min, fallbackField.min ?? 0),
      max: numberOrFallback(field.max, fallbackField.max ?? 1),
      male: normalizeDistribution(field.male, fallbackField.male),
      female: normalizeDistribution(field.female, fallbackField.female),
      scoreWeight: scoreWeights[key] ?? 0.3,
      note: sourceNote,
      reference: sourceReference,
      datasetId: String(field.datasetId || reference.datasetId || fallbackPopulationReference.datasetId),
      sourceTable,
      isVetted: Boolean(field.isVetted)
    };
  });

  return [...baseMetrics, ...derivedMetrics];
}

export const POPULATION_METRICS = buildPopulationMetrics();

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

export function getPopulationMetric(key, metrics = POPULATION_METRICS) {
  return metrics.find((metric) => metric.key === key) || metrics[0] || POPULATION_METRICS[0];
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

export function buildScatterPoints(xKey, yKey, metrics = POPULATION_METRICS) {
  const xMetric = getPopulationMetric(xKey, metrics);
  const yMetric = getPopulationMetric(yKey, metrics);

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

export function buildGenderScoreRows(measurements, metrics = POPULATION_METRICS) {
  return metrics.map((metric) => ({
    key: metric.key,
    label: metric.label,
    unit: metric.unit,
    note: metric.note,
    weight: metric.scoreWeight ?? 1,
    value: clampMetricValue(populationMetricValue(measurements, metric), metric),
    score: metricSexScore(populationMetricValue(measurements, metric), metric)
  }));
}

export function aggregateGenderScore(measurements, metrics = POPULATION_METRICS) {
  const rows = buildGenderScoreRows(measurements, metrics);
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
