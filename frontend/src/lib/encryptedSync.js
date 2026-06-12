import { SYNC_VAULTS_ENDPOINT } from "../config.js";
import { readJsonSync, removeStoredItemSync, writeJsonSync } from "./storageAdapter.js";


export const SYNC_VAULT_STATE_KEY = "bodymod:sync-vault:v1";
export const AUTO_SYNC_STATE_KEY = "bodymod:auto-sync:v1";
export const DEFAULT_AUTO_SYNC_INTERVAL_MINUTES = 15;


export function defaultSyncVaultState() {
  return {
    version: 1,
    accountId: "",
    vaultId: "",
    syncToken: "",
    deviceId: "",
    revision: 0,
    createdAt: "",
    updatedAt: ""
  };
}

export function loadSyncVaultState(adapter) {
  try {
    return {
      ...defaultSyncVaultState(),
      ...(readJsonSync(SYNC_VAULT_STATE_KEY, null, adapter) || {})
    };
  } catch {
    return defaultSyncVaultState();
  }
}

export function persistSyncVaultState(state, adapter) {
  const nextState = {
    ...defaultSyncVaultState(),
    ...state
  };
  writeJsonSync(SYNC_VAULT_STATE_KEY, nextState, adapter);
  return nextState;
}

export function clearSyncVaultState(adapter) {
  removeStoredItemSync(SYNC_VAULT_STATE_KEY, adapter);
  return defaultSyncVaultState();
}

export function defaultAutoSyncState() {
  return {
    version: 1,
    enabled: false,
    accountId: "",
    vaultId: "",
    deviceId: "",
    lastRunAt: "",
    lastResult: "",
    lastRevision: 0,
    lastTrigger: "",
    lastError: "",
    pendingReason: "",
    lastBackupSignature: "",
    intervalMinutes: DEFAULT_AUTO_SYNC_INTERVAL_MINUTES
  };
}

export function normalizeAutoSyncState(state = {}) {
  const version = Number(state.version);
  const lastRevision = Number(state.lastRevision);
  const intervalMinutes = Number(state.intervalMinutes);
  const defaults = defaultAutoSyncState();
  return {
    ...defaults,
    version: Number.isFinite(version) && version > 0 ? version : defaults.version,
    enabled: Boolean(state.enabled),
    accountId: String(state.accountId || ""),
    vaultId: String(state.vaultId || ""),
    deviceId: String(state.deviceId || ""),
    lastRunAt: String(state.lastRunAt || ""),
    lastResult: String(state.lastResult || ""),
    lastRevision: Number.isFinite(lastRevision) && lastRevision > 0 ? lastRevision : 0,
    lastTrigger: String(state.lastTrigger || ""),
    lastError: String(state.lastError || ""),
    pendingReason: String(state.pendingReason || ""),
    lastBackupSignature: String(state.lastBackupSignature || ""),
    intervalMinutes:
      Number.isFinite(intervalMinutes) && intervalMinutes > 0
        ? intervalMinutes
        : DEFAULT_AUTO_SYNC_INTERVAL_MINUTES
  };
}

export function loadAutoSyncState(adapter) {
  try {
    return normalizeAutoSyncState(readJsonSync(AUTO_SYNC_STATE_KEY, null, adapter) || {});
  } catch {
    return defaultAutoSyncState();
  }
}

export function persistAutoSyncState(state, adapter) {
  const nextState = normalizeAutoSyncState(state);
  writeJsonSync(AUTO_SYNC_STATE_KEY, nextState, adapter);
  return nextState;
}

export function clearAutoSyncState(adapter) {
  removeStoredItemSync(AUTO_SYNC_STATE_KEY, adapter);
  return defaultAutoSyncState();
}

export function buildAutoSyncReadiness({
  accountId = "",
  vaultId = "",
  syncToken = "",
  passphrase = ""
} = {}) {
  if (!String(accountId || "").trim()) {
    return {
      ready: false,
      reason: "Sign in before enabling automatic sync preview."
    };
  }

  if (String(passphrase || "").length < 8) {
    return {
      ready: false,
      reason: "Enter an 8+ character backup passphrase before automatic sync can run."
    };
  }

  if (!String(vaultId || "").trim()) {
    return {
      ready: false,
      reason: "Create or enter a sync vault ID before automatic sync can run."
    };
  }

  if (!String(syncToken || "").trim()) {
    return {
      ready: false,
      reason: "Enter the sync token before automatic sync can run."
    };
  }

  return {
    ready: true,
    reason: "Automatic sync preview is ready."
  };
}

export function shouldRunAutoSync({
  state = {},
  currentBackupSignature = "",
  now = Date.now()
} = {}) {
  const normalized = normalizeAutoSyncState(state);
  if (!normalized.enabled) {
    return false;
  }

  const signature = String(currentBackupSignature || "");
  if (signature && signature !== normalized.lastBackupSignature) {
    return true;
  }

  if (!normalized.lastRunAt) {
    return true;
  }

  const lastRunMs = Date.parse(normalized.lastRunAt);
  if (!Number.isFinite(lastRunMs)) {
    return true;
  }

  const intervalMs = Math.max(1, normalized.intervalMinutes) * 60 * 1000;
  return Number(now) - lastRunMs >= intervalMs;
}

