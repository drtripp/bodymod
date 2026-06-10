import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMorphFrames,
  interpolateMeasurements
} from "../src/lib/comparison.js";

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
