import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMaintenanceDriftAlerts,
  buildGoalProgress,
  buildGoalPauseSummary,
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

test("builds maintenance drift alerts after a target-band snapshot exists", () => {
  const goal = {
    id: "goal-1",
    startingMeasurements: {
      waistCircumference: 90,
      bideltoidCircumference: 120
    },
    targetMetrics: {
      waistCircumference: -6,
      bideltoidCircumference: 5
    }
  };
  const snapshots = [
    {
      id: "baseline",
      label: "Baseline",
      createdAt: "2026-01-01T00:00:00.000Z",
      measurements: {
        waistCircumference: 90,
        bideltoidCircumference: 120
      }
    },
    {
      id: "at-goal",
      label: "At goal",
      createdAt: "2026-04-01T00:00:00.000Z",
      measurements: {
        waistCircumference: 84,
        bideltoidCircumference: 125
      }
    }
  ];

  assert.equal(
    buildMaintenanceDriftAlerts(
      goal,
      { waistCircumference: 87, bideltoidCircumference: 125 },
      snapshots.slice(0, 1)
    ),
    null
  );

  const alerts = buildMaintenanceDriftAlerts(
    goal,
    { waistCircumference: 87, bideltoidCircumference: 125 },
    snapshots
  );

  assert.equal(alerts.reachedLabel, "At goal");
  assert.equal(alerts.alerts.length, 1);
  assert.equal(alerts.alerts[0].key, "waistCircumference");
  assert.equal(
    alerts.alerts[0].message,
    "Waist drifted +3.0 cm outside +/-2.0 cm maintenance band."
  );
});

test("does not alert while current measurements remain inside the maintenance band", () => {
  const goal = {
    startingMeasurements: {
      weight: 90
    },
    targetMetrics: {
      weight: -5
    }
  };
  const snapshots = [
    {
      id: "at-goal",
      label: "At goal",
      createdAt: "2026-04-01T00:00:00.000Z",
      measurements: {
        weight: 85
      }
    }
  ];

  assert.equal(
    buildMaintenanceDriftAlerts(goal, { weight: 86.5 }, snapshots),
    null
  );
});

test("pauses goals while active life-event windows affect target metrics", () => {
  const goal = {
    id: "goal-1",
    targetMetrics: {
      waistCircumference: -4,
      bideltoidCircumference: 3
    }
  };
  const checkIns = [
    {
      id: "injury-1",
      type: "life-event",
      eventMode: "injury",
      affectedFields: ["waistCircumference"],
      durationDays: 21,
      createdAt: "2026-06-01T00:00:00.000Z"
    },
    {
      id: "procedure-1",
      type: "life-event",
      eventMode: "procedure",
      affectedFields: ["all"],
      durationDays: 3,
      createdAt: "2026-05-01T00:00:00.000Z"
    }
  ];
  const paused = buildGoalPauseSummary(
    goal,
    checkIns,
    Date.parse("2026-06-10T00:00:00.000Z")
  );

  assert.equal(paused.goalId, "goal-1");
  assert.deepEqual(paused.affectedLabels, ["Waist"]);
  assert.deepEqual(paused.eventModes, ["injury"]);
  assert.equal(paused.latestEndAt, "2026-06-22T00:00:00.000Z");
  assert.ok(paused.message.includes("Goal paused for Waist"));
  assert.equal(
    buildGoalPauseSummary(goal, checkIns, Date.parse("2026-06-30T00:00:00.000Z")),
    null
  );
});