function fetchApi() {
  if (typeof fetch === "undefined") {
    return null;
  }

  return fetch.bind(globalThis);
}

function ensureFetcher(fetcher) {
  if (!fetcher) {
    throw new Error("Encrypted sync needs fetch support.");
  }
  return fetcher;
}

function requestHeaders() {
  return {
    "Content-Type": "application/json",
    Accept: "application/json"
  };
}

async function jsonRequest(fetcher, url, options) {
  const response = await ensureFetcher(fetcher)(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.detail || `Encrypted sync request failed: ${response.status}`;
    const error = new Error(typeof detail === "string" ? detail : detail.message || "Encrypted sync failed.");
    error.status = response.status;
    error.detail = detail;
    throw error;
  }
  return payload;
}

export function encryptedBackupToSyncBlob(rawEncryptedBackup) {
  const parsed =
    typeof rawEncryptedBackup === "string"
      ? JSON.parse(rawEncryptedBackup)
      : rawEncryptedBackup;

  if (!parsed || parsed.kind !== "bodymod.encrypted-local-backup") {
    throw new Error("Encrypted sync expects a bodymod encrypted local backup.");
  }

  return {
    version: Number(parsed.version || 1),
    algorithm: parsed.algorithm,
    kdf: `${parsed.kdf?.name || "PBKDF2"}-${parsed.kdf?.hash || "SHA-256"}:${parsed.kdf?.iterations || ""}`,
    salt: String(parsed.salt || ""),
    iv: String(parsed.iv || ""),
    ciphertext: String(parsed.ciphertext || "")
  };
}

function parseSyncKdf(value = "") {
  const [label, iterationsText] = String(value || "").split(":");
  const separatorIndex = label.indexOf("-");
  return {
    name: separatorIndex > 0 ? label.slice(0, separatorIndex) : "PBKDF2",
    hash: separatorIndex > 0 ? label.slice(separatorIndex + 1) : "SHA-256",
    iterations: Number(iterationsText) || 150000
  };
}

export function syncBlobToEncryptedBackup(blob, encryptedAt = new Date().toISOString()) {
  if (!blob || blob.algorithm !== "AES-GCM") {
    throw new Error("Encrypted sync vault returned an unsupported blob.");
  }

  return JSON.stringify(
    {
      version: Number(blob.version || 1),
      kind: "bodymod.encrypted-local-backup",
      encryptedAt,
      algorithm: blob.algorithm,
      kdf: parseSyncKdf(blob.kdf),
      salt: String(blob.salt || ""),
      iv: String(blob.iv || ""),
      ciphertext: String(blob.ciphertext || "")
    },
    null,
    2
  );
}

export function normalizeSyncVaultRecord(record = {}) {
  return {
    vaultId: String(record.vaultId || ""),
    syncToken: record.syncToken ? String(record.syncToken) : "",
    revision: Number(record.revision || 0),
    deviceId: String(record.deviceId || ""),
    createdAt: String(record.createdAt || ""),
    updatedAt: String(record.updatedAt || ""),
    blob: record.blob || null
  };
}

export async function createSyncVault({
  encryptedBackup,
  deviceId,
  fetcher = fetchApi(),
  endpoint = SYNC_VAULTS_ENDPOINT
} = {}) {
  const payload = {
    deviceId,
    blob: encryptedBackupToSyncBlob(encryptedBackup)
  };
  const record = await jsonRequest(fetcher, endpoint, {
    method: "POST",
    headers: requestHeaders(),
    body: JSON.stringify(payload)
  });
  return normalizeSyncVaultRecord(record);
}

export async function readSyncVault({
  vaultId,
  syncToken,
  fetcher = fetchApi(),
  endpoint = SYNC_VAULTS_ENDPOINT
} = {}) {
  const record = await jsonRequest(fetcher, `${endpoint}/${encodeURIComponent(vaultId)}/read`, {
    method: "POST",
    headers: requestHeaders(),
    body: JSON.stringify({ syncToken })
  });
  return normalizeSyncVaultRecord(record);
}

export async function updateSyncVault({
  vaultId,
  syncToken,
  expectedRevision,
  encryptedBackup,
  deviceId,
  force = false,
  fetcher = fetchApi(),
  endpoint = SYNC_VAULTS_ENDPOINT
} = {}) {
  const record = await jsonRequest(fetcher, `${endpoint}/${encodeURIComponent(vaultId)}`, {
    method: "PUT",
    headers: requestHeaders(),
    body: JSON.stringify({
      syncToken,
      expectedRevision,
      deviceId,
      blob: encryptedBackupToSyncBlob(encryptedBackup),
      force
    })
  });
  return normalizeSyncVaultRecord(record);
}

export async function revokeSyncVault({
  vaultId,
  syncToken,
  fetcher = fetchApi(),
  endpoint = SYNC_VAULTS_ENDPOINT
} = {}) {
  const payload = await jsonRequest(fetcher, `${endpoint}/${encodeURIComponent(vaultId)}/revoke`, {
    method: "POST",
    headers: requestHeaders(),
    body: JSON.stringify({ syncToken })
  });
  return {
    revoked: payload.status === "revoked",
    status: String(payload.status || "")
  };
}
