export const fallbackCorpusModerationPolicy = {
  version: 1,
  source: "Bundled fallback corpus moderation policy. Review-only; no user case log publishes automatically.",
  notes: [
    "Metadata-only fallback for offline review.",
    "All rules stay blocking until publication and exclusion policy is approved."
  ],
  publicationModes: [
    {
      id: "private-review-only",
      label: "Private review-only queue",
      reviewStatus: "current prototype default; needs review before public launch",
      availability: "prototype-default",
      notes: [
        "Submitted case logs stay in the moderation queue.",
        "Approval updates queue status only and does not publish."
      ]
    },
    {
      id: "web-full-corpus",
      label: "Web full corpus",
      reviewStatus: "needs Dawson source and legal review",
      availability: "candidate",
      notes: ["Candidate mode for a source-reviewed web corpus."]
    },
    {
      id: "ios-trimmed-corpus",
      label: "iOS trimmed corpus",
      reviewStatus: "needs App Store policy review",
      availability: "candidate",
      notes: ["Candidate mode if native store policy requires a reduced corpus."]
    }
  ],
  rules: [
    {
      id: "source-reviewed-before-publication",
      label: "Source-reviewed before publication",
      category: "publication",
      appliesTo: ["strategy-entry", "case-log"],
      reviewStatus: "needs Dawson/source review",
      blocking: true,
      decisionsRequired: ["Approved source-link and citation policy"],
      exclusionTriggers: ["Missing source URL for non-anecdotal claims"],
      allowedCurrentScaffold: ["Backend seed/import corpus only"],
      verification: ["cd frontend && npm run test:corpus-moderation"],
      docs: ["manual-work-queue.md#1-source-reviewed-strategy-corpus"]
    },
    {
      id: "case-log-publication",
      label: "Case-log publication review",
      category: "moderation",
      appliesTo: ["submitted-case-log"],
      reviewStatus: "needs moderation policy review",
      blocking: true,
      decisionsRequired: ["Reviewer roles and audit trail policy"],
      exclusionTriggers: ["Private data or medical advice in submitted summaries"],
      allowedCurrentScaffold: ["POST /api/case-log-submissions stores review-safe summaries"],
      verification: ["cd frontend && npm run test:case-log-submissions"],
      docs: ["manual-work-queue.md#6-launch-privacy-and-moderation-approvals"]
    },
    {
      id: "high-risk-exclusion",
      label: "High-risk personalization exclusion",
      category: "safety",
      appliesTo: ["strategy-entry"],
      reviewStatus: "needs clinical/body-mod safety review",
      blocking: true,
      decisionsRequired: ["High-risk category exclusion decisions"],
      exclusionTriggers: ["Surgical or pharmaceutical action framed as personalized advice"],
      allowedCurrentScaffold: ["High-risk strategies excluded from personalization"],
      verification: ["cd frontend && npm run test:corpus"],
      docs: ["manual-work-queue.md#6-launch-privacy-and-moderation-approvals"]
    }
  ]
};

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringField(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function stringArray(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim())
    : [];
}

function normalizePublicationMode(rawMode) {
  if (!isObject(rawMode)) {
    throw new Error("Each corpus publication mode must be an object.");
  }

  const id = stringField(rawMode.id);
  const label = stringField(rawMode.label);

  if (!id || !label) {
    throw new Error("Each corpus publication mode needs id and label.");
  }

  return {
    id,
    label,
    reviewStatus: stringField(rawMode.reviewStatus, "needs review"),
    availability: stringField(rawMode.availability, "candidate"),
    notes: stringArray(rawMode.notes)
  };
}

function normalizeModerationRule(rawRule) {
  if (!isObject(rawRule)) {
    throw new Error("Each corpus moderation rule must be an object.");
  }

  const id = stringField(rawRule.id);
  const label = stringField(rawRule.label);

  if (!id || !label) {
    throw new Error("Each corpus moderation rule needs id and label.");
  }

  return {
    id,
    label,
    category: stringField(rawRule.category, "review"),
    appliesTo: stringArray(rawRule.appliesTo),
    reviewStatus: stringField(rawRule.reviewStatus, "needs review"),
    blocking: rawRule.blocking !== false,
    decisionsRequired: stringArray(rawRule.decisionsRequired),
    exclusionTriggers: stringArray(rawRule.exclusionTriggers),
    allowedCurrentScaffold: stringArray(rawRule.allowedCurrentScaffold),
    verification: stringArray(rawRule.verification),
    docs: stringArray(rawRule.docs)
  };
}

export function normalizeCorpusModerationPolicy(rawPolicy) {
  const fallback = fallbackCorpusModerationPolicy;
  const publicationModes = Array.isArray(rawPolicy?.publicationModes)
    ? rawPolicy.publicationModes.map(normalizePublicationMode)
    : fallback.publicationModes.map(normalizePublicationMode);
  const rules = Array.isArray(rawPolicy?.rules)
    ? rawPolicy.rules.map(normalizeModerationRule)
    : fallback.rules.map(normalizeModerationRule);

  if (!publicationModes.length) {
    throw new Error("Corpus moderation policy needs publication modes.");
  }
  if (!rules.length) {
    throw new Error("Corpus moderation policy needs rules.");
  }

  return {
    version: Number(rawPolicy?.version) || fallback.version,
    source: stringField(rawPolicy?.source, fallback.source),
    notes: stringArray(rawPolicy?.notes),
    publicationModes,
    rules
  };
}

export function corpusModerationPolicySummary(policy) {
  const normalized = normalizeCorpusModerationPolicy(policy);
  const blockingCount = normalized.rules.filter((rule) => rule.blocking).length;
  const submittedCaseLogRuleCount = normalized.rules.filter((rule) =>
    rule.appliesTo.includes("submitted-case-log")
  ).length;

  return {
    totalRules: normalized.rules.length,
    blockingCount,
    publicationModeCount: normalized.publicationModes.length,
    submittedCaseLogRuleCount,
    prototypeDefaultMode:
      normalized.publicationModes.find((mode) => mode.availability === "prototype-default") ||
      null
  };
}
