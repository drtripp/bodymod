import { readJsonSync, writeJsonSync } from "./storageAdapter.js";
import { sumFluid, sumNutrition } from "./diet.js";

export const HEALTH_SYNC_STATE_KEY = "bodymod:health-sync:v1";
export const HEALTH_SYNC_BATCH_KIND = "bodymod.health-sync-write-batch";
export const HEALTH_SYNC_STATE_KIND = "bodymod.health-sync-state";

export const healthSyncDestinations = [
  {
    id: "ios-healthkit",
    label: "Apple HealthKit",
    status: "native-plugin-pending"
  },
  {
    id: "android-health-connect",
    label: "Android Health Connect",
    status: "native-plugin-pending"
  }
];

const HEALTH_MEASUREMENT_FIELDS = {
  height: { type: "height", label: "Height", unit: "cm" },
  headCircumference: { type: "head_circumference", label: "Head circumference", unit: "cm" },
  neckCircumference: { type: "neck_circumference", label: "Neck circumference", unit: "cm" },
  biacromialWidth: { type: "shoulder_width", label: "Biacromial width", unit: "cm" },
  bideltoidWidth: { type: "shoulder_width", label: "Bideltoid width", unit: "cm" },
  bideltoidCircumference: { type: "shoulder_circumference", label: "Bideltoid circumference", unit: "cm" },
  chestCircumference: { type: "chest_circumference", label: "Chest circumference", unit: "cm" },
  underbustCircumference: { type: "chest_circumference", label: "Underbust circumference", unit: "cm" },
  waistCircumference: { type: "waist_circumference", label: "Waist circumference", unit: "cm" },
  pantWaistCircumference: { type: "waist_circumference", label: "Pant waist circumference", unit: "cm" },
  hipCircumference: { type: "hip_circumference", label: "Hip circumference", unit: "cm" },
  bicepCircumference: { type: "arm_circumference", label: "Bicep circumference", unit: "cm" },
  upperForearmCircumference: { type: "arm_circumference", label: "Upper forearm circumference", unit: "cm" },
  wristCircumference: { type: "wrist_circumference", label: "Wrist circumference", unit: "cm" },
  upperThighCircumference: { type: "leg_circumference", label: "Upper thigh circumference", unit: "cm" },
  midThighCircumference: { type: "leg_circumference", label: "Mid thigh circumference", unit: "cm" },
  calfCircumference: { type: "leg_circumference", label: "Calf circumference", unit: "cm" },
  ankleCircumference: { type: "ankle_circumference", label: "Ankle circumference", unit: "cm" }
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function numberValue(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function isoDate(value, fallback = new Date().toISOString()) {
  const parsed = new Date(value || fallback);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

function localDateKey(value) {
  const parsed = new Date(value || 0);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
}

function recordId(...parts) {
  return parts
    .map((part) =>
      String(part || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    )
    .filter(Boolean)
    .join(":");
}

function addBodyMassRecord(records, value, observedAt, sourceType, sourceIndex) {
  const weight = numberValue(value);
  if (weight === null || weight <= 0) {
    return;
  }

  const startAt = isoDate(observedAt);
  records.push({
    id: recordId("body-mass", sourceType, sourceIndex, startAt),
    category: "body",
    type: "body_mass",
    unit: "kg",
    value: Number(weight.toFixed(2)),
    startAt,
    source: "bodymod-local",
    sourceType
  });
}

function addMeasurementRecords(records, measurements, observedAt, sourceType, sourceIndex) {
  const startAt = isoDate(observedAt);

  for (const [field, config] of Object.entries(HEALTH_MEASUREMENT_FIELDS)) {
    const value = numberValue(measurements?.[field]);
    if (value === null || value <= 0) {
      continue;
    }

    records.push({
      id: recordId("measurement", sourceType, sourceIndex, field, startAt),
      category: "measurement",
      type: config.type,
      field,
      label: config.label,
      unit: config.unit,
      value: Number(value.toFixed(2)),
      startAt,
      source: "bodymod-local",
      sourceType
    });
  }
}

function workoutRecords(workoutSessions = []) {
  return safeArray(workoutSessions)
    .filter((session) => session && session.createdAt)
    .map((session, index) => {
      const startAt = isoDate(session.createdAt);
      const sets = Math.max(0, Math.round(numberValue(session.sets) || 0));
      const reps = Math.max(0, Math.round(numberValue(session.reps) || 0));
      const loadKg = Math.max(0, numberValue(session.loadKg) || 0);
      const volumeKg = Math.max(0, numberValue(session.volumeKg) || sets * reps * loadKg);

      return {
        id: recordId("workout", index, startAt),
        category: "workout",
        type: "strength_training",
        startAt,
        source: "bodymod-local",
        exerciseId: String(session.exerciseId || "strength-training"),
        exerciseLabel: String(session.exerciseLabel || "Strength training"),
        sets,
        reps,
        loadKg: Number(loadKg.toFixed(1)),
        volumeKg: Number(volumeKg.toFixed(1))
      };
    });
}

function nutritionRecords(dietLog = []) {
  const byDate = new Map();
  for (const entry of safeArray(dietLog)) {
    const key = localDateKey(entry.loggedAt);
    if (!key) {
      continue;
    }

    byDate.set(key, [...(byDate.get(key) || []), entry]);
  }

  return [...byDate.entries()].map(([date, entries]) => {
    const totals = sumNutrition(entries);
    return {
      id: recordId("nutrition", date),
      category: "nutrition",
      type: "daily_nutrition",
      startAt: `${date}T00:00:00.000Z`,
      endAt: `${date}T23:59:59.999Z`,
      source: "bodymod-local",
      entryCount: entries.length,
      nutrients: {
        calories: Number((totals.macros.calories || 0).toFixed(1)),
        protein: Number((totals.macros.protein || 0).toFixed(1)),
        carbs: Number((totals.macros.carbs || 0).toFixed(1)),
        fat: Number((totals.macros.fat || 0).toFixed(1)),
        fiber: Number((totals.micros.fiber || 0).toFixed(1)),
        sugar: Number((totals.micros.sugar || 0).toFixed(1)),
        sodium: Number((totals.micros.sodium || 0).toFixed(1)),
        potassium: Number((totals.micros.potassium || 0).toFixed(1))
      }
    };
  });
}

function fluidRecords(fluidLog = []) {
  const byDate = new Map();
  for (const entry of safeArray(fluidLog)) {
    const key = localDateKey(entry.loggedAt);
    if (!key) {
      continue;
    }

    byDate.set(key, [...(byDate.get(key) || []), entry]);
  }

  return [...byDate.entries()].map(([date, entries]) => ({
    id: recordId("hydration", date),
    category: "nutrition",
    type: "daily_water",
    startAt: `${date}T00:00:00.000Z`,
    endAt: `${date}T23:59:59.999Z`,
    source: "bodymod-local",
    entryCount: entries.length,
    unit: "ml",
    value: sumFluid(entries)
  }));
}

function countRecords(records) {
  return records.reduce(
    (counts, record) => {
      if (record.type === "body_mass") {
        counts.bodyMass += 1;
      } else if (record.category === "measurement") {
        counts.measurements += 1;
      } else if (record.category === "workout") {
        counts.workouts += 1;
      } else if (record.type === "daily_nutrition") {
        counts.nutritionDays += 1;
      } else if (record.type === "daily_water") {
        counts.fluidDays += 1;
      }
      counts.total += 1;
      return counts;
    },
    {
      total: 0,
      bodyMass: 0,
      measurements: 0,
      workouts: 0,
      nutritionDays: 0,
      fluidDays: 0
    }
  );
}

export function buildHealthWriteBatch({
  currentMeasurements = {},
  snapshots = [],
  checkIns = [],
  workoutSessions = [],
  dietLog = [],
  fluidLog = [],
  generatedAt = new Date().toISOString()
} = {}) {
  const records = [];

  safeArray(checkIns)
    .filter((checkIn) => checkIn?.type === "daily-weight")
    .forEach((checkIn, index) =>
      addBodyMassRecord(records, checkIn.weight, checkIn.createdAt, "daily-check-in", index)
    );

  addBodyMassRecord(records, currentMeasurements.weight, generatedAt, "current-form", "current");
  addMeasurementRecords(records, currentMeasurements, generatedAt, "current-form", "current");

  safeArray(snapshots).forEach((snapshot, index) => {
    addBodyMassRecord(records, snapshot.measurements?.weight, snapshot.createdAt, "snapshot", index);
    addMeasurementRecords(records, snapshot.measurements, snapshot.createdAt, "snapshot", index);
  });

  records.push(...workoutRecords(workoutSessions));
  records.push(...nutritionRecords(dietLog));
  records.push(...fluidRecords(fluidLog));

  return {
    kind: HEALTH_SYNC_BATCH_KIND,
    version: 1,
    generatedAt: isoDate(generatedAt),
    mode: "native-write-preview",
    destinations: healthSyncDestinations,
    counts: countRecords(records),
    records
  };
}

export function summarizeHealthWriteBatch(batch = {}) {
  const counts = batch.counts || countRecords(batch.records || []);
  return {
    kind: "bodymod.health-sync-preview",
    generatedAt: batch.generatedAt || new Date().toISOString(),
    mode: batch.mode || "native-write-preview",
    counts,
    destinations: healthSyncDestinations,
    lines: [
      `Weight samples: ${counts.bodyMass}`,
      `Measurement samples: ${counts.measurements}`,
      `Workout samples: ${counts.workouts}`,
      `Nutrition day samples: ${counts.nutritionDays}`,
      `Fluid day samples: ${counts.fluidDays}`
    ],
    privacy:
      "Preview state stores metadata only. Native writes, once implemented, must not include account emails, local account IDs, notes, food names, or photo data."
  };
}

export function defaultHealthSyncState() {
  return {
    kind: HEALTH_SYNC_STATE_KIND,
    version: 1,
    status: "not-prepared",
    lastPreparedAt: "",
    recordCount: 0,
    counts: {
      total: 0,
      bodyMass: 0,
      measurements: 0,
      workouts: 0,
      nutritionDays: 0,
      fluidDays: 0
    },
    destinations: healthSyncDestinations,
    privacy:
      "Metadata only; no health values, account emails, account IDs, notes, food names, or photo data are persisted in this state."
  };
}

export function loadHealthSyncState(adapter) {
  const parsed = readJsonSync(HEALTH_SYNC_STATE_KEY, defaultHealthSyncState(), adapter);
  return {
    ...defaultHealthSyncState(),
    ...parsed,
    counts: {
      ...defaultHealthSyncState().counts,
      ...(parsed?.counts || {})
    },
    destinations: healthSyncDestinations
  };
}

export function persistHealthSyncState(batchOrPreview = {}, adapter) {
  const counts = batchOrPreview.counts || countRecords(batchOrPreview.records || []);
  const nextState = {
    ...defaultHealthSyncState(),
    status: "prepared-preview",
    lastPreparedAt: batchOrPreview.generatedAt || new Date().toISOString(),
    recordCount: counts.total,
    counts
  };

  writeJsonSync(HEALTH_SYNC_STATE_KEY, nextState, adapter);
  return nextState;
}

export function createUnavailableHealthAdapter() {
  return {
    name: "native-health-unavailable",
    available: false,
    async write(batch) {
      return {
        status: "unavailable",
        attemptedRecordCount: batch?.counts?.total || safeArray(batch?.records).length,
        message: "Native HealthKit/Health Connect plugins are not configured in this build."
      };
    }
  };
}

export async function writeHealthBatch(batch, { adapter = createUnavailableHealthAdapter() } = {}) {
  if (!adapter?.available || typeof adapter.write !== "function") {
    return createUnavailableHealthAdapter().write(batch);
  }

  return adapter.write(batch);
}
