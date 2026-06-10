const STORAGE_KEY = "bodymod:snapshots:v1";
const DIET_STORAGE_KEY = "bodymod:diet-log:v1";
const DIET_FOOD_LIBRARY_KEY = "bodymod:diet-food-library:v1";
const DIET_FLUID_STORAGE_KEY = "bodymod:diet-fluid-log:v1";
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

export function loadFluidLog() {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(DIET_FLUID_STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed.entries) ? parsed.entries : [];
  } catch (error) {
    return [];
  }
}

export function persistFluidLog(entries) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    DIET_FLUID_STORAGE_KEY,
    JSON.stringify({
      version: STORAGE_VERSION,
      entries
    })
  );
}

export function loadDietFoodLibrary() {
  if (!canUseStorage()) {
    return {
      customFoods: [],
      favoriteFoods: [],
      recentFoods: [],
      mealTemplates: []
    };
  }

  try {
    const rawValue = window.localStorage.getItem(DIET_FOOD_LIBRARY_KEY);
    if (!rawValue) {
      return {
        customFoods: [],
        favoriteFoods: [],
        recentFoods: [],
        mealTemplates: []
      };
    }

    const parsed = JSON.parse(rawValue);
    return {
      customFoods: Array.isArray(parsed.customFoods) ? parsed.customFoods : [],
      favoriteFoods: Array.isArray(parsed.favoriteFoods) ? parsed.favoriteFoods : [],
      recentFoods: Array.isArray(parsed.recentFoods) ? parsed.recentFoods : [],
      mealTemplates: Array.isArray(parsed.mealTemplates) ? parsed.mealTemplates : []
    };
  } catch (error) {
    return {
      customFoods: [],
      favoriteFoods: [],
      recentFoods: [],
      mealTemplates: []
    };
  }
}

export function persistDietFoodLibrary(library) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    DIET_FOOD_LIBRARY_KEY,
    JSON.stringify({
      version: STORAGE_VERSION,
      customFoods: Array.isArray(library.customFoods) ? library.customFoods : [],
      favoriteFoods: Array.isArray(library.favoriteFoods) ? library.favoriteFoods : [],
      recentFoods: Array.isArray(library.recentFoods) ? library.recentFoods : [],
      mealTemplates: Array.isArray(library.mealTemplates) ? library.mealTemplates : []
    })
  );
}
