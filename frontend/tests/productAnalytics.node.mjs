import assert from "node:assert/strict";
import test from "node:test";
import {
  analyticsSessionId,
  clearAnalyticsEvents,
  createProductAnalyticsEvent,
  installProductAnalytics,
  loadAnalyticsEvents,
  reportProductAnalytics,
  sendProductAnalyticsEvent,
  storeAnalyticsEvent
} from "../src/lib/productAnalytics.js";
import { clearEvents, loadEvents, trackEvent } from "../src/lib/analytics.js";
import { createMemoryStorageAdapter } from "../src/lib/storageAdapter.js";

const fixedSessionId = "analytics-session:0123456789abcdef";

test("creates minimized analytics events without raw user values", () => {
  const event = createProductAnalyticsEvent("raw height should-not-leak", {
    sessionId: fixedSessionId,
    surface: "weight should-not-leak",
    context: "gender",
    location: { pathname: "/profile/dawson@example.com?m=should-not-leak" },
    navigator: { userAgent: "Mozilla/5.0 Firefox/128.0" },
    now: "2026-06-11T12:00:00.000Z"
  });
  const serialized = JSON.stringify(event);

  assert.equal(event.name, "app_interaction");
  assert.equal(event.surface, "app");
  assert.equal(event.context, "gender");
  assert.equal(event.route, "/profile/:param");
  assert.equal(event.userAgentFamily, "Firefox");
  assert.equal(event.anonymousSessionId, fixedSessionId);
  assert.match(event.id, /^analytics:[a-f0-9]{8}$/);
  assert.doesNotMatch(serialized, /height|weight|dawson|example\.com|should-not-leak|m=/i);
});

test("persists anonymous analytics session ids locally", () => {
  const adapter = createMemoryStorageAdapter();
  const crypto = {
    getRandomValues(bytes) {
      bytes.set([0, 1, 2, 3, 4, 5, 6, 7]);
      return bytes;
    }
  };

  const first = analyticsSessionId(adapter, crypto);
  const second = analyticsSessionId(adapter, {
    getRandomValues(bytes) {
      bytes.fill(255);
      return bytes;
    }
  });

  assert.equal(first, "analytics-session:0001020304050607");
  assert.equal(second, first);
});

test("replaces unsafe caller-provided session ids", () => {
  const adapter = createMemoryStorageAdapter();
  const event = createProductAnalyticsEvent("app_opened", {
    adapter,
    sessionId: "dawson@example.com-should-not-leak",
    crypto: {
      getRandomValues(bytes) {
        bytes.set([8, 9, 10, 11, 12, 13, 14, 15]);
        return bytes;
      }
    },
    now: "2026-06-11T12:00:00.000Z"
  });

  assert.equal(event.anonymousSessionId, "analytics-session:08090a0b0c0d0e0f");
  assert.doesNotMatch(JSON.stringify(event), /dawson|example\.com|should-not-leak/i);
});

test("stores only the latest local analytics events", () => {
  const adapter = createMemoryStorageAdapter();

  for (let index = 0; index < 55; index += 1) {
    storeAnalyticsEvent(
      createProductAnalyticsEvent("app_opened", {
        adapter,
        sessionId: fixedSessionId,
        now: new Date(Date.UTC(2026, 5, 11, 12, 0, index)).toISOString()
      }),
      adapter
    );
  }

  const events = loadAnalyticsEvents(adapter);
  assert.equal(events.length, 50);
  assert.equal(events[0].createdAt, "2026-06-11T12:00:05.000Z");

  clearAnalyticsEvents(adapter);
  assert.deepEqual(loadAnalyticsEvents(adapter), []);
});

test("uploads analytics only when explicitly enabled", async () => {
  const event = createProductAnalyticsEvent("theme_changed", {
    sessionId: fixedSessionId,
    surface: "settings",
    context: "desktop",
    now: "2026-06-11T12:00:00.000Z"
  });
  const calls = [];
  const disabled = await sendProductAnalyticsEvent(event, {
    uploadEnabled: false,
    endpoint: "/api/product-analytics",
    fetcher: async () => {
      throw new Error("should not send");
    }
  });
  const enabled = await sendProductAnalyticsEvent(event, {
    uploadEnabled: true,
    endpoint: "/api/product-analytics",
    fetcher: async (endpoint, options) => {
      calls.push({ endpoint, body: JSON.parse(options.body) });
      return { ok: true, status: 202 };
    }
  });

  assert.equal(disabled.sent, false);
  assert.equal(enabled.sent, true);
  assert.equal(calls[0].endpoint, "/api/product-analytics");
  assert.deepEqual(Object.keys(calls[0].body), ["event"]);
  assert.equal(calls[0].body.event.properties, undefined);
  assert.equal(calls[0].body.event.measurements, undefined);
});

test("install records one startup event through the same privacy envelope", async () => {
  const adapter = createMemoryStorageAdapter();
  const uploads = [];
  installProductAnalytics({
    windowRef: {
      innerWidth: 390,
      location: { pathname: "/app/session-1234567890abcdef?m=should-not-leak" },
      navigator: { userAgent: "Mozilla/5.0 Chrome/126.0.0.0 Safari/537.36" }
    },
    adapter,
    uploadEnabled: true,
    endpoint: "/api/product-analytics",
    fetcher: async (endpoint, options) => {
      uploads.push({ endpoint, body: JSON.parse(options.body) });
      return { ok: true, status: 202 };
    },
    release: "test"
  });
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

  const events = loadAnalyticsEvents(adapter);
  assert.equal(events.length, 1);
  assert.equal(events[0].name, "app_opened");
  assert.equal(events[0].context, "mobile");
  assert.equal(events[0].route, "/app/:param");
  assert.equal(uploads.length, 1);
  assert.doesNotMatch(JSON.stringify({ events, uploads }), /session-1234567890abcdef|should-not-leak|m=/i);
});

test("report helper stores and returns the created event", () => {
  const adapter = createMemoryStorageAdapter();
  const event = reportProductAnalytics("backup_exported", {
    adapter,
    sessionId: fixedSessionId,
    surface: "backup",
    context: "signed-in",
    uploadEnabled: false,
    now: "2026-06-11T12:00:00.000Z"
  });

  assert.equal(event.name, "backup_exported");
  assert.equal(loadAnalyticsEvents(adapter)[0].id, event.id);
});

test("legacy local event controls clear the minimized product analytics buffer", () => {
  const entries = new Map();
  const previousWindow = globalThis.window;
  globalThis.window = {
    location: { pathname: "/app/session-1234567890abcdef" },
    localStorage: {
      getItem(key) {
        return entries.has(key) ? entries.get(key) : null;
      },
      setItem(key, value) {
        entries.set(key, String(value));
      },
      removeItem(key) {
        entries.delete(key);
      }
    }
  };

  try {
    clearEvents();
    trackEvent("snapshot_saved", { source: "onboarding" });

    assert.equal(loadEvents().length, 2);
    assert.equal(loadAnalyticsEvents()[0].name, "snapshot_saved");
    assert.equal(loadAnalyticsEvents()[0].context, "first-run");

    clearEvents();
    assert.equal(loadEvents().length, 0);
    assert.equal(loadAnalyticsEvents().length, 0);
  } finally {
    globalThis.window = previousWindow;
  }
});
