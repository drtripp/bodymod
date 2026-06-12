import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { readJsonSync, writeJsonSync } from "./storageAdapter.js";
import { isNativeCapacitorRuntime } from "./storageAdapter.js";
import {
  NATIVE_PUSH_TOKENS_ENDPOINT,
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
    remotePushUpdatedAt: "",
    remotePushNextReminderAfter: "",
    nativePushStatus: "not-configured",
    nativePushTokenHash: "",
    nativePushPlatform: "",
    nativePushUpdatedAt: "",
    nativePushNextReminderAfter: ""
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

const grantedNativePushPermissionStates = new Set(["granted"]);

export function nativePushPlatform(capacitor = Capacitor) {
  try {
    const platform =
      typeof capacitor?.getPlatform === "function" ? capacitor.getPlatform() : "";
    return platform === "ios" || platform === "android" ? platform : "";
  } catch (error) {
    return "";
  }
}

export function isNativePushRuntime({
  capacitor = Capacitor,
  pushNotifications = PushNotifications
} = {}) {
  return (
    isNativeCapacitorRuntime(capacitor) &&
    typeof pushNotifications?.register === "function"
  );
}

export function trendPushStatusFromPreference(preference = loadNotificationPreference()) {
  if (
    preference.nativePushStatus &&
    preference.nativePushStatus !== "not-configured"
  ) {
    return preference.nativePushStatus;
  }

  return preference.remotePushStatus;
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
      remotePushUpdatedAt: details.now ? details.now.toISOString() : new Date().toISOString(),
      remotePushNextReminderAfter: details.nextReminderAfter || ""
    },
    adapter
  );
}

function persistNativePushStatus(status, adapter, details = {}) {
  return persistNotificationPreference(
    {
      ...loadNotificationPreference(adapter),
      nativePushStatus: status,
      nativePushTokenHash: details.tokenHash || "",
      nativePushPlatform: details.platform || "",
      nativePushUpdatedAt: details.now ? details.now.toISOString() : new Date().toISOString(),
      nativePushNextReminderAfter: details.nextReminderAfter || ""
    },
    adapter
  );
}

export function nextTrendReminderAfter(weeklyStreak = {}, now = new Date()) {
  if (weeklyStreak?.status === "needs-check-in") {
    return now.toISOString();
  }

  const candidate = weeklyStreak?.graceEndsAt || "";
  const timestamp = Date.parse(candidate);
  if (!Number.isFinite(timestamp)) {
    return "";
  }

  return new Date(Math.max(timestamp, now.getTime())).toISOString();
}

function webPushSubscriptionRequestBody({
  subscription,
  weeklyStreak,
  now,
  navigatorRef
}) {
  const reminderAfter = nextTrendReminderAfter(weeklyStreak, now);

  return {
    subscription,
    context: "trend-stale",
    userAgentFamily: userAgentFamily(navigatorRef),
    createdAt: now.toISOString(),
    nextReminderAfter: reminderAfter || null
  };
}

function nativePushTokenRequestBody({
  token,
  platform,
  weeklyStreak,
  now
}) {
  const reminderAfter = nextTrendReminderAfter(weeklyStreak, now);

  return {
    token,
    platform,
    context: "trend-stale",
    createdAt: now.toISOString(),
    nextReminderAfter: reminderAfter || null
  };
}

async function ensureNativePushPermission(pushNotifications) {
  const currentPermission =
    typeof pushNotifications.checkPermissions === "function"
      ? await pushNotifications.checkPermissions()
      : { receive: "prompt" };

  if (grantedNativePushPermissionStates.has(currentPermission?.receive)) {
    return true;
  }

  if (typeof pushNotifications.requestPermissions !== "function") {
    return false;
  }

  const requestedPermission = await pushNotifications.requestPermissions();
  return grantedNativePushPermissionStates.has(requestedPermission?.receive);
}

async function removeNativeListener(handle) {
  if (typeof handle?.remove === "function") {
    await handle.remove();
  }
}

