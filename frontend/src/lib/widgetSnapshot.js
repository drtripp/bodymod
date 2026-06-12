import { buildWeeklyStreak } from "./checkInLoop.js";
import { buildMeasurementDueState } from "./measurementCadence.js";
import { readJsonSync, writeJsonSync } from "./storageAdapter.js";


export const HOME_WIDGET_SNAPSHOT_KEY = "bodymod:home-widget-snapshot:v1";
export const HOME_WIDGET_KIND = "bodymod.home-widget-snapshot";

function isoTimestamp(value) {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : "";
}

function addDays(value, days) {
  const parsed = new Date(value || Date.now());
  parsed.setDate(parsed.getDate() + days);
  return parsed.toISOString();
}

export function formatWidgetDate(value) {
  const parsed = new Date(value || 0);
  if (!Number.isFinite(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}

function dailyLabel(cadenceDueState) {
  const daily = cadenceDueState?.daily || {};
  if (daily.isDue) {
    return "Daily log ready";
  }
  if (daily.latestAt) {
    return `Daily log saved ${formatWidgetDate(daily.latestAt)}`;
  }
  return "Daily log not started";
}

function nextWeeklyState(weeklyStreak, now) {
  if (!weeklyStreak?.latestAt) {
    return {
      urgency: "start",
      nextCheckInAt: isoTimestamp(now),
      nextCheckInLabel: "Start first weekly check-in"
    };
  }

  if (weeklyStreak.status === "needs-check-in") {
    return {
      urgency: "due",
      nextCheckInAt: isoTimestamp(weeklyStreak.nextDueAt),
      nextCheckInLabel: "Weekly check-in due"
    };
  }

  if (weeklyStreak.status === "grace") {
    return {
      urgency: "grace",
      nextCheckInAt: isoTimestamp(weeklyStreak.graceEndsAt || weeklyStreak.nextDueAt),
      nextCheckInLabel: `Grace through ${formatWidgetDate(weeklyStreak.graceEndsAt)}`
    };
  }

  const nextCheckInAt = weeklyStreak.nextDueAt || addDays(now, 7);
  return {
    urgency: "current",
    nextCheckInAt: isoTimestamp(nextCheckInAt),
    nextCheckInLabel: `Next check-in ${formatWidgetDate(nextCheckInAt)}`
  };
}

export function defaultHomeWidgetSnapshot() {
  return {
    version: 1,
    kind: HOME_WIDGET_KIND,
    updatedAt: "",
    streakCount: 0,
    streakStatus: "not-started",
    streakLabel: "No weekly streak yet",
    nextCheckInAt: "",
    nextCheckInLabel: "Start first weekly check-in",
    urgency: "start",
    dailyLabel: "Daily log not started",
    actionLabel: "Open Body Cafe",
    privacy: "No body values, notes, contact info, or photos."
  };
}

export function normalizeHomeWidgetSnapshot(snapshot = {}) {
  return {
    ...defaultHomeWidgetSnapshot(),
    ...snapshot,
    version: Number(snapshot.version || 1),
    kind: HOME_WIDGET_KIND,
    streakCount: Number(snapshot.streakCount || 0),
    nextCheckInAt: String(snapshot.nextCheckInAt || ""),
    updatedAt: String(snapshot.updatedAt || "")
  };
}

export function buildHomeWidgetSnapshot({
  checkIns = [],
  weeklyStreak = null,
  cadenceDueState = null,
  now = Date.now()
} = {}) {
  const timestamp = new Date(now).toISOString();
  const streak = weeklyStreak || buildWeeklyStreak(checkIns, now);
  const cadence = cadenceDueState || buildMeasurementDueState(checkIns, now);
  const nextWeekly = nextWeeklyState(streak, now);

  return normalizeHomeWidgetSnapshot({
    updatedAt: timestamp,
    streakCount: streak.current || 0,
    streakStatus: streak.status || "not-started",
    streakLabel: streak.label || "No weekly streak yet",
    dailyLabel: dailyLabel(cadence),
    ...nextWeekly
  });
}

export function loadHomeWidgetSnapshot(adapter) {
  return normalizeHomeWidgetSnapshot(
    readJsonSync(HOME_WIDGET_SNAPSHOT_KEY, defaultHomeWidgetSnapshot(), adapter)
  );
}

export function persistHomeWidgetSnapshot(snapshot, adapter) {
  const normalized = normalizeHomeWidgetSnapshot(snapshot);
  writeJsonSync(HOME_WIDGET_SNAPSHOT_KEY, normalized, adapter);
  return normalized;
}

export function syncHomeWidgetSnapshot(options = {}, adapter) {
  return persistHomeWidgetSnapshot(buildHomeWidgetSnapshot(options), adapter);
}
