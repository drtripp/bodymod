import { readJsonSync, writeJsonSync } from "./storageAdapter.js";

export const NOTIFICATION_PREFERENCE_KEY = "bodymod:notification-preferences:v1";
export const TREND_NOTIFICATION_WORKER_URL = "/trend-notification-worker.js";

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

function serviceWorkerApi() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  return navigator.serviceWorker;
}

export async function registerTrendNotificationWorker({
  serviceWorker = serviceWorkerApi(),
  workerUrl = TREND_NOTIFICATION_WORKER_URL
} = {}) {
  if (!serviceWorker || typeof serviceWorker.register !== "function") {
    return {
      registered: false,
      reason: "unsupported"
    };
  }

  try {
    const registration = await serviceWorker.register(workerUrl);
    return {
      registered: true,
      registration
    };
  } catch (error) {
    return {
      registered: false,
      reason: "failed"
    };
  }
}

export async function requestTrendNotificationPermission({
  context = "first-snapshot",
  now = new Date(),
  adapter,
  api = notificationApi(),
  serviceWorker = serviceWorkerApi(),
  workerUrl = TREND_NOTIFICATION_WORKER_URL
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
    if (currentPermission === "granted") {
      void registerTrendNotificationWorker({ serviceWorker, workerUrl });
    }

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
  if (requestedPermission === "granted") {
    void registerTrendNotificationWorker({ serviceWorker, workerUrl });
  }

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

async function notificationRegistration({
  registration,
  serviceWorker = serviceWorkerApi(),
  workerUrl = TREND_NOTIFICATION_WORKER_URL
} = {}) {
  if (registration && typeof registration.showNotification === "function") {
    return registration;
  }

  const registrationResult = await registerTrendNotificationWorker({ serviceWorker, workerUrl });
  if (
    registrationResult.registration &&
    typeof registrationResult.registration.showNotification === "function"
  ) {
    return registrationResult.registration;
  }

  if (serviceWorker?.ready && typeof serviceWorker.ready.then === "function") {
    try {
      const readyRegistration = await serviceWorker.ready;
      if (readyRegistration && typeof readyRegistration.showNotification === "function") {
        return readyRegistration;
      }
    } catch (error) {
      return null;
    }
  }

  return null;
}

function trendNotificationOptions(copy) {
  return {
    body: copy.body,
    tag: "bodymod-trend-stale",
    renotify: false,
    data: {
      url: "/"
    }
  };
}

export async function sendTrendReminderNotificationIfDue({
  weeklyStreak,
  now = new Date(),
  adapter,
  api = notificationApi(),
  registration,
  serviceWorker = serviceWorkerApi(),
  workerUrl = TREND_NOTIFICATION_WORKER_URL
} = {}) {
  const preference = loadNotificationPreference(adapter);

  if (
    !shouldSendTrendReminder(preference, weeklyStreak, now.getTime())
  ) {
    return {
      sent: false,
      preference
    };
  }

  const copy = buildTrendReminderCopy(weeklyStreak);
  const options = trendNotificationOptions(copy);
  const serviceWorkerRegistration = await notificationRegistration({
    registration,
    serviceWorker,
    workerUrl
  });

  if (serviceWorkerRegistration) {
    try {
      await serviceWorkerRegistration.showNotification(copy.title, options);
      return {
        sent: true,
        delivery: "service-worker",
        copy,
        preference: recordTrendReminderSent(preference, now, adapter)
      };
    } catch (error) {
      // Fall through to the direct Notification API when service-worker delivery fails.
    }
  }

  if (typeof api !== "function") {
    return {
      sent: false,
      copy,
      preference
    };
  }

  try {
    new api(copy.title, options);
  } catch (error) {
    return {
      sent: false,
      copy,
      preference
    };
  }

  return {
    sent: true,
    delivery: "notification-api",
    copy,
    preference: recordTrendReminderSent(preference, now, adapter)
  };
}
