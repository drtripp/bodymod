import { readJsonSync, removeStoredItemSync, writeJsonSync } from "./storageAdapter.js";
import { filterReliableEntries } from "./reliabilityEvents.js";
import { defaultPhotoAssetAdapter } from "./photoStorage.js";

const ACCOUNTS_KEY = "bodymod:accounts:v1";
const SESSION_KEY = "bodymod:session:v1";
const GOALS_KEY = "bodymod:goals:v1";
const PROTOCOLS_KEY = "bodymod:protocols:v1";
const CHECKINS_KEY = "bodymod:checkins:v1";
const WORKOUTS_KEY = "bodymod:workouts:v1";
const PHOTOS_KEY = "bodymod:photos:v1";
const FACE_MEASUREMENTS_KEY = "bodymod:face-measurements:v1";
const PROCEDURES_KEY = "bodymod:procedures:v1";
const BLOODWORK_KEY = "bodymod:bloodwork:v1";
const STORAGE_VERSION = 1;

function readStorage(key, fallback) {
  return readJsonSync(key, fallback);
}

function writeStorage(key, value) {
  writeJsonSync(key, value);
}

function timestampMs(record) {
  const parsed = new Date(record?.createdAt || record?.loggedAt || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function loadAccounts() {
  const parsed = readStorage(ACCOUNTS_KEY, { accounts: [] });
  return Array.isArray(parsed.accounts) ? parsed.accounts : [];
}

export function persistAccounts(accounts) {
  writeStorage(ACCOUNTS_KEY, {
    version: STORAGE_VERSION,
    accounts
  });
}

export function createLocalAccount({ displayName, email, personaId = "" }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error("Email is required.");
  }

  const accounts = loadAccounts();
  const existingAccount = accounts.find((account) => account.email === normalizedEmail);
  if (existingAccount) {
    persistSession(existingAccount.id);
    return existingAccount;
  }

  const account = {
    id: crypto.randomUUID(),
    displayName: String(displayName || normalizedEmail.split("@")[0]).trim(),
    email: normalizedEmail,
    personaId,
    createdAt: new Date().toISOString()
  };

  persistAccounts([account, ...accounts]);
  persistSession(account.id);
  return account;
}

export function loginLocalAccount(email) {
  const normalizedEmail = normalizeEmail(email);
  const account = loadAccounts().find((item) => item.email === normalizedEmail);

  if (!account) {
    throw new Error("No local account found for that email.");
  }

  persistSession(account.id);
  return account;
}

export function persistSession(accountId) {
  writeStorage(SESSION_KEY, {
    version: STORAGE_VERSION,
    accountId
  });
}

export function clearSession() {
  removeStoredItemSync(SESSION_KEY);
}

export function loadSessionAccount() {
  const session = readStorage(SESSION_KEY, null);
  if (!session?.accountId) {
    return null;
  }

  return loadAccounts().find((account) => account.id === session.accountId) || null;
}

export function loadUserGoals(accountId) {
  if (!accountId) {
    return [];
  }

  const parsed = readStorage(GOALS_KEY, { goals: [] });
  const goals = Array.isArray(parsed.goals) ? parsed.goals : [];
  return goals.filter((goal) => goal.accountId === accountId);
}

export function loadUserProtocols(accountId) {
  if (!accountId) {
    return [];
  }

  const parsed = readStorage(PROTOCOLS_KEY, { protocols: [] });
  const protocols = Array.isArray(parsed.protocols) ? parsed.protocols : [];
  return protocols.filter((protocol) => protocol.accountId === accountId);
}

export function loadUserCheckIns(accountId) {
  if (!accountId) {
    return [];
  }

  const parsed = readStorage(CHECKINS_KEY, { checkIns: [] });
  const checkIns = Array.isArray(parsed.checkIns) ? parsed.checkIns : [];
  return checkIns.filter((checkIn) => checkIn.accountId === accountId);
}

export function loadUserWorkoutSessions(accountId) {
  if (!accountId) {
    return [];
  }

  const parsed = readStorage(WORKOUTS_KEY, { workouts: [] });
  const workouts = Array.isArray(parsed.workouts) ? parsed.workouts : [];
  return workouts.filter((workout) => workout.accountId === accountId);
}

export function loadUserProcedures(accountId) {
  if (!accountId) {
    return [];
  }

  const parsed = readStorage(PROCEDURES_KEY, { procedures: [] });
  const procedures = Array.isArray(parsed.procedures) ? parsed.procedures : [];
  return procedures.filter((procedure) => procedure.accountId === accountId);
}

export function loadUserBloodworkResults(accountId) {
  if (!accountId) {
    return [];
  }

  const parsed = readStorage(BLOODWORK_KEY, { bloodworkResults: [] });
  const bloodworkResults = Array.isArray(parsed.bloodworkResults)
    ? parsed.bloodworkResults
    : [];
  return bloodworkResults.filter((result) => result.accountId === accountId);
}

export function loadUserPhotos(accountId) {
  if (!accountId) {
    return [];
  }

  const parsed = readStorage(PHOTOS_KEY, { photos: [] });
  const photos = Array.isArray(parsed.photos) ? parsed.photos : [];
  return photos.filter((photo) => photo.accountId === accountId);
}

export function loadUserFaceMeasurements(accountId) {
  if (!accountId) {
    return [];
  }

  const parsed = readStorage(FACE_MEASUREMENTS_KEY, { faceMeasurements: [] });
  const faceMeasurements = Array.isArray(parsed.faceMeasurements)
    ? parsed.faceMeasurements
    : [];
  return faceMeasurements.filter((scan) => scan.accountId === accountId);
}

function collectionFromStorage(storageKey, collectionKey, fallbackRecords) {
  if (Array.isArray(fallbackRecords)) {
    return fallbackRecords;
  }

  const parsed = readStorage(storageKey, { [collectionKey]: [] });
  return Array.isArray(parsed[collectionKey]) ? parsed[collectionKey] : [];
}

function countForAccount(records, accountId) {
  return records.filter((record) => record.accountId === accountId).length;
}

export function buildLocalProfileSummaries({
  accounts = loadAccounts(),
  goals,
  protocols,
  checkIns,
  workoutSessions,
  procedures,
  bloodworkResults,
  photos,
  faceMeasurements
} = {}) {
  const accountList = Array.isArray(accounts) ? accounts : [];
  const goalRecords = collectionFromStorage(GOALS_KEY, "goals", goals);
  const protocolRecords = collectionFromStorage(PROTOCOLS_KEY, "protocols", protocols);
  const checkInRecords = collectionFromStorage(CHECKINS_KEY, "checkIns", checkIns);
  const workoutRecords = collectionFromStorage(WORKOUTS_KEY, "workouts", workoutSessions);
  const procedureRecords = collectionFromStorage(PROCEDURES_KEY, "procedures", procedures);
  const bloodworkRecords = collectionFromStorage(BLOODWORK_KEY, "bloodworkResults", bloodworkResults);
  const photoRecords = collectionFromStorage(PHOTOS_KEY, "photos", photos);
  const faceMeasurementRecords = collectionFromStorage(
    FACE_MEASUREMENTS_KEY,
    "faceMeasurements",
    faceMeasurements
  );

  return accountList.map((account) => {
    const counts = {
      goals: countForAccount(goalRecords, account.id),
      protocols: countForAccount(protocolRecords, account.id),
      checkIns: countForAccount(checkInRecords, account.id),
      workoutSessions: countForAccount(workoutRecords, account.id),
      procedures: countForAccount(procedureRecords, account.id),
      bloodworkResults: countForAccount(bloodworkRecords, account.id),
      photos: countForAccount(photoRecords, account.id),
      faceMeasurements: countForAccount(faceMeasurementRecords, account.id)
    };
    const totalRecords = Object.values(counts).reduce((total, value) => total + value, 0);

    return {
      id: account.id,
      displayName: account.displayName || account.email || "Local profile",
      email: account.email || "",
      personaId: account.personaId || "",
      createdAt: account.createdAt || "",
      counts,
      totalRecords
    };
  });
}

function dailyWeightEntries(checkIns) {
  const dailyWeights = checkIns
    .filter((checkIn) => checkIn.type === "daily-weight" && Number.isFinite(Number(checkIn.weight)))
    .slice()
    .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt));

  return filterReliableEntries(dailyWeights, checkIns, "weight");
}

