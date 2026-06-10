import { readJsonSync, writeJsonSync } from "./storageAdapter.js";

export const NOTIFICATION_PREFERENCE_KEY = "bodymod:notification-preferences:v1";

export function defaultNotificationPreference() {
  return {
    version: 1,
    permission: "unknown",
    permissionAsked: false,
    firstAskedAt: "",
    lastAskedContext: "",
    lastReminderAt: ""
  };
}

export function loadNotificationPreference(adapter) {
  try {
    return {
      ...defaultNotificationPreference(),
      ...(readJsonSync(NOTIFICATION_PREFERENCE_KEY, null, adapter) || {})
    };
  } catch {
    return defaultNotificationPreference();
  }
}

export function persistNotificationPreference(preference, adapter) {
  const nextPreference = {
    ...defaultNotificationPreference(),
    ...preference
  };
  writeJsonSync(NOTIFICATION_PREFERENCE_KEY, nextPreference, adapter);
  return nextPreference;
}

function notificationApi() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }

  return window.Notification;
}

export async function requestTrendNotificationPermission({
  context = "first-snapshot",
  now = new Date(),
  adapter,
  api = notificationApi()
} = {}) {
  const currentPreference = loadNotificationPreference(adapter);
  const currentPermission = api?.permission || "unsupported";
  const basePreference = {
    ...currentPreference,
    permission: currentPermission,
    lastAskedContext: context
  };

  if (!api || typeof api.requestPermission !== "function") {
    return persistNotificationPreference(
      {
        ...basePreference,
        permission: "unsupported"
      },
      adapter
    );
  }

  if (currentPermission !== "default") {
    return persistNotificationPreference(
      {
        ...basePreference,
        permission: currentPermission,
        permissionAsked: currentPreference.permissionAsked || currentPermission !== "unsupported"
      },
      adapter
    );
  }

  const requestedPermission = await api.requestPermission();
  return persistNotificationPreference(
    {
      ...basePreference,
      permission: requestedPermission,
      permissionAsked: true,
      firstAskedAt: currentPreference.firstAskedAt || now.toISOString()
    },
    adapter
  );
}

export function buildTrendReminderCopy(weeklyStreak = {}) {
  switch (weeklyStreak.status) {
    case "current":
      return {
        title: "Trend data is current",
        body: "Your weekly measurement check-in is fresh enough for trend comparisons."
      };
    case "grace":
      return {
        title: "Trend data is nearing stale",
        body: "A weekly check-in keeps tape trends readable before the grace window closes."
      };
    case "needs-check-in":
      return {
        title: "Trend data is stale",
        body: "Log a weekly measurement check-in before reading new tape-measure changes."
      };
    default:
      return {
        title: "Start trend tracking",
        body: "Save a weekly measurement check-in when you want trend comparisons to stay useful."
      };
  }
}

export function shouldSendTrendReminder(preference, weeklyStreak, now = Date.now()) {
  if (preference?.permission !== "granted" || weeklyStreak?.status !== "needs-check-in") {
    return false;
  }

  const lastReminderAt = new Date(preference.lastReminderAt || 0).getTime();
  if (!Number.isFinite(lastReminderAt) || lastReminderAt <= 0) {
    return true;
  }

  return now - lastReminderAt >= 24 * 60 * 60 * 1000;
}

export function recordTrendReminderSent(preference, now = new Date(), adapter) {
  return persistNotificationPreference(
    {
      ...preference,
      lastReminderAt: now.toISOString()
    },
    adapter
  );
}

export function sendTrendReminderNotificationIfDue({
  weeklyStreak,
  now = new Date(),
  adapter,
  api = notificationApi()
} = {}) {
  const preference = loadNotificationPreference(adapter);

  if (
    !shouldSendTrendReminder(preference, weeklyStreak, now.getTime()) ||
    typeof api !== "function"
  ) {
    return {
      sent: false,
      preference
    };
  }

  const copy = buildTrendReminderCopy(weeklyStreak);
  new api(copy.title, {
    body: copy.body,
    tag: "bodymod-trend-stale",
    renotify: false
  });

  return {
    sent: true,
    copy,
    preference: recordTrendReminderSent(preference, now, adapter)
  };
}
