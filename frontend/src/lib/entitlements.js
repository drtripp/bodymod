import { readJsonSync, writeJsonSync } from "./storageAdapter.js";

export const PRO_WAITLIST_KEY = "bodymod:pro-waitlist:v1";

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
