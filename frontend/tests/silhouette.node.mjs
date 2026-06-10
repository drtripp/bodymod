import assert from "node:assert/strict";
import test from "node:test";
import { defaultMeasurements } from "../src/lib/measurements.js";
import {
  buildFrontSilhouette,
  buildSideSilhouette,
  buildSilhouette,
  silhouetteViewOptions
} from "../src/lib/silhouette.js";

function spanWidth(anchor) {
  return Number((anchor.right.x - anchor.left.x).toFixed(2));
}

test("builds distinct front and side silhouettes with usable anchors", () => {
  const front = buildFrontSilhouette(defaultMeasurements);
  const side = buildSideSilhouette(defaultMeasurements);

  assert.notEqual(front.path, side.path);
  assert.equal(side.view, "side");
  assert.equal(buildSilhouette(defaultMeasurements, "side").path, side.path);
  assert.equal(buildSilhouette(defaultMeasurements, "unknown").path, front.path);
  assert.deepEqual(
    silhouetteViewOptions.map((option) => option.id),
    ["front", "side"]
  );
  assert.ok(spanWidth(side.anchors.waistCircumference) > 8);
  assert.ok(spanWidth(side.anchors.headCircumference) > 20);
});

test("side projection depth responds to circumference relative to width", () => {
  const slimWaist = buildSideSilhouette({
    ...defaultMeasurements,
    waistCircumference: 68
  });
  const largerWaist = buildSideSilhouette({
    ...defaultMeasurements,
    waistCircumference: 112
  });
  const sameWaistNarrowFrame = buildSideSilhouette({
    ...defaultMeasurements,
    waistCircumference: 96,
    biacromialWidth: 32
  });
  const sameWaistBroadFrame = buildSideSilhouette({
    ...defaultMeasurements,
    waistCircumference: 96,
    biacromialWidth: 58
  });

  assert.ok(
    spanWidth(largerWaist.anchors.waistCircumference) >
      spanWidth(slimWaist.anchors.waistCircumference)
  );
  assert.ok(
    spanWidth(sameWaistNarrowFrame.anchors.waistCircumference) >
      spanWidth(sameWaistBroadFrame.anchors.waistCircumference)
  );
});
