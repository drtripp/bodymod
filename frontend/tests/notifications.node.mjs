import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildTrendReminderCopy,
  fetchWebPushConfig,
  loadNotificationPreference,
  nextTrendReminderAfter,
  recordTrendReminderSent,
  registerTrendNotificationWorker,
  requestTrendNotificationPermission,
  sendTrendReminderNotificationIfDue,
  shouldSendTrendReminder,
  syncTrendPushReminderSchedule,
  subscribeTrendPushNotifications,
  unsubscribeTrendPushNotifications,
  urlBase64ToUint8Array
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
  let registeredWorkerUrl = "";
  const serviceWorker = {
    async register(workerUrl) {
      registeredWorkerUrl = workerUrl;
      return { scope: "/" };
    }
  };

  const preference = await requestTrendNotificationPermission({
    adapter,
    api,
    serviceWorker,
    context: "first-snapshot",
    now: new Date("2026-06-10T12:00:00Z")
  });
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

  assert.equal(requestCount, 1);
  assert.equal(preference.permission, "granted");
  assert.equal(preference.permissionAsked, true);
  assert.equal(preference.firstAskedAt, "2026-06-10T12:00:00.000Z");
  assert.equal(loadNotificationPreference(adapter).lastAskedContext, "first-snapshot");
  assert.equal(registeredWorkerUrl, "/trend-notification-worker.js");

  const secondPreference = await requestTrendNotificationPermission({
    adapter,
    api,
    serviceWorker,
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
  assert.equal(
    nextTrendReminderAfter(
      { status: "current", graceEndsAt: "2026-06-20T12:00:00.000Z" },
      new Date("2026-06-10T12:00:00Z")
    ),
    "2026-06-20T12:00:00.000Z"
  );
  assert.equal(
    nextTrendReminderAfter({ status: "needs-check-in" }, new Date("2026-06-10T12:00:00Z")),
    "2026-06-10T12:00:00.000Z"
  );
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

test("registers the trend notification service worker when supported", async () => {
  let registeredWorkerUrl = "";
  const result = await registerTrendNotificationWorker({
    serviceWorker: {
      async register(workerUrl) {
        registeredWorkerUrl = workerUrl;
        return { scope: "/" };
      }
    }
  });
  const unsupported = await registerTrendNotificationWorker({ serviceWorker: null });

  assert.equal(result.registered, true);
  assert.equal(registeredWorkerUrl, "/trend-notification-worker.js");
  assert.equal(unsupported.registered, false);
  assert.equal(unsupported.reason, "unsupported");
});

test("sends a stale trend notification through the direct API fallback", async () => {
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

  const firstResult = await sendTrendReminderNotificationIfDue({
    adapter,
    api: Notification,
    serviceWorker: null,
    weeklyStreak: { status: "needs-check-in" },
    now: new Date("2026-06-10T10:00:00Z")
  });
  const secondResult = await sendTrendReminderNotificationIfDue({
    adapter,
    api: Notification,
    serviceWorker: null,
    weeklyStreak: { status: "needs-check-in" },
    now: new Date("2026-06-10T12:00:00Z")
  });

  assert.equal(firstResult.sent, true);
  assert.equal(firstResult.delivery, "notification-api");
  assert.equal(firstResult.copy.title, "Trend data is stale");
  assert.equal(secondResult.sent, false);
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0].title, "Trend data is stale");
  assert.equal(delivered[0].options.tag, "bodymod-trend-stale");
  assert.equal(delivered[0].options.data.url, "/");
});

test("prefers service-worker delivery for stale trend notifications", async () => {
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
  const directNotifications = [];

  const result = await sendTrendReminderNotificationIfDue({
    adapter,
    api(title, options) {
      directNotifications.push({ title, options });
    },
    registration: {
      async showNotification(title, options) {
        delivered.push({ title, options });
      }
    },
    weeklyStreak: { status: "needs-check-in" },
    now: new Date("2026-06-10T10:00:00Z")
  });

  assert.equal(result.sent, true);
  assert.equal(result.delivery, "service-worker");
  assert.equal(directNotifications.length, 0);
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0].title, "Trend data is stale");
  assert.equal(delivered[0].options.data.url, "/");
});