export function buildTrendWeightSeries(checkIns, alpha = 0.25) {
  const dailyWeights = dailyWeightEntries(checkIns);

  if (!dailyWeights.length) {
    return [];
  }

  let trend = Number(dailyWeights[0].weight);

  return dailyWeights.map((entry, index) => {
    if (index > 0) {
      trend = alpha * Number(entry.weight) + (1 - alpha) * trend;
    }

    return {
      id: entry.id,
      createdAt: entry.createdAt,
      raw: Number(entry.weight),
      trend: Number(trend.toFixed(2))
    };
  });
}

export function calculateTrendWeight(checkIns, alpha = 0.25) {
  const series = buildTrendWeightSeries(checkIns, alpha);

  if (!series.length) {
    return null;
  }

  const latest = series[series.length - 1];
  const previous = series[series.length - 2] || latest;

  return {
    value: Number(latest.trend.toFixed(1)),
    delta: series.length > 1 ? Number((latest.trend - previous.trend).toFixed(1)) : 0,
    count: series.length
  };
}

export function persistUserGoal(accountId, goal) {
  const parsed = readStorage(GOALS_KEY, { goals: [] });
  const goals = Array.isArray(parsed.goals) ? parsed.goals : [];
  const nextGoal = {
    id: crypto.randomUUID(),
    accountId,
    createdAt: new Date().toISOString(),
    checkIns: [],
    ...goal
  };

  writeStorage(GOALS_KEY, {
    version: STORAGE_VERSION,
    goals: [nextGoal, ...goals]
  });

  return nextGoal;
}

