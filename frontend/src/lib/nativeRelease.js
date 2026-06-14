export const fallbackNativeReleaseChecklist = {
  version: 1,
  source: "Native release readiness metadata unavailable.",
  notes: [
    "Backend native release metadata did not load. Treat native launch as blocked until release items are reviewed."
  ],
  items: [
    {
      id: "native-release-unavailable",
      label: "Native release readiness unavailable",
      category: "native-release",
      status: "native-project-required",
      blocking: true,
      owner: "Dawson",
      platforms: ["ios", "android"],
      launchGateIds: ["native-release-readiness"],
      releaseRequirement: "Reload backend native release readiness before native launch review.",
      decisionsRequired: ["Do not ship native apps without the release checklist."],
      currentScaffold: [],
      validationSteps: ["Run the verifier after backend metadata loads."],
      verification: [".\\verify.ps1"],
      docs: ["manual-work-queue.md"],
      metadataOnly: true
    }
  ]
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeNativeReleaseItem(item = {}) {
  return {
    id: String(item.id || ""),
    label: String(item.label || item.id || "Native release item"),
    category: String(item.category || "native-release"),
    status: String(item.status || "native-project-required"),
    blocking: item.blocking !== false,
    owner: String(item.owner || "Dawson"),
    platforms: safeArray(item.platforms).map(String),
    launchGateIds: safeArray(item.launchGateIds).map(String),
    releaseRequirement: String(item.releaseRequirement || "Native release requirement not captured."),
    decisionsRequired: safeArray(item.decisionsRequired).map(String),
    currentScaffold: safeArray(item.currentScaffold).map(String),
    validationSteps: safeArray(item.validationSteps).map(String),
    verification: safeArray(item.verification).map(String),
    docs: safeArray(item.docs).map(String),
    metadataOnly: item.metadataOnly !== false
  };
}

export function normalizeNativeReleaseChecklist(payload = {}) {
  const items = safeArray(payload.items)
    .filter((item) => item?.id)
    .map(normalizeNativeReleaseItem);

  return {
    version: Number(payload.version || fallbackNativeReleaseChecklist.version),
    source: String(payload.source || fallbackNativeReleaseChecklist.source),
    notes: safeArray(payload.notes).map(String),
    items: items.length ? items : fallbackNativeReleaseChecklist.items
  };
}

export function nativeReleaseSummary(checklist = fallbackNativeReleaseChecklist) {
  const normalized = normalizeNativeReleaseChecklist(checklist);
  const blockingCount = normalized.items.filter((item) => item.blocking).length;
  const completedCount = normalized.items.filter(
    (item) => item.status === "completed" || item.status === "removed-from-scope"
  ).length;
  const platformCounts = normalized.items.reduce(
    (counts, item) => {
      for (const platform of item.platforms) {
        counts[platform] = (counts[platform] || 0) + 1;
      }
      return counts;
    },
    { ios: 0, android: 0, web: 0 }
  );
  const metadataOnlyCount = normalized.items.filter((item) => item.metadataOnly).length;

  return {
    totalCount: normalized.items.length,
    blockingCount,
    completedCount,
    openCount: normalized.items.length - completedCount,
    platformCounts,
    metadataOnlyCount,
    ready: blockingCount === 0
  };
}
