import { PERSONAL_DATA_API_ENDPOINT } from "../config.js";
import { normalizeSyncVaultRecord } from "./encryptedSync.js";


function fetchApi() {
  if (typeof fetch === "undefined") {
    return null;
  }

  return fetch.bind(globalThis);
}

function ensureFetcher(fetcher) {
  if (!fetcher) {
    throw new Error("Personal data API needs fetch support.");
  }
  return fetcher;
}

function requestHeaders(accessToken = "") {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json"
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

async function jsonRequest(fetcher, url, options) {
  const response = await ensureFetcher(fetcher)(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.detail || `Personal data API request failed: ${response.status}`;
    const error = new Error(typeof detail === "string" ? detail : detail.message || "Personal data API failed.");
    error.status = response.status;
    error.detail = detail;
    throw error;
  }
  return payload;
}

export function normalizePersonalDataToken(record = {}) {
  return {
    tokenId: String(record.tokenId || ""),
    accessToken: record.accessToken ? String(record.accessToken) : "",
    vaultId: String(record.vaultId || ""),
    label: String(record.label || ""),
    scopes: Array.isArray(record.scopes) ? record.scopes.map(String) : [],
    createdAt: String(record.createdAt || ""),
    expiresAt: record.expiresAt ? String(record.expiresAt) : "",
    revokedAt: record.revokedAt ? String(record.revokedAt) : ""
  };
}

export async function createPersonalDataToken({
  vaultId,
  syncToken,
  label = "Personal data export",
  scopes = ["sync-vault:read"],
  expiresAt = "",
  fetcher = fetchApi(),
  endpoint = PERSONAL_DATA_API_ENDPOINT
} = {}) {
  const payload = {
    vaultId,
    syncToken,
    label,
    scopes
  };
  if (expiresAt) {
    payload.expiresAt = expiresAt;
  }

  const record = await jsonRequest(fetcher, `${endpoint}/tokens`, {
    method: "POST",
    headers: requestHeaders(),
    body: JSON.stringify(payload)
  });
  return normalizePersonalDataToken(record);
}

export async function readPersonalDataSyncVault({
  accessToken,
  fetcher = fetchApi(),
  endpoint = PERSONAL_DATA_API_ENDPOINT
} = {}) {
  const record = await jsonRequest(fetcher, `${endpoint}/sync-vault`, {
    method: "GET",
    headers: requestHeaders(accessToken)
  });
  return normalizeSyncVaultRecord(record);
}

export async function revokePersonalDataToken({
  accessToken,
  fetcher = fetchApi(),
  endpoint = PERSONAL_DATA_API_ENDPOINT
} = {}) {
  const payload = await jsonRequest(fetcher, `${endpoint}/tokens/revoke`, {
    method: "POST",
    headers: requestHeaders(accessToken)
  });
  return {
    revoked: Boolean(payload.revoked),
    status: String(payload.status || "")
  };
}