export function persistUserCheckIn(accountId, checkIn) {
  const parsed = readStorage(CHECKINS_KEY, { checkIns: [] });
  const checkIns = Array.isArray(parsed.checkIns) ? parsed.checkIns : [];
  const nextCheckIn = {
    id: crypto.randomUUID(),
    accountId,
    createdAt: new Date().toISOString(),
    ...checkIn
  };

  writeStorage(CHECKINS_KEY, {
    version: STORAGE_VERSION,
    checkIns: [nextCheckIn, ...checkIns]
  });

  return nextCheckIn;
}

export function persistUserCheckIns(accountId, importedCheckIns = []) {
  const parsed = readStorage(CHECKINS_KEY, { checkIns: [] });
  const checkIns = Array.isArray(parsed.checkIns) ? parsed.checkIns : [];
  const nextCheckIns = importedCheckIns.map((checkIn) => ({
    id: crypto.randomUUID(),
    accountId,
    createdAt: new Date().toISOString(),
    ...checkIn
  }));

  const mergedCheckIns = [...nextCheckIns, ...checkIns].sort(
    (left, right) => new Date(right.createdAt) - new Date(left.createdAt)
  );

  writeStorage(CHECKINS_KEY, {
    version: STORAGE_VERSION,
    checkIns: mergedCheckIns
  });

  return mergedCheckIns.filter((checkIn) => checkIn.accountId === accountId);
}

export function deleteUserCheckInsByType(accountId, type) {
  const parsed = readStorage(CHECKINS_KEY, { checkIns: [] });
  const checkIns = Array.isArray(parsed.checkIns) ? parsed.checkIns : [];
  const nextCheckIns = checkIns.filter(
    (checkIn) => checkIn.accountId !== accountId || checkIn.type !== type
  );

  writeStorage(CHECKINS_KEY, {
    version: STORAGE_VERSION,
    checkIns: nextCheckIns
  });

  return nextCheckIns.filter((checkIn) => checkIn.accountId === accountId);
}

