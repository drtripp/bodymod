import assert from "node:assert/strict";
import test from "node:test";
import { buildMeasurementBandDiff } from "../src/lib/comparison.js";
import {
  buildSnapshotTargetMetrics,
  buildSnapshotTargets,
  isSnapshotTargetId
} from "../src/lib/localTargets.js";
import {
  buildTargetFilterOptions,
  filterTargets,
  targetBuildProfile
} from "../src/lib/targetFilters.js";

test("converts saved snapshots into local past-self target profiles", () => {
  const [target] = buildSnapshotTargets([
    {
      id: "snap-1",
      label: "Baseline",
      note: "Pre-cut log.",
      createdAt: "2026-06-10T12:00:00.000Z",
      measurements: {
        height: 181,
        weight: 86,
        waistCircumference: 84
      }
    }
  ]);

  assert.equal(target.id, "snapshot:snap-1");
  assert.equal(isSnapshotTargetId(target.id), true);
  assert.equal(target.snapshotId, "snap-1");
  assert.equal(target.label, "Past self: Baseline");
  assert.equal(target.source_type, "past-self");
  assert.match(target.notes, /Local snapshot saved 2026-06-10/);
  assert.match(target.notes, /Pre-cut log/);
  assert.deepEqual(target.explanation, [
    "Local saved snapshot target.",
    "No external similarity score or curated target data used."
  ]);
});

test("builds goal metric deltas from current measurements to a snapshot target", () => {
  const metrics = buildSnapshotTargetMetrics(
    {
      height: 181,
      weight: 88,
      waistCircumference: 90,
      bideltoidCircumference: 120
    },
    {
      height: 181,
      weight: 86,
      waistCircumference: 84,
      bideltoidCircumference: 124
    }
  );

  assert.equal(metrics.height, 0);
  assert.equal(metrics.weight, -2);
  assert.equal(metrics.waistCircumference, -6);
  assert.equal(metrics.bideltoidCircumference, 4);
});

test("normalizes measurement band differences against the largest target gap", () => {
  const bands = buildMeasurementBandDiff(
    {
      height: 180,
      weight: 82,
      waistCircumference: 80,
      bideltoidCircumference: 118,
      hipCircumference: 96,
      upperThighCircumference: 55,
      bicepCircumference: 33
    },
    {
      height: 178,
      weight: 71,
      waistCircumference: 76,
      bideltoidCircumference: 108,
      hipCircumference: 92,
      upperThighCircumference: 52,
      bicepCircumference: 31
    }
  );

  assert.equal(bands.find((band) => band.key === "weight").magnitudePercent, 100);
  assert.equal(bands.find((band) => band.key === "bideltoidCircumference").magnitudePercent, 90.9);
  assert.equal(bands.find((band) => band.key === "height").direction, "up");
});

test("filters comparison targets by source, sex, and inferred build", () => {
  const targets = [
    {
      id: "lean-character",
      source_type: "character",
      measurements: {
        sex: "male",
        height: 178,
        weight: 71,
        waistCircumference: 76,
        hipCircumference: 92,
        bideltoidCircumference: 108
      }
    },
    {
      id: "muscular-archetype",
      source_type: "archetype",
      measurements: {
        sex: "male",
        height: 180,
        weight: 88,
        waistCircumference: 78,
        hipCircumference: 98,
        bideltoidCircumference: 128
      }
    },
    {
      id: "curvy-snapshot",
      source_type: "past-self",
      measurements: {
        sex: "female",
        height: 166,
        weight: 64,
        waistCircumference: 66,
        hipCircumference: 104,
        bideltoidCircumference: 104
      }
    }
  ];

  const options = buildTargetFilterOptions(targets);

  assert.equal(targetBuildProfile(targets[0]).id, "lean");
  assert.equal(targetBuildProfile(targets[1]).id, "muscular");
  assert.equal(targetBuildProfile(targets[2]).id, "curvy");
  assert.deepEqual(options.sources.map((source) => source.id), [
    "archetype",
    "character",
    "past-self"
  ]);
  assert.deepEqual(options.sexes.map((sex) => sex.id), ["female", "male"]);
  assert.deepEqual(
    filterTargets(targets, { source: "all", sex: "male", build: "muscular" }).map(
      (target) => target.id
    ),
    ["muscular-archetype"]
  );
  assert.deepEqual(
    filterTargets(targets, { source: "past-self", sex: "female", build: "curvy" }).map(
      (target) => target.id
    ),
    ["curvy-snapshot"]
  );
});
