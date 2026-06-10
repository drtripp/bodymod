import {
  loadDietFoodLibrary,
  loadDietLog,
  loadFluidLog
} from "./storage.js";

const EXPORT_VERSION = 1;

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function photoManifest(photos = []) {
  return safeArray(photos).map((photo) => ({
    id: photo.id,
    createdAt: photo.createdAt,
    category: photo.category,
    fileName: photo.fileName,
    mimeType: photo.mimeType,
    size: photo.size,
    note: photo.note,
    hasImageData: Boolean(photo.dataUrl)
  }));
}

export function buildPlainJsonExport({
  account = null,
  snapshots = [],
  goals = [],
  protocols = [],
  checkIns = [],
  workoutSessions = [],
  photos = [],
  faceMeasurements = [],
  dietLog = loadDietLog(),
  dietFoodLibrary = loadDietFoodLibrary(),
  fluidLog = loadFluidLog(),
  proWaitlistSignups = []
} = {}) {
  return {
    version: EXPORT_VERSION,
    kind: "bodymod.local-json-export",
    exportedAt: new Date().toISOString(),
    account: account
      ? {
          displayName: account.displayName,
          email: account.email,
          personaId: account.personaId,
          createdAt: account.createdAt
        }
      : null,
    snapshots: safeArray(snapshots),
    accountData: {
      goals: account ? safeArray(goals) : [],
      protocols: account ? safeArray(protocols) : [],
      checkIns: account ? safeArray(checkIns) : [],
      workoutSessions: account ? safeArray(workoutSessions) : [],
      faceMeasurements: account ? safeArray(faceMeasurements) : [],
      photoManifest: account ? photoManifest(photos) : []
    },
    diet: {
      entries: safeArray(dietLog),
      customFoods: safeArray(dietFoodLibrary.customFoods),
      favoriteFoods: safeArray(dietFoodLibrary.favoriteFoods),
      recentFoods: safeArray(dietFoodLibrary.recentFoods),
      mealTemplates: safeArray(dietFoodLibrary.mealTemplates),
      fluidEntries: safeArray(fluidLog)
    },
    proWaitlistSignups: safeArray(proWaitlistSignups),
    notes: [
      "This is a readable JSON export for portability, not an encrypted backup.",
      "Photo image data is not included. The export keeps only a local photo manifest."
    ]
  };
}

export function serializePlainJsonExport(bundle) {
  return JSON.stringify(bundle, null, 2);
}

export function summarizePlainJsonExport(bundle = {}) {
  return {
    snapshots: safeArray(bundle.snapshots).length,
    goals: safeArray(bundle.accountData?.goals).length,
    protocols: safeArray(bundle.accountData?.protocols).length,
    checkIns: safeArray(bundle.accountData?.checkIns).length,
    workoutSessions: safeArray(bundle.accountData?.workoutSessions).length,
    faceMeasurements: safeArray(bundle.accountData?.faceMeasurements).length,
    photoManifest: safeArray(bundle.accountData?.photoManifest).length,
    dietEntries: safeArray(bundle.diet?.entries).length,
    fluidEntries: safeArray(bundle.diet?.fluidEntries).length,
    customFoods: safeArray(bundle.diet?.customFoods).length,
    mealTemplates: safeArray(bundle.diet?.mealTemplates).length,
    proWaitlistSignups: safeArray(bundle.proWaitlistSignups).length
  };
}