function mergeAccountCollection({
  storageKey,
  collectionKey,
  accountId,
  records = []
}) {
  const parsed = readStorage(storageKey, { [collectionKey]: [] });
  const collection = Array.isArray(parsed[collectionKey]) ? parsed[collectionKey] : [];
  const existingForAccount = collection.filter((record) => record.accountId === accountId);
  const otherAccounts = collection.filter((record) => record.accountId !== accountId);
  const existingIds = new Set(existingForAccount.map((record) => record.id).filter(Boolean));
  const restoredRecords = records
    .filter((record) => record && typeof record === "object")
    .map((record) => ({
      ...record,
      id: record.id || crypto.randomUUID(),
      accountId
    }))
    .filter((record) => {
      if (existingIds.has(record.id)) {
        return false;
      }
      existingIds.add(record.id);
      return true;
    });
  const mergedForAccount = [...restoredRecords, ...existingForAccount].sort(
    (left, right) => timestampMs(right) - timestampMs(left)
  );

  writeStorage(storageKey, {
    version: STORAGE_VERSION,
    [collectionKey]: [...mergedForAccount, ...otherAccounts]
  });

  return {
    records: mergedForAccount,
    importedCount: restoredRecords.length
  };
}

export function restoreUserBackupData(accountId, backup = {}) {
  if (!accountId) {
    throw new Error("Sign in before restoring a backup.");
  }

  const goals = mergeAccountCollection({
    storageKey: GOALS_KEY,
    collectionKey: "goals",
    accountId,
    records: backup.goals
  });
  const protocols = mergeAccountCollection({
    storageKey: PROTOCOLS_KEY,
    collectionKey: "protocols",
    accountId,
    records: backup.protocols
  });
  const checkIns = mergeAccountCollection({
    storageKey: CHECKINS_KEY,
    collectionKey: "checkIns",
    accountId,
    records: backup.checkIns
  });
  const workouts = mergeAccountCollection({
    storageKey: WORKOUTS_KEY,
    collectionKey: "workouts",
    accountId,
    records: backup.workoutSessions || backup.workouts
  });
  const procedures = mergeAccountCollection({
    storageKey: PROCEDURES_KEY,
    collectionKey: "procedures",
    accountId,
    records: backup.procedures
  });
  const bloodworkResults = mergeAccountCollection({
    storageKey: BLOODWORK_KEY,
    collectionKey: "bloodworkResults",
    accountId,
    records: backup.bloodworkResults
  });
  const faceMeasurements = mergeAccountCollection({
    storageKey: FACE_MEASUREMENTS_KEY,
    collectionKey: "faceMeasurements",
    accountId,
    records: backup.faceMeasurements
  });

  return {
    goals: goals.records,
    protocols: protocols.records,
    checkIns: checkIns.records,
    workoutSessions: workouts.records,
    procedures: procedures.records,
    bloodworkResults: bloodworkResults.records,
    faceMeasurements: faceMeasurements.records,
    imported: {
      goals: goals.importedCount,
      protocols: protocols.importedCount,
      checkIns: checkIns.importedCount,
      workoutSessions: workouts.importedCount,
      procedures: procedures.importedCount,
      bloodworkResults: bloodworkResults.importedCount,
      faceMeasurements: faceMeasurements.importedCount,
      photoManifest: Array.isArray(backup.photoManifest) ? backup.photoManifest.length : 0
    }
  };
}

export function persistUserWorkoutSession(accountId, workout) {
  const parsed = readStorage(WORKOUTS_KEY, { workouts: [] });
  const workouts = Array.isArray(parsed.workouts) ? parsed.workouts : [];
  const nextWorkout = {
    id: crypto.randomUUID(),
    accountId,
    createdAt: new Date().toISOString(),
    ...workout
  };

  writeStorage(WORKOUTS_KEY, {
    version: STORAGE_VERSION,
    workouts: [nextWorkout, ...workouts]
  });

  return nextWorkout;
}

export function persistUserProcedure(accountId, procedure) {
  const parsed = readStorage(PROCEDURES_KEY, { procedures: [] });
  const procedures = Array.isArray(parsed.procedures) ? parsed.procedures : [];
  const nextProcedure = {
    id: crypto.randomUUID(),
    accountId,
    createdAt: new Date().toISOString(),
    ...procedure
  };

  writeStorage(PROCEDURES_KEY, {
    version: STORAGE_VERSION,
    procedures: [nextProcedure, ...procedures]
  });

  return nextProcedure;
}

