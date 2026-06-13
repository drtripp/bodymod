export const fallbackProviderDecisionLibrary = {
  version: 1,
  source: "Provider decision metadata unavailable.",
  notes: [
    "Backend provider decision metadata did not load. Treat production launch as blocked until provider decisions are reviewed."
  ],
  decisions: [
    {
      id: "provider-decisions-unavailable",
      label: "Provider decisions unavailable",
      category: "launch",
      status: "provider-decision-required",
      blocking: true,
      owner: "Dawson",
      launchGateIds: ["launch-privacy-moderation"],
      decisionNeeded: ["Reload backend provider decisions before launch review."],
      privacyRequirements: ["Do not enable production providers without metadata review."],
      currentScaffold: [],
      verification: [".\\verify.ps1"],
      docs: ["manual-work-queue.md"],
      candidates: [
        {
          id: "unavailable",
          label: "Unavailable",
          providerType: "fallback",
          reviewStatus: "needs review",
          recommendedForPrototype: true,
          metadataOnly: true,
          notes: ["Fallback row only."]
        }
      ]
    }
  ]
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeCandidate(candidate = {}) {
  return {
    id: String(candidate.id || ""),
    label: String(candidate.label || candidate.id || "Provider candidate"),
    providerType: String(candidate.providerType || "provider"),
    reviewStatus: String(candidate.reviewStatus || "needs review"),
    recommendedForPrototype: Boolean(candidate.recommendedForPrototype),
    metadataOnly: candidate.metadataOnly !== false,
    notes: safeArray(candidate.notes).map(String)
  };
}

export function normalizeProviderDecisionLibrary(payload = {}) {
  const decisions = safeArray(payload.decisions)
    .filter((decision) => decision?.id)
    .map((decision) => ({
      id: String(decision.id),
      label: String(decision.label || decision.id),
      category: String(decision.category || "provider"),
      status: String(decision.status || "provider-decision-required"),
      blocking: decision.blocking !== false,
      owner: String(decision.owner || "Dawson"),
      launchGateIds: safeArray(decision.launchGateIds).map(String),
      decisionNeeded: safeArray(decision.decisionNeeded).map(String),
      privacyRequirements: safeArray(decision.privacyRequirements).map(String),
      currentScaffold: safeArray(decision.currentScaffold).map(String),
      verification: safeArray(decision.verification).map(String),
      docs: safeArray(decision.docs).map(String),
      candidates: safeArray(decision.candidates).map(normalizeCandidate)
    }));

  return {
    version: Number(payload.version || fallbackProviderDecisionLibrary.version),
    source: String(payload.source || fallbackProviderDecisionLibrary.source),
    notes: safeArray(payload.notes).map(String),
    decisions: decisions.length ? decisions : fallbackProviderDecisionLibrary.decisions
  };
}

export function providerDecisionSummary(library = fallbackProviderDecisionLibrary) {
  const normalized = normalizeProviderDecisionLibrary(library);
  const blockingCount = normalized.decisions.filter((decision) => decision.blocking).length;
  const completedCount = normalized.decisions.filter(
    (decision) => decision.status === "completed" || decision.status === "removed-from-scope"
  ).length;
  const candidateCount = normalized.decisions.reduce(
    (total, decision) => total + decision.candidates.length,
    0
  );
  const prototypeCandidateCount = normalized.decisions.filter((decision) =>
    decision.candidates.some((candidate) => candidate.recommendedForPrototype)
  ).length;

  return {
    totalCount: normalized.decisions.length,
    blockingCount,
    completedCount,
    openCount: normalized.decisions.length - completedCount,
    candidateCount,
    prototypeCandidateCount,
    ready: blockingCount === 0
  };
}
