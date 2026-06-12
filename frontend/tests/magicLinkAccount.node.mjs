import assert from "node:assert/strict";
import test from "node:test";

import {
  clearAccountIdentitySession,
  loadAccountIdentitySession,
  persistAccountIdentitySession,
  readAccountIdentitySession,
  requestAccountMagicLink,
  revokeAccountIdentitySession,
  verifyAccountMagicLink
} from "../src/lib/magicLinkAccount.js";
import { createMemoryStorageAdapter } from "../src/lib/storageAdapter.js";

function jsonResponse(payload, ok = true, status = 200) {
  return {
    ok,
    status,
    async json() {
      return payload;
    }
  };
}

test("requests magic links without sending local measurement data", async () => {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    return jsonResponse({
      status: "accepted",
      requestId: "mlr_test",
      maskedEmail: "m***@example.com",
      emailDomain: "example.com",
      expiresAt: "2026-06-12T18:00:00+00:00",
      deliveryStatus: "dev-token-returned",
      devLoginToken: "bmd_ml_test-token-abcdefghijklmnopqrstuvwxyz"
    }, true, 202);
  };

  const response = await requestAccountMagicLink({
    email: "mason@example.com",
    displayName: "Mason",
    userAgentFamily: "chromium",
    fetcher,
    endpoint: "https://api.example.test/api/accounts"
  });

  assert.equal(response.deliveryStatus, "dev-token-returned");
  assert.equal(response.devLoginToken, "bmd_ml_test-token-abcdefghijklmnopqrstuvwxyz");
  assert.equal(calls[0].url, "https://api.example.test/api/accounts/magic-links");
  const body = JSON.parse(calls[0].options.body);
  assert.deepEqual(body, {
    email: "mason@example.com",
    displayName: "Mason",
    userAgentFamily: "chromium"
  });
  assert.equal(calls[0].options.method, "POST");
  assert.equal(JSON.stringify(body).includes("measurements"), false);
  assert.equal(JSON.stringify(body).includes("weight"), false);
  assert.equal(JSON.stringify(body).includes("syncToken"), false);
});

test("verifies, reads, persists, and revokes an account identity session", async () => {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith("/magic-links/verify")) {
      return jsonResponse({
        accountId: "acct_test",
        sessionId: "sess_test",
        sessionToken: "bmd_sess_test-token-abcdefghijklmnopqrstuvwxyz",
        displayName: "Mason",
        maskedEmail: "m***@example.com",
        emailDomain: "example.com",
        scopes: ["identity:read", "sync-vault:link"],
        createdAt: "2026-06-12T17:00:00+00:00",
        authenticatedAt: "2026-06-12T17:01:00+00:00",
        expiresAt: "2026-07-12T17:01:00+00:00"
      }, true, 201);
    }
    if (url.endsWith("/session")) {
      assert.equal(
        options.headers.Authorization,
        "Bearer bmd_sess_test-token-abcdefghijklmnopqrstuvwxyz"
      );
      return jsonResponse({
        accountId: "acct_test",
        sessionId: "sess_test",
        displayName: "Mason",
        maskedEmail: "m***@example.com",
        emailDomain: "example.com",
        scopes: ["identity:read", "sync-vault:link"],
        createdAt: "2026-06-12T17:00:00+00:00",
        authenticatedAt: "2026-06-12T17:01:00+00:00",
        expiresAt: "2026-07-12T17:01:00+00:00"
      });
    }
    if (url.endsWith("/logout")) {
      assert.equal(
        options.headers.Authorization,
        "Bearer bmd_sess_test-token-abcdefghijklmnopqrstuvwxyz"
      );
      return jsonResponse({ status: "revoked", revoked: true });
    }
    throw new Error(`Unexpected URL ${url}`);
  };

  const session = await verifyAccountMagicLink({
    token: "bmd_ml_test-token-abcdefghijklmnopqrstuvwxyz",
    fetcher,
    endpoint: "https://api.example.test/api/accounts"
  });
  assert.equal(session.accountId, "acct_test");
  assert.equal(session.sessionToken, "bmd_sess_test-token-abcdefghijklmnopqrstuvwxyz");
  assert.equal(JSON.parse(calls[0].options.body).token, "bmd_ml_test-token-abcdefghijklmnopqrstuvwxyz");

  const adapter = createMemoryStorageAdapter();
  persistAccountIdentitySession(session, adapter);
  assert.deepEqual(loadAccountIdentitySession(adapter), session);

  const readBack = await readAccountIdentitySession({
    sessionToken: session.sessionToken,
    fetcher,
    endpoint: "https://api.example.test/api/accounts"
  });
  assert.equal(readBack.sessionToken, session.sessionToken);

  const revoked = await revokeAccountIdentitySession({
    sessionToken: session.sessionToken,
    fetcher,
    endpoint: "https://api.example.test/api/accounts"
  });
  assert.deepEqual(revoked, { status: "revoked", revoked: true });

  clearAccountIdentitySession(adapter);
  assert.equal(loadAccountIdentitySession(adapter).sessionToken, "");
});

test("surfaces account identity API failures with status details", async () => {
  const fetcher = async () => jsonResponse({ detail: "Magic link token is invalid or expired." }, false, 403);

  await assert.rejects(
    () =>
      verifyAccountMagicLink({
        token: "bmd_ml_wrong-token-abcdefghijklmnopqrstuvwxyz",
        fetcher,
        endpoint: "https://api.example.test/api/accounts"
      }),
    (error) => {
      assert.equal(error.status, 403);
      assert.equal(error.message, "Magic link token is invalid or expired.");
      return true;
    }
  );
});
