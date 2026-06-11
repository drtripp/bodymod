import {
  PRODUCT_ANALYTICS_ENDPOINT,
  PRODUCT_ANALYTICS_UPLOAD_ENABLED
} from "../config.js";
import {
  defaultStorageAdapter,
  readJsonSync,
  removeStoredItemSync,
  writeJsonSync
} from "./storageAdapter.js";

const ANALYTICS_EVENTS_KEY = "bodymod:product-analytics-events:v1";
const ANALYTICS_SESSION_KEY = "bodymod:product-analytics-session:v1";
const MAX_STORED_EVENTS = 50;

const ALLOWED_EVENT_NAMES = new Set([
  "app_opened",
  "app_interaction",
  "tab_selected",
  "theme_changed",
  "account_opened",
  "snapshot_saved",
  "goal_saved",
  "protocol_saved",
  "diet_logged",
  "share_dashboard_published",
  "backup_exported"
]);

const ALLOWED_SURFACES = new Set([
  "app",
  "body",
  "diet",
  "account",
  "goals",
  "protocols",
  "sharing",
  "backup",
  "settings"
]);

const ALLOWED_CONTEXTS = new Set([
  "none",
  "desktop",
  "mobile",
  "result",
  "target",
  "gender",
  "scatter",
  "distribution",
  "first-run",
  "signed-in",
  "signed-out"
]);

function safeString(value) {
  return value === null || value === undefined ? "" : String(value);
}

function hashString(value) {
  let hash = 0x811c9dc5;
  const input = safeString(value);

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function randomHex16(cryptoRef = globalThis.crypto) {
  const bytes = new Uint8Array(8);
  if (cryptoRef && typeof cryptoRef.getRandomValues === "function") {
    cryptoRef.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function userAgentFamily(navigatorRef) {
  const userAgent = safeString(navigatorRef?.userAgent);
  if (!userAgent) {
    return "Unknown";
  }
  if (/Edg\//.test(userAgent)) {
    return "Edge";
  }
  if (/Firefox\//.test(userAgent)) {
    return "Firefox";
  }
  if (/Chrome\//.test(userAgent)) {
    return "Chrome";
  }
  if (/Safari\//.test(userAgent)) {
    return "Safari";
  }
  return "Other";
}

function sanitizeRoute(value) {
  const pathname =
    typeof value === "string"
      ? value
      : value?.pathname || "/";
  const cleanPath = safeString(pathname).split("?")[0].split("#")[0] || "/";
  const segments = cleanPath
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      let decoded = segment;
      try {
        decoded = decodeURIComponent(segment);
      } catch (error) {
        decoded = segment;
      }

      const safeSegment = decoded.replace(/[^A-Za-z0-9._-]/g, "");
      if (!safeSegment || safeSegment.length > 32 || /@/.test(decoded)) {
        return ":param";
      }
      if (
        /^\d+$/.test(safeSegment) ||
        /^[a-f0-9-]{16,}$/i.test(safeSegment) ||
        /[a-f0-9]{12,}/i.test(safeSegment)
      ) {
        return ":param";
      }
      return safeSegment;
    });

  return `/${segments.join("/")}`.slice(0, 160) || "/";
}

function allowedValue(value, allowed, fallback) {
  const normalized = safeString(value).trim();
  return allowed.has(normalized) ? normalized : fallback;
}

export function loadAnalyticsEvents(adapter = defaultStorageAdapter) {
  const parsed = readJsonSync(ANALYTICS_EVENTS_KEY, { version: 1, events: [] }, adapter);
  return Array.isArray(parsed.events) ? parsed.events : [];
}

export function clearAnalyticsEvents(adapter = defaultStorageAdapter) {
  removeStoredItemSync(ANALYTICS_EVENTS_KEY, adapter);
}

export function analyticsSessionId(adapter = defaultStorageAdapter, cryptoRef = globalThis.crypto) {
  const stored = readJsonSync(ANALYTICS_SESSION_KEY, "", adapter);
  if (/^analytics-session:[a-f0-9]{16}$/.test(stored)) {
    return stored;
  }

  const next = `analytics-session:${randomHex16(cryptoRef)}`;
  writeJsonSync(ANALYTICS_SESSION_KEY, next, adapter);
  return next;
}

function normalizedSessionId(value, adapter, cryptoRef) {
  return /^analytics-session:[a-f0-9]{16}$/.test(value)
    ? value
    : analyticsSessionId(adapter, cryptoRef);
}

export function createProductAnalyticsEvent(name = "app_interaction", options = {}) {
  const eventName = allowedValue(name, ALLOWED_EVENT_NAMES, "app_interaction");
  const surface = allowedValue(options.surface, ALLOWED_SURFACES, "app");
  const context = allowedValue(options.context, ALLOWED_CONTEXTS, "none");
  const route = sanitizeRoute(options.location || globalThis.window?.location || "/");
  const anonymousSessionId = normalizedSessionId(
    options.sessionId,
    options.adapter || defaultStorageAdapter,
    options.crypto
  );
  const createdAt = new Date(options.now || Date.now()).toISOString();
  const id = `analytics:${hashString(
    `${createdAt}|${eventName}|${surface}|${context}|${route}|${anonymousSessionId}`
  )}`;

  return {
    id,
    name: eventName,
    surface,
    context,
    route,
    anonymousSessionId,
    release: safeString(options.release || "").slice(0, 80),
    userAgentFamily: userAgentFamily(options.navigator || globalThis.navigator),
    createdAt
  };
}

export function storeAnalyticsEvent(event, adapter = defaultStorageAdapter) {
  const events = loadAnalyticsEvents(adapter);
  const nextEvents = [...events, event].slice(-MAX_STORED_EVENTS);
  writeJsonSync(
    ANALYTICS_EVENTS_KEY,
    {
      version: 1,
      events: nextEvents
    },
    adapter
  );
  return nextEvents;
}

export async function sendProductAnalyticsEvent(
  event,
  {
    endpoint = PRODUCT_ANALYTICS_ENDPOINT,
    uploadEnabled = PRODUCT_ANALYTICS_UPLOAD_ENABLED,
    fetcher = globalThis.fetch
  } = {}
) {
  if (!uploadEnabled || !endpoint || typeof fetcher !== "function") {
    return { sent: false, status: "disabled" };
  }

  try {
    const response = await fetcher(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ event }),
      keepalive: true
    });

    return {
      sent: Boolean(response?.ok),
      status: response?.status || 0
    };
  } catch (error) {
    return { sent: false, status: "failed" };
  }
}

export function reportProductAnalytics(name, options = {}) {
  const event = createProductAnalyticsEvent(name, options);
  storeAnalyticsEvent(event, options.adapter || defaultStorageAdapter);
  void sendProductAnalyticsEvent(event, options);
  return event;
}

export function installProductAnalytics({
  windowRef = globalThis.window,
  adapter = defaultStorageAdapter,
  endpoint = PRODUCT_ANALYTICS_ENDPOINT,
  uploadEnabled = PRODUCT_ANALYTICS_UPLOAD_ENABLED,
  fetcher = globalThis.fetch,
  release = ""
} = {}) {
  if (!windowRef) {
    return () => {};
  }

  const isMobile =
    Number(windowRef.innerWidth || 0) > 0 && Number(windowRef.innerWidth || 0) < 640;
  reportProductAnalytics("app_opened", {
    adapter,
    endpoint,
    uploadEnabled,
    fetcher,
    release,
    location: windowRef.location,
    navigator: windowRef.navigator,
    surface: "app",
    context: isMobile ? "mobile" : "desktop"
  });

  return () => {};
}
