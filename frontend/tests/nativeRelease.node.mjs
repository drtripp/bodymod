import assert from "node:assert/strict";
import test from "node:test";

import {
  fallbackNativeReleaseChecklist,
  nativeReleaseSummary,
  normalizeNativeReleaseChecklist
} from "../src/lib/nativeRelease.js";

test("normalizes native release readiness items and counts blockers", () => {
  const checklist = normalizeNativeReleaseChecklist({
    version: 2,
    source: "Native release test seed.",
    notes: ["metadata-only"],
    items: [
      {
        id: "generated-native-projects",
        label: "Generated native projects",
        category: "project-bootstrap",
        status: "native-project-required",
        blocking: true,
        owner: "Dawson",
        platforms: ["ios", "android"],
        launchGateIds: ["native-release-readiness"],
        releaseRequirement: "Generate projects.",
        decisionsRequired: ["Bundle IDs"],
        currentScaffold: ["capacitor.config.json"],
        validationSteps: ["Open projects."],
        verification: ["npm run test:native-release"],
        docs: ["manual-work-queue.md#6-launch-privacy-and-moderation-approvals"],
        metadataOnly: true
      },
      {
        id: "completed-web-shell",
        label: "Completed web shell",
        category: "web",
        status: "completed",
        blocking: false,
        owner: "Dawson",
        platforms: ["web"],
        launchGateIds: ["native-release-readiness"],
        releaseRequirement: "Already done.",
        decisionsRequired: ["None"],
        validationSteps: ["Build"],
        verification: ["npm run build"],
        docs: ["manual-work-queue.md#6-launch-privacy-and-moderation-approvals"]
      }
    ]
  });
  const summary = nativeReleaseSummary(checklist);

  assert.equal(checklist.version, 2);
  assert.equal(checklist.items[0].label, "Generated native projects");
  assert.equal(checklist.items[1].metadataOnly, true);
  assert.equal(summary.totalCount, 2);
  assert.equal(summary.blockingCount, 1);
  assert.equal(summary.platformCounts.ios, 1);
  assert.equal(summary.platformCounts.android, 1);
  assert.equal(summary.platformCounts.web, 1);
});

test("falls back to a blocking native release item when payload is empty", () => {
  const checklist = normalizeNativeReleaseChecklist({});
  const summary = nativeReleaseSummary(checklist);

  assert.equal(checklist.source, fallbackNativeReleaseChecklist.source);
  assert.equal(checklist.items[0].id, "native-release-unavailable");
  assert.equal(summary.blockingCount, 1);
  assert.equal(summary.platformCounts.ios, 1);
  assert.equal(summary.platformCounts.android, 1);
});

test("fallback native release checklist stays metadata-only", () => {
  const serialized = JSON.stringify(fallbackNativeReleaseChecklist);

  assert.doesNotMatch(
    serialized,
    /waistCircumference|mason@example\.com|syncToken|APNS_PRIVATE_KEY|GOOGLE_PLAY_SERVICE_ACCOUNT/i
  );
});
