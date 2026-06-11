import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { test } from "node:test";
import {
  createSyncVault,
  encryptedBackupToSyncBlob,
  readSyncVault,
  revokeSyncVault,
  updateSyncVault
} from "../src/lib/encryptedSync.js";
import {
  buildLocalBackupBundle,
  encryptLocalBackup
} from "../src/lib/localBackup.js";


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

  assert.equal(blob.algorithm, "AES-GCM");
  assert.match(blob.kdf, /^PBKDF2-SHA-256:150000$/);
  assert.ok(blob.salt);
  assert.ok(blob.iv);
  assert.ok(blob.ciphertext);
  assert.doesNotMatch(JSON.stringify(blob), /taylor@example.com|Shoulder goal|waistCircumference/);
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
