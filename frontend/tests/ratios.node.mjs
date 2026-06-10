import assert from "node:assert/strict";
import test from "node:test";
import { calculateRatios } from "../src/lib/ratios.js";

test("calculates waist-to-height ratio alongside body proportion ratios", () => {
  const ratios = calculateRatios({
    height: 180,
    weight: 82,
    sex: "male",
    neckCircumference: 39,
    waistCircumference: 80,
    hipCircumference: 96,
    wristCircumference: 17,
    ankleCircumference: 23,
    bideltoidCircumference: 118
  });
  const byId = Object.fromEntries(ratios.map((ratio) => [ratio.id, ratio]));

  assert.equal(byId.waistHeight.label, "WHTR");
  assert.equal(byId.waistHeight.value, 0.44);
  assert.equal(byId.waistHeight.note, "Waist-to-height ratio");
  assert.equal(byId.waistHip.value, 0.83);
  assert.equal(byId.bodyFat.value, 15);
  assert.equal(byId.bodyFat.note, "Average of Navy and RFM circumference estimates");
});
