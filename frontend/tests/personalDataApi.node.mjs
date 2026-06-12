import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createPersonalDataToken,
  normalizePersonalDataToken,
  readPersonalDataSyncVault,
  revokePersonalDataToken
} from "../src/lib/personalDataApi.js";


function syncBlob(ciphertext = "QUJDREVGR0hJSktMTU5PUA==") {
  return {
    version: 1,
    algorithm: "AES-GCM",
    kdf: "PBKDF2-SHA-256:150000",
    salt: "YWJjZGVmZ2hpamtsbW5vcA==",
    iv: "YWJjZGVmZ2hpams=",
    ciphertext
  };
}

test("creates personal data API tokens without sending plaintext measurements", async () => {
  const calls = [];
  const token = await createPersonalDataToken({
    vaultId: "vault-1",
    syncToken: "sync-token-long-enough-0123456789",
    label: "QS script",
    endpoint: "/api/personal-data",
    async fetcher(url, options = {}) {
      calls.push({ url, options });
      return {
        ok: true,
        async json() {
          return {
            tokenId: "pdt_1",
            accessToken: "bmd_pat_abc123",
            vaultId: "vault-1",
            label: "QS script",
            scopes: ["sync-vault:read"],
            createdAt: "2026-06-12T12:00:00+00:00",
            expiresAt: null,
            revokedAt: null
          };
        }
      };
    }
  });

  assert.equal(calls[0].url, "/api/personal-data/tokens");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(token.accessToken, "bmd_pat_abc123");
  assert.deepEqual(token.scopes, ["sync-vault:read"]);
  assert.doesNotMatch(calls[0].options.body, /measurements|waistCircumference|note|email/);
});

test("reads and revokes personal data API tokens with bearer auth", async () => {
  const calls = [];
  async function fetcher(url, options = {}) {
    calls.push({ url, options });
    if (url.endsWith("/sync-vault")) {
      return {
        ok: true,
        async json() {
          return {
            vaultId: "vault-1",
            revision: 4,
            deviceId: "browser-a",
            createdAt: "2026-06-12T12:00:00+00:00",
            updatedAt: "2026-06-12T12:05:00+00:00",
            blob: syncBlob()
          };
        }
      };
    }
    return {
      ok: true,
      async json() {
        return {
          status: "revoked",
          revoked: true
        };
      }
    };
  }

  const vault = await readPersonalDataSyncVault({
    accessToken: "bmd_pat_abc123",
    endpoint: "/api/personal-data",
    fetcher
  });
  const revoked = await revokePersonalDataToken({
    accessToken: "bmd_pat_abc123",
    endpoint: "/api/personal-data",
    fetcher
  });

  assert.equal(vault.revision, 4);
  assert.equal(revoked.revoked, true);
  assert.equal(calls[0].url, "/api/personal-data/sync-vault");
  assert.equal(calls[0].options.headers.Authorization, "Bearer bmd_pat_abc123");
  assert.equal(calls[1].url, "/api/personal-data/tokens/revoke");
  assert.equal(calls[1].options.headers.Authorization, "Bearer bmd_pat_abc123");
});

test("surfaces personal data API errors with status details", async () => {
  await assert.rejects(
    () =>
      readPersonalDataSyncVault({
        accessToken: "expired",
        endpoint: "/api/personal-data",
        async fetcher() {
          return {
            ok: false,
            status: 403,
            async json() {
              return { detail: "Invalid or expired personal data token." };
            }
          };
        }
      }),
    (error) => error.status === 403 && error.message === "Invalid or expired personal data token."
  );
});

test("normalizes sparse personal data API token records", () => {
  const normalized = normalizePersonalDataToken({
    tokenId: "pdt_1",
    scopes: ["sync-vault:read"]
  });

  assert.equal(normalized.tokenId, "pdt_1");
  assert.equal(normalized.accessToken, "");
  assert.deepEqual(normalized.scopes, ["sync-vault:read"]);
});
