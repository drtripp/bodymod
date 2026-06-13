import assert from "node:assert/strict";
import test from "node:test";

import {
  fallbackLaunchReadiness,
  launchReadinessSummary,
  normalizeLaunchReadiness
} from "../src/lib/launchReadiness.js";

test("normalizes launch-readiness gates and counts blockers", () => {
  const readiness = normalizeLaunchReadiness({
    version: 2,
    source: "Manual gate seed.",
    notes: ["No account data."],
    gates: [
      {
        id: "strategy",
        label: "Strategy corpus",
        category: "content",
        status: "human-review-required",
        blocking: true,
        owner: "Dawson",
        evidenceRequired: ["Reviewed sources"],
        currentScaffold: ["seed"],
        verification: ["npm run test:corpus"],
        docs: ["manual-work-queue.md"]
      },
      {
        id: "removed",
        label: "Removed scope",
        status: "removed-from-scope",
        blocking: false
      }
    ]
  });
  const summary = launchReadinessSummary(readiness);

  assert.equal(readiness.version, 2);
  assert.equal(readiness.gates[0].label, "Strategy corpus");
  assert.equal(readiness.gates[1].category, "launch");
  assert.equal(summary.totalCount, 2);
  assert.equal(summary.blockingCount, 1);
  assert.equal(summary.ready, false);
});

test("falls back to a blocking launch gate when payload is empty", () => {
  const readiness = normalizeLaunchReadiness({});
  const summary = launchReadinessSummary(readiness);

  assert.equal(readiness.source, fallbackLaunchReadiness.source);
  assert.equal(readiness.gates[0].id, "launch-readiness-unavailable");
  assert.equal(summary.blockingCount, 1);
});