test("fetches web push config and decodes VAPID keys", async () => {
  const config = await fetchWebPushConfig({
    endpoint: "/api/web-push/config",
    async fetcher(endpoint, options) {
      assert.equal(endpoint, "/api/web-push/config");
      assert.equal(options.headers.Accept, "application/json");
      return {
        ok: true,
        async json() {
          return {
            enabled: true,
            vapidPublicKey: "AQID",
            reason: ""
          };
        }
      };
    }
  });

  assert.equal(config.enabled, true);
  assert.deepEqual(Array.from(urlBase64ToUint8Array("AQID")), [1, 2, 3]);

  const unavailable = await fetchWebPushConfig({
    async fetcher() {
      return { ok: false, status: 503 };
    }
  });

  assert.equal(unavailable.enabled, false);
  assert.equal(unavailable.reason, "config unavailable");
});

test("subscribes remote web push only after notification permission is granted", async () => {
  const adapter = createMemoryStorageAdapter();
  const blocked = await subscribeTrendPushNotifications({
    adapter,
    api: { permission: "denied" },
    now: new Date("2026-06-10T12:00:00Z")
  });

  assert.equal(blocked.subscribed, false);
  assert.equal(blocked.reason, "permission-required");
  assert.equal(loadNotificationPreference(adapter).remotePushStatus, "permission-required");

  let subscribeOptions = null;
  const subscriptionPayload = {
    endpoint: "https://push.example.test/subscriptions/browser-1",
    expirationTime: null,
    keys: {
      p256dh: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef0123456789_-",
      auth: "abcdef0123456789_-"
    }
  };
  const registration = {
    pushManager: {
      async getSubscription() {
        return null;
      },
      async subscribe(options) {
        subscribeOptions = options;
        return {
          endpoint: subscriptionPayload.endpoint,
          toJSON() {
            return subscriptionPayload;
          }
        };
      }
    }
  };
  const serviceWorker = {
    async register(workerUrl) {
      assert.equal(workerUrl, "/trend-notification-worker.js");
      return registration;
    },
    ready: Promise.resolve(registration)
  };
  const calls = [];
  async function fetcher(endpoint, options = {}) {
    calls.push({ endpoint, options });
    if (endpoint === "/push-config") {
      return {
        ok: true,
        async json() {
          return {
            enabled: true,
            vapidPublicKey: "AQID",
            reason: ""
          };
        }
      };
    }
    return {
      ok: true,
      async json() {
        return {
          status: "accepted",
          stored: true,
          endpointHash: "abc123",
          deliveryConfigured: true
        };
      }
    };
  }

  const result = await subscribeTrendPushNotifications({
    adapter,
    api: { permission: "granted" },
    serviceWorker,
    fetcher,
    navigatorRef: { userAgent: "Mozilla/5.0 Chrome/125.0" },
    weeklyStreak: {
      status: "current",
      graceEndsAt: "2026-06-20T12:00:00.000Z"
    },
    configEndpoint: "/push-config",
    subscriptionsEndpoint: "/push-subscriptions",
    now: new Date("2026-06-10T12:30:00Z")
  });

  const posted = JSON.parse(calls[1].options.body);
  assert.equal(result.subscribed, true);
  assert.equal(result.endpointHash, "abc123");
  assert.equal(loadNotificationPreference(adapter).remotePushStatus, "subscribed");
  assert.equal(loadNotificationPreference(adapter).remotePushEndpointHash, "abc123");
  assert.equal(subscribeOptions.userVisibleOnly, true);
  assert.deepEqual(Array.from(subscribeOptions.applicationServerKey), [1, 2, 3]);
  assert.equal(calls[1].endpoint, "/push-subscriptions");
  assert.equal(posted.context, "trend-stale");
  assert.equal(posted.userAgentFamily, "Chrome");
  assert.equal(posted.nextReminderAfter, "2026-06-20T12:00:00.000Z");
  assert.equal(posted.subscription.endpoint, subscriptionPayload.endpoint);
  assert.equal(String(calls[1].options.body).includes("measurements"), false);
  assert.equal(
    loadNotificationPreference(adapter).remotePushNextReminderAfter,
    "2026-06-20T12:00:00.000Z"
  );
});

