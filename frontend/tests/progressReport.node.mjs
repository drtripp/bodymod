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
        calorieDelta: -300,
        startingMeasurements: measurements,
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
    procedures: [
      {
        id: "procedure-1",
        label: "Large tattoo session",
        category: "tattoo",
        procedureDate: "2026-06-08",
        healingDays: 28,
        affectedFields: ["bicepCircumference"],
        photoCategory: "body",
        reviewStatus: "needs artist review",
        note: "Upper arm placement."
      }
    ],
    bloodworkResults: [
      {
        id: "blood-1",
        markerId: "ldl-c",
        markerLabel: "LDL-C",
        value: 92,
        unit: "mg/dL",
        collectedAt: "2026-06-09",
        rangeStatus: "in-range",
        note: "Fasting draw."
      },
      {
        id: "blood-0",
        markerId: "ldl-c",
        markerLabel: "LDL-C",
        value: 100,
        unit: "mg/dL",
        collectedAt: "2026-05-09",
        rangeStatus: "in-range"
      }
    ],
    photos: [
      { id: "body", category: "body", createdAt: "2026-06-09T10:00:00.000Z" },
      { id: "face", category: "face" }
    ],
    faceMeasurements: [
      {
        id: "face-scan",
        source: "photo",
        note: "Neutral expression.",
        metrics: [
          {
            id: "midfaceRatio",
            label: "Midface ratio",
            displayValue: "0.80"
          },
          {
            id: "canthalTiltDeg",
            label: "Canthal tilt",
            displayValue: "9.5 deg"
          }
        ]
      }
    ]
  };
  const model = buildProgressReportModel(input);
  const html = buildProgressReportHtml(input);

  assert.equal(model.snapshotCount, 2);
  assert.equal(model.protocols[0].adherence.checkIns, 2);
  assert.equal(model.protocols[0].adherence.onTrack, 1);
  assert.equal(model.protocolCaseLogs[0].label, "Progressive resistance training");
  assert.equal(model.procedureCaseLogs[0].label, "Large tattoo session");
  assert.equal(model.procedureCaseLogs[0].photoCount, 1);
  assert.equal(model.bloodworkTrends[0].markerLabel, "LDL-C");
  assert.equal(model.bloodworkTrends[0].delta, -8);
  assert.equal(model.workoutPrs[0].exerciseLabel, "Dumbbell lateral raise");
  assert.equal(model.faceMeasurements.length, 1);
  assert.match(html, /bodymod progress report/);
  assert.match(html, /Mason/);
  assert.match(html, /Progressive resistance training/);
  assert.match(html, /Protocol case logs/);
  assert.match(html, /Procedure case logs/);
  assert.match(html, /Large tattoo session/);
  assert.match(html, /Bloodwork/);
  assert.match(html, /LDL-C/);
  assert.match(html, /Photo manifest/);
  assert.match(html, /Face measurements/);
  assert.match(html, /Midface ratio: 0.80/);
});
