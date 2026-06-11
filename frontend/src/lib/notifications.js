import { readJsonSync, writeJsonSync } from "./storageAdapter.js";
import {
  WEB_PUSH_CONFIG_ENDPOINT,
  WEB_PUSH_SUBSCRIPTIONS_ENDPOINT
} from "../config.js";

export const NOTIFICATION_PREFERENCE_KEY = "bodymod:notification-preferences:v1";
export const TREND_NOTIFICATION_WORKER_URL = "/trend-notification-worker.js";

export function defaultNotificationPreference() {
  return {
    version: 1,
    permission: "unknown",
    permissionAsked: false,
    firstAskedAt: "",
    lastAskedContext: "",
    lastReminderAt: "",
    remotePushStatus: "not-configured",
    remotePushEndpointHash: "",
    remotePushUpdatedAt: ""
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

function fetchApi() {
  if (typeof fetch === "undefined") {
    return null;
  }

  return fetch.bind(globalThis);
}

function userAgentFamily(navigatorRef = typeof navigator === "undefined" ? null : navigator) {
  const agent = navigatorRef?.userAgent || "";
  if (/Edg\//.test(agent)) {
    return "Edge";
  }
  if (/Firefox\//.test(agent)) {
    return "Firefox";
  }
  if (/Chrome\//.test(agent)) {
    return "Chrome";
  }
  if (/Safari\//.test(agent)) {
    return "Safari";
  }
  return "Unknown";
}

function decodeBase64(value) {
  if (typeof atob === "function") {
    return atob(value);
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "base64").toString("binary");
  }
  throw new Error("Base64 decoding is unavailable.");
}

export function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = decodeBase64(base64);
  const output = new Uint8Array(raw.length);

  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }

  return output;
}

export async function fetchWebPushConfig({
  fetcher = fetchApi(),
  endpoint = WEB_PUSH_CONFIG_ENDPOINT
} = {}) {
  if (!fetcher) {
    return {
      enabled: false,
      vapidPublicKey: "",
      reason: "fetch unsupported"
    };
  }

  try {
    const response = await fetcher(endpoint, {
      headers: {
        Accept: "application/json"
      }
    });
    if (!response.ok) {
      throw new Error(`Web push config failed: ${response.status}`);
    }
    const payload = await response.json();
    return {
      enabled: Boolean(payload.enabled),
      vapidPublicKey: String(payload.vapidPublicKey || ""),
      reason: String(payload.reason || "")
    };
  } catch (error) {
    return {
      enabled: false,
      vapidPublicKey: "",
      reason: "config unavailable"
    };
  }
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

function normalizePushSubscription(subscription) {
  const payload =
    typeof subscription?.toJSON === "function" ? subscription.toJSON() : subscription;

  return {
    endpoint: String(payload?.endpoint || ""),
    expirationTime: payload?.expirationTime ?? null,
    keys: {
      p256dh: String(payload?.keys?.p256dh || ""),
      auth: String(payload?.keys?.auth || "")
    }
  };
}

async function readyServiceWorkerRegistration(serviceWorker, workerUrl) {
  const registrationResult = await registerTrendNotificationWorker({ serviceWorker, workerUrl });
  if (registrationResult.registration) {
    return registrationResult.registration;
  }
  if (serviceWorker?.ready && typeof serviceWorker.ready.then === "function") {
    return serviceWorker.ready;
  }
  return null;
}

function persistRemotePushStatus(status, adapter, details = {}) {
  return persistNotificationPreference(
    {
      ...loadNotificationPreference(adapter),
      remotePushStatus: status,
      remotePushEndpointHash: details.endpointHash || "",
      remotePushUpdatedAt: details.now ? details.now.toISOString() : new Date().toISOString()
    },
    adapter
  );
}

export async function subscribeTrendPushNotifications({
  adapter,
  now = new Date(),
  api = notificationApi(),
  serviceWorker = serviceWorkerApi(),
  fetcher = fetchApi(),
  navigatorRef = typeof navigator === "undefined" ? null : navigator,
  workerUrl = TREND_NOTIFICATION_WORKER_URL,
  configEndpoint = WEB_PUSH_CONFIG_ENDPOINT,
  subscriptionsEndpoint = WEB_PUSH_SUBSCRIPTIONS_ENDPOINT
} = {}) {
  if (api?.permission !== "granted") {
    const preference = persistRemotePushStatus("permission-required", adapter, { now });
    return {
      subscribed: false,
      reason: "permission-required",
      preference
    };
  }

  const config = await fetchWebPushConfig({ fetcher, endpoint: configEndpoint });
  if (!config.enabled || !config.vapidPublicKey) {
    const preference = persistRemotePushStatus("not-configured", adapter, { now });
    return {
      subscribed: false,
      reason: config.reason || "not-configured",
      preference
    };
  }

  if (!serviceWorker || !fetcher) {
    const preference = persistRemotePushStatus("unsupported", adapter, { now });
    return {
      subscribed: false,
      reason: "unsupported",
      preference
    };
  }

  try {
    const registration = await readyServiceWorkerRegistration(serviceWorker, workerUrl);
    const pushManager = registration?.pushManager;
    if (!pushManager) {
      const preference = persistRemotePushStatus("unsupported", adapter, { now });
      return {
        subscribed: false,
        reason: "unsupported",
        preference
      };
    }

    const existingSubscription =
      typeof pushManager.getSubscription === "function"
        ? await pushManager.getSubscription()
        : null;
    const subscription =
      existingSubscription ||
      (await pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.vapidPublicKey)
      }));
    const payload = normalizePushSubscription(subscription);
    const response = await fetcher(subscriptionsEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        subscription: payload,
        context: "trend-stale",
        userAgentFamily: userAgentFamily(navigatorRef),
        createdAt: now.toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Web push subscribe failed: ${response.status}`);
    }

    const body = await response.json();
    const preference = persistRemotePushStatus("subscribed", adapter, {
      endpointHash: body.endpointHash,
      now
    });
    return {
      subscribed: true,
      subscription: payload,
      endpointHash: body.endpointHash,
      deliveryConfigured: Boolean(body.deliveryConfigured),
      preference
    };
  } catch (error) {
    const preference = persistRemotePushStatus("failed", adapter, { now });
    return {
      subscribed: false,
      reason: "failed",
      preference
    };
  }
}

export async function unsubscribeTrendPushNotifications({
  adapter,
  now = new Date(),
  serviceWorker = serviceWorkerApi(),
  fetcher = fetchApi(),
  subscriptionsEndpoint = WEB_PUSH_SUBSCRIPTIONS_ENDPOINT
} = {}) {
  try {
    const registration =
      serviceWorker?.ready && typeof serviceWorker.ready.then === "function"
        ? await serviceWorker.ready
        : null;
    const subscription =
      registration?.pushManager && typeof registration.pushManager.getSubscription === "function"
        ? await registration.pushManager.getSubscription()
        : null;
    const endpoint = subscription?.endpoint || "";

    if (subscription && typeof subscription.unsubscribe === "function") {
      await subscription.unsubscribe();
    }

    if (endpoint && fetcher) {
      await fetcher(`${subscriptionsEndpoint}/unsubscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          endpoint,
          createdAt: now.toISOString()
        })
      });
    }

    const preference = persistRemotePushStatus("unsubscribed", adapter, { now });
    return {
      unsubscribed: true,
      preference
    };
  } catch (error) {
    const preference = persistRemotePushStatus("failed", adapter, { now });
    return {
      unsubscribed: false,
      reason: "failed",
      preference
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
