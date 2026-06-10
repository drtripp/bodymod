import assert from "node:assert/strict";
import test from "node:test";

import sharedSchema from "../../shared/measurement_schema.json" with { type: "json" };
import {
  defaultMeasurements,
  measurementCategories,
  measurementFields,
  measurementSchema,
  normalizeMeasurements,
  validateMeasurements
} from "../src/lib/measurements.js";

test("frontend measurement exports come from the shared schema", () => {
  assert.equal(measurementSchema, sharedSchema);
  assert.deepEqual(measurementCategories, sharedSchema.categories);
  assert.deepEqual(measurementFields, sharedSchema.fields);
});

test("shared defaults hydrate the frontend default measurement set", () => {
  assert.deepEqual(defaultMeasurements, {
    ...sharedSchema.defaults,
    ...sharedSchema.defaultsBySex[sharedSchema.defaults.sex]
  });

  assert.equal(normalizeMeasurements({ sex: "female" }).hipCircumference, 100);
  assert.equal(normalizeMeasurements({ sex: "male" }).bicepCircumference, 34);
});

test("shared bounds drive frontend validation messages", () => {
  const belowHeight = validateMeasurements({
    ...defaultMeasurements,
    height: sharedSchema.fields.find((field) => field.name === "height").min - 1
  });

  assert.match(belowHeight.height, /Expected 120-240 cm/);
});
