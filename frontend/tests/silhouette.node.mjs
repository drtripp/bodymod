import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultMeasurements,
  measurementFields,
  validateMeasurements
} from "../src/lib/measurements.js";
import { silhouetteQaProfiles } from "../src/lib/silhouetteQaProfiles.js";
import {
  buildFrontSilhouette,
  buildSideSilhouette,
  buildSilhouette,
  silhouetteViewOptions
} from "../src/lib/silhouette.js";

const VIEW_BOX = {
  minX: 0,
  maxX: 240,
  minY: 0,
  maxY: 360
};

const expectedAnchorNames = measurementFields
  .filter((field) => field.type !== "select" && !["height", "weight"].includes(field.name))
  .map((field) => field.name)
  .sort();

function spanWidth(anchor) {
  return Number((anchor.right.x - anchor.left.x).toFixed(2));
}

function pathNumbers(path) {
  return (path.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
}

function assertPointInBounds(point, label) {
  assert.ok(Number.isFinite(point.x), `${label} x is finite`);
  assert.ok(Number.isFinite(point.y), `${label} y is finite`);
  assert.ok(point.x >= VIEW_BOX.minX, `${label} x is inside viewBox left edge`);
  assert.ok(point.x <= VIEW_BOX.maxX, `${label} x is inside viewBox right edge`);
  assert.ok(point.y >= VIEW_BOX.minY, `${label} y is inside viewBox top edge`);
  assert.ok(point.y <= VIEW_BOX.maxY, `${label} y is inside viewBox bottom edge`);
}

function assertPathInBounds(path, label) {
  const numbers = pathNumbers(path);

  assert.ok(path.length > 20, `${label} path has drawing data`);
  assert.equal(numbers.length % 2, 0, `${label} path has paired coordinates`);

  for (const value of numbers) {
    assert.ok(Number.isFinite(value), `${label} path coordinates are finite`);
  }

  for (let index = 0; index < numbers.length; index += 2) {
    assertPointInBounds({ x: numbers[index], y: numbers[index + 1] }, `${label} path point ${index / 2}`);
  }
}

function assertHeadInBounds(head, label) {
  if (head.path) {
    assertPathInBounds(head.path, `${label} head`);
    return;
  }

  assertPointInBounds({ x: head.cx - head.r, y: head.cy - head.r }, `${label} head upper-left`);
  assertPointInBounds({ x: head.cx + head.r, y: head.cy + head.r }, `${label} head lower-right`);
}

function assertAnchorsInBounds(anchors, label) {
  assert.deepEqual(Object.keys(anchors).sort(), expectedAnchorNames, `${label} exposes every measurable anchor`);

  for (const [name, anchor] of Object.entries(anchors)) {
    assertPointInBounds(anchor.left, `${label} ${name} left anchor`);
    assertPointInBounds(anchor.right, `${label} ${name} right anchor`);
    assert.ok(spanWidth(anchor) > 0, `${label} ${name} anchor has width`);
    assert.ok(
      Math.abs(anchor.left.y - anchor.right.y) < 0.01,
      `${label} ${name} anchor endpoints share a band`
    );
  }
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

test("real-world QA profiles are schema-valid full measurement records", () => {
  const ids = new Set(silhouetteQaProfiles.map((profile) => profile.id));

  assert.equal(silhouetteQaProfiles.length, 10);
  assert.equal(ids.size, silhouetteQaProfiles.length);

  for (const profile of silhouetteQaProfiles) {
    assert.deepEqual(validateMeasurements(profile.measurements), {}, `${profile.id} validates`);

    for (const field of measurementFields) {
      assert.ok(
        Object.hasOwn(profile.measurements, field.name),
        `${profile.id} includes ${field.name}`
      );
    }
  }
});

test("renders real-world QA profiles inside the SVG viewBox for both projections", () => {
  for (const profile of silhouetteQaProfiles) {
    const front = buildSilhouette(profile.measurements, "front");
    const side = buildSilhouette(profile.measurements, "side");

    assert.notEqual(front.path, side.path, `${profile.id} front and side paths differ`);

    for (const [view, silhouette] of [
      ["front", front],
      ["side", side]
    ]) {
      const label = `${profile.id} ${view}`;

      assertPathInBounds(silhouette.path, label);
      assertHeadInBounds(silhouette.head, label);
      assertAnchorsInBounds(silhouette.anchors, label);
    }
  }
});

test("real-world QA profiles preserve expected relative shape signals", () => {
  const profileById = Object.fromEntries(
    silhouetteQaProfiles.map((profile) => [profile.id, profile])
  );
  const highBmi = buildFrontSilhouette(profileById["high-bmi-central-mass"].measurements);
  const lean = buildFrontSilhouette(profileById["endurance-lean"].measurements);
  const upperBody = buildFrontSilhouette(profileById["upper-body-dominant"].measurements);
  const lowerBody = buildFrontSilhouette(profileById["lower-body-dominant"].measurements);
  const curvySide = buildSideSilhouette(profileById["waist-hip-curvy"].measurements);
  const narrowSide = buildSideSilhouette(profileById["narrow-frame-lean"].measurements);

  assert.ok(
    spanWidth(highBmi.anchors.waistCircumference) >
      spanWidth(lean.anchors.waistCircumference),
    "higher central mass profile renders a wider front waist than lean profile"
  );
  assert.ok(
    spanWidth(upperBody.anchors.bideltoidWidth) >
      spanWidth(lowerBody.anchors.bideltoidWidth),
    "upper-body dominant profile renders broader deltoids than lower-body dominant profile"
  );
  assert.ok(
    spanWidth(lowerBody.anchors.hipCircumference) >
      spanWidth(upperBody.anchors.hipCircumference),
    "lower-body dominant profile renders wider hips than upper-body dominant profile"
  );
  assert.ok(
    spanWidth(curvySide.anchors.hipCircumference) >
      spanWidth(narrowSide.anchors.hipCircumference),
    "curvy profile renders greater side hip depth than narrow-frame profile"
  );
});