async function registerNativePushToken(pushNotifications, timeoutMs = 10000) {
  const listenerHandles = [];

  return new Promise((resolve, reject) => {
    let settled = false;
    let timeoutId = null;

    function settle(callback, value) {
      if (settled) {
        return;
      }

      settled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      void Promise.all(listenerHandles.map(removeNativeListener));
      callback(value);
    }

    async function register() {
      if (typeof pushNotifications.addListener === "function") {
        listenerHandles.push(
          await pushNotifications.addListener("registration", (token) => {
            const value = String(token?.value || "").trim();
            if (value) {
              settle(resolve, value);
            } else {
              settle(reject, new Error("Native push registration returned an empty token."));
            }
          })
        );
        listenerHandles.push(
          await pushNotifications.addListener("registrationError", (error) => {
            settle(
              reject,
              new Error(error?.error || "Native push registration failed.")
            );
          })
        );
      }

      timeoutId = setTimeout(() => {
        settle(reject, new Error("Native push registration timed out."));
      }, timeoutMs);

      await pushNotifications.register();
    }

    void register().catch((error) => settle(reject, error));
  });
}

export async function subscribeNativeTrendPushNotifications({
  adapter,
  now = new Date(),
  pushNotifications = PushNotifications,
  capacitor = Capacitor,
  fetcher = fetchApi(),
  weeklyStreak = null,
  subscriptionsEndpoint = NATIVE_PUSH_TOKENS_ENDPOINT,
  registrationTimeoutMs = 10000
} = {}) {
  if (!isNativePushRuntime({ capacitor, pushNotifications }) || !fetcher) {
    const preference = persistNativePushStatus("unsupported", adapter, { now });
    return {
      subscribed: false,
      native: true,
      reason: "unsupported",
      preference
    };
  }

  try {
    const permissionGranted = await ensureNativePushPermission(pushNotifications);
    if (!permissionGranted) {
      const preference = persistNativePushStatus("permission-required", adapter, { now });
      return {
        subscribed: false,
        native: true,
        reason: "permission-required",
        preference
      };
    }

    const token = await registerNativePushToken(pushNotifications, registrationTimeoutMs);
    const platform = nativePushPlatform(capacitor);
    if (!platform) {
      const preference = persistNativePushStatus("unsupported", adapter, { now });
      return {
        subscribed: false,
        native: true,
        reason: "unsupported",
        preference
      };
    }

    const requestBody = nativePushTokenRequestBody({
      token,
      platform,
      weeklyStreak,
      now
    });
    const response = await fetcher(subscriptionsEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Native push subscribe failed: ${response.status}`);
    }

    const body = await response.json();
    const preference = persistNativePushStatus("subscribed", adapter, {
      tokenHash: body.tokenHash,
      platform,
      now,
      nextReminderAfter: body.nextReminderAfter || requestBody.nextReminderAfter || ""
    });

    return {
      subscribed: true,
      native: true,
      tokenHash: body.tokenHash,
      platform,
      deliveryConfigured: Boolean(body.deliveryConfigured),
      nextReminderAfter: body.nextReminderAfter || requestBody.nextReminderAfter || "",
      preference
    };
  } catch (error) {
    const preference = persistNativePushStatus("failed", adapter, { now });
    return {
      subscribed: false,
      native: true,
      reason: "failed",
      preference
    };
  }
}

export async function syncNativeTrendPushReminderSchedule({
  adapter,
  now = new Date(),
  weeklyStreak = null,
  pushNotifications = PushNotifications,
  capacitor = Capacitor,
  fetcher = fetchApi(),
  subscriptionsEndpoint = NATIVE_PUSH_TOKENS_ENDPOINT,
  registrationTimeoutMs = 10000
} = {}) {
  const currentPreference = loadNotificationPreference(adapter);
  if (currentPreference.nativePushStatus !== "subscribed") {
    return {
      synced: false,
      native: true,
      reason: "not-subscribed",
      preference: currentPreference
    };
  }

  if (!isNativePushRuntime({ capacitor, pushNotifications }) || !fetcher) {
    return {
      synced: false,
      native: true,
      reason: "unsupported",
      preference: currentPreference
    };
  }

  try {
    const token = await registerNativePushToken(pushNotifications, registrationTimeoutMs);
    const platform = nativePushPlatform(capacitor);
    if (!platform) {
      return {
        synced: false,
        native: true,
        reason: "unsupported",
        preference: currentPreference
      };
    }
    const requestBody = nativePushTokenRequestBody({
      token,
      platform,
      weeklyStreak,
      now
    });
    const response = await fetcher(subscriptionsEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Native push schedule sync failed: ${response.status}`);
    }

    const body = await response.json();
    const preference = persistNativePushStatus("subscribed", adapter, {
      tokenHash: body.tokenHash || currentPreference.nativePushTokenHash,
      platform,
      now,
      nextReminderAfter: body.nextReminderAfter || requestBody.nextReminderAfter || ""
    });

    return {
      synced: true,
      native: true,
      tokenHash: body.tokenHash || currentPreference.nativePushTokenHash,
      nextReminderAfter: body.nextReminderAfter || requestBody.nextReminderAfter || "",
      preference
    };
  } catch (error) {
    return {
      synced: false,
      native: true,
      reason: "failed",
      preference: currentPreference
    };
  }
}

