import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProcedureCaseLog,
  buildProcedureReliabilityCheckIn,
  createProcedureRecord,
  fallbackProcedureLibrary,
  formatProcedureRecord,
  normalizeProcedureLibrary,
  procedureById,
  procedureHealingEndsAt
} from "../src/lib/procedures.js";

test("normalizes procedure library seed data with fallback records", () => {
  const normalized = normalizeProcedureLibrary({
    version: 2,
    reference: "test reference",
    notes: ["test note"],
    procedureTypes: [
      {
        id: "test-procedure",
        label: "Test procedure",
        category: "tattoo",
        defaultHealingDays: "14",
        affectedFields: "waistCircumference, hipCircumference",
        photoCategory: "body",
        timeline: [{ day: "7", label: "Review", summary: "Check notes." }]
      }
    ]
  });
  const fallback = normalizeProcedureLibrary(null);

  assert.equal(normalized.version, 2);
  assert.equal(normalized.procedureTypes[0].defaultHealingDays, 14);
  assert.deepEqual(normalized.procedureTypes[0].affectedFields, [
    "waistCircumference",
    "hipCircumference"
  ]);
  assert.equal(normalized.procedureTypes[0].timeline[0].day, 7);
  assert.ok(fallback.procedureTypes.length >= fallbackProcedureLibrary.procedureTypes.length);
  assert.equal(procedureById(normalized, "test-procedure").label, "Test procedure");
});

test("creates procedure records and derived reliability events", () => {
  const library = normalizeProcedureLibrary(fallbackProcedureLibrary);
  const template = procedureById(library, "orthognathic-or-jaw-surgery");
  const record = {
    id: "procedure-1",
    ...createProcedureRecord({
      template,
      procedureDate: "2026-06-01",
      healingDays: "90",
      affectedFields: "headCircumference, neckCircumference",
      note: "Side profile baseline saved.",
      baselineMeasurements: { height: 180, weight: 80 },
      snapshotCount: 2
    })
  };
  const checkIn = buildProcedureReliabilityCheckIn(record);

  assert.equal(record.label, "Jaw or orthognathic surgery");
  assert.equal(record.healingEndsAt, "2026-08-30");
  assert.equal(procedureHealingEndsAt(record), "2026-08-30");
  assert.equal(record.photoCategory, "face");
  assert.equal(checkIn.type, "life-event");
  assert.equal(checkIn.source, "procedure-tracker");
  assert.equal(checkIn.eventMode, "procedure");
  assert.equal(checkIn.durationDays, 90);
  assert.equal(checkIn.createdAt, "2026-06-01T12:00:00.000Z");
  assert.match(checkIn.note, /Procedure log: Jaw or orthognathic surgery/);
  assert.equal(formatProcedureRecord(record), "Jaw or orthognathic surgery / 2026-06-01 / 90 day window");
});

test("builds procedure case logs from snapshots and photo manifests", () => {
  const library = normalizeProcedureLibrary(fallbackProcedureLibrary);
  const template = procedureById(library, "large-tattoo-session");
  const record = {
    id: "procedure-2",
    ...createProcedureRecord({
      template,
      procedureDate: "2026-06-01",
      healingDays: "28",
      affectedFields: "bicepCircumference, calfCircumference",
      note: "Sleeve session."
    })
  };
  const caseLog = buildProcedureCaseLog(
    record,
    [
      { id: "before", createdAt: "2026-05-15T12:00:00.000Z" },
      { id: "during", createdAt: "2026-06-10T12:00:00.000Z" },
      { id: "after", createdAt: "2026-07-10T12:00:00.000Z" }
    ],
    [
      { id: "body", category: "body", createdAt: "2026-06-05T12:00:00.000Z" },
      { id: "face", category: "face", createdAt: "2026-06-05T12:00:00.000Z" }
    ]
  );

  assert.equal(caseLog.window, "2026-06-01 - 2026-06-29");
  assert.equal(caseLog.snapshotCount, 1);
  assert.equal(caseLog.photoCount, 1);
  assert.match(caseLog.summary, /bicepCircumference, calfCircumference paused for 28 day/);
  assert.equal(caseLog.reviewStatus, "fallback seed needs review");
});
