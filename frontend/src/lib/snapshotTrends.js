import { comparisonMetrics } from "./comparison.js";

export const measurementNoiseSd = {
  height: 0.6,
  weight: 0.7,
  headCircumference: 0.5,
  wristCircumference: 0.4,
  neckCircumference: 0.8,
  biacromialWidth: 0.8,
  bideltoidWidth: 0.8,
  bideltoidCircumference: 1.5,
  armpitCircumference: 1.5,
  nippleCircumference: 1.5,
  waistCircumference: 1.5,
  pantWaistCircumference: 1.5,
  underbustCircumference: 1.2,
  hipCircumference: 1.2,
  upperThighCircumference: 1.0,
  midThighCircumference: 1.0,
  calfCircumference: 0.7,
  bicepCircumference: 0.7,
  upperForearmCircumference: 0.6
};

const chartMetricKeys = [
  "weight",
  "waistCircumference",
  "bideltoidCircumference",
  "hipCircumference"
];

const chartMetrics = comparisonMetrics.filter(([key]) => chartMetricKeys.includes(key));

function pointString(points) {
  return points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
}

function bandPath(upperPoints, lowerPoints) {
  if (!upperPoints.length || !lowerPoints.length) {
    return "";
  }

  const [first, ...rest] = upperPoints;
  const upper = [`M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`]
    .concat(rest.map((point) => `L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`));
  const lower = lowerPoints
    .slice()
    .reverse()
    .map((point) => `L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`);

  return [...upper, ...lower, "Z"].join(" ");
}

export function noiseSdForMetric(metricKey) {
  return measurementNoiseSd[metricKey] ?? 1;
}

export function buildSnapshotTrendChart(snapshots) {
  if (!Array.isArray(snapshots) || snapshots.length < 2) {
    return null;
  }

  const orderedSnapshots = snapshots.slice().reverse();
  const width = 360;
  const height = 150;
  const padding = 18;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const series = chartMetrics.map(([key, label, unit], seriesIndex) => {
    const values = orderedSnapshots.map((snapshot) => Number(snapshot.measurements[key]));
    const noiseSd = noiseSdForMetric(key);
    const min = Math.min(...values.map((value) => value - noiseSd));
    const max = Math.max(...values.map((value) => value + noiseSd));
    const range = max - min || 1;
    const toPoint = (value, index) => {
      const x =
        padding +
        (orderedSnapshots.length === 1
          ? innerWidth / 2
          : (index / (orderedSnapshots.length - 1)) * innerWidth);
      const y = padding + innerHeight - ((value - min) / range) * innerHeight;

      return { x, y };
    };
    const points = values.map(toPoint);
    const upperNoisePoints = values.map((value, index) => toPoint(value + noiseSd, index));
    const lowerNoisePoints = values.map((value, index) => toPoint(value - noiseSd, index));

    return {
      key,
      label,
      unit,
      seriesIndex,
      points: pointString(points),
      noiseBandPath: bandPath(upperNoisePoints, lowerNoisePoints),
      noiseSd,
      latest: values[values.length - 1],
      noiseLabel: `+/-${noiseSd} ${unit}`
    };
  });

  return { width, height, series };
}
