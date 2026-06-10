import { comparisonMetrics } from "./comparison.js";

export function snapshotTargetId(snapshotId) {
  return `snapshot:${snapshotId}`;
}

export function isSnapshotTargetId(targetId) {
  return String(targetId || "").startsWith("snapshot:");
}

function formatSnapshotDate(createdAt) {
  if (!createdAt) {
    return "undated";
  }

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return "undated";
  }

  return date.toISOString().slice(0, 10);
}

export function buildSnapshotTargets(snapshots = []) {
  return snapshots
    .filter((snapshot) => snapshot?.id && snapshot?.measurements)
    .map((snapshot) => {
      const dateLabel = formatSnapshotDate(snapshot.createdAt);
      const snapshotLabel = snapshot.label || dateLabel;

      return {
        id: snapshotTargetId(snapshot.id),
        snapshotId: snapshot.id,
        createdAt: snapshot.createdAt,
        label: `Past self: ${snapshotLabel}`,
        source_type: "past-self",
        notes: snapshot.note
          ? `Local snapshot saved ${dateLabel}. ${snapshot.note}`
          : `Local snapshot saved ${dateLabel}.`,
        measurements: snapshot.measurements,
        explanation: [
          "Local saved snapshot target.",
          "No external similarity score or curated target data used."
        ]
      };
    });
}

export function buildMeasurementTargetMetrics(currentMeasurements = {}, targetMeasurements = {}) {
  return comparisonMetrics.reduce((metrics, [key]) => {
    const current = Number(currentMeasurements[key]);
    const target = Number(targetMeasurements[key]);

    if (Number.isFinite(current) && Number.isFinite(target)) {
      metrics[key] = Number((target - current).toFixed(2));
    }

    return metrics;
  }, {});
}

export function buildSnapshotTargetMetrics(currentMeasurements = {}, targetMeasurements = {}) {
  return buildMeasurementTargetMetrics(currentMeasurements, targetMeasurements);
}
