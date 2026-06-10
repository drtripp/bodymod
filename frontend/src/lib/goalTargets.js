export const CUSTOM_GOAL_TARGET_ID = "custom-deltas";

export const goalMetricLabels = {
  weight: ["Weight", "kg"],
  waistCircumference: ["Waist", "cm"],
  hipCircumference: ["Hip", "cm"],
  bideltoidCircumference: ["Bideltoid Circ", "cm"],
  bicepCircumference: ["Bicep Circ", "cm"],
  upperThighCircumference: ["Upper Thigh Circ", "cm"]
};

export const customGoalMetricOptions = Object.entries(goalMetricLabels).map(
  ([key, [label, unit]]) => ({
    key,
    label,
    unit
  })
);

function clampProgress(value) {
  return Math.max(0, Math.min(100, value));
}

export function parseCustomGoalMetrics(values = {}) {
  return customGoalMetricOptions.reduce((metrics, option) => {
    const rawValue = values[option.key];
    if (rawValue === null || rawValue === undefined || rawValue === "") {
      return metrics;
    }

    const parsed = Number(rawValue);
    if (Number.isFinite(parsed) && parsed !== 0) {
      metrics[option.key] = Number(parsed.toFixed(2));
    }

    return metrics;
  }, {});
}

export function buildGoalProgress(goal, currentMeasurements) {
  const starting = goal.startingMeasurements;
  const targetMetrics = goal.targetMetrics || {};
  const rows = Object.entries(targetMetrics)
    .map(([key, targetDelta]) => {
      const [label, unit] = goalMetricLabels[key] || [key, ""];
      const start = Number(starting?.[key]);
      const current = Number(currentMeasurements[key]);
      const delta = Number(targetDelta);

      if (
        !Number.isFinite(start) ||
        !Number.isFinite(current) ||
        !Number.isFinite(delta) ||
        delta === 0
      ) {
        return null;
      }

      const target = start + delta;
      const progress = clampProgress(((current - start) / delta) * 100);

      return {
        key,
        label,
        unit,
        start,
        current,
        target,
        progress
      };
    })
    .filter(Boolean);

  if (!rows.length) {
    return null;
  }

  const average = rows.reduce((total, row) => total + row.progress, 0) / rows.length;
  return {
    average,
    rows
  };
}

export function goalTargetSourceLabel(goal) {
  if (goal?.targetSource?.type === "past-self") {
    return `Past self target: ${goal.targetSource.label}`;
  }

  if (goal?.targetSource?.type === "target-profile") {
    return `Target profile: ${goal.targetSource.label}`;
  }

  if (goal?.targetSource?.type === "custom") {
    return "Custom target deltas";
  }

  return "";
}
