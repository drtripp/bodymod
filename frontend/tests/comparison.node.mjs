import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMeasurementBandDiff,
  buildMorphFrames,
  interpolateMeasurements
} from "../src/lib/comparison.js";
import { measurementFields } from "../src/lib/measurements.js";
import { silhouetteQaProfiles } from "../src/lib/silhouetteQaProfiles.js";

const current = {
  height: 180,
  weight: 82,
  sex: "male",
  waistCircumference: 80,
  bideltoidCircumference: 118
};

const target = {
  height: 178,
  weight: 71,
  sex: "female",
  waistCircumference: 76,
  bideltoidCircumference: 108
};

test("interpolates numeric measurements and switches categorical sex at midpoint", () => {
  const early = interpolateMeasurements(current, target, 0.25);
  const midpoint = interpolateMeasurements(current, target, 0.5);

  assert.equal(early.height, 179.5);
  assert.equal(early.weight, 79.3);
  assert.equal(early.sex, "male");
  assert.equal(midpoint.weight, 76.5);
  assert.equal(midpoint.sex, "female");
});

test("builds ordered morph frames from current to target", () => {
  const frames = buildMorphFrames(current, target, 3);

  assert.deepEqual(frames.map((frame) => frame.fraction), [0, 0.5, 1]);
  assert.equal(frames[0].measurements.weight, 82);
  assert.equal(frames[1].measurements.weight, 76.5);
  assert.equal(frames[2].measurements.weight, 71);
});

test("comparison variants handle real-world silhouette QA profile pairs", () => {
  const numericFields = measurementFields.filter((field) => field.type !== "select");
  const profilePairs = [
    ["compact-light-frame", "tall-broad-frame"],
    ["waist-hip-curvy", "narrow-frame-lean"],
    ["high-bmi-central-mass", "endurance-lean"],
    ["lower-body-dominant", "upper-body-dominant"],
    ["weight-loss-return", "transition-tracker"]
  ].map(([currentId, targetId]) => [
    silhouetteQaProfiles.find((profile) => profile.id === currentId),
    silhouetteQaProfiles.find((profile) => profile.id === targetId)
  ]);

  for (const [currentProfile, targetProfile] of profilePairs) {
    assert.ok(currentProfile, "current QA profile exists");
    assert.ok(targetProfile, "target QA profile exists");

    const frames = buildMorphFrames(
      currentProfile.measurements,
      targetProfile.measurements,
      5
    );
    const bands = buildMeasurementBandDiff(
      currentProfile.measurements,
      targetProfile.measurements
    );

    assert.deepEqual(frames.map((frame) => frame.fraction), [0, 0.25, 0.5, 0.75, 1]);
    assert.equal(frames[0].measurements.height, currentProfile.measurements.height);
    assert.equal(frames[4].measurements.height, targetProfile.measurements.height);
    assert.equal(frames[2].measurements.sex, targetProfile.measurements.sex);
    assert.equal(bands.length, 7);
    assert.equal(Math.max(...bands.map((band) => band.magnitudePercent)), 100);

    for (const frame of frames) {
      for (const field of numericFields) {
        assert.ok(
          Number.isFinite(Number(frame.measurements[field.name])),
          `${currentProfile.id} to ${targetProfile.id} ${field.name} stays numeric`
        );
      }
    }

    for (const band of bands) {
      assert.ok(Number.isFinite(band.currentValue), `${band.key} current value is finite`);
      assert.ok(Number.isFinite(band.baselineValue), `${band.key} target value is finite`);
      assert.ok(Number.isFinite(band.delta), `${band.key} delta is finite`);
      assert.ok(Number.isFinite(band.magnitudePercent), `${band.key} magnitude is finite`);
    }
  }
});
