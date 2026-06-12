import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import {
  isNativeCapacitorRuntime,
  readJsonSync,
  removeStoredItemSync,
  writeJsonSync
} from "./storageAdapter.js";


export const NATIVE_BACKUP_STATE_KEY = "bodymod:native-backup:v1";
export const NATIVE_BACKUP_ROOT = "bodymod-encrypted-backups";
export const NATIVE_BACKUP_FILENAME = "latest.bodymod-encrypted-backup.json";

function byteLength(value) {
  return new TextEncoder().encode(String(value || "")).length;
}

function nowIso(now = Date.now()) {
  return new Date(now).toISOString();
}

function normalizedSummary(summary = {}) {
  return {
    snapshots: Number(summary.snapshots || 0),
    checkIns: Number(summary.checkIns || 0),
    goals: Number(summary.goals || 0),
    protocols: Number(summary.protocols || 0),
    procedures: Number(summary.procedures || 0),
    bloodworkResults: Number(summary.bloodworkResults || 0),
    referralCredits: Number(summary.referralCredits || 0),
    faceMeasurements: Number(summary.faceMeasurements || 0),
    photoManifest: Number(summary.photoManifest || 0)
  };
}

export function defaultNativeBackupState() {
  return {
    version: 1,
    autoBackupEnabled: false,
    status: "not-configured",
    lastBackupAt: "",
    path: "",
    directory: "",
    byteLength: 0,
    summary: normalizedSummary(),
    cloudEligibility: "platform-app-data-backup",
    note: "Encrypted backup file only; iCloud/Google Drive policy wiring belongs to native project setup."
  };
}

export function normalizeNativeBackupState(state = {}) {
  return {
    ...defaultNativeBackupState(),
    ...state,
    version: Number(state.version || 1),
    autoBackupEnabled: Boolean(state.autoBackupEnabled),
    byteLength: Number(state.byteLength || 0),
    summary: normalizedSummary(state.summary)
  };
}

export function loadNativeBackupState(adapter) {
  return normalizeNativeBackupState(
    readJsonSync(NATIVE_BACKUP_STATE_KEY, defaultNativeBackupState(), adapter)
  );
}

export function persistNativeBackupState(state, adapter) {
  const normalized = normalizeNativeBackupState(state);
  writeJsonSync(NATIVE_BACKUP_STATE_KEY, normalized, adapter);
  return normalized;
}

export function clearNativeBackupState(adapter) {
  removeStoredItemSync(NATIVE_BACKUP_STATE_KEY, adapter);
  return defaultNativeBackupState();
}

export function createWebNativeBackupAdapter() {
  return {
    name: "web-native-backup-unavailable",
    isAvailable() {
      return false;
    },
    async saveEncryptedBackup() {
      throw new Error("Native backup file storage is available only in the installed app.");
    },
    async readEncryptedBackup() {
      throw new Error("Native backup file storage is available only in the installed app.");
    },
    async deleteEncryptedBackup() {
      return { deleted: false };
    }
  };
}

export function createCapacitorNativeBackupAdapter({
  capacitor = Capacitor,
  filesystem = Filesystem,
  directory = Directory.Data,
  rootDirectory = NATIVE_BACKUP_ROOT
} = {}) {
  function backupPath() {
    return `${rootDirectory}/${NATIVE_BACKUP_FILENAME}`;
  }

  return {
    name: "capacitor-native-encrypted-backup",
    isAvailable() {
      return isNativeCapacitorRuntime(capacitor);
    },
    async saveEncryptedBackup({ encryptedBackup, summary = {}, now = Date.now() } = {}) {
      if (!this.isAvailable()) {
        throw new Error("Native backup file storage is available only in the installed app.");
      }
      if (!encryptedBackup) {
        throw new Error("Encrypted backup payload is required.");
      }

      const path = backupPath();
      await filesystem.writeFile({
        path,
        data: String(encryptedBackup),
        directory,
        encoding: Encoding.UTF8,
        recursive: true
      });

      return normalizeNativeBackupState({
        status: "saved",
        lastBackupAt: nowIso(now),
        path,
        directory,
        byteLength: byteLength(encryptedBackup),
        summary,
        cloudEligibility: "platform-app-data-backup"
      });
    },
    async readEncryptedBackup(state = {}) {
      if (!this.isAvailable()) {
        throw new Error("Native backup file storage is available only in the installed app.");
      }

      const path = state.path || backupPath();
      const { data } = await filesystem.readFile({
        path,
        directory: state.directory || directory,
        encoding: Encoding.UTF8
      });
      return String(data || "");
    },
    async deleteEncryptedBackup(state = {}) {
      if (!this.isAvailable()) {
        return { deleted: false };
      }

      const path = state.path || backupPath();
      if (!path) {
        return { deleted: false };
      }

      await filesystem.deleteFile({
        path,
        directory: state.directory || directory
      });
      return { deleted: true };
    }
  };
}

export function createDefaultNativeBackupAdapter({ capacitor = Capacitor } = {}) {
  return isNativeCapacitorRuntime(capacitor)
    ? createCapacitorNativeBackupAdapter({ capacitor })
    : createWebNativeBackupAdapter();
}

export const defaultNativeBackupAdapter = createDefaultNativeBackupAdapter();

export async function saveNativeEncryptedBackup({
  encryptedBackup,
  summary,
  adapter = defaultNativeBackupAdapter,
  storageAdapter,
  previousState = loadNativeBackupState(storageAdapter),
  now = Date.now()
} = {}) {
  const record = await adapter.saveEncryptedBackup({ encryptedBackup, summary, now });
  return persistNativeBackupState(
    {
      ...previousState,
      ...record,
      autoBackupEnabled: previousState.autoBackupEnabled
    },
    storageAdapter
  );
}

export async function readNativeEncryptedBackup({
  adapter = defaultNativeBackupAdapter,
  storageAdapter,
  state = loadNativeBackupState(storageAdapter)
} = {}) {
  return adapter.readEncryptedBackup(state);
}

export async function deleteNativeEncryptedBackup({
  adapter = defaultNativeBackupAdapter,
  storageAdapter,
  state = loadNativeBackupState(storageAdapter)
} = {}) {
  const result = await adapter.deleteEncryptedBackup(state);
  const nextState = persistNativeBackupState(
    {
      ...defaultNativeBackupState(),
      autoBackupEnabled: state.autoBackupEnabled,
      status: result.deleted ? "deleted" : "not-configured"
    },
    storageAdapter
  );
  return {
    ...result,
    state: nextState
  };
}
