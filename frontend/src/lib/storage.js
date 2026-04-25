const STORAGE_KEY = "bodymod:snapshots:v1";

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

export function createSnapshot(measurements) {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    measurements
  };
}