export async function unsubscribeNativeTrendPushNotifications({
  adapter,
  now = new Date(),
  pushNotifications = PushNotifications,
  capacitor = Capacitor,
  fetcher = fetchApi(),
  subscriptionsEndpoint = NATIVE_PUSH_TOKENS_ENDPOINT
} = {}) {
  const currentPreference = loadNotificationPreference(adapter);

  try {
    if (
      isNativePushRuntime({ capacitor, pushNotifications }) &&
      typeof pushNotifications.unregister === "function"
    ) {
      await pushNotifications.unregister();
    }

    if (currentPreference.nativePushTokenHash && fetcher) {
      await fetcher(`${subscriptionsEndpoint}/unsubscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tokenHash: currentPreference.nativePushTokenHash,
          createdAt: now.toISOString()
        })
      });
    }

    const preference = persistNativePushStatus("unsubscribed", adapter, { now });
    return {
      unsubscribed: true,
      native: true,
      preference
    };
  } catch (error) {
    const preference = persistNativePushStatus("failed", adapter, { now });
    return {
      unsubscribed: false,
      native: true,
      reason: "failed",
      preference
    };
  }
}

export async function subscribeTrendPushNotifications({
  adapter,
  now = new Date(),
  api = notificationApi(),
  serviceWorker = serviceWorkerApi(),
  fetcher = fetchApi(),
  navigatorRef = typeof navigator === "undefined" ? null : navigator,
  weeklyStreak = null,
  workerUrl = TREND_NOTIFICATION_WORKER_URL,
  configEndpoint = WEB_PUSH_CONFIG_ENDPOINT,
  subscriptionsEndpoint = WEB_PUSH_SUBSCRIPTIONS_ENDPOINT,
  pushNotifications = PushNotifications,
  capacitor = Capacitor,
  nativeSubscriptionsEndpoint = NATIVE_PUSH_TOKENS_ENDPOINT,
  registrationTimeoutMs = 10000
} = {}) {
  if (isNativePushRuntime({ capacitor, pushNotifications })) {
    return subscribeNativeTrendPushNotifications({
      adapter,
      now,
      pushNotifications,
      capacitor,
      fetcher,
      weeklyStreak,
      subscriptionsEndpoint: nativeSubscriptionsEndpoint,
      registrationTimeoutMs
    });
  }

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
    const requestBody = webPushSubscriptionRequestBody({
      subscription: payload,
      weeklyStreak,
      now,
      navigatorRef
    });
    const response = await fetcher(subscriptionsEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Web push subscribe failed: ${response.status}`);
    }

    const body = await response.json();
    const preference = persistRemotePushStatus("subscribed", adapter, {
      endpointHash: body.endpointHash,
      now,
      nextReminderAfter: body.nextReminderAfter || requestBody.nextReminderAfter || ""
    });
    return {
      subscribed: true,
      subscription: payload,
      endpointHash: body.endpointHash,
      deliveryConfigured: Boolean(body.deliveryConfigured),
      nextReminderAfter: body.nextReminderAfter || requestBody.nextReminderAfter || "",
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

export async function syncTrendPushReminderSchedule({
  adapter,
  now = new Date(),
  weeklyStreak = null,
  serviceWorker = serviceWorkerApi(),
  fetcher = fetchApi(),
  navigatorRef = typeof navigator === "undefined" ? null : navigator,
  workerUrl = TREND_NOTIFICATION_WORKER_URL,
  subscriptionsEndpoint = WEB_PUSH_SUBSCRIPTIONS_ENDPOINT,
  pushNotifications = PushNotifications,
  capacitor = Capacitor,
  nativeSubscriptionsEndpoint = NATIVE_PUSH_TOKENS_ENDPOINT,
  registrationTimeoutMs = 10000
} = {}) {
  const currentPreference = loadNotificationPreference(adapter);
  if (currentPreference.nativePushStatus === "subscribed") {
    return syncNativeTrendPushReminderSchedule({
      adapter,
      now,
      weeklyStreak,
      pushNotifications,
      capacitor,
      fetcher,
      subscriptionsEndpoint: nativeSubscriptionsEndpoint,
      registrationTimeoutMs
    });
  }

  if (currentPreference.remotePushStatus !== "subscribed") {
    return {
      synced: false,
      reason: "not-subscribed",
      preference: currentPreference
    };
  }

  if (!serviceWorker || !fetcher) {
    return {
      synced: false,
      reason: "unsupported",
      preference: currentPreference
    };
  }

  try {
    const registration = await readyServiceWorkerRegistration(serviceWorker, workerUrl);
    const subscription =
      registration?.pushManager && typeof registration.pushManager.getSubscription === "function"
        ? await registration.pushManager.getSubscription()
        : null;
    if (!subscription) {
      return {
        synced: false,
        reason: "missing-subscription",
        preference: currentPreference
      };
    }

    const payload = normalizePushSubscription(subscription);
    const requestBody = webPushSubscriptionRequestBody({
      subscription: payload,
      weeklyStreak,
      now,
      navigatorRef
    });
    const response = await fetcher(subscriptionsEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });
    if (!response.ok) {
      throw new Error(`Web push schedule sync failed: ${response.status}`);
    }

    const body = await response.json();
    const preference = persistRemotePushStatus("subscribed", adapter, {
      endpointHash: body.endpointHash || currentPreference.remotePushEndpointHash,
      now,
      nextReminderAfter: body.nextReminderAfter || requestBody.nextReminderAfter || ""
    });

    return {
      synced: true,
      endpointHash: body.endpointHash || currentPreference.remotePushEndpointHash,
      nextReminderAfter: body.nextReminderAfter || requestBody.nextReminderAfter || "",
      preference
    };
  } catch (error) {
    return {
      synced: false,
      reason: "failed",
      preference: currentPreference
    };
  }
}

export async function unsubscribeTrendPushNotifications({
  adapter,
  now = new Date(),
  serviceWorker = serviceWorkerApi(),
  fetcher = fetchApi(),
  subscriptionsEndpoint = WEB_PUSH_SUBSCRIPTIONS_ENDPOINT,
  pushNotifications = PushNotifications,
  capacitor = Capacitor,
  nativeSubscriptionsEndpoint = NATIVE_PUSH_TOKENS_ENDPOINT
} = {}) {
  const currentPreference = loadNotificationPreference(adapter);
  if (currentPreference.nativePushStatus === "subscribed") {
    return unsubscribeNativeTrendPushNotifications({
      adapter,
      now,
      pushNotifications,
      capacitor,
      fetcher,
      subscriptionsEndpoint: nativeSubscriptionsEndpoint
    });
  }

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
