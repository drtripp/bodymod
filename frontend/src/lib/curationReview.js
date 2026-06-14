export const fallbackCurationReviewLibrary = {
  version: 1,
  source: "Curation review packets unavailable.",
  notes: [
    "Backend curation review metadata did not load. Treat source/content review as blocked until curation packets are reviewed."
  ],
  packets: [
    {
      id: "curation-review-unavailable",
      label: "Curation review packets unavailable",
      category: "curation",
      status: "human-review-required",
      blocking: true,
      owner: "Dawson",
      launchGateIds: [],
      inputRequired: ["Reload backend curation packets before source/content review."],
      seedFiles: [],
      reviewerQuestions: ["Which production seed files are ready for review?"],
      acceptanceCriteria: ["Do not replace dummy content without reviewed inputs."],
      currentScaffold: [],
      verification: [".\\verify.ps1"],
      docs: ["manual-work-queue.md"],
      metadataOnly: true
    }
  ]
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizePacket(packet = {}) {
  return {
    id: String(packet.id || ""),
    label: String(packet.label || packet.id || "Curation review packet"),
    category: String(packet.category || "curation"),
    status: String(packet.status || "human-review-required"),
    blocking: packet.blocking !== false,
    owner: String(packet.owner || "Dawson"),
    launchGateIds: safeArray(packet.launchGateIds).map(String),
    inputRequired: safeArray(packet.inputRequired).map(String),
    seedFiles: safeArray(packet.seedFiles).map(String),
    reviewerQuestions: safeArray(packet.reviewerQuestions).map(String),
    acceptanceCriteria: safeArray(packet.acceptanceCriteria).map(String),
    currentScaffold: safeArray(packet.currentScaffold).map(String),
    verification: safeArray(packet.verification).map(String),
    docs: safeArray(packet.docs).map(String),
    metadataOnly: packet.metadataOnly !== false
  };
}

export function normalizeCurationReviewLibrary(payload = {}) {
  const packets = safeArray(payload.packets)
    .filter((packet) => packet?.id)
    .map(normalizePacket);

  return {
    version: Number(payload.version || fallbackCurationReviewLibrary.version),
    source: String(payload.source || fallbackCurationReviewLibrary.source),
    notes: safeArray(payload.notes).map(String),
    packets: packets.length ? packets : fallbackCurationReviewLibrary.packets
  };
}

export function curationReviewSummary(library = fallbackCurationReviewLibrary) {
  const normalized = normalizeCurationReviewLibrary(library);
  const blockingCount = normalized.packets.filter((packet) => packet.blocking).length;
  const completedCount = normalized.packets.filter(
    (packet) => packet.status === "completed" || packet.status === "removed-from-scope"
  ).length;
  const seedFileCount = new Set(
    normalized.packets.flatMap((packet) => packet.seedFiles)
  ).size;
  const metadataOnlyCount = normalized.packets.filter((packet) => packet.metadataOnly).length;

  return {
    totalCount: normalized.packets.length,
    blockingCount,
    completedCount,
    openCount: normalized.packets.length - completedCount,
    seedFileCount,
    metadataOnlyCount,
    ready: blockingCount === 0
  };
}
