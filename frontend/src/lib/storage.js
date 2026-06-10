import { readJsonSync, writeJsonSync } from "./storageAdapter.js";

const STORAGE_KEY = "bodymod:snapshots:v1";
const DIET_STORAGE_KEY = "bodymod:diet-log:v1";
const DIET_FOOD_LIBRARY_KEY = "bodymod:diet-food-library:v1";
const DIET_FLUID_STORAGE_KEY = "bodymod:diet-fluid-log:v1";
const STORAGE_VERSION = 1;

export function loadSnapshots(adapter) {
  const parsed = readJsonSync(STORAGE_KEY, { snapshots: [] }, adapter);
  return Array.isArray(parsed.snapshots) ? parsed.snapshots : [];
}

export function persistSnapshots(snapshots, adapter) {
  writeJsonSync(
    STORAGE_KEY,
    {
      version: 1,
      snapshots
    },
    adapter
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

export function loadDietLog(adapter) {
  const parsed = readJsonSync(DIET_STORAGE_KEY, { entries: [] }, adapter);
  return Array.isArray(parsed.entries) ? parsed.entries : [];
}

export function persistDietLog(entries, adapter) {
  writeJsonSync(
    DIET_STORAGE_KEY,
    {
      version: STORAGE_VERSION,
      entries
    },
    adapter
  );
}

export function loadFluidLog(adapter) {
  const parsed = readJsonSync(DIET_FLUID_STORAGE_KEY, { entries: [] }, adapter);
  return Array.isArray(parsed.entries) ? parsed.entries : [];
}

export function persistFluidLog(entries, adapter) {
  writeJsonSync(
    DIET_FLUID_STORAGE_KEY,
    {
      version: STORAGE_VERSION,
      entries
    },
    adapter
  );
}

function emptyDietFoodLibrary() {
  return {
    customFoods: [],
    favoriteFoods: [],
    recentFoods: [],
    mealTemplates: []
  };
}

export function loadDietFoodLibrary(adapter) {
  const parsed = readJsonSync(DIET_FOOD_LIBRARY_KEY, emptyDietFoodLibrary(), adapter);

  return {
    customFoods: Array.isArray(parsed.customFoods) ? parsed.customFoods : [],
    favoriteFoods: Array.isArray(parsed.favoriteFoods) ? parsed.favoriteFoods : [],
    recentFoods: Array.isArray(parsed.recentFoods) ? parsed.recentFoods : [],
    mealTemplates: Array.isArray(parsed.mealTemplates) ? parsed.mealTemplates : []
  };
}

export function persistDietFoodLibrary(library, adapter) {
  writeJsonSync(
    DIET_FOOD_LIBRARY_KEY,
    {
      version: STORAGE_VERSION,
      customFoods: Array.isArray(library.customFoods) ? library.customFoods : [],
      favoriteFoods: Array.isArray(library.favoriteFoods) ? library.favoriteFoods : [],
      recentFoods: Array.isArray(library.recentFoods) ? library.recentFoods : [],
      mealTemplates: Array.isArray(library.mealTemplates) ? library.mealTemplates : []
    },
    adapter
  );
}