export function persistUserBloodworkResult(accountId, result) {
  const parsed = readStorage(BLOODWORK_KEY, { bloodworkResults: [] });
  const bloodworkResults = Array.isArray(parsed.bloodworkResults)
    ? parsed.bloodworkResults
    : [];
  const nextResult = {
    id: crypto.randomUUID(),
    accountId,
    createdAt: new Date().toISOString(),
    ...result
  };

  writeStorage(BLOODWORK_KEY, {
    version: STORAGE_VERSION,
    bloodworkResults: [nextResult, ...bloodworkResults]
  });

  return nextResult;
}

export function persistUserPhoto(accountId, photo) {
  const parsed = readStorage(PHOTOS_KEY, { photos: [] });
  const photos = Array.isArray(parsed.photos) ? parsed.photos : [];
  const nextPhoto = {
    id: crypto.randomUUID(),
    accountId,
    createdAt: new Date().toISOString(),
    ...photo
  };

  writeStorage(PHOTOS_KEY, {
    version: STORAGE_VERSION,
    photos: [nextPhoto, ...photos]
  });

  return nextPhoto;
}

export async function persistUserPhotoAsset(
  accountId,
  photo,
  { photoAssetAdapter = defaultPhotoAssetAdapter } = {}
) {
  const parsed = readStorage(PHOTOS_KEY, { photos: [] });
  const photos = Array.isArray(parsed.photos) ? parsed.photos : [];
  const nextPhoto = {
    id: crypto.randomUUID(),
    accountId,
    createdAt: new Date().toISOString(),
    ...photo
  };

  try {
    const stored = await photoAssetAdapter.storePhoto(nextPhoto);
    const persistedPhoto = stored.persistedPhoto || nextPhoto;

    writeStorage(PHOTOS_KEY, {
      version: STORAGE_VERSION,
      photos: [persistedPhoto, ...photos]
    });

    return stored.runtimePhoto || persistedPhoto;
  } catch (error) {
    return persistUserPhoto(accountId, photo);
  }
}

export function persistUserFaceMeasurement(accountId, faceMeasurement) {
  const parsed = readStorage(FACE_MEASUREMENTS_KEY, { faceMeasurements: [] });
  const faceMeasurements = Array.isArray(parsed.faceMeasurements)
    ? parsed.faceMeasurements
    : [];
  const nextFaceMeasurement = {
    id: crypto.randomUUID(),
    accountId,
    createdAt: new Date().toISOString(),
    ...faceMeasurement
  };

  writeStorage(FACE_MEASUREMENTS_KEY, {
    version: STORAGE_VERSION,
    faceMeasurements: [nextFaceMeasurement, ...faceMeasurements]
  });

  return nextFaceMeasurement;
}

export function deleteUserPhoto(accountId, photoId) {
  const parsed = readStorage(PHOTOS_KEY, { photos: [] });
  const photos = Array.isArray(parsed.photos) ? parsed.photos : [];
  const nextPhotos = photos.filter(
    (photo) => photo.accountId !== accountId || photo.id !== photoId
  );

  writeStorage(PHOTOS_KEY, {
    version: STORAGE_VERSION,
    photos: nextPhotos
  });

  return nextPhotos.filter((photo) => photo.accountId === accountId);
}

export async function hydrateUserPhotoAssets(
  photos,
  { photoAssetAdapter = defaultPhotoAssetAdapter } = {}
) {
  if (!Array.isArray(photos) || !photos.length) {
    return [];
  }

  try {
    return await photoAssetAdapter.hydratePhotos(photos);
  } catch (error) {
    return photos;
  }
}

