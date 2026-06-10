import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildProgressReportHtml,
  buildProgressReportModel
} from "../src/lib/progressReport.js";

const measurements = {
  height: 181,
  weight: 86,
  sex: "male",
  waistCircumference: 86,
  bideltoidCircumference: 124,
  hipCircumference: 99
};

test("builds a printable progress report model and HTML", () => {
  const input = {
    account: { displayName: "Mason", email: "mason@example.com" },
    measurements,
    snapshots: [
      { id: "now", createdAt: "2026-06-08T10:00:00.000Z", measurements },
      {
        id: "base",
        createdAt: "2026-06-01T10:00:00.000Z",
        measurements: { ...measurements, weight: 87, waistCircumference: 88 }
      }
    ],
    goals: [{ label: "Improve shoulder-to-waist ratio", category: "Body", checkIns: [{}] }],
    protocols: [
      {
        label: "Progressive resistance training",
        status: "active",
        dose: "4-day split",
        frequency: "4/week",
        checkIns: [{ adherence: "on track" }, { adherence: "missed" }]
      }
    ],
    checkIns: [{ type: "daily-weight", createdAt: "2026-06-09T10:00:00.000Z", note: "Low sodium." }],
    workoutSessions: [
      {
        exerciseId: "lateral-raise",
        exerciseLabel: "Dumbbell lateral raise",
        loadKg: 8,
        volumeKg: 288
      }
    ],
    photos: [
      { id: "body", category: "body" },
      { id: "face", category: "face" }
    ]
  };
  const model = buildProgressReportModel(input);
  const html = buildProgressReportHtml(input);

  assert.equal(model.snapshotCount, 2);
  assert.equal(model.protocols[0].adherence.checkIns, 2);
  assert.equal(model.protocols[0].adherence.onTrack, 1);
  assert.equal(model.workoutPrs[0].exerciseLabel, "Dumbbell lateral raise");
  assert.match(html, /bodymod progress report/);
  assert.match(html, /Mason/);
  assert.match(html, /Progressive resistance training/);
  assert.match(html, /Photo manifest/);
});
