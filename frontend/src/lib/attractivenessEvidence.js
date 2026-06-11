export const fallbackAttractivenessEvidence = {
  version: 1,
  reference: "Local fallback attractiveness evidence framing.",
  notes: [
    "Population-average rater preferences are not personal targets.",
    "Backend evidence seed unavailable; using conservative local fallback copy."
  ],
  sources: [],
  metrics: [
    {
      id: "fallback-goal-framing",
      label: "Goal framing",
      category: "Safety",
      goalPresetIds: [],
      metricKeys: [],
      verdict: "needs-research",
      evidenceStrength: "fallback",
      populationReference: "Use selected goals as tracking context, not attractiveness prescriptions.",
      userFacingSummary: "Goal notes are informational and should stay tied to the user's own chosen target.",
      framing: "No hard attractiveness targets without reviewed evidence.",
      sourceIds: [],
      requiresHumanReview: true,
      notes: []
    }
  ]
};

const verdictLabels = {
  "ship-reference": "Reference only",
  "do-not-ship": "Do not use as target",
  "needs-research": "Needs research"
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function normalizeAttractivenessEvidence(source = fallbackAttractivenessEvidence) {
  const payload = source && typeof source === "object" ? source : fallbackAttractivenessEvidence;
  const metrics = safeArray(payload.metrics).map((metric) => ({
    id: String(metric.id || ""),
    label: String(metric.label || "Evidence note"),
    category: String(metric.category || "Evidence"),
    goalPresetIds: safeArray(metric.goalPresetIds).map(String),
    metricKeys: safeArray(metric.metricKeys).map(String),
    verdict: verdictLabels[metric.verdict] ? metric.verdict : "needs-research",
    evidenceStrength: String(metric.evidenceStrength || "needs review"),
    populationReference: String(metric.populationReference || ""),
    userFacingSummary: String(metric.userFacingSummary || ""),
    framing: String(metric.framing || ""),
    sourceIds: safeArray(metric.sourceIds).map(String),
    requiresHumanReview: metric.requiresHumanReview !== false,
    notes: safeArray(metric.notes).map(String)
  }));

  return {
    version: Number(payload.version) || 1,
    reference: String(payload.reference || fallbackAttractivenessEvidence.reference),
    notes: safeArray(payload.notes).map(String),
    sources: safeArray(payload.sources).map((sourceItem) => ({
      id: String(sourceItem.id || ""),
      title: String(sourceItem.title || ""),
      year: Number(sourceItem.year) || null,
      url: String(sourceItem.url || ""),
      sourceType: String(sourceItem.sourceType || ""),
      reviewStatus: String(sourceItem.reviewStatus || "")
    })),
    metrics: metrics.filter((metric) => metric.id && metric.userFacingSummary)
  };
}

export function evidenceForGoal(library, goalId, limit = 3) {
  if (!goalId) {
    return [];
  }

  return normalizeAttractivenessEvidence(library)
    .metrics.filter((metric) => metric.goalPresetIds.includes(goalId))
    .slice(0, limit);
}

export function verdictLabel(verdict) {
  return verdictLabels[verdict] || verdictLabels["needs-research"];
}

export function evidenceSourceSummary(library, metric) {
  const normalized = normalizeAttractivenessEvidence(library);
  const sourceMap = new Map(normalized.sources.map((source) => [source.id, source]));
  const labels = metric.sourceIds
    .map((sourceId) => sourceMap.get(sourceId))
    .filter(Boolean)
    .map((source) => `${source.year || "n.d."}: ${source.title}`);

  return labels.join("; ");
}
