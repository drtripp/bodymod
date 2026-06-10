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

export const snapshotHistoryRangeOptions = [
  { id: "all", label: "All", days: null },
  { id: "90d", label: "90 days", days: 90 },
  { id: "180d", label: "180 days", days: 180 },
  { id: "1y", label: "1 year", days: 365 }
];

export const snapshotHistoryMetricOptions = comparisonMetrics.map(([key, label, unit]) => ({
  key,
  label,
  unit
}));

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

function timestampMs(snapshot) {
  const parsed = new Date(snapshot?.createdAt || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function orderedSnapshots(snapshots = []) {
  return snapshots
    .filter((snapshot) => snapshot?.measurements && Number.isFinite(timestampMs(snapshot)))
    .slice()
    .sort((left, right) => timestampMs(left) - timestampMs(right));
}

function rangeOption(rangeId) {
  return (
    snapshotHistoryRangeOptions.find((option) => option.id === rangeId) ||
    snapshotHistoryRangeOptions[0]
  );
}

function snapshotsInRange(snapshots = [], rangeId = "all") {
  const ordered = orderedSnapshots(snapshots);
  const option = rangeOption(rangeId);

  if (!option.days || ordered.length < 2) {
    return ordered;
  }

  const latestMs = timestampMs(ordered[ordered.length - 1]);
  const cutoff = latestMs - option.days * 24 * 60 * 60 * 1000;
  const filtered = ordered.filter((snapshot) => timestampMs(snapshot) >= cutoff);

  return filtered.length >= 2 ? filtered : ordered.slice(-2);
}

export function buildSnapshotTrendChart(snapshots) {
  if (!Array.isArray(snapshots) || snapshots.length < 2) {
    return null;
  }

  const orderedChartSnapshots = orderedSnapshots(snapshots);
  const width = 360;
  const height = 150;
  const padding = 18;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const series = chartMetrics.map(([key, label, unit], seriesIndex) => {
    const values = orderedChartSnapshots.map((snapshot) => Number(snapshot.measurements[key]));
    const noiseSd = noiseSdForMetric(key);
    const min = Math.min(...values.map((value) => value - noiseSd));
    const max = Math.max(...values.map((value) => value + noiseSd));
    const range = max - min || 1;
    const toPoint = (value, index) => {
      const x =
        padding +
        (orderedChartSnapshots.length === 1
          ? innerWidth / 2
          : (index / (orderedChartSnapshots.length - 1)) * innerWidth);
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

export function buildSnapshotHistoryChart(
  snapshots,
  { metricKey = "weight", rangeId = "all" } = {}
) {
  const metric =
    snapshotHistoryMetricOptions.find((option) => option.key === metricKey) ||
    snapshotHistoryMetricOptions[0];
  const filteredSnapshots = snapshotsInRange(snapshots, rangeId)
    .map((snapshot) => ({
      snapshot,
      value: Number(snapshot.measurements[metric.key])
    }))
    .filter((point) => Number.isFinite(point.value));

  if (filteredSnapshots.length < 2) {
    return null;
  }

  const width = 360;
  const height = 150;
  const padding = 18;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const noiseSd = noiseSdForMetric(metric.key);
  const values = filteredSnapshots.map((point) => point.value);
  const min = Math.min(...values.map((value) => value - noiseSd));
  const max = Math.max(...values.map((value) => value + noiseSd));
  const range = max - min || 1;
  const toPoint = (value, index) => {
    const x =
      padding +
      (filteredSnapshots.length === 1
        ? innerWidth / 2
        : (index / (filteredSnapshots.length - 1)) * innerWidth);
    const y = padding + innerHeight - ((value - min) / range) * innerHeight;
    return { x, y };
  };
  const points = filteredSnapshots.map((point, index) => {
    const chartPoint = toPoint(point.value, index);
    return {
      ...chartPoint,
      id: point.snapshot.id,
      label: point.snapshot.label || "",
      note: point.snapshot.note || "",
      createdAt: point.snapshot.createdAt,
      value: point.value
    };
  });
  const upperNoisePoints = filteredSnapshots.map((point, index) =>
    toPoint(point.value + noiseSd, index)
  );
  const lowerNoisePoints = filteredSnapshots.map((point, index) =>
    toPoint(point.value - noiseSd, index)
  );
  const baseline = filteredSnapshots[0];
  const latest = filteredSnapshots[filteredSnapshots.length - 1];
  const selectedRange = rangeOption(rangeId);

  return {
    width,
    height,
    metricKey: metric.key,
    label: metric.label,
    unit: metric.unit,
    rangeId: selectedRange.id,
    rangeLabel: selectedRange.label,
    points,
    pointString: pointString(points),
    notePoints: points.filter((point) => point.note),
    noiseBandPath: bandPath(upperNoisePoints, lowerNoisePoints),
    noiseSd,
    noiseLabel: `+/-${noiseSd} ${metric.unit}`,
    baseline: {
      value: baseline.value,
      createdAt: baseline.snapshot.createdAt,
      label: baseline.snapshot.label || ""
    },
    latest: {
      value: latest.value,
      createdAt: latest.snapshot.createdAt,
      label: latest.snapshot.label || ""
    },
    delta: Number((latest.value - baseline.value).toFixed(2)),
    count: filteredSnapshots.length
  };
}
