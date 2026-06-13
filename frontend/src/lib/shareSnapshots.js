import { measurementFields } from "./measurements.js";

export const DEFAULT_SHARE_SNAPSHOT_EXPIRY_HOURS = 72;

const MEASUREMENT_FIELD_NAMES = new Set(measurementFields.map((field) => field.name));

function stripMeasurementSet(measurements = {}) {
  return Object.fromEntries(
    Object.entries(measurements).filter(
      ([key, value]) =>
        MEASUREMENT_FIELD_NAMES.has(key) && value !== undefined && value !== null
    )
  );
}

export function buildShareSnapshotPayload(
  measurements,
  {
    title = "Shared bodymod measurements",
    expiresInHours = DEFAULT_SHARE_SNAPSHOT_EXPIRY_HOURS,
    now = new Date()
  } = {}
) {
  return {
    snapshot: {
      version: 1,
      title,
      createdAt: now.toISOString(),
      privacyNote:
        "Expiring read-only measurement snapshot. Account email, local account IDs, notes, photos, and face scan images are not included.",
      measurements: stripMeasurementSet(measurements)
    },
    expiresInHours
  };
}

export function publicShareSnapshotUrl(publicToken, locationLike = globalThis.location) {
  if (!publicToken || !locationLike) {
    return "";
  }

  const path = locationLike.pathname || "/";
  return `${locationLike.origin}${path}?snapshot=${encodeURIComponent(publicToken)}`;
}
