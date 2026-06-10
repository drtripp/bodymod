import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildResultCardModel,
  buildResultCardSvg,
  resultCardDataUrl
} from "../src/lib/resultCard.js";

const measurements = {
  height: 180,
  weight: 82,
  sex: "male",
  headCircumference: 57,
  neckCircumference: 39,
  biacromialWidth: 40,
  bideltoidWidth: 50,
  bideltoidCircumference: 118,
  armpitCircumference: 98,
  nippleCircumference: 96,
  underbustCircumference: 92,
  waistCircumference: 80,
  pantWaistCircumference: 86,
  hipCircumference: 96,
  upperThighCircumference: 58,
  midThighCircumference: 50,
  calfCircumference: 38,
  bicepCircumference: 34,
  upperForearmCircumference: 29,
  wristCircumference: 17
};

const result = {
  top_match: {
    label: "Astarion",
    similarity: 88.8
  },
  percentiles: {
    height: 44,
    waistCircumference: 26,
    bideltoidCircumference: 43
  }
};

test("builds a branded 4:5 result-card SVG", () => {
  const model = buildResultCardModel(measurements, result);
  const svg = buildResultCardSvg(measurements, result);

  assert.equal(model.brand, "bodymod");
  assert.equal(model.topMatch, "Astarion");
  assert.equal(model.similarity, "89%");
  assert.match(svg, /width="1080"/);
  assert.match(svg, /height="1350"/);
  assert.match(svg, /bodymod/);
  assert.match(svg, /Astarion/);
  assert.match(svg, /SWR/);
  assert.match(svg, /<path d="/);
});

test("encodes the result card as an SVG data URL", () => {
  const dataUrl = resultCardDataUrl(measurements, result);

  assert.ok(dataUrl.startsWith("data:image/svg+xml;charset=utf-8,"));
  assert.ok(decodeURIComponent(dataUrl).includes("Measurement profile"));
});
