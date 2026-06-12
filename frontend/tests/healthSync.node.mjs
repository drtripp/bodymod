import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHealthWriteBatch,
  createUnavailableHealthAdapter,
  loadHealthSyncState,
  persistHealthSyncState,
  summarizeHealthWriteBatch,
  writeHealthBatch
} from "../src/lib/healthSync.js";
import { createMemoryStorageAdapter } from "../src/lib/storageAdapter.js";

const generatedAt = "2026-06-12T12:00:00.000Z";

function privateFixture() {
  return {
    account: {
      id: "acct-private",
      email: "private@example.com"
    },
    currentMeasurements: {
      height: 181,
      weight: 86.4,
      waistCircumference: 87,
      bideltoidCircumference: 123
    },
    snapshots: [
      {
        id: "snapshot-private-id",
        label: "Private baseline",
        note: "First private note",
        createdAt: "2026-06-01T08:00:00.000Z",
        measurements: {
          weight: 88,
          waistCircumference: 90,
          bideltoidCircumference: 120
        }
      }
    ],
    checkIns: [
      {
        id: "checkin-private-id",
        accountId: "acct-private",
        type: "daily-weight",
        weight: 85.9,
        note: "Low sodium private note",
        createdAt: "2026-06-10T08:00:00.000Z"
      }
    ],
    workoutSessions: [
      {
        id: "workout-private-id",
        accountId: "acct-private",
        exerciseId: "dumbbell-lateral-raise",
        exerciseLabel: "Dumbbell lateral raise",
        sets: 3,
        reps: 12,
        loadKg: 8,
        volumeKg: 288,
        note: "Strict private reps",
        createdAt: "2026-06-11T08:00:00.000Z"
      }
    ],
    dietLog: [
      {
        id: "food-private-id",
        name: "Private tofu bowl",
        brand: "Private kitchen",
        loggedAt: "2026-06-11T12:00:00.000Z",
        macros: { calories: 520, protein: 38, carbs: 60, fat: 14 },
        micros: { fiber: 8, sugar: 6, sodium: 620, potassium: 700 }
      }
    ],
    fluidLog: [
      {
        id: "fluid-private-id",
        label: "Private bottle",
        amountMl: 750,
        loggedAt: "2026-06-11T13:00:00.000Z"
      }
    ]
  };
}

test("builds native health write batches without account ids, notes, or food names", () => {
  const fixture = privateFixture();
  const batch = buildHealthWriteBatch({
    ...fixture,
    generatedAt
  });
  const serialized = JSON.stringify(batch);

  assert.equal(batch.kind, "bodymod.health-sync-write-batch");
  assert.equal(batch.mode, "native-write-preview");
  assert.equal(batch.counts.bodyMass, 3);
  assert.equal(batch.counts.workouts, 1);
  assert.equal(batch.counts.nutritionDays, 1);
  assert.equal(batch.counts.fluidDays, 1);
  assert.ok(batch.counts.measurements >= 4);
  assert.ok(batch.records.some((record) => record.type === "daily_nutrition"));
  assert.ok(batch.records.some((record) => record.type === "daily_water"));

  assert.doesNotMatch(
    serialized,
    /private@example\.com|acct-private|snapshot-private-id|checkin-private-id|workout-private-id|food-private-id|fluid-private-id|Private baseline|First private note|Low sodium private note|Strict private reps|Private tofu bowl|Private kitchen|Private bottle/i
  );
});

test("persists only metadata for prepared health sync state", () => {
  const adapter = createMemoryStorageAdapter();
  const batch = buildHealthWriteBatch({
    ...privateFixture(),
    generatedAt
  });
  const preview = summarizeHealthWriteBatch(batch);
  const state = persistHealthSyncState(preview, adapter);
  const storedState = loadHealthSyncState(adapter);
  const serialized = JSON.stringify(storedState);

  assert.equal(state.status, "prepared-preview");
  assert.equal(storedState.recordCount, batch.counts.total);
  assert.equal(storedState.counts.nutritionDays, 1);
  assert.match(storedState.privacy, /Metadata only/);
  assert.doesNotMatch(serialized, /86\.4|85\.9|87|123|private@example|acct-private|waistCircumference|Private/i);
});

test("health adapter stays unavailable until native plugins are configured", async () => {
  const batch = buildHealthWriteBatch({
    currentMeasurements: { weight: 82 },
    generatedAt
  });
  const unavailable = createUnavailableHealthAdapter();
  const result = await writeHealthBatch(batch, { adapter: unavailable });

  assert.equal(result.status, "unavailable");
  assert.equal(result.attemptedRecordCount, batch.counts.total);
  assert.match(result.message, /not configured/);
});
