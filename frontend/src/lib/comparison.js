export const comparisonMetrics = [
  ["height", "Height", "cm"],
  ["weight", "Weight", "kg"],
  ["bideltoidCircumference", "Shoulder mass", "cm"],
  ["waistCircumference", "Waist", "cm"],
  ["hipCircumference", "Hip", "cm"],
  ["upperThighCircumference", "Upper thigh", "cm"],
  ["bicepCircumference", "Bicep", "cm"]
];

export function summarizeMeasurementDiff(current, baseline) {
  if (!baseline) {
    return [];
  }

  return comparisonMetrics.map(([key, label, unit]) => {
    const currentValue = Number(current[key]);
    const baselineValue = Number(baseline[key]);
    const delta = currentValue - baselineValue;

    return {
      key,
      label,
      unit,
      currentValue,
      baselineValue,
      delta,
      direction: delta > 0 ? "up" : delta < 0 ? "down" : "same"
    };
  });
}

export function summarizeSnapshotTrend(snapshots) {
  if (!Array.isArray(snapshots) || snapshots.length < 2) {
    return null;
  }

  const latest = snapshots[0];
  const baseline = snapshots[snapshots.length - 1];

  return {
    latest,
    baseline,
    metrics: summarizeMeasurementDiff(latest.measurements, baseline.measurements)
  };
}
