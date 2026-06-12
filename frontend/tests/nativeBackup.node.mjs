import assert from "node:assert/strict";
import { test } from "node:test";
import {
  NATIVE_BACKUP_STATE_KEY,
  clearNativeBackupState,
  createCapacitorNativeBackupAdapter,
  createWebNativeBackupAdapter,
  deleteNativeEncryptedBackup,
  loadNativeBackupState,
  persistNativeBackupState,
  readNativeEncryptedBackup,
  saveNativeEncryptedBackup
} from "../src/lib/nativeBackup.js";
import { createMemoryStorageAdapter } from "../src/lib/storageAdapter.js";


function nativeCapacitor() {
  return {
    isNativePlatform() {
      return true;
    }
  };
}

function webCapacitor() {
  return {
    isNativePlatform() {
      return false;
    }
  };
}

function fakeFilesystem() {
  const entries = new Map();
  const calls = [];

  return {
    calls,
    async writeFile(options) {
      calls.push({ method: "writeFile", options });
      entries.set(`${options.directory}:${options.path}`, String(options.data));
      return { uri: `fake://${options.path}` };
    },
    async readFile(options) {
      calls.push({ method: "readFile", options });
      const key = `${options.directory}:${options.path}`;
      if (!entries.has(key)) {
        throw new Error("File not found.");
      }
      return { data: entries.get(key) };
    },
    async deleteFile(options) {
      calls.push({ method: "deleteFile", options });
      entries.delete(`${options.directory}:${options.path}`);
    },
    dump() {
      return Object.fromEntries(entries);
    }
  };
}

const encryptedBackup = JSON.stringify({
  version: 1,
  kind: "bodymod.encrypted-local-backup",
  algorithm: "AES-GCM",
  ciphertext: "ENCRYPTEDPAYLOADONLY"
});

const summary = {
  snapshots: 2,
  checkIns: 3,
  goals: 1,
  protocols: 1,
  procedures: 0,
  bloodworkResults: 0,
  referralCredits: 0,
  faceMeasurements: 0,
  photoManifest: 1
};

test("web native backup adapter reports unavailable", async () => {
  const adapter = createWebNativeBackupAdapter();

  assert.equal(adapter.isAvailable(), false);
  await assert.rejects(
    () => adapter.saveEncryptedBackup({ encryptedBackup }),
    /installed app/
  );
});

test("saves, reads, and deletes encrypted backups through Capacitor Filesystem", async () => {
  const filesystem = fakeFilesystem();
  const adapter = createCapacitorNativeBackupAdapter({
    capacitor: nativeCapacitor(),
    filesystem,
    directory: "DATA"
  });

  const record = await adapter.saveEncryptedBackup({
    encryptedBackup,
    summary,
    now: Date.parse("2026-06-12T12:00:00.000Z")
  });
  const readBack = await adapter.readEncryptedBackup(record);
  const deleted = await adapter.deleteEncryptedBackup(record);

  assert.equal(adapter.isAvailable(), true);
  assert.equal(record.status, "saved");
  assert.equal(record.directory, "DATA");
  assert.equal(record.path, "bodymod-encrypted-backups/latest.bodymod-encrypted-backup.json");
  assert.equal(record.summary.checkIns, 3);
  assert.equal(readBack, encryptedBackup);
  assert.equal(deleted.deleted, true);
  assert.deepEqual(filesystem.dump(), {});
  assert.equal(filesystem.calls[0].options.encoding, "utf8");
  assert.equal(filesystem.calls[0].options.recursive, true);
});

test("persists native backup metadata without raw measurements or account values", async () => {
  const filesystem = fakeFilesystem();
  const storage = createMemoryStorageAdapter();
  const adapter = createCapacitorNativeBackupAdapter({
    capacitor: nativeCapacitor(),
    filesystem,
    directory: "DATA"
  });
  const previousState = persistNativeBackupState(
    {
      autoBackupEnabled: true,
      status: "pending"
    },
    storage
  );

  const saved = await saveNativeEncryptedBackup({
    encryptedBackup,
    summary,
    adapter,
    storageAdapter: storage,
    previousState,
    now: Date.parse("2026-06-12T12:00:00.000Z")
  });
  const stored = JSON.parse(storage.getItemSync(NATIVE_BACKUP_STATE_KEY));
  const readBack = await readNativeEncryptedBackup({
    adapter,
    storageAdapter: storage
  });
  const deleted = await deleteNativeEncryptedBackup({
    adapter,
    storageAdapter: storage,
    state: saved
  });

  assert.equal(saved.autoBackupEnabled, true);
  assert.equal(stored.autoBackupEnabled, true);
  assert.equal(stored.summary.snapshots, 2);
  assert.equal(readBack, encryptedBackup);
  assert.equal(deleted.deleted, true);
  assert.equal(loadNativeBackupState(storage).status, "deleted");
  assert.doesNotMatch(JSON.stringify(stored), /waistCircumference|mason@example|private note|weight/i);
});

test("clears native backup state from storage", () => {
  const storage = createMemoryStorageAdapter();
  persistNativeBackupState({ status: "saved", path: "x" }, storage);
  const cleared = clearNativeBackupState(storage);

  assert.equal(cleared.status, "not-configured");
  assert.equal(storage.getItemSync(NATIVE_BACKUP_STATE_KEY), null);
});

test("capacitor adapter stays unavailable outside native runtime", () => {
  const adapter = createCapacitorNativeBackupAdapter({
    capacitor: webCapacitor(),
    filesystem: fakeFilesystem()
  });

  assert.equal(adapter.isAvailable(), false);
});
