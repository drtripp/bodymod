import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import test from "node:test";
import {
  buildFaceMeasurementRecord,
  deriveFaceMetricsFromLandmarks,
  formatFaceMetricSummary,
  sideProfileResearchNotes
} from "../src/lib/faceMeasurements.js";

function makeLandmarks() {
  const landmarks = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  const points = {
    10: { x: 0.5, y: 0.1, z: 0 },
    168: { x: 0.5, y: 0.28, z: 0 },
    2: { x: 0.5, y: 0.48, z: 0 },
    152: { x: 0.5, y: 0.9, z: 0 },
    234: { x: 0.2, y: 0.48, z: 0 },
    454: { x: 0.8, y: 0.48, z: 0 },
    172: { x: 0.3, y: 0.76, z: 0 },
    397: { x: 0.7, y: 0.76, z: 0 },
    33: { x: 0.32, y: 0.33, z: 0 },
    133: { x: 0.44, y: 0.35, z: 0 },
    362: { x: 0.56, y: 0.35, z: 0 },
    263: { x: 0.68, y: 0.33, z: 0 },
    468: { x: 0.38, y: 0.34, z: 0 },
    473: { x: 0.62, y: 0.34, z: 0 },
    61: { x: 0.42, y: 0.62, z: 0 },
    291: { x: 0.58, y: 0.62, z: 0 },
    13: { x: 0.5, y: 0.58, z: 0 },
    0: { x: 0.5, y: 0.62, z: 0 },
    14: { x: 0.5, y: 0.65, z: 0 },
    17: { x: 0.5, y: 0.69, z: 0 }
  };

  for (const [index, point] of Object.entries(points)) {
    landmarks[Number(index)] = point;
  }

  return landmarks;
}

test("derives repeatable face metrics from a Face Landmarker mesh", () => {
  const summary = deriveFaceMetricsFromLandmarks(makeLandmarks());
  const metricById = new Map(summary.metrics.map((metric) => [metric.id, metric]));

  assert.equal(summary.landmarkCount, 478);
  assert.equal(metricById.get("midfaceRatio").displayValue, "0.80");
  assert.ok(metricById.get("eyeSpacingRatio").value > 0.98);
  assert.equal(metricById.get("fwhRatio").displayValue, "2.00");
  assert.equal(metricById.get("cheekJawRatio").displayValue, "1.50");
  assert.ok(metricById.get("canthalTiltDeg").value > 9);
  assert.ok(summary.limitations.includes(sideProfileResearchNotes[0]));
});

test("builds local-only face measurement records without image data", () => {
  const scan = {
    source: "photo",
    measuredAt: "2026-06-10T12:00:00.000Z",
    ...deriveFaceMetricsFromLandmarks(makeLandmarks())
  };
  const record = buildFaceMeasurementRecord(scan, "Neutral expression.");

  assert.equal(record.source, "photo");
  assert.equal(record.note, "Neutral expression.");
  assert.equal(record.landmarkCount, 478);
  assert.equal(record.dataUrl, undefined);
  assert.equal(record.metrics.some((metric) => metric.id === "philtrumLipRatio"), true);
  assert.match(formatFaceMetricSummary(record), /Midface ratio: 0\.80/);
});

test("ships self-hosted MediaPipe face model assets", async () => {
  const model = await stat(new URL("../public/models/mediapipe/face_landmarker.task", import.meta.url));
  const wasm = await stat(new URL("../public/mediapipe/wasm/vision_wasm_internal.wasm", import.meta.url));

  assert.ok(model.size > 3_000_000);
  assert.ok(wasm.size > 10_000_000);
});
