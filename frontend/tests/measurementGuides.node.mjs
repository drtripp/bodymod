import assert from "node:assert/strict";
import test from "node:test";
import {
  getDefaultMeasurementGuideField,
  indexMeasurementGuides,
  normalizeMeasurementGuideLibrary,
  publicMeasurementGuidePath
} from "../src/lib/measurementGuides.js";

test("normalizes measurement guide libraries to known schema fields", () => {
  const library = normalizeMeasurementGuideLibrary({
    version: "2",
    reference: " Dummy guide copy ",
    notes: [" keep tape level ", ""],
    guides: [
      {
        field: "waistCircumference",
        label: "Waist",
        cadence: "weekly",
        illustration: "waist-tape",
        summary: "Narrowest relaxed torso circumference.",
        steps: ["Find the narrowest relaxed point.", "Keep tape level."],
        commonMistakes: ["pulling tape into skin", ""]
      },
      {
        field: "ankleCircumference",
        label: "Ankle",
        cadence: "monthly",
        illustration: "ankle-tape",
        summary: "Narrowest point above ankle bones.",
        steps: ["Wrap tape just above the ankle bones."]
      },
      {
        field: "unknownField",
        label: "Unknown",
        cadence: "weekly",
        steps: ["This should be filtered out."]
      },
      {
        field: "height",
        label: "Height",
        cadence: "monthly",
        steps: []
      }
    ]
  });

  assert.equal(library.version, 2);
  assert.equal(library.reference, "Dummy guide copy");
  assert.deepEqual(library.notes, ["keep tape level"]);
  assert.equal(library.guides.length, 2);
  assert.equal(library.guides[0].field, "waistCircumference");
  assert.deepEqual(library.guides[0].commonMistakes, ["pulling tape into skin"]);
  assert.equal(library.guides[1].field, "ankleCircumference");
});

test("indexes guides and resolves the default field", () => {
  const library = {
    version: 1,
    guides: [
      {
        field: "bideltoidCircumference",
        label: "Bideltoid circumference",
        cadence: "weekly",
        illustration: "shoulder-loop",
        summary: "Tape around shoulders.",
        steps: ["Wrap tape at the widest deltoid line."]
      },
      {
        field: "waistCircumference",
        label: "Waist",
        cadence: "weekly",
        illustration: "waist-tape",
        summary: "Narrowest relaxed torso.",
        steps: ["Measure after a normal exhale."]
      }
    ]
  };

  const index = indexMeasurementGuides(library);

  assert.equal(index.bideltoidCircumference.label, "Bideltoid circumference");
  assert.equal(getDefaultMeasurementGuideField(library), "waistCircumference");
  assert.equal(
    getDefaultMeasurementGuideField({ guides: [library.guides[0]] }),
    "bideltoidCircumference"
  );
});

test("resolves public measurement guide routes for SEO pages", () => {
  assert.equal(publicMeasurementGuidePath("waistCircumference"), "/measurement-guides/waist-circumference.html");
  assert.equal(
    publicMeasurementGuidePath("bideltoidCircumference"),
    "/measurement-guides/bideltoid-circumference.html"
  );
  assert.equal(publicMeasurementGuidePath("hipCircumference"), "/measurement-guides/index.html");
});
