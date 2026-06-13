const forbiddenSubmissionPatterns = [
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,
  /\b(accountId|sessionToken|syncToken|accessToken|measurements|waistCircumference|hipCircumference|private note)\b/i
];

function text(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeLimitations(value) {
  return Array.isArray(value)
    ? value.map((item) => text(item)).filter(Boolean).slice(0, 6)
    : [];
}

export function assertCaseLogSubmissionPublicSafe(payload) {
  const serialized = JSON.stringify(payload);
  if (forbiddenSubmissionPatterns.some((pattern) => pattern.test(serialized))) {
    throw new Error("Case-log submission includes private account or measurement payload data.");
  }
  return payload;
}

export function buildCaseLogSubmission(caseLog = {}, options = {}) {
  const payload = {
    caseLog: {
      protocolId: text(caseLog.protocolId || caseLog.id, "local-protocol"),
      label: text(caseLog.label, "Local protocol case log"),
      strategyName: text(caseLog.strategyName || caseLog.label, "Local protocol"),
      category: text(caseLog.category, "unspecified"),
      status: text(caseLog.status, "open"),
      dose: text(caseLog.dose, "Not captured."),
      frequency: text(caseLog.frequency, "Not captured."),
      window: text(caseLog.window, "open"),
      adherenceCount: Math.max(0, Math.round(number(caseLog.adherenceCount))),
      averageScore:
        caseLog.averageScore === null || caseLog.averageScore === undefined
          ? null
          : Math.min(5, Math.max(0, number(caseLog.averageScore))),
      snapshotCount: Math.max(0, Math.round(number(caseLog.snapshotCount))),
      outcomeSummary: text(caseLog.outcomeSummary, "No outcome summary captured."),
      projectionSummary: text(caseLog.projectionSummary, "No defensible projection configured."),
      sourceType: "user-submitted local protocol",
      reviewStatus: "queued-for-moderation",
      limitations: [
        ...safeLimitations(caseLog.limitations),
        "Self-logged n=1 report; not evidence of a general effect.",
        "Submitted for moderation and not public until reviewed.",
        "No account ID, photos, or raw measurement fields included."
      ].slice(0, 6)
    },
    consent: true,
    submitterContext: "local-browser-account",
    createdAt: text(options.createdAt, new Date().toISOString())
  };

  return assertCaseLogSubmissionPublicSafe(payload);
}

export function caseLogSubmissionStatusLine(response = {}) {
  const id = text(response.submissionId, "queued");
  const status = text(response.reviewStatus || response.status, "queued-for-moderation");
  return `${id} / ${status}`;
}
