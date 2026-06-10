import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGoalProgress,
  goalTargetSourceLabel,
  parseCustomGoalMetrics
} from "../src/lib/goalTargets.js";

test("parses custom goal deltas and ignores blank or zero fields", () => {
  const metrics = parseCustomGoalMetrics({
    weight: "-2.5",
    waistCircumference: "-4",
    hipCircumference: "",
    bideltoidCircumference: "0",
    bicepCircumference: "1.25",
    upperThighCircumference: "not a number"
  });

  assert.deepEqual(metrics, {
    weight: -2.5,
    waistCircumference: -4,
    bicepCircumference: 1.25
  });
});

test("builds target-relative progress rows from saved goal metrics", () => {
  const progress = buildGoalProgress(
    {
      startingMeasurements: {
        weight: 86,
        waistCircumference: 90,
        bideltoidCircumference: 120
      },
      targetMetrics: {
        weight: -2,
        waistCircumference: -4,
        bideltoidCircumference: 4
      }
    },
    {
      weight: 85,
      waistCircumference: 88,
      bideltoidCircumference: 122
    }
  );

  assert.equal(Math.round(progress.average), 50);
  assert.deepEqual(
    progress.rows.map((row) => `${row.label}:${row.current}/${row.target}/${row.progress}`),
    [
      "Weight:85/84/50",
      "Waist:88/86/50",
      "Bideltoid Circ:122/124/50"
    ]
  );
});

test("formats saved goal source labels", () => {
  assert.equal(
    goalTargetSourceLabel({ targetSource: { type: "custom" } }),
    "Custom target deltas"
  );
  assert.equal(
    goalTargetSourceLabel({
      targetSource: { type: "target-profile", label: "Classic Physique Archetype" }
    }),
    "Target profile: Classic Physique Archetype"
  );
  assert.equal(
    goalTargetSourceLabel({
      targetSource: { type: "past-self", label: "Past self: Baseline" }
    }),
    "Past self target: Past self: Baseline"
  );
});
