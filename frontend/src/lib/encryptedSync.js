import { SYNC_VAULTS_ENDPOINT } from "../config.js";
import { readJsonSync, removeStoredItemSync, writeJsonSync } from "./storageAdapter.js";


export const SYNC_VAULT_STATE_KEY = "bodymod:sync-vault:v1";


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
