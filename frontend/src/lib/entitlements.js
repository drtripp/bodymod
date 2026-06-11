import { readJsonSync, writeJsonSync } from "./storageAdapter.js";

export const PRO_WAITLIST_KEY = "bodymod:pro-waitlist:v1";
export const REFERRAL_CREDITS_KEY = "bodymod:referral-credits:v1";

export const fallbackEntitlementConfig = {
  version: 1,
  currentTier: "free",
  source: "Frontend fallback entitlement config.",
  tiers: [
    {
      id: "free",
      label: "Free",
      summary: "All current tracking, local logs, imports, exports, and restore tools remain free."
    },
    {
      id: "pro",
      label: "Pro",
      summary: "Future paid tier for compute, curation, sync, and automation."
    }
  ],
  features: [
    {
      id: "measurement-tracking",
      label: "Measurement tracking",
      tier: "free",
      status: "available",
      category: "Tracking",
      summary: "Manual measurements, snapshots, check-ins, trend charts, and goals."
    },
    {
      id: "local-data-export",
      label: "Local data export",
      tier: "free",
      status: "available",
      category: "Data ownership",
      summary: "Snapshot JSON export, encrypted local backup, and progress report downloads."
    },
    {
      id: "diet-workout-logs",
      label: "Diet and workout logs",
      tier: "free",
      status: "available",
      category: "Tracking",
      summary: "Food logging, CSV imports, fluid logs, workout sessions, and PR charts."
    },
    {
      id: "ai-data-explainer",
      label: "AI explain my data",
      tier: "pro",
      status: "preview",
      category: "Compute",
      summary: "A bounded assistant for questions about the user's own logs and corpus entries."
    },
    {
      id: "healthkit-auto-sync",
      label: "HealthKit and Health Connect auto-sync",
      tier: "pro",
      status: "preview",
      category: "Native automation",
      summary: "Native-device sync, automatic imports, and write-back once mobile apps ship."
    }
  ],
  nonPaywalledFeatureIds: [
    "measurement-tracking",
    "local-data-export",
    "diet-workout-logs"
  ],
  waitlist: {
    enabled: true,
    storage: "local-only",
    message: "Join the local Pro waitlist before pricing or checkout exists."
  },
  referral: {
    enabled: true,
    storage: "local-only",
    rewardLabel: "1 Pro month",
    referrerCreditMonths: 1,
    refereeCreditMonths: 1,
    message: "Invite without pressure: both sides get one future Pro month when production accounts and billing exist.",
    disclaimer: "Referral credits never gate tracking, logs, exports, or results."
  }
};

const tierRank = {
  free: 0,
  pro: 1
};

function normalizeFeature(feature = {}) {
  return {
    id: String(feature.id || ""),
    label: String(feature.label || feature.id || "Feature"),
    tier: feature.tier === "pro" ? "pro" : "free",
    status: String(feature.status || "available"),
    category: String(feature.category || "General"),
    summary: String(feature.summary || "")
  };
}

export function normalizeEntitlementConfig(input = fallbackEntitlementConfig) {
  const tiers = Array.isArray(input.tiers) && input.tiers.length
    ? input.tiers
    : fallbackEntitlementConfig.tiers;
  const features = Array.isArray(input.features) && input.features.length
    ? input.features.map(normalizeFeature).filter((feature) => feature.id)
    : fallbackEntitlementConfig.features;
  const featureIds = new Set(features.map((feature) => feature.id));
  const nonPaywalledFeatureIds = Array.isArray(input.nonPaywalledFeatureIds)
    ? input.nonPaywalledFeatureIds.filter((id) => featureIds.has(id))
    : fallbackEntitlementConfig.nonPaywalledFeatureIds;

  return {
    version: Number(input.version || fallbackEntitlementConfig.version),
    currentTier: input.currentTier === "pro" ? "pro" : "free",
    source: String(input.source || fallbackEntitlementConfig.source),
    tiers,
    features,
    nonPaywalledFeatureIds,
    waitlist: {
      ...fallbackEntitlementConfig.waitlist,
      ...(input.waitlist || {})
    },
    referral: {
      ...fallbackEntitlementConfig.referral,
      ...(input.referral || {})
    }
  };
}

export function entitlementTier(config = fallbackEntitlementConfig) {
  const normalized = normalizeEntitlementConfig(config);
  return normalized.tiers.find((tier) => tier.id === normalized.currentTier) || normalized.tiers[0];
}

export function canAccessEntitlementFeature(
  config = fallbackEntitlementConfig,
  featureId,
  tierId = config.currentTier
) {
  const normalized = normalizeEntitlementConfig(config);
  const feature = normalized.features.find((item) => item.id === featureId);
  if (!feature) {
    return false;
  }

  if (normalized.nonPaywalledFeatureIds.includes(feature.id)) {
    return true;
  }

  return (tierRank[tierId] || 0) >= (tierRank[feature.tier] || 0);
}

export function ownDataFeatureIds(config = fallbackEntitlementConfig) {
  return normalizeEntitlementConfig(config).nonPaywalledFeatureIds;
}

export function loadProWaitlistSignups(adapter) {
  const parsed = readJsonSync(PRO_WAITLIST_KEY, { signups: [] }, adapter);
  return Array.isArray(parsed.signups) ? parsed.signups : [];
}

