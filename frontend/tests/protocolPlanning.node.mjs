import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEnergyProjection,
  buildPlanRetro,
  buildProjectedMeasurements,
  buildProtocolCaseLog,
  buildProtocolOutcomeSummary,
  formatProtocolSchemaSummary,
  protocolSnapshots,
  splitAffectedFields
} from "../src/lib/protocolPlanning.js";

const startingMeasurements = {
  height: 180,
  weight: 90,
  sex: "male",
  headCircumference: 57,
  neckCircumference: 39,
  biacromialWidth: 40,
  bideltoidWidth: 50,
  waistCircumference: 100,
  pantWaistCircumference: 104,
  hipCircumference: 106,
  bideltoidCircumference: 122,
  armpitCircumference: 100,
  nippleCircumference: 98,
  underbustCircumference: 94,
  upperThighCircumference: 60,
  midThighCircumference: 52,
  calfCircumference: 39,
  ankleCircumference: 24,
  bicepCircumference: 35,
  upperForearmCircumference: 29,
  wristCircumference: 17
};

const currentMeasurements = {
  ...startingMeasurements,
  weight: 87,
  waistCircumference: 95,
  hipCircumference: 105,
  bideltoidCircumference: 123
};

const protocol = {
  id: "protocol-1",
  label: "Calorie target with weekly trend review",
  category: "Diet",
  status: "active",
  dose: "300 kcal deficit",
  frequency: "daily",
  startDate: "2026-06-01",
  endDate: "2026-08-24",
  calorieDelta: -300,
  startingMeasurements,
  checkIns: [
    { score: 4, createdAt: "2026-06-08T12:00:00.000Z" },
    { score: 5, createdAt: "2026-06-15T12:00:00.000Z" }
  ]
};

const snapshots = [
  {
    id: "before",
    createdAt: "2026-05-20T12:00:00.000Z",
    measurements: { ...startingMeasurements, weight: 91 }
  },
  {
    id: "during",
    createdAt: "2026-06-15T12:00:00.000Z",
    measurements: currentMeasurements
  }
];

test("links snapshots to a protocol window and summarizes outcomes", () => {
  const linked = protocolSnapshots(protocol, snapshots);
  const outcome = buildProtocolOutcomeSummary(protocol, currentMeasurements, snapshots);

  assert.deepEqual(linked.map((snapshot) => snapshot.id), ["during"]);
  assert.equal(outcome.snapshotCount, 1);
  assert.equal(outcome.averageScore, 4.5);
  assert.ok(outcome.summary.includes("Weight -3.0 kg"));
});

test("builds conservative energy projections, retros, and case logs", () => {
  const projection = buildEnergyProjection(protocol, currentMeasurements);
  const retro = buildPlanRetro(protocol, currentMeasurements, snapshots);
  const caseLog = buildProtocolCaseLog(protocol, currentMeasurements, snapshots);

  assert.equal(projection.model, "NIDDK/Hall-inspired dynamic planning band");
  assert.equal(projection.dailyDelta, -300);
  assert.ok(projection.projectedDeltaKg < 0);
  assert.equal(retro.actualDeltaKg, -3);
  assert.match(retro.projectedBand, /kg/);
  assert.equal(caseLog.adherenceCount, 2);
  assert.match(caseLog.projectionSummary, /NIDDK/);
});

test("builds a projected silhouette measurement set for calorie-linked fields only", () => {
  const projected = buildProjectedMeasurements(protocol, currentMeasurements);

  assert.ok(projected);
  assert.equal(projected.measurements.height, startingMeasurements.height);
  assert.equal(projected.measurements.bideltoidCircumference, startingMeasurements.bideltoidCircumference);
  assert.ok(projected.measurements.weight < startingMeasurements.weight);
  assert.ok(projected.measurements.waistCircumference < startingMeasurements.waistCircumference);
  assert.ok(projected.measurements.pantWaistCircumference < startingMeasurements.pantWaistCircumference);
  assert.deepEqual(projected.adjustedFields, [
    "weight",
    "waistCircumference",
    "pantWaistCircumference"
  ]);
  assert.match(projected.note, /only calorie-linked weight and waist/);
});

test("formats protocol taxonomy and life-event field input", () => {
  const summary = formatProtocolSchemaSummary([
    { label: "Diet", doseFields: ["daily calories", "protein"] },
    { label: "Procedure", doseFields: ["event date", "affected fields"] }
  ]);

  assert.equal(summary, "Diet: daily calories, protein / Procedure: event date, affected fields");
  assert.deepEqual(splitAffectedFields("waistCircumference, hipCircumference"), [
    "waistCircumference",
    "hipCircumference"
  ]);
});
