import assert from "node:assert/strict";
import { test } from "node:test";
import {
  HOME_WIDGET_SNAPSHOT_KEY,
  buildHomeWidgetSnapshot,
  loadHomeWidgetSnapshot,
  persistHomeWidgetSnapshot,
  syncHomeWidgetSnapshot
} from "../src/lib/widgetSnapshot.js";
import { createMemoryStorageAdapter } from "../src/lib/storageAdapter.js";


const weeklyCheckIns = [
  {
    id: "weekly-1",
    type: "weekly-measurements",
    createdAt: "2026-06-03T12:00:00.000Z",
    measurements: {
      waistCircumference: 84,
      hipCircumference: 100,
      bideltoidCircumference: 118
    },
    note: "private baseline"
  },
  {
    id: "daily-1",
    type: "daily-weight",
    weight: 82,
    calories: 2300,
    createdAt: "2026-06-16T12:00:00.000Z"
  },
  {
    id: "weekly-2",
    type: "weekly-measurements",
    createdAt: "2026-06-10T12:00:00.000Z",
    measurements: {
      waistCircumference: 82,
      hipCircumference: 99,
      bideltoidCircumference: 119
    },
    note: "private weekly note"
  }
];

test("builds a current home widget snapshot without raw account or measurement data", () => {
  const snapshot = buildHomeWidgetSnapshot({
    checkIns: weeklyCheckIns,
    now: Date.parse("2026-06-17T12:00:00.000Z")
  });
  const serialized = JSON.stringify(snapshot);

  assert.equal(snapshot.kind, "bodymod.home-widget-snapshot");
  assert.equal(snapshot.streakStatus, "current");
  assert.equal(snapshot.streakCount, 2);
  assert.equal(snapshot.nextCheckInAt, "2026-06-17T12:00:00.000Z");
  assert.equal(snapshot.nextCheckInLabel, "Next check-in Jun 17");
  assert.equal(snapshot.dailyLabel, "Daily log ready");
  assert.doesNotMatch(serialized, /waistCircumference|hipCircumference|private|calories|weight|email/i);
});

test("marks overdue weekly check-ins as due for native widgets", () => {
  const snapshot = buildHomeWidgetSnapshot({
    checkIns: weeklyCheckIns,
    now: Date.parse("2026-06-22T12:00:00.000Z")
  });

  assert.equal(snapshot.streakStatus, "needs-check-in");
  assert.equal(snapshot.urgency, "due");
  assert.equal(snapshot.nextCheckInLabel, "Weekly check-in due");
});

test("builds a start-state widget snapshot before the first weekly check-in", () => {
  const snapshot = buildHomeWidgetSnapshot({
    checkIns: [],
    now: Date.parse("2026-06-12T12:00:00.000Z")
  });

  assert.equal(snapshot.streakStatus, "not-started");
  assert.equal(snapshot.urgency, "start");
  assert.equal(snapshot.streakLabel, "No weekly streak yet");
  assert.equal(snapshot.nextCheckInLabel, "Start first weekly check-in");
});

test("persists and loads the home widget snapshot through storage adapters", () => {
  const adapter = createMemoryStorageAdapter();
  const synced = syncHomeWidgetSnapshot(
    {
      checkIns: weeklyCheckIns,
      now: Date.parse("2026-06-17T12:00:00.000Z")
    },
    adapter
  );
  const stored = JSON.parse(adapter.getItemSync(HOME_WIDGET_SNAPSHOT_KEY));
  const loaded = loadHomeWidgetSnapshot(adapter);
  const updated = persistHomeWidgetSnapshot(
    {
      ...synced,
      streakLabel: "Manual refresh"
    },
    adapter
  );

  assert.equal(stored.streakLabel, "2 week streak");
  assert.equal(loaded.nextCheckInLabel, "Next check-in Jun 17");
  assert.equal(updated.streakLabel, "Manual refresh");
  assert.equal(loadHomeWidgetSnapshot(adapter).streakLabel, "Manual refresh");
});