export async function deleteUserPhotoAsset(
  accountId,
  photoId,
  { photoAssetAdapter = defaultPhotoAssetAdapter } = {}
) {
  const parsed = readStorage(PHOTOS_KEY, { photos: [] });
  const photos = Array.isArray(parsed.photos) ? parsed.photos : [];
  const targetPhoto = photos.find(
    (photo) => photo.accountId === accountId && photo.id === photoId
  );

  if (targetPhoto) {
    try {
      await photoAssetAdapter.removePhoto(targetPhoto);
    } catch (error) {
      // Metadata deletion should still succeed if the asset file is already gone.
    }
  }

  return deleteUserPhoto(accountId, photoId);
}

export function appendGoalCheckIn(accountId, goalId, checkIn) {
  const parsed = readStorage(GOALS_KEY, { goals: [] });
  const goals = Array.isArray(parsed.goals) ? parsed.goals : [];
  const updatedGoals = goals.map((goal) => {
    if (goal.accountId !== accountId || goal.id !== goalId) {
      return goal;
    }

    return {
      ...goal,
      checkIns: [
        {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          ...checkIn
        },
        ...(Array.isArray(goal.checkIns) ? goal.checkIns : [])
      ]
    };
  });

  writeStorage(GOALS_KEY, {
    version: STORAGE_VERSION,
    goals: updatedGoals
  });

  return updatedGoals.filter((goal) => goal.accountId === accountId);
}

export function persistUserProtocol(accountId, protocol) {
  const parsed = readStorage(PROTOCOLS_KEY, { protocols: [] });
  const protocols = Array.isArray(parsed.protocols) ? parsed.protocols : [];
  const nextProtocol = {
    id: crypto.randomUUID(),
    accountId,
    createdAt: new Date().toISOString(),
    status: "active",
    checkIns: [],
    ...protocol
  };

  writeStorage(PROTOCOLS_KEY, {
    version: STORAGE_VERSION,
    protocols: [nextProtocol, ...protocols]
  });

  return nextProtocol;
}

export function appendProtocolCheckIn(accountId, protocolId, checkIn) {
  const parsed = readStorage(PROTOCOLS_KEY, { protocols: [] });
  const protocols = Array.isArray(parsed.protocols) ? parsed.protocols : [];
  const updatedProtocols = protocols.map((protocol) => {
    if (protocol.accountId !== accountId || protocol.id !== protocolId) {
      return protocol;
    }

    return {
      ...protocol,
      checkIns: [
        {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          ...checkIn
        },
        ...(Array.isArray(protocol.checkIns) ? protocol.checkIns : [])
      ]
    };
  });

  writeStorage(PROTOCOLS_KEY, {
    version: STORAGE_VERSION,
    protocols: updatedProtocols
  });

  return updatedProtocols.filter((protocol) => protocol.accountId === accountId);
}

export function updateUserProtocol(accountId, protocolId, patch) {
  const parsed = readStorage(PROTOCOLS_KEY, { protocols: [] });
  const protocols = Array.isArray(parsed.protocols) ? parsed.protocols : [];
  const updatedProtocols = protocols.map((protocol) => {
    if (protocol.accountId !== accountId || protocol.id !== protocolId) {
      return protocol;
    }

    return {
      ...protocol,
      ...patch,
      updatedAt: new Date().toISOString()
    };
  });

  writeStorage(PROTOCOLS_KEY, {
    version: STORAGE_VERSION,
    protocols: updatedProtocols
  });

  return updatedProtocols.filter((protocol) => protocol.accountId === accountId);
}

export function archiveUserProtocol(accountId, protocolId) {
  const parsed = readStorage(PROTOCOLS_KEY, { protocols: [] });
  const protocols = Array.isArray(parsed.protocols) ? parsed.protocols : [];
  const updatedProtocols = protocols.map((protocol) => {
    if (protocol.accountId !== accountId || protocol.id !== protocolId) {
      return protocol;
    }

    return {
      ...protocol,
      status: "archived",
      archivedAt: new Date().toISOString()
    };
  });

  writeStorage(PROTOCOLS_KEY, {
    version: STORAGE_VERSION,
    protocols: updatedProtocols
  });

  return updatedProtocols.filter((protocol) => protocol.accountId === accountId);
}
