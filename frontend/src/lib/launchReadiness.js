export const fallbackLaunchReadiness = {
  version: 1,
  source: "Launch-readiness gates unavailable.",
  notes: [
    "Backend launch-readiness metadata did not load. Treat production launch as blocked until manual gates are reviewed."
  ],
  gates: [
    {
      id: "launch-readiness-unavailable",
      label: "Launch readiness unavailable",
      category: "launch",
      status: "human-review-required",
      blocking: true,
      owner: "Dawson",
      evidenceRequired: ["Reload backend launch-readiness gates before launch review."],
      currentScaffold: [],
      verification: [".\\verify.ps1"],
      docs: ["manual-work-queue.md"]
    }
  ]
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function normalizeLaunchReadiness(payload = {}) {
  const gates = safeArray(payload.gates)
    .filter((gate) => gate?.id)
    .map((gate) => ({
      id: String(gate.id),
      label: String(gate.label || gate.id),
      category: String(gate.category || "launch"),
      status: String(gate.status || "human-review-required"),
      blocking: gate.blocking !== false,
      owner: String(gate.owner || "Dawson"),
      evidenceRequired: safeArray(gate.evidenceRequired).map(String),
      currentScaffold: safeArray(gate.currentScaffold).map(String),
      verification: safeArray(gate.verification).map(String),
      docs: safeArray(gate.docs).map(String)
    }));

  return {
    version: Number(payload.version || fallbackLaunchReadiness.version),
    source: String(payload.source || fallbackLaunchReadiness.source),
    notes: safeArray(payload.notes).map(String),
    gates: gates.length ? gates : fallbackLaunchReadiness.gates
  };
}

export function launchReadinessSummary(readiness = fallbackLaunchReadiness) {
  const normalized = normalizeLaunchReadiness(readiness);
  const blockingCount = normalized.gates.filter((gate) => gate.blocking).length;
  const completedCount = normalized.gates.filter((gate) => gate.status === "completed").length;

  return {
    totalCount: normalized.gates.length,
    blockingCount,
    completedCount,
    openCount: normalized.gates.length - completedCount,
    ready: blockingCount === 0
  };
}
