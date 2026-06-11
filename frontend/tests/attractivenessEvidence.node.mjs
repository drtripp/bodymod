import assert from "node:assert/strict";
import { test } from "node:test";
import {
  evidenceForGoal,
  evidenceSourceSummary,
  fallbackAttractivenessEvidence,
  normalizeAttractivenessEvidence,
  verdictLabel
} from "../src/lib/attractivenessEvidence.js";

const library = {
  version: 1,
  reference: "Test evidence seed.",
  notes: ["Population averages only."],
  sources: [
    {
      id: "study-1",
      title: "Replicated ratio study",
      year: 2004,
      url: "https://example.test/study-1",
      sourceType: "peer-reviewed",
      reviewStatus: "reviewed"
    }
  ],
  metrics: [
    {
      id: "whr",
      label: "WHR context",
      category: "Body",
      goalPresetIds: ["waist-hip-ratio"],
      metricKeys: ["waistCircumference", "hipCircumference"],
      verdict: "ship-reference",
      evidenceStrength: "replicated but nuanced",
      populationReference: "Population-level context.",
      userFacingSummary: "Use WHR as context, not a personal ideal.",
      framing: "Reference only.",
      sourceIds: ["study-1"],
      requiresHumanReview: true,
      notes: []
    },
    {
      id: "unsupported",
      label: "Unsupported face ratios",
      category: "Face",
      goalPresetIds: ["face-measurements"],
      metricKeys: [],
      verdict: "do-not-ship",
      evidenceStrength: "contested",
      populationReference: "Unsupported.",
      userFacingSummary: "Do not turn this into a goal.",
      framing: "Safety rail.",
      sourceIds: [],
      requiresHumanReview: true,
      notes: []
    }
  ]
};

test("normalizes attractiveness evidence and filters by goal", () => {
  const normalized = normalizeAttractivenessEvidence(library);
  const whr = evidenceForGoal(normalized, "waist-hip-ratio");
  const face = evidenceForGoal(normalized, "face-measurements");

  assert.equal(normalized.metrics.length, 2);
  assert.equal(whr.length, 1);
  assert.equal(whr[0].id, "whr");
  assert.equal(face[0].verdict, "do-not-ship");
  assert.equal(evidenceForGoal(normalized, "weekly-check-in").length, 0);
});

test("formats verdicts and source summaries without inventing targets", () => {
  const normalized = normalizeAttractivenessEvidence(library);
  const [metric] = evidenceForGoal(normalized, "waist-hip-ratio");

  assert.equal(verdictLabel(metric.verdict), "Reference only");
  assert.equal(verdictLabel("unknown"), "Needs research");
  assert.equal(evidenceSourceSummary(normalized, metric), "2004: Replicated ratio study");
  assert.doesNotMatch(metric.userFacingSummary, /you should|you must|your ideal/i);
});

test("provides conservative fallback evidence framing", () => {
  const fallback = normalizeAttractivenessEvidence(null);

  assert.equal(fallback.reference, fallbackAttractivenessEvidence.reference);
  assert.equal(fallback.metrics[0].requiresHumanReview, true);
  assert.equal(fallback.metrics[0].verdict, "needs-research");
});
