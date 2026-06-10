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

export function buildMeasurementBandDiff(current, baseline) {
  const rows = summarizeMeasurementDiff(current, baseline);
  const maxMagnitude = Math.max(
    1,
    ...rows.map((row) => Math.abs(row.delta))
  );

  return rows.map((row) => ({
    ...row,
    magnitudePercent: Number(((Math.abs(row.delta) / maxMagnitude) * 100).toFixed(1))
  }));
}

export function interpolateMeasurements(current = {}, target = {}, fraction = 0.5) {
  const clampedFraction = Math.max(0, Math.min(1, Number(fraction) || 0));
  const keys = new Set([
    ...Object.keys(current || {}),
    ...Object.keys(target || {})
  ]);

  return [...keys].reduce((measurements, key) => {
    const currentValue = current?.[key];
    const targetValue = target?.[key];
    const currentNumber = Number(currentValue);
    const targetNumber = Number(targetValue);

    if (key === "sex") {
      measurements[key] = clampedFraction < 0.5 ? currentValue : targetValue || currentValue;
      return measurements;
    }

    if (Number.isFinite(currentNumber) && Number.isFinite(targetNumber)) {
      measurements[key] = Number(
        (currentNumber + (targetNumber - currentNumber) * clampedFraction).toFixed(1)
      );
      return measurements;
    }

    measurements[key] = clampedFraction < 0.5
      ? currentValue ?? targetValue
      : targetValue ?? currentValue;
    return measurements;
  }, {});
}

export function buildMorphFrames(current = {}, target = {}, frameCount = 5) {
  const count = Math.max(2, Math.round(Number(frameCount) || 5));
  return Array.from({ length: count }, (_, index) => {
    const fraction = index / (count - 1);
    return {
      fraction,
      measurements: interpolateMeasurements(current, target, fraction)
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
