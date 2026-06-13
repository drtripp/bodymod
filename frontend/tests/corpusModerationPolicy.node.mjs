import assert from "node:assert/strict";
import test from "node:test";

import {
  corpusModerationPolicySummary,
  fallbackCorpusModerationPolicy,
  normalizeCorpusModerationPolicy
} from "../src/lib/corpusModerationPolicy.js";

test("normalizes corpus moderation policy modes and rules", () => {
  const policy = normalizeCorpusModerationPolicy({
    version: 2,
    source: "Review draft.",
    notes: ["metadata-only"],
    publicationModes: [
      {
        id: "private-review-only",
        label: "Private review-only queue",
        reviewStatus: "needs review",
        availability: "prototype-default",
        notes: ["No publication."]
      }
    ],
    rules: [
      {
        id: "case-log-publication",
        label: "Case-log publication review",
        category: "moderation",
        appliesTo: ["submitted-case-log", ""],
        reviewStatus: "needs review",
        blocking: true,
        decisionsRequired: ["Reviewer roles"],
        exclusionTriggers: ["Private data"],
        allowedCurrentScaffold: ["Queue only"],
        verification: ["npm run test:corpus-moderation"],
        docs: ["manual-work-queue.md#6-launch-privacy-and-moderation-approvals"]
      }
    ]
  });

  assert.equal(policy.version, 2);
  assert.equal(policy.publicationModes[0].availability, "prototype-default");
  assert.deepEqual(policy.rules[0].appliesTo, ["submitted-case-log"]);
  assert.equal(policy.rules[0].blocking, true);
});

test("summarizes blocking rules and prototype-default mode", () => {
  const summary = corpusModerationPolicySummary(fallbackCorpusModerationPolicy);

  assert.equal(summary.totalRules, 3);
  assert.equal(summary.blockingCount, 3);
  assert.equal(summary.publicationModeCount, 3);
  assert.equal(summary.submittedCaseLogRuleCount, 1);
  assert.equal(summary.prototypeDefaultMode.label, "Private review-only queue");
});

test("rejects malformed rules before rendering", () => {
  assert.throws(
    () =>
      normalizeCorpusModerationPolicy({
        publicationModes: [
          {
            id: "private-review-only",
            label: "Private review-only queue"
          }
        ],
        rules: [{ label: "Missing id" }]
      }),
    /needs id and label/
  );
});

test("fallback policy stays metadata-only", () => {
  const serialized = JSON.stringify(fallbackCorpusModerationPolicy);

  assert.doesNotMatch(
    serialized,
    /mason@example\.com|waistCircumference|accountId|syncToken|private note/i
  );
});
