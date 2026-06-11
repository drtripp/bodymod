import assert from "node:assert/strict";
import test from "node:test";

import { createMemoryStorageAdapter } from "../src/lib/storageAdapter.js";
import {
  canAccessEntitlementFeature,
  fallbackEntitlementConfig,
  loadReferralCredits,
  loadProWaitlistSignups,
  normalizeEntitlementConfig,
  normalizeReferralCode,
  ownDataFeatureIds,
  referralCodeForAccount,
  restoreReferralCredits,
  saveReferralCredit,
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
  assert.equal(config.referral.enabled, true);
  assert.equal(config.referral.referrerCreditMonths, 1);
  assert.equal(config.referral.refereeCreditMonths, 1);
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

test("local referral credits generate stable codes and dedupe accepted invites", () => {
  const adapter = createMemoryStorageAdapter();
  const account = {
    id: "account-1",
    email: "user@example.com",
    displayName: "User"
  };
  const ownCode = referralCodeForAccount(account);

  assert.match(ownCode, /^BM-[A-Z0-9]{7}$/);
  assert.equal(referralCodeForAccount(account), ownCode);
  assert.equal(normalizeReferralCode(" bm friend-1 "), "BM-FRIEND1");

  const credit = saveReferralCredit(
    {
      accountId: account.id,
      accountEmail: account.email,
      referralCode: "friend-1",
      ownReferralCode: ownCode
    },
    fallbackEntitlementConfig,
    adapter
  );
  const duplicate = saveReferralCredit(
    {
      accountId: account.id,
      accountEmail: account.email,
      referralCode: "BM-FRIEND1",
      ownReferralCode: ownCode
    },
    fallbackEntitlementConfig,
    adapter
  );

  assert.equal(credit.referralCode, "BM-FRIEND1");
  assert.equal(credit.referrerCreditMonths, 1);
  assert.equal(credit.refereeCreditMonths, 1);
  assert.equal(credit.status, "local-pending");
  assert.equal(credit.localOnly, true);
  assert.equal(duplicate.duplicate, true);
  assert.equal(loadReferralCredits(account.id, adapter).length, 1);
});

test("local referral credits reject self-referrals and restore from backups", () => {
  const adapter = createMemoryStorageAdapter();
  const ownCode = referralCodeForAccount({ id: "account-1" });

  assert.throws(
    () =>
      saveReferralCredit(
        {
          accountId: "account-1",
          referralCode: ownCode,
          ownReferralCode: ownCode
        },
        fallbackEntitlementConfig,
        adapter
      ),
    /someone else's/
  );

  const restored = restoreReferralCredits(
    "account-2",
    [{ id: "credit-1", accountId: "old-account", referralCode: "BM-FRIEND2" }],
    adapter
  );
  const restoredAgain = restoreReferralCredits(
    "account-2",
    [{ id: "credit-1", accountId: "old-account", referralCode: "BM-FRIEND2" }],
    adapter
  );

  assert.equal(restored.importedCount, 1);
  assert.equal(restoredAgain.importedCount, 0);
  assert.equal(loadReferralCredits("account-2", adapter)[0].accountId, "account-2");
});
