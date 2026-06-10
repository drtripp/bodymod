import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildTrendReminderCopy,
  loadNotificationPreference,
  recordTrendReminderSent,
  requestTrendNotificationPermission,
  sendTrendReminderNotificationIfDue,
  shouldSendTrendReminder
} from "../src/lib/notifications.js";
import { createMemoryStorageAdapter } from "../src/lib/storageAdapter.js";

test("requests browser notification permission once after first snapshot", async () => {
  const adapter = createMemoryStorageAdapter();
  let requestCount = 0;
  const api = {
    permission: "default",
    async requestPermission() {
      requestCount += 1;
      api.permission = "granted";
      return "granted";
    }
  };

  const preference = await requestTrendNotificationPermission({
    adapter,
    api,
    context: "first-snapshot",
    now: new Date("2026-06-10T12:00:00Z")
  });

  assert.equal(requestCount, 1);
  assert.equal(preference.permission, "granted");
  assert.equal(preference.permissionAsked, true);
  assert.equal(preference.firstAskedAt, "2026-06-10T12:00:00.000Z");
  assert.equal(loadNotificationPreference(adapter).lastAskedContext, "first-snapshot");

  const secondPreference = await requestTrendNotificationPermission({
    adapter,
    api,
    context: "first-snapshot"
  });

  assert.equal(requestCount, 1);
  assert.equal(secondPreference.permission, "granted");
});

test("handles denied or unsupported notification APIs without prompting", async () => {
  const deniedAdapter = createMemoryStorageAdapter();
  let deniedRequestCount = 0;
  const deniedPreference = await requestTrendNotificationPermission({
    adapter: deniedAdapter,
    api: {
      permission: "denied",
      async requestPermission() {
        deniedRequestCount += 1;
        return "denied";
      }
    }
  });

  assert.equal(deniedRequestCount, 0);
  assert.equal(deniedPreference.permission, "denied");
  assert.equal(deniedPreference.permissionAsked, true);

  const unsupportedPreference = await requestTrendNotificationPermission({
    adapter: createMemoryStorageAdapter(),
    api: null
  });

  assert.equal(unsupportedPreference.permission, "unsupported");
  assert.equal(unsupportedPreference.permissionAsked, false);
});

test("builds trend-staleness notification copy without body judgment", () => {
  assert.equal(buildTrendReminderCopy({ status: "current" }).title, "Trend data is current");
  assert.match(buildTrendReminderCopy({ status: "grace" }).body, /weekly check-in/i);
  assert.equal(buildTrendReminderCopy({ status: "needs-check-in" }).title, "Trend data is stale");
  assert.doesNotMatch(buildTrendReminderCopy({ status: "needs-check-in" }).body, /bad|failure|behind/i);
});

test("throttles stale trend reminders to once per day", () => {
  const preference = {
    permission: "granted",
    lastReminderAt: ""
  };
  const weeklyStreak = { status: "needs-check-in" };

  assert.equal(shouldSendTrendReminder(preference, weeklyStreak, Date.parse("2026-06-10T12:00:00Z")), true);
  const updatedPreference = recordTrendReminderSent(
    preference,
    new Date("2026-06-10T12:00:00Z"),
    createMemoryStorageAdapter()
  );

  assert.equal(
    shouldSendTrendReminder(updatedPreference, weeklyStreak, Date.parse("2026-06-10T18:00:00Z")),
    false
  );
  assert.equal(
    shouldSendTrendReminder(updatedPreference, weeklyStreak, Date.parse("2026-06-11T13:00:00Z")),
    true
  );
  assert.equal(shouldSendTrendReminder(updatedPreference, { status: "current" }, Date.now()), false);
});

test("sends a stale trend notification only when due and granted", () => {
  const adapter = createMemoryStorageAdapter();
  recordTrendReminderSent(
    {
      permission: "granted",
      lastReminderAt: ""
    },
    new Date("2026-06-09T09:00:00Z"),
    adapter
  );
  const delivered = [];
  function Notification(title, options) {
    delivered.push({ title, options });
  }

  const firstResult = sendTrendReminderNotificationIfDue({
    adapter,
    api: Notification,
    weeklyStreak: { status: "needs-check-in" },
    now: new Date("2026-06-10T10:00:00Z")
  });
  const secondResult = sendTrendReminderNotificationIfDue({
    adapter,
    api: Notification,
    weeklyStreak: { status: "needs-check-in" },
    now: new Date("2026-06-10T12:00:00Z")
  });

  assert.equal(firstResult.sent, true);
  assert.equal(firstResult.copy.title, "Trend data is stale");
  assert.equal(secondResult.sent, false);
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0].title, "Trend data is stale");
  assert.equal(delivered[0].options.tag, "bodymod-trend-stale");
});
