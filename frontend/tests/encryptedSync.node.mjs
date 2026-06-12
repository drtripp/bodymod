import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { test } from "node:test";
import {
  AUTO_SYNC_STATE_KEY,
  buildAutoSyncReadiness,
  createSyncVault,
  clearAutoSyncState,
  clearSyncVaultState,
  encryptedBackupToSyncBlob,
  loadAutoSyncState,
  loadSyncVaultState,
  persistAutoSyncState,
  persistSyncVaultState,
  readSyncVault,
  revokeSyncVault,
  shouldRunAutoSync,
  syncBlobToEncryptedBackup,
  updateSyncVault
} from "../src/lib/encryptedSync.js";
import {
  buildLocalBackupBundle,
  decryptLocalBackup,
  encryptLocalBackup
} from "../src/lib/localBackup.js";
import { createMemoryStorageAdapter } from "../src/lib/storageAdapter.js";


if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto
  });
}

function sampleBundle() {
  return buildLocalBackupBundle({
    account: {
      displayName: "Taylor",
      email: "taylor@example.com",
      personaId: "recomp-lifter",
      createdAt: "2026-06-10T12:00:00Z"
    },
    checkIns: [
      {
        id: "checkin-1",
        type: "weekly-measurements",
        note: "Shoulder goal note",
        measurements: {
          weight: 82,
          waistCircumference: 84
        }
      }
    ],
    goals: [
      {
        id: "goal-1",
        label: "Shoulder goal"
      }
    ]
  });
}

test("converts encrypted local backups into opaque sync blobs", async () => {
  const encrypted = await encryptLocalBackup(sampleBundle(), "correct horse battery staple");
  const blob = encryptedBackupToSyncBlob(encrypted);
  const roundTrip = await decryptLocalBackup(
    syncBlobToEncryptedBackup(blob, "2026-06-10T12:00:00Z"),
    "correct horse battery staple"
  );

  assert.equal(blob.algorithm, "AES-GCM");
  assert.match(blob.kdf, /^PBKDF2-SHA-256:150000$/);
  assert.ok(blob.salt);
  assert.ok(blob.iv);
  assert.ok(blob.ciphertext);
  assert.doesNotMatch(JSON.stringify(blob), /taylor@example.com|Shoulder goal|waistCircumference/);
  assert.equal(roundTrip.account.email, "taylor@example.com");
  assert.equal(roundTrip.checkIns[0].measurements.waistCircumference, 84);
});

test("persists sync vault credentials locally until cleared", () => {
  const adapter = createMemoryStorageAdapter();
  const stored = persistSyncVaultState(
    {
      accountId: "account-1",
      vaultId: "vault-1",
      syncToken: "sync-token-1",
      deviceId: "browser-a",
      revision: 3,
      createdAt: "2026-06-10T12:00:00Z",
      updatedAt: "2026-06-11T12:00:00Z"
    },
    adapter
  );

  assert.equal(stored.revision, 3);
  assert.equal(loadSyncVaultState(adapter).vaultId, "vault-1");
  assert.equal(clearSyncVaultState(adapter).vaultId, "");
  assert.equal(loadSyncVaultState(adapter).syncToken, "");
});

test("persists automatic sync preview state without passphrases or tokens", () => {
  const adapter = createMemoryStorageAdapter();
  const stored = persistAutoSyncState(
    {
      enabled: true,
      accountId: "account-1",
      vaultId: "vault-1",
      deviceId: "browser-a",
      lastRunAt: "2026-06-10T12:00:00Z",
      lastResult: "Revision 3",
      lastRevision: 3,
      lastTrigger: "background",
      lastBackupSignature: "account-1|2|snapshot-1",
      intervalMinutes: 5,
      syncToken: "sync-token-1",
      passphrase: "correct horse battery staple"
    },
    adapter
  );
  const rawState = adapter.getItemSync(AUTO_SYNC_STATE_KEY);

  assert.equal(stored.enabled, true);
  assert.equal(stored.vaultId, "vault-1");
  assert.equal(loadAutoSyncState(adapter).lastRevision, 3);
  assert.doesNotMatch(rawState, /sync-token-1|correct horse battery staple/);
  assert.equal(clearAutoSyncState(adapter).enabled, false);
  assert.equal(loadAutoSyncState(adapter).vaultId, "");
});

