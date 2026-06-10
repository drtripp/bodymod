import {
  ERROR_MONITORING_ENDPOINT,
  ERROR_MONITORING_UPLOAD_ENABLED
} from "../config.js";
import {
  defaultStorageAdapter,
  readJsonSync,
  removeStoredItemSync,
  writeJsonSync
} from "./storageAdapter.js";

const ERROR_EVENTS_KEY = "bodymod:error-events:v1";
const MAX_STORED_EVENTS = 30;

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

function messageShape(value) {
  return safeString(value)
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\d+(?:\.\d+)?/g, "#")
    .replace(/[a-z]+/gi, "a")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function errorNameFrom(value) {
  const name = safeString(value).trim();
  return /^[A-Za-z]{0,64}Error$/.test(name) ? name : "Error";
}

function lineNumber(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function sanitizeSource(value) {
  const normalized = safeString(value).split("?")[0].split("#")[0].replace(/\\/g, "/");
  if (!normalized) {
    return "";
  }

  try {
    const parsed = new URL(normalized, "http://bodymod.local");
    const parts = parsed.pathname.split("/").filter(Boolean).slice(-2);
    return parts.length ? `/${parts.join("/")}`.slice(0, 160) : "/";
  } catch (error) {
    const parts = normalized.split("/").filter(Boolean).slice(-2);
    return parts.length ? `/${parts.join("/")}`.slice(0, 160) : "";
  }
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

function sourceFromStack(stack) {
  const line = safeString(stack)
    .split("\n")
    .find((item) => /(?:https?:\/\/|file:\/\/\/|[A-Za-z]:\\|\/).+:\d+:\d+/.test(item));

  if (!line) {
    return {};
  }

  const match = line.match(
    /((?:https?:\/\/|file:\/\/\/)[^\s)]+|(?:[A-Za-z]:\\|\/)[^\s)]+):(\d+):(\d+)/
  );

  return match
    ? {
        source: sanitizeSource(match[1]),
        line: lineNumber(match[2]),
        column: lineNumber(match[3])
      }
    : {};
}

function normalizeErrorInput(input = {}, options = {}) {
  if (input instanceof Error) {
    return {
      errorName: errorNameFrom(input.name),
      message: input.message,
      stack: input.stack,
      source: options.source,
      line: options.line,
      column: options.column
    };
  }

  if (input?.error instanceof Error) {
    return normalizeErrorInput(input.error, {
      ...options,
      source: input.filename || options.source,
      line: input.lineno || options.line,
      column: input.colno || options.column
    });
  }

  return {
    errorName: errorNameFrom(input?.name),
    message: input?.message || input?.reason || input,
    stack: input?.stack,
    source: input?.filename || options.source,
    line: input?.lineno || options.line,
    column: input?.colno || options.column
  };
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

export function createSanitizedErrorEvent(input = {}, options = {}) {
  const normalized = normalizeErrorInput(input, options);
  const stackSource = sourceFromStack(normalized.stack);
  const source = sanitizeSource(normalized.source || stackSource.source || "");
  const line = lineNumber(normalized.line ?? stackSource.line);
  const column = lineNumber(normalized.column ?? stackSource.column);
  const route = sanitizeRoute(options.location || globalThis.window?.location || "/");
  const createdAt = new Date(options.now || Date.now()).toISOString();
  const messageFingerprint = hashString(
    `${normalized.errorName}|${messageShape(normalized.message)}`
  );
  const stackFingerprint = normalized.stack
    ? hashString(`${source}|${messageShape(normalized.stack)}`)
    : "";
  const id = `client-error:${hashString(
    `${createdAt}|${messageFingerprint}|${stackFingerprint}|${source}|${line}|${column}`
  )}`;

  return {
    id,
    type: options.type || "manual",
    errorName: normalized.errorName,
    messageFingerprint,
    stackFingerprint,
    source,
    line,
    column,
    route,
    severity: options.severity || "error",
    release: safeString(options.release || "").slice(0, 80),
    userAgentFamily: userAgentFamily(options.navigator || globalThis.navigator),
    createdAt
  };
}

export function loadErrorEvents(adapter = defaultStorageAdapter) {
  const parsed = readJsonSync(ERROR_EVENTS_KEY, { version: 1, events: [] }, adapter);
  return Array.isArray(parsed.events) ? parsed.events : [];
}

export function clearErrorEvents(adapter = defaultStorageAdapter) {
  removeStoredItemSync(ERROR_EVENTS_KEY, adapter);
}

export function storeErrorEvent(event, adapter = defaultStorageAdapter) {
  const events = loadErrorEvents(adapter);
  const nextEvents = [...events, event].slice(-MAX_STORED_EVENTS);
  writeJsonSync(
    ERROR_EVENTS_KEY,
    {
      version: 1,
      events: nextEvents
    },
    adapter
  );
  return nextEvents;
}

export async function sendErrorEvent(
  event,
  {
    endpoint = ERROR_MONITORING_ENDPOINT,
    uploadEnabled = ERROR_MONITORING_UPLOAD_ENABLED,
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

export function reportClientError(input = {}, options = {}) {
  const event = createSanitizedErrorEvent(input, options);
  storeErrorEvent(event, options.adapter || defaultStorageAdapter);
  void sendErrorEvent(event, options);
  return event;
}

export function installErrorMonitoring({
  windowRef = globalThis.window,
  adapter = defaultStorageAdapter,
  endpoint = ERROR_MONITORING_ENDPOINT,
  uploadEnabled = ERROR_MONITORING_UPLOAD_ENABLED,
  fetcher = globalThis.fetch,
  release = ""
} = {}) {
  if (!windowRef || typeof windowRef.addEventListener !== "function") {
    return () => {};
  }

  const reportOptions = {
    adapter,
    endpoint,
    uploadEnabled,
    fetcher,
    release,
    location: windowRef.location,
    navigator: windowRef.navigator
  };

  const handleError = (event) => {
    reportClientError(event, {
      ...reportOptions,
      type: event?.error ? "error" : "resource-error",
      source: event?.filename,
      line: event?.lineno,
      column: event?.colno
    });
  };
  const handleRejection = (event) => {
    reportClientError(event?.reason || event, {
      ...reportOptions,
      type: "unhandledrejection"
    });
  };

  windowRef.addEventListener("error", handleError);
  windowRef.addEventListener("unhandledrejection", handleRejection);

  return () => {
    windowRef.removeEventListener("error", handleError);
    windowRef.removeEventListener("unhandledrejection", handleRejection);
  };
}
