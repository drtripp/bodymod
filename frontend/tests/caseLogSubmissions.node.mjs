import assert from "node:assert/strict";
import test from "node:test";

import {
  assertCaseLogSubmissionPublicSafe,
  buildCaseLogSubmission,
  caseLogSubmissionStatusLine
} from "../src/lib/caseLogSubmissions.js";

const generatedCaseLog = {
  protocolId: "protocol-1",
  label: "Progressive resistance training",
  strategyName: "Calorie surplus with resistance training",
  category: "training",
  status: "archived",
  dose: "Four lifting sessions weekly",
  frequency: "12 weeks",
  window: "2026-01-01 - 2026-03-26",
  adherenceCount: 11,
  averageScore: 4.2,
  snapshotCount: 4,
  outcomeSummary: "Weight +3.0 kg, Waist +1.0 cm",
  projectionSummary: "NIDDK/Hall 2011 linearized planning band: +2.4 kg",
  measurements: { waistCircumference: 84 },
  accountId: "local-account",
  syncToken: "mock-sync-token",
  note: "private note"
};

test("builds a review-safe case-log submission envelope", () => {
  const submission = buildCaseLogSubmission(generatedCaseLog, {
    createdAt: "2026-06-13T12:00:00.000Z"
  });
  const serialized = JSON.stringify(submission);

  assert.equal(submission.consent, true);
  assert.equal(submission.submitterContext, "local-browser-account");
  assert.equal(submission.caseLog.reviewStatus, "queued-for-moderation");
  assert.equal(submission.caseLog.sourceType, "user-submitted local protocol");
  assert.equal(submission.caseLog.adherenceCount, 11);
  assert.equal(submission.caseLog.averageScore, 4.2);
  assert.match(submission.caseLog.limitations.join(" "), /not public until reviewed/);
  assert.doesNotMatch(
    serialized,
    /measurements|waistCircumference|accountId|mason@example\.com|syncToken|private note/
  );
});

test("rejects public fields that include private identifiers", () => {
  assert.throws(
    () => buildCaseLogSubmission({ ...generatedCaseLog, label: "Mason mason@example.com" }),
    /private account/
  );
  assert.throws(
    () =>
      assertCaseLogSubmissionPublicSafe({
        caseLog: {
          outcomeSummary: "waistCircumference raw field leaked"
        }
      }),
    /private account/
  );
});

test("formats queued submission status metadata", () => {
  assert.equal(
    caseLogSubmissionStatusLine({
      submissionId: "cls_abc123",
      reviewStatus: "queued-for-moderation"
    }),
    "cls_abc123 / queued-for-moderation"
  );
});
