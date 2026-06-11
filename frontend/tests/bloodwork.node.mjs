import assert from "node:assert/strict";
import test from "node:test";

import {
  bloodworkMarkerById,
  bloodworkRangeStatus,
  buildBloodworkTrendRows,
  createBloodworkResult,
  fallbackBloodworkLibrary,
  formatBloodworkResult,
  formatReferenceRange,
  normalizeBloodworkLibrary,
  referenceRangeForMarker
} from "../src/lib/bloodwork.js";

test("normalizes bloodwork marker libraries and reference ranges", () => {
  const library = normalizeBloodworkLibrary({
    version: 2,
    reference: "test library",
    markerGroups: [{ id: "hormones", label: "Hormones", summary: "Test group" }],
    markers: [
      {
        id: "testosterone",
        label: "Testosterone",
        groupId: "hormones",
        unit: "ng/dL",
        referenceRanges: {
          male: { low: "300", high: "1000", unit: "ng/dL" }
        }
      }
    ]
  });
  const fallback = normalizeBloodworkLibrary(null);
  const marker = bloodworkMarkerById(library, "testosterone");

  assert.equal(library.version, 2);
  assert.equal(marker.label, "Testosterone");
  assert.equal(referenceRangeForMarker(marker, "male").low, 300);
  assert.equal(formatReferenceRange(referenceRangeForMarker(marker, "male")), "300-1000 ng/dL");
  assert.ok(fallback.markers.length >= fallbackBloodworkLibrary.markers.length);
});

test("creates local-only bloodwork records with range status", () => {
  const library = normalizeBloodworkLibrary(fallbackBloodworkLibrary);
  const marker = bloodworkMarkerById(library, "total-testosterone");
  const result = createBloodworkResult({
    marker,
    value: "850",
    collectedAt: "2026-06-10",
    note: "Morning draw.",
    protocolId: "protocol-1",
    sex: "male"
  });

  assert.equal(result.markerLabel, "Total testosterone");
  assert.equal(result.value, 850);
  assert.equal(result.unit, "ng/dL");
  assert.equal(result.rangeStatus, "in-range");
  assert.equal(result.protocolId, "protocol-1");
  assert.equal(result.localOnlySensitive, true);
  assert.equal(formatBloodworkResult(result), "Total testosterone: 850 ng/dL");
  assert.equal(bloodworkRangeStatus(1200, referenceRangeForMarker(marker, "male")), "above-range");
  assert.throws(
    () => createBloodworkResult({ marker, value: "not-a-number" }),
    /numeric lab value/
  );
});

test("builds bloodwork trend rows and sparkline paths", () => {
  const rows = buildBloodworkTrendRows([
    {
      id: "late-other",
      markerId: "ldl-c",
      markerLabel: "LDL-C",
      value: 92,
      unit: "mg/dL",
      collectedAt: "2026-06-10",
      rangeStatus: "in-range"
    },
    {
      id: "base",
      markerId: "total-testosterone",
      markerLabel: "Total testosterone",
      value: 620,
      unit: "ng/dL",
      collectedAt: "2026-05-10",
      rangeStatus: "in-range"
    },
    {
      id: "latest",
      markerId: "total-testosterone",
      markerLabel: "Total testosterone",
      value: 700,
      unit: "ng/dL",
      collectedAt: "2026-06-10",
      rangeStatus: "in-range"
    }
  ]);

  const testosterone = rows.find((row) => row.markerId === "total-testosterone");
  assert.equal(rows[0].latestAt, "2026-06-10");
  assert.equal(testosterone.count, 2);
  assert.equal(testosterone.delta, 80);
  assert.match(testosterone.points, /\d+\.\d,\d+\.\d/);
});