test("checks automatic sync readiness and due timing", () => {
  assert.equal(buildAutoSyncReadiness().ready, false);
  assert.match(buildAutoSyncReadiness({ accountId: "account-1" }).reason, /passphrase/);
  assert.match(
    buildAutoSyncReadiness({
      accountId: "account-1",
      passphrase: "correct horse battery staple"
    }).reason,
    /vault ID/
  );
  assert.equal(
    buildAutoSyncReadiness({
      accountId: "account-1",
      vaultId: "vault-1",
      syncToken: "sync-token-1",
      passphrase: "correct horse battery staple"
    }).ready,
    true
  );

  const baseState = {
    enabled: true,
    lastRunAt: "2026-06-10T12:00:00Z",
    lastBackupSignature: "account-1|snapshot-a",
    intervalMinutes: 15
  };

  assert.equal(
    shouldRunAutoSync({
      state: baseState,
      currentBackupSignature: "account-1|snapshot-a",
      now: Date.parse("2026-06-10T12:10:00Z")
    }),
    false
  );
  assert.equal(
    shouldRunAutoSync({
      state: baseState,
      currentBackupSignature: "account-1|snapshot-a",
      now: Date.parse("2026-06-10T12:15:00Z")
    }),
    true
  );
  assert.equal(
    shouldRunAutoSync({
      state: baseState,
      currentBackupSignature: "account-1|snapshot-b",
      now: Date.parse("2026-06-10T12:01:00Z")
    }),
    true
  );
  assert.equal(shouldRunAutoSync({ state: { ...baseState, enabled: false } }), false);
});

test("creates sync vaults without sending plaintext account data", async () => {
  const encrypted = await encryptLocalBackup(sampleBundle(), "correct horse battery staple");
  const calls = [];
  const created = await createSyncVault({
    encryptedBackup: encrypted,
    deviceId: "browser-a",
    endpoint: "/api/sync-vaults",
    async fetcher(url, options = {}) {
      calls.push({ url, options });
      const requestBody = JSON.parse(options.body);
      return {
        ok: true,
        async json() {
          return {
            vaultId: "vault-1",
            syncToken: "sync-token-1",
            revision: 1,
            deviceId: requestBody.deviceId,
            createdAt: "2026-06-10T12:00:00Z",
            updatedAt: "2026-06-10T12:00:00Z",
            blob: requestBody.blob
          };
        }
      };
    }
  });
  const posted = calls[0].options.body;

  assert.equal(calls[0].url, "/api/sync-vaults");
  assert.equal(created.vaultId, "vault-1");
  assert.equal(created.syncToken, "sync-token-1");
  assert.equal(created.revision, 1);
  assert.doesNotMatch(posted, /taylor@example.com|Shoulder goal|measurements|waistCircumference/);
});

test("reads, updates, revokes, and surfaces sync conflicts", async () => {
  const encrypted = await encryptLocalBackup(sampleBundle(), "correct horse battery staple");
  const calls = [];
  async function fetcher(url, options = {}) {
    calls.push({ url, options });
    if (url.endsWith("/read")) {
      return {
        ok: true,
        async json() {
          return {
            vaultId: "vault-1",
            revision: 2,
            deviceId: "browser-a",
            createdAt: "2026-06-10T12:00:00Z",
            updatedAt: "2026-06-11T12:00:00Z",
            blob: encryptedBackupToSyncBlob(encrypted)
          };
        }
      };
    }
    if (options.method === "PUT") {
      return {
        ok: false,
        status: 409,
        async json() {
          return {
            detail: {
              message: "Sync vault revision conflict.",
              currentRevision: 2
            }
          };
        }
      };
    }
    return {
      ok: true,
      async json() {
        return { status: "revoked" };
      }
    };
  }

  const read = await readSyncVault({
    vaultId: "vault-1",
    syncToken: "sync-token-1",
    endpoint: "/api/sync-vaults",
    fetcher
  });
  await assert.rejects(
    () =>
      updateSyncVault({
        vaultId: "vault-1",
        syncToken: "sync-token-1",
        expectedRevision: 1,
        encryptedBackup: encrypted,
        deviceId: "browser-b",
        endpoint: "/api/sync-vaults",
        fetcher
      }),
    (error) => error.status === 409 && error.detail.currentRevision === 2
  );
  const revoked = await revokeSyncVault({
    vaultId: "vault-1",
    syncToken: "sync-token-1",
    endpoint: "/api/sync-vaults",
    fetcher
  });

  assert.equal(read.revision, 2);
  assert.equal(revoked.revoked, true);
  assert.equal(calls[0].url, "/api/sync-vaults/vault-1/read");
  assert.equal(calls[1].url, "/api/sync-vaults/vault-1");
  assert.equal(calls[2].url, "/api/sync-vaults/vault-1/revoke");
});
