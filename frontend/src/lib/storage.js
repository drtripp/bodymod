const STORAGE_KEY = "bodymod:snapshots:v1";
const DIET_STORAGE_KEY = "bodymod:diet-log:v1";
const STORAGE_VERSION = 1;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadSnapshots() {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed.snapshots) ? parsed.snapshots : [];
  } catch (error) {
    return [];
  }
}

export function persistSnapshots(snapshots) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: 1,
      snapshots
    })
  );
}

export function serializeSnapshots(snapshots) {
  return JSON.stringify(
    {
      version: STORAGE_VERSION,
      exportedAt: new Date().toISOString(),
      snapshots
    },
    null,
    2
  );
}

export function parseSnapshotExport(rawValue) {
  const parsed = JSON.parse(rawValue);
  const snapshots = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.snapshots)
      ? parsed.snapshots
      : null;

  if (!snapshots) {
    throw new Error("Snapshot export must contain a snapshots array.");
  }

  return snapshots.filter(
    (snapshot) => snapshot?.id && snapshot?.createdAt && snapshot?.measurements
  );
}

export function createSnapshot(measurements, label = "", note = "") {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    label: label.trim() || undefined,
    note: note.trim() || undefined,
    measurements
  };
}

export function loadDietLog() {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(DIET_STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed.entries) ? parsed.entries : [];
  } catch (error) {
    return [];
  }
}

export function persistDietLog(entries) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    DIET_STORAGE_KEY,
    JSON.stringify({
      version: STORAGE_VERSION,
      entries
    })
  );
}
