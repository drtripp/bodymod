import { ACCOUNT_IDENTITY_ENDPOINT } from "../config.js";
import { readJsonSync, removeStoredItemSync, writeJsonSync } from "./storageAdapter.js";

export const ACCOUNT_IDENTITY_SESSION_KEY = "bodymod:account-identity-session:v1";

function fetchApi() {
  if (typeof fetch === "undefined") {
    return null;
  }

  return fetch.bind(globalThis);
}

function ensureFetcher(fetcher) {
  if (!fetcher) {
    throw new Error("Email identity needs fetch support.");
  }
  return fetcher;
}

function requestHeaders(sessionToken = "") {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json"
  };

  if (sessionToken) {
    headers.Authorization = `Bearer ${sessionToken}`;
  }

  return headers;
}

async function jsonRequest(fetcher, url, options) {
  const response = await ensureFetcher(fetcher)(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.detail || `Email identity request failed: ${response.status}`;
    const error = new Error(typeof detail === "string" ? detail : detail.message || "Email identity failed.");
    error.status = response.status;
    error.detail = detail;
    throw error;
  }
  return payload;
}

export function defaultAccountIdentitySession() {
  return {
    accountId: "",
    sessionId: "",
    sessionToken: "",
    displayName: "",
    maskedEmail: "",
    emailDomain: "",
    scopes: [],
    createdAt: "",
    authenticatedAt: "",
    expiresAt: ""
  };
}

export function normalizeAccountIdentitySession(record = {}) {
  return {
    ...defaultAccountIdentitySession(),
    accountId: String(record.accountId || ""),
    sessionId: String(record.sessionId || ""),
    sessionToken: record.sessionToken ? String(record.sessionToken) : "",
    displayName: String(record.displayName || ""),
    maskedEmail: String(record.maskedEmail || ""),
    emailDomain: String(record.emailDomain || ""),
    scopes: Array.isArray(record.scopes) ? record.scopes.map(String) : [],
    createdAt: String(record.createdAt || ""),
    authenticatedAt: String(record.authenticatedAt || ""),
    expiresAt: String(record.expiresAt || "")
  };
}

export function normalizeMagicLinkRequest(record = {}) {
  return {
    status: String(record.status || ""),
    requestId: String(record.requestId || ""),
    maskedEmail: String(record.maskedEmail || ""),
    emailDomain: String(record.emailDomain || ""),
    expiresAt: String(record.expiresAt || ""),
    deliveryStatus: String(record.deliveryStatus || ""),
    devLoginToken: record.devLoginToken ? String(record.devLoginToken) : ""
  };
}

export function loadAccountIdentitySession(adapter) {
  return normalizeAccountIdentitySession(
    readJsonSync(ACCOUNT_IDENTITY_SESSION_KEY, defaultAccountIdentitySession(), adapter)
  );
}

export function persistAccountIdentitySession(session, adapter) {
  const normalized = normalizeAccountIdentitySession(session);
  writeJsonSync(ACCOUNT_IDENTITY_SESSION_KEY, normalized, adapter);
  return normalized;
}

export function clearAccountIdentitySession(adapter) {
  removeStoredItemSync(ACCOUNT_IDENTITY_SESSION_KEY, adapter);
  return defaultAccountIdentitySession();
}

export async function requestAccountMagicLink({
  email,
  displayName = "",
  userAgentFamily = "browser",
  fetcher = fetchApi(),
  endpoint = ACCOUNT_IDENTITY_ENDPOINT
} = {}) {
  const payload = {
    email,
    userAgentFamily
  };
  if (displayName) {
    payload.displayName = displayName;
  }

  const record = await jsonRequest(fetcher, `${endpoint}/magic-links`, {
    method: "POST",
    headers: requestHeaders(),
    body: JSON.stringify(payload)
  });
  return normalizeMagicLinkRequest(record);
}

export async function verifyAccountMagicLink({
  token,
  fetcher = fetchApi(),
  endpoint = ACCOUNT_IDENTITY_ENDPOINT
} = {}) {
  const record = await jsonRequest(fetcher, `${endpoint}/magic-links/verify`, {
    method: "POST",
    headers: requestHeaders(),
    body: JSON.stringify({ token })
  });
  return normalizeAccountIdentitySession(record);
}

export async function readAccountIdentitySession({
  sessionToken,
  fetcher = fetchApi(),
  endpoint = ACCOUNT_IDENTITY_ENDPOINT
} = {}) {
  const record = await jsonRequest(fetcher, `${endpoint}/session`, {
    method: "GET",
    headers: requestHeaders(sessionToken)
  });
  return normalizeAccountIdentitySession({
    ...record,
    sessionToken
  });
}

export async function revokeAccountIdentitySession({
  sessionToken,
  fetcher = fetchApi(),
  endpoint = ACCOUNT_IDENTITY_ENDPOINT
} = {}) {
  const payload = await jsonRequest(fetcher, `${endpoint}/logout`, {
    method: "POST",
    headers: requestHeaders(sessionToken)
  });
  return {
    revoked: Boolean(payload.revoked),
    status: String(payload.status || "")
  };
}