test("syncs remote web push reminder schedule without measurement data", async () => {
  const adapter = createMemoryStorageAdapter();
  const subscriptionPayload = {
    endpoint: "https://push.example.test/subscriptions/browser-3",
    expirationTime: null,
    keys: {
      p256dh: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef0123456789_-",
      auth: "abcdef0123456789_-"
    }
  };
  recordTrendReminderSent(
    {
      permission: "granted",
      remotePushStatus: "subscribed",
      remotePushEndpointHash: "existing-hash",
      lastReminderAt: ""
    },
    new Date("2026-06-09T09:00:00Z"),
    adapter
  );
  const registration = {
    pushManager: {
      async getSubscription() {
        return {
          endpoint: subscriptionPayload.endpoint,
          toJSON() {
            return subscriptionPayload;
          }
        };
      }
    }
  };
  const calls = [];
  const result = await syncTrendPushReminderSchedule({
    adapter,
    serviceWorker: {
      async register() {
        return registration;
      },
      ready: Promise.resolve(registration)
    },
    subscriptionsEndpoint: "/push-subscriptions",
    navigatorRef: { userAgent: "Mozilla/5.0 Firefox/126.0" },
    weeklyStreak: { status: "needs-check-in" },
    now: new Date("2026-06-11T12:00:00Z"),
    async fetcher(endpoint, options = {}) {
      calls.push({ endpoint, options });
      return {
        ok: true,
        async json() {
          return {
            status: "accepted",
            stored: true,
            endpointHash: "synced-hash",
            nextReminderAfter: "2026-06-11T12:00:00.000Z"
          };
        }
      };
    }
  });

  const posted = JSON.parse(calls[0].options.body);
  assert.equal(result.synced, true);
  assert.equal(result.nextReminderAfter, "2026-06-11T12:00:00.000Z");
  assert.equal(posted.userAgentFamily, "Firefox");
  assert.equal(posted.nextReminderAfter, "2026-06-11T12:00:00.000Z");
  assert.equal(String(calls[0].options.body).includes("measurements"), false);
  assert.equal(loadNotificationPreference(adapter).remotePushEndpointHash, "synced-hash");
});

test("unsubscribes remote web push and revokes the backend endpoint", async () => {
  const adapter = createMemoryStorageAdapter();
  const calls = [];
  let unsubscribed = false;
  const registration = {
    pushManager: {
      async getSubscription() {
        return {
          endpoint: "https://push.example.test/subscriptions/browser-2",
          async unsubscribe() {
            unsubscribed = true;
            return true;
          }
        };
      }
    }
  };

  const result = await unsubscribeTrendPushNotifications({
    adapter,
    serviceWorker: {
      ready: Promise.resolve(registration)
    },
    subscriptionsEndpoint: "/push-subscriptions",
    async fetcher(endpoint, options = {}) {
      calls.push({ endpoint, options });
      return {
        ok: true,
        async json() {
          return { status: "revoked", revoked: true };
        }
      };
    },
    now: new Date("2026-06-10T13:00:00Z")
  });

  assert.equal(result.unsubscribed, true);
  assert.equal(unsubscribed, true);
  assert.equal(calls[0].endpoint, "/push-subscriptions/unsubscribe");
  assert.equal(
    JSON.parse(calls[0].options.body).endpoint,
    "https://push.example.test/subscriptions/browser-2"
  );
  assert.equal(loadNotificationPreference(adapter).remotePushStatus, "unsubscribed");
});
