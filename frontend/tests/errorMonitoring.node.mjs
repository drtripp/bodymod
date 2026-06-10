import assert from "node:assert/strict";
import test from "node:test";
import {
  clearErrorEvents,
  createSanitizedErrorEvent,
  installErrorMonitoring,
  loadErrorEvents,
  sendErrorEvent,
  storeErrorEvent
} from "../src/lib/errorMonitoring.js";
import { createMemoryStorageAdapter } from "../src/lib/storageAdapter.js";

test("creates sanitized client error events without raw messages or values", () => {
  const error = new TypeError(
    "Bad height 182.5 and weight 74 for dawson@example.com at https://example.com/?m=secret"
  );
  error.stack = "TypeError: Bad height\n    at App (C:\\Users\\Dawson\\project\\src\\App.jsx:20:8)";

  const event = createSanitizedErrorEvent(error, {
    type: "error",
    source: "C:\\Users\\Dawson\\project\\src\\App.jsx?m=secret",
    line: 20,
    column: 8,
    location: { pathname: "/profile/dawson@example.com?m=secret" },
    navigator: { userAgent: "Mozilla/5.0 Chrome/126.0.0.0 Safari/537.36" },
    now: "2026-06-10T12:00:00.000Z"
  });
  const serialized = JSON.stringify(event);

  assert.equal(event.errorName, "TypeError");
  assert.equal(event.source, "/src/App.jsx");
  assert.equal(event.route, "/profile/:param");
  assert.equal(event.userAgentFamily, "Chrome");
  assert.equal(event.line, 20);
  assert.match(event.messageFingerprint, /^[a-f0-9]{8}$/);
  assert.doesNotMatch(serialized, /182\.5|74|dawson|example\.com|m=secret|Bad height/i);
});

test("stores only the latest local error events", () => {
  const adapter = createMemoryStorageAdapter();

  for (let index = 0; index < 35; index += 1) {
    storeErrorEvent(
      {
        id: `client-error:${index}`,
        type: "manual",
        errorName: "Error",
        messageFingerprint: "12345678",
        stackFingerprint: "",
        source: "/src/App.jsx",
        line: index,
        column: 1,
        route: "/",
        severity: "error",
        release: "",
        userAgentFamily: "Unknown",
        createdAt: new Date(Date.UTC(2026, 5, 10, 12, 0, index)).toISOString()
      },
      adapter
    );
  }

  const events = loadErrorEvents(adapter);
  assert.equal(events.length, 30);
  assert.equal(events[0].id, "client-error:5");

  clearErrorEvents(adapter);
  assert.deepEqual(loadErrorEvents(adapter), []);
});

test("uploads sanitized events only when enabled", async () => {
  const event = createSanitizedErrorEvent(new Error("waist 81 private note"), {
    now: "2026-06-10T12:00:00.000Z"
  });
  const calls = [];
  const disabled = await sendErrorEvent(event, {
    uploadEnabled: false,
    endpoint: "/api/client-errors",
    fetcher: async () => {
      throw new Error("should not send");
    }
  });
  const enabled = await sendErrorEvent(event, {
    uploadEnabled: true,
    endpoint: "/api/client-errors",
    fetcher: async (endpoint, options) => {
      calls.push({ endpoint, body: JSON.parse(options.body) });
      return { ok: true, status: 202 };
    }
  });

  assert.equal(disabled.sent, false);
  assert.equal(enabled.sent, true);
  assert.equal(calls[0].endpoint, "/api/client-errors");
  assert.deepEqual(Object.keys(calls[0].body), ["event"]);
  assert.equal(calls[0].body.event.message, undefined);
  assert.equal(calls[0].body.event.stack, undefined);
  assert.doesNotMatch(JSON.stringify(calls[0].body), /waist|81|private note/i);
});

test("installs browser error and rejection listeners", async () => {
  const adapter = createMemoryStorageAdapter();
  const listeners = {};
  const removed = {};
  const uploads = [];
  const windowRef = {
    location: { pathname: "/app/session-1234567890abcdef" },
    navigator: { userAgent: "Mozilla/5.0 Firefox/128.0" },
    addEventListener(name, listener) {
      listeners[name] = listener;
    },
    removeEventListener(name, listener) {
      removed[name] = listener === listeners[name];
    }
  };
  const cleanup = installErrorMonitoring({
    windowRef,
    adapter,
    uploadEnabled: true,
    endpoint: "/api/client-errors",
    fetcher: async (endpoint, options) => {
      uploads.push({ endpoint, body: JSON.parse(options.body) });
      return { ok: true, status: 202 };
    },
    release: "test"
  });

  listeners.error({
    error: new TypeError("weight 82 should not leak"),
    filename: "http://localhost:5173/assets/index.js?m=secret",
    lineno: 10,
    colno: 2
  });
  listeners.unhandledrejection(new Error("hip 91 should not leak"));
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

  const events = loadErrorEvents(adapter);
  assert.equal(events.length, 2);
  assert.equal(events[0].type, "error");
  assert.equal(events[0].source, "/assets/index.js");
  assert.equal(events[0].route, "/app/:param");
  assert.equal(events[0].userAgentFamily, "Firefox");
  assert.equal(events[1].type, "unhandledrejection");
  assert.equal(uploads.length, 2);
  assert.doesNotMatch(JSON.stringify({ events, uploads }), /82|91|weight|hip|m=secret/i);

  cleanup();
  assert.equal(removed.error, true);
  assert.equal(removed.unhandledrejection, true);
});
