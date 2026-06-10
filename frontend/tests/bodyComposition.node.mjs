import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateBodyComposition,
  calculateNavyBodyFat,
  calculateRfmBodyFat
} from "../src/lib/bodyComposition.js";

const maleMeasurements = {
  height: 180,
  weight: 82,
  sex: "male",
  neckCircumference: 39,
  waistCircumference: 80,
  hipCircumference: 96,
  wristCircumference: 17,
  ankleCircumference: 23
};

const femaleMeasurements = {
  height: 166,
  weight: 64,
  sex: "female",
  neckCircumference: 32,
  waistCircumference: 70,
  hipCircumference: 100,
  wristCircumference: 15,
  ankleCircumference: 21
};

test("calculates Navy and RFM body-fat estimates", () => {
  assert.equal(calculateNavyBodyFat(maleMeasurements), 11);
  assert.equal(calculateRfmBodyFat(maleMeasurements), 19);
  assert.equal(calculateNavyBodyFat(femaleMeasurements), 27.5);
  assert.equal(calculateRfmBodyFat(femaleMeasurements), 28.6);
});

test("builds FFMI and male frame-potential context", () => {
  const composition = calculateBodyComposition(maleMeasurements);

  assert.equal(composition.bodyFatAverage, 15);
  assert.equal(composition.ffmi.leanMassKg, 69.7);
  assert.equal(composition.ffmi.ffmi, 21.5);
  assert.equal(composition.ffmi.normalizedFfmi, 21.5);
  assert.equal(composition.potential.eligible, true);
  assert.equal(composition.potential.leanMassPotentialKg, 82.3);
  assert.equal(composition.potential.remainingLeanMassKg, 12.6);
  assert.equal(composition.potential.potentialFfmi, 25.4);
});

test("flags the Casey Butt-style potential estimate as male-only", () => {
  const composition = calculateBodyComposition(femaleMeasurements);

  assert.equal(composition.bodyFatAverage, 28.1);
  assert.equal(composition.potential.eligible, false);
  assert.match(composition.potential.note, /male-only/i);
});
