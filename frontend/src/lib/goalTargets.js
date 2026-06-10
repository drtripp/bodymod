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

function targetRows(goal, measurements) {
  const starting = goal.startingMeasurements;
  const targetMetrics = goal.targetMetrics || {};

  return Object.entries(targetMetrics)
    .map(([key, targetDelta]) => {
      const [label, unit] = goalMetricLabels[key] || [key, ""];
      const start = Number(starting?.[key]);
      const current = Number(measurements?.[key]);
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
      const drift = Number((current - target).toFixed(2));

      return {
        key,
        label,
        unit,
        start,
        current,
        target,
        progress,
        drift
      };
    })
    .filter(Boolean);
}

function driftBand(row, bands = {}) {
  const explicit = Number(bands[row.key]);
  if (Number.isFinite(explicit) && explicit > 0) {
    return explicit;
  }

  return row.unit === "kg" ? 2 : 2;
}

function formatSigned(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}`;
}

function timestampMs(value) {
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
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
  const rows = targetRows(goal, currentMeasurements);

  if (!rows.length) {
    return null;
  }

  const average = rows.reduce((total, row) => total + row.progress, 0) / rows.length;
  return {
    average,
    rows
  };
}

export function buildMaintenanceDriftAlerts(
  goal,
  currentMeasurements,
  snapshots = [],
  { bands = {} } = {}
) {
  const currentRows = targetRows(goal, currentMeasurements);
  if (!currentRows.length) {
    return null;
  }

  const targetSnapshots = snapshots
    .filter((snapshot) => snapshot?.measurements)
    .slice()
    .sort((left, right) => timestampMs(left.createdAt) - timestampMs(right.createdAt))
    .map((snapshot) => {
      const rows = targetRows(goal, snapshot.measurements);
      const withinBand =
        rows.length === currentRows.length &&
        rows.every((row) => Math.abs(row.drift) <= driftBand(row, bands));

      return {
        id: snapshot.id,
        label: snapshot.label || "snapshot",
        createdAt: snapshot.createdAt,
        withinBand
      };
    });
  const reachedSnapshot = targetSnapshots.filter((snapshot) => snapshot.withinBand).at(-1);

  if (!reachedSnapshot) {
    return null;
  }

  const alerts = currentRows
    .map((row) => {
      const band = driftBand(row, bands);
      const magnitude = Math.abs(row.drift);
      if (magnitude <= band) {
        return null;
      }

      return {
        key: row.key,
        label: row.label,
        unit: row.unit,
        target: row.target,
        current: row.current,
        drift: row.drift,
        band,
        outsideBy: Number((magnitude - band).toFixed(2)),
        message: `${row.label} drifted ${formatSigned(row.drift)} ${row.unit} outside +/-${band.toFixed(1)} ${row.unit} maintenance band.`
      };
    })
    .filter(Boolean);

  if (!alerts.length) {
    return null;
  }

  return {
    goalId: goal.id,
    reachedAt: reachedSnapshot.createdAt,
    reachedLabel: reachedSnapshot.label,
    alerts
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
