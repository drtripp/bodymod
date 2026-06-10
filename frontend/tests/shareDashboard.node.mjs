import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultMeasurements } from "../src/lib/measurements.js";
import {
  buildShareDashboardPayload,
  clearShareDashboardState,
  loadShareDashboardState,
  persistShareDashboardState,
  publicShareDashboardUrl
} from "../src/lib/shareDashboard.js";
import { createMemoryStorageAdapter } from "../src/lib/storageAdapter.js";

const measurements = {
  ...defaultMeasurements,
  height: 181,
  weight: 86,
  sex: "male",
  waistCircumference: 86,
  hipCircumference: 98,
  bideltoidCircumference: 124
};

test("builds a public dashboard payload without private account fields or notes", () => {
  const payload = buildShareDashboardPayload({
    account: {
      id: "local-account-1",
      displayName: "Mason",
      email: "mason@example.com"
    },
    currentMeasurements: measurements,
    snapshots: [
      {
        id: "snapshot-1",
        label: "Baseline",
        createdAt: "2026-06-10T12:00:00Z",
        note: "private note should not publish",
        measurements
      }
    ],
    goals: [
      {
        id: "goal-1",
        accountId: "local-account-1",
        label: "Improve shoulder-to-waist ratio",
        category: "shape",
        targetMetrics: {
          waistCircumference: -4
        },
        targetSource: {
          type: "custom",
          label: "Custom deltas"
        },
        startingMeasurements: {
          ...measurements,
          waistCircumference: 90
        },
        note: "private goal note"
      }
    ],
    protocols: [
      {
        id: "protocol-1",
        accountId: "local-account-1",
        label: "Progressive resistance training",
        category: "training",
        status: "active",
        dose: "private-ish dose detail",
        checkIns: [{ score: 4 }, { score: 5 }],
        startingMeasurements: measurements
      }
    ],
    checkIns: [
      {
        id: "checkin-1",
        accountId: "local-account-1",
        type: "weekly-measurements",
        createdAt: "2026-06-10T12:00:00Z",
        note: "private check-in note"
      }
    ],
    workoutSessions: [{ id: "workout-1" }],
    faceMeasurements: [{ id: "face-1" }],
    weeklyStreak: {
      status: "current",
      count: 1,
      latestAt: "2026-06-10T12:00:00Z"
    },
    trendWeight: {
      value: 86.3,
      delta: -0.1,
      count: 2
    },
    now: new Date("2026-06-10T13:00:00Z")
  });

  const serialized = JSON.stringify(payload);
  assert.equal(payload.displayName, "Mason");
  assert.equal(payload.stats.snapshotCount, 1);
  assert.equal(payload.stats.workoutCount, 1);
  assert.equal(payload.stats.faceScanCount, 1);
  assert.equal(payload.goals[0].progressPercent, 100);
  assert.deepEqual(payload.goals[0].targetDistances, ["Waist: At target"]);
  assert.equal(payload.protocols[0].averageScore, 4.5);
  assert.equal(payload.snapshots[0].note, undefined);
  assert.equal(serialized.includes("mason@example.com"), false);
  assert.equal(serialized.includes("local-account-1"), false);
  assert.equal(serialized.includes("private note should not publish"), false);
  assert.equal(serialized.includes("private goal note"), false);
  assert.equal(serialized.includes("private check-in note"), false);
});

test("persists and clears local share dashboard state", () => {
  const adapter = createMemoryStorageAdapter();
  const saved = persistShareDashboardState(
    {
      accountId: "local-account-1",
      publicToken: "public-token",
      revokeToken: "private-revoke-token",
      publicUrl: "https://example.test/?share=public-token",
      createdAt: "2026-06-10T12:00:00Z",
      updatedAt: "2026-06-10T12:00:00Z"
    },
    adapter
  );

  assert.equal(saved.publicToken, "public-token");
  assert.equal(loadShareDashboardState(adapter).accountId, "local-account-1");
  assert.equal(loadShareDashboardState(adapter).revokeToken, "private-revoke-token");
  assert.equal(
    publicShareDashboardUrl("abc 123", {
      origin: "https://bodymod.example",
      pathname: "/app"
    }),
    "https://bodymod.example/app?share=abc%20123"
  );
  assert.equal(clearShareDashboardState(adapter).publicToken, "");
  assert.equal(loadShareDashboardState(adapter).publicToken, "");
});
