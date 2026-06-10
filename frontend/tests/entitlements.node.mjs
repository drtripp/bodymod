import assert from "node:assert/strict";
import test from "node:test";

import { createMemoryStorageAdapter } from "../src/lib/storageAdapter.js";
import {
  canAccessEntitlementFeature,
  fallbackEntitlementConfig,
  loadProWaitlistSignups,
  normalizeEntitlementConfig,
  ownDataFeatureIds,
  saveProWaitlistSignup
} from "../src/lib/entitlements.js";

test("normalizes entitlement config and keeps current data tools free", () => {
  const config = normalizeEntitlementConfig(fallbackEntitlementConfig);

  assert.equal(config.currentTier, "free");
  assert.ok(ownDataFeatureIds(config).includes("measurement-tracking"));
  assert.ok(ownDataFeatureIds(config).includes("local-data-export"));
  assert.equal(canAccessEntitlementFeature(config, "measurement-tracking"), true);
  assert.equal(canAccessEntitlementFeature(config, "local-data-export"), true);
  assert.equal(canAccessEntitlementFeature(config, "ai-data-explainer"), false);
  assert.equal(canAccessEntitlementFeature(config, "ai-data-explainer", "pro"), true);
});

test("local pro waitlist stores deduped signups without server sync", () => {
  const adapter = createMemoryStorageAdapter();

  const signup = saveProWaitlistSignup(
    { email: " User@Example.COM ", accountId: "account-1" },
    adapter
  );
  const duplicate = saveProWaitlistSignup(
    { email: "user@example.com", accountId: "account-1" },
    adapter
  );

  assert.equal(signup.email, "user@example.com");
  assert.equal(duplicate.duplicate, true);
  assert.equal(loadProWaitlistSignups(adapter).length, 1);
});

test("local pro waitlist rejects invalid emails", () => {
  assert.throws(
    () => saveProWaitlistSignup({ email: "not-email" }, createMemoryStorageAdapter()),
    /valid email/
  );
});
