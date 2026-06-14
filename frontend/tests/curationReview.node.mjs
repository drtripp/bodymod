import assert from "node:assert/strict";
import test from "node:test";

import {
  curationReviewSummary,
  fallbackCurationReviewLibrary,
  normalizeCurationReviewLibrary
} from "../src/lib/curationReview.js";

test("normalizes curation review packets and counts blockers", () => {
  const library = normalizeCurationReviewLibrary({
    version: 2,
    source: "test curation packets",
    notes: ["metadata only"],
    packets: [
      {
        id: "strategy-corpus-source-review",
        label: "Strategy corpus source review",
        category: "strategy-corpus",
        status: "human-review-required",
        blocking: true,
        owner: "Dawson",
        launchGateIds: ["strategy-corpus-v1"],
        inputRequired: ["Prioritized outcome list"],
        seedFiles: ["backend/app/data/strategy_corpus.seed.json"],
        reviewerQuestions: ["Which outcomes ship first?"],
        acceptanceCriteria: ["Every strategy has source metadata."],
        currentScaffold: ["Strategy explorer"],
        verification: ["npm run test:corpus"],
        docs: ["manual-work-queue.md#1-source-reviewed-strategy-corpus"],
        metadataOnly: true
      },
      {
        id: "target-profile-curation",
        label: "Target profiles",
        category: "target-profiles",
        status: "completed",
        blocking: false,
        owner: "Dawson",
        launchGateIds: ["production-target-profiles"],
        inputRequired: ["Target library scope"],
        seedFiles: ["backend/app/data/targets.seed.json"],
        reviewerQuestions: ["Generic or named targets?"],
        acceptanceCriteria: ["Every target has uncertainty notes."],
        currentScaffold: ["Target filters"],
        verification: ["python -m pytest"],
        docs: ["manual-work-queue.md#2-production-target-profiles"],
        metadataOnly: true
      }
    ]
  });

  assert.equal(library.version, 2);
  assert.equal(library.packets.length, 2);
  assert.equal(library.packets[0].blocking, true);
  assert.deepEqual(library.packets[0].seedFiles, ["backend/app/data/strategy_corpus.seed.json"]);

  const summary = curationReviewSummary(library);
  assert.equal(summary.totalCount, 2);
  assert.equal(summary.blockingCount, 1);
  assert.equal(summary.completedCount, 1);
  assert.equal(summary.openCount, 1);
  assert.equal(summary.seedFileCount, 2);
  assert.equal(summary.metadataOnlyCount, 2);
  assert.equal(summary.ready, false);
});

test("falls back to a blocking curation packet when payload is empty", () => {
  const library = normalizeCurationReviewLibrary({});
  const summary = curationReviewSummary(library);

  assert.equal(library.packets[0].id, "curation-review-unavailable");
  assert.equal(summary.totalCount, 1);
  assert.equal(summary.blockingCount, 1);
  assert.equal(summary.ready, false);
});

test("fallback curation review library stays metadata-only", () => {
  const serialized = JSON.stringify(fallbackCurationReviewLibrary);

  assert.match(serialized, /metadata/i);
  assert.doesNotMatch(
    serialized,
    /waistCircumference|syncToken|mason@example\.com|data:image|private note/
  );
});