export function saveProWaitlistSignup({ email, accountId = "", source = "account-panel" }, adapter) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Enter a valid email for the Pro waitlist.");
  }

  const signups = loadProWaitlistSignups(adapter);
  const existing = signups.find((signup) => signup.email === normalizedEmail);
  if (existing) {
    return {
      ...existing,
      duplicate: true
    };
  }

  const signup = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    accountId,
    source,
    createdAt: new Date().toISOString()
  };

  writeJsonSync(PRO_WAITLIST_KEY, {
    version: 1,
    signups: [signup, ...signups]
  }, adapter);

  return signup;
}

function accountSeed(account = {}) {
  return String(account.id || account.email || account.displayName || "bodymod").trim().toLowerCase();
}

function stableBase36Hash(value) {
  let hash = 2166136261;
  for (const character of String(value || "")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(0, 7);
}

export function normalizeReferralCode(code) {
  const cleaned = String(code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  if (!cleaned) {
    return "";
  }

  return cleaned.startsWith("BM") ? `BM-${cleaned.slice(2)}` : `BM-${cleaned}`;
}

export function referralCodeForAccount(account = {}) {
  return `BM-${stableBase36Hash(accountSeed(account))}`;
}

export function loadReferralCredits(accountId = "", adapter) {
  const parsed = readJsonSync(REFERRAL_CREDITS_KEY, { credits: [] }, adapter);
  const credits = Array.isArray(parsed.credits) ? parsed.credits : [];

  if (!accountId) {
    return credits;
  }

  return credits.filter((credit) => credit.accountId === accountId);
}

export function saveReferralCredit(
  {
    accountId = "",
    accountEmail = "",
    referralCode = "",
    ownReferralCode = "",
    source = "account-panel"
  } = {},
  config = fallbackEntitlementConfig,
  adapter
) {
  const normalizedConfig = normalizeEntitlementConfig(config);
  const normalizedCode = normalizeReferralCode(referralCode);
  const normalizedOwnCode = normalizeReferralCode(ownReferralCode);

  if (!normalizedConfig.referral.enabled) {
    throw new Error("Referral credits are not enabled.");
  }
  if (!accountId) {
    throw new Error("Create a local account before logging a referral.");
  }
  if (normalizedCode.length < 6) {
    throw new Error("Enter a referral code.");
  }
  if (normalizedOwnCode && normalizedCode === normalizedOwnCode) {
    throw new Error("Use someone else's referral code, not your own.");
  }

  const credits = loadReferralCredits("", adapter);
  const existing = credits.find(
    (credit) => credit.accountId === accountId && credit.referralCode === normalizedCode
  );
  if (existing) {
    return {
      ...existing,
      duplicate: true
    };
  }

  const credit = {
    id: crypto.randomUUID(),
    accountId,
    accountEmail: String(accountEmail || "").trim().toLowerCase(),
    referralCode: normalizedCode,
    rewardLabel: normalizedConfig.referral.rewardLabel,
    referrerCreditMonths: Number(normalizedConfig.referral.referrerCreditMonths || 0),
    refereeCreditMonths: Number(normalizedConfig.referral.refereeCreditMonths || 0),
    status: "local-pending",
    source,
    localOnly: true,
    createdAt: new Date().toISOString()
  };

  writeJsonSync(REFERRAL_CREDITS_KEY, {
    version: 1,
    credits: [credit, ...credits]
  }, adapter);

  return credit;
}

export function restoreReferralCredits(accountId, records = [], adapter) {
  if (!accountId) {
    throw new Error("Create a local account before restoring referral credits.");
  }

  const credits = loadReferralCredits("", adapter);
  const existingForAccount = credits.filter((credit) => credit.accountId === accountId);
  const otherAccounts = credits.filter((credit) => credit.accountId !== accountId);
  const existingIds = new Set(existingForAccount.map((credit) => credit.id).filter(Boolean));
  const restoredCredits = Array.isArray(records)
    ? records
        .filter((record) => record && typeof record === "object")
        .map((record) => ({
          ...record,
          id: record.id || crypto.randomUUID(),
          accountId
        }))
        .filter((record) => {
          if (existingIds.has(record.id)) {
            return false;
          }
          existingIds.add(record.id);
          return true;
        })
    : [];

  writeJsonSync(REFERRAL_CREDITS_KEY, {
    version: 1,
    credits: [...restoredCredits, ...existingForAccount, ...otherAccounts]
  }, adapter);

  return {
    credits: [...restoredCredits, ...existingForAccount],
    importedCount: restoredCredits.length
  };
}

export function summarizeReferralCredits(credits = [], config = fallbackEntitlementConfig) {
  const normalizedConfig = normalizeEntitlementConfig(config);
  const localCredits = Array.isArray(credits) ? credits : [];
  const earnedMonths = localCredits.reduce(
    (total, credit) => total + Number(credit.refereeCreditMonths || 0),
    0
  );

  return {
    count: localCredits.length,
    earnedMonths,
    rewardLabel: normalizedConfig.referral.rewardLabel,
    status: localCredits.length ? "local-pending" : "none"
  };
}
