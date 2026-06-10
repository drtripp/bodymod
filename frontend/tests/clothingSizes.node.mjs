import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_CLOTHING_SIZE_TABLES,
  estimateClothingSizes
} from "../src/lib/clothingSizes.js";

const defaultMeasurements = {
  sex: "male",
  nippleCircumference: 96,
  waistCircumference: 80,
  pantWaistCircumference: 86,
  hipCircumference: 96,
  headCircumference: 57,
  wristCircumference: 17
};

function estimateById(measurements) {
  return Object.fromEntries(
    estimateClothingSizes(measurements, DEFAULT_CLOTHING_SIZE_TABLES).map((estimate) => [
      estimate.id,
      estimate
    ])
  );
}

test("maps default male measurements to generic fit bands", () => {
  const estimates = estimateById(defaultMeasurements);

  assert.equal(estimates.shirt.value, "US M / EU 48 / UK 38");
  assert.equal(estimates.pants.value, "US W34 / EU 50 / UK W34");
  assert.equal(estimates.hat.value, "US 7 1/8 / EU 57 / UK 7");
  assert.equal(estimates.ring.value, "US 7 / EU 54 / UK N");
  assert.equal(estimates.ring.confidence, "low");
});

test("maps female waist and hip proxy bands for pants and dresses", () => {
  const estimates = estimateById(
    {
      sex: "female",
      nippleCircumference: 88,
      waistCircumference: 70,
      pantWaistCircumference: 77,
      hipCircumference: 100,
      headCircumference: 55,
      wristCircumference: 15
    }
  );

  assert.equal(estimates.shirt.value, "US S / EU 36 / UK 8");
  assert.equal(estimates.pants.value, "US 10 / EU 42 / UK 14");
  assert.equal(estimates.dress.value, "US 10 / EU 42 / UK 14");
});

test("clamps out-of-table values to the closest published scaffold band", () => {
  const estimates = estimateById(
    {
      sex: "male",
      nippleCircumference: 190,
      waistCircumference: 180,
      pantWaistCircumference: 190,
      hipCircumference: 200,
      headCircumference: 70,
      wristCircumference: 30
    }
  );

  assert.equal(estimates.shirt.value, "US XXL / EU 60 / UK 50");
  assert.equal(estimates.pants.value, "US W42 / EU 58 / UK W42");
  assert.equal(estimates.hat.value, "US 7 1/2 / EU 60 / UK 7 3/8");
  assert.equal(estimates.ring.value, "US 9 / EU 59 / UK R");
});
