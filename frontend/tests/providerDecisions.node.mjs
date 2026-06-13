import assert from "node:assert/strict";
import test from "node:test";

import {
  fallbackProviderDecisionLibrary,
  normalizeProviderDecisionLibrary,
  providerDecisionSummary
} from "../src/lib/providerDecisions.js";

test("normalizes provider decisions and counts blockers", () => {
  const library = normalizeProviderDecisionLibrary({
    version: 2,
    source: "Provider matrix.",
    notes: ["No account data."],
    decisions: [
      {
        id: "analytics",
        label: "Analytics",
        category: "privacy",
        status: "provider-decision-required",
        blocking: true,
        owner: "Dawson",
        launchGateIds: ["launch-privacy-moderation"],
        decisionNeeded: ["Approve provider"],
        privacyRequirements: ["No measurements"],
        currentScaffold: ["sink"],
        verification: ["npm run test:analytics"],
        docs: ["manual-work-queue.md"],
        candidates: [
          {
            id: "disabled",
            label: "Disabled",
            providerType: "scope-decision",
            reviewStatus: "review before production",
            recommendedForPrototype: true,
            metadataOnly: true,
            notes: ["Default"]
          },
          {
            id: "hosted",
            label: "Hosted provider",
            providerType: "external",
            reviewStatus: "needs review",
            metadataOnly: true
          }
        ]
      },
      {
        id: "removed",
        label: "Removed scope",
        status: "removed-from-scope",
        blocking: false,
        candidates: []
      }
    ]
  });
  const summary = providerDecisionSummary(library);

  assert.equal(library.version, 2);
  assert.equal(library.decisions[0].label, "Analytics");
  assert.equal(library.decisions[1].category, "provider");
  assert.equal(library.decisions[0].candidates[0].metadataOnly, true);
  assert.equal(summary.totalCount, 2);
  assert.equal(summary.blockingCount, 1);
  assert.equal(summary.candidateCount, 2);
  assert.equal(summary.prototypeCandidateCount, 1);
  assert.equal(summary.ready, false);
});

test("falls back to a blocking provider decision when payload is empty", () => {
  const library = normalizeProviderDecisionLibrary({});
  const summary = providerDecisionSummary(library);

  assert.equal(library.source, fallbackProviderDecisionLibrary.source);
  assert.equal(library.decisions[0].id, "provider-decisions-unavailable");
  assert.equal(summary.blockingCount, 1);
});
