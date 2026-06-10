import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildWorkoutHistories,
  buildWorkoutSparkline,
  calculateWorkoutPrs,
  createWorkoutSession,
  formatWorkoutSession,
  normalizeExerciseLibrary,
  programsForGoal,
  suggestedExerciseTargets
} from "../src/lib/workouts.js";

const library = normalizeExerciseLibrary({
  version: 1,
  reference: "test",
  exercises: [
    {
      id: "dumbbell-lateral-raise",
      label: "Dumbbell lateral raise",
      primaryMuscles: ["side delts"],
      measurementTargets: ["bideltoidCircumference"]
    },
    {
      id: "split-squat",
      label: "Split squat",
      primaryMuscles: ["quads"],
      measurementTargets: ["upperThighCircumference"]
    }
  ],
  muscleTargets: [
    {
      id: "shoulders",
      label: "Shoulders",
      measurementTargets: ["bideltoidCircumference"],
      muscleGroups: ["side delts"],
      exerciseIds: ["dumbbell-lateral-raise"]
    },
    {
      id: "legs",
      label: "Legs",
      measurementTargets: ["upperThighCircumference"],
      muscleGroups: ["quads"],
      exerciseIds: ["split-squat"]
    }
  ],
  programTemplates: [
    {
      id: "upper-lower",
      label: "Upper/lower",
      goalIds: ["shoulder-waist-ratio"],
      days: []
    },
    {
      id: "leg-day",
      label: "Leg day",
      goalIds: ["lean-mass"],
      days: []
    }
  ]
});

test("maps goal target metrics to exercise targets and programs", () => {
  const goal = {
    id: "shoulder-waist-ratio",
    targetMetrics: {
      bideltoidCircumference: 4,
      waistCircumference: -4
    }
  };

  const targets = suggestedExerciseTargets(goal, library);
  const programs = programsForGoal(goal, library);

  assert.equal(targets.length, 1);
  assert.equal(targets[0].id, "shoulders");
  assert.equal(programs.length, 1);
  assert.equal(programs[0].id, "upper-lower");
});

test("creates workout sessions and lift PR rows", () => {
  const exercise = library.exercises[0];
  const session = createWorkoutSession({
    exercise,
    sets: "3",
    reps: "12",
    loadKg: "8",
    rpe: "8.5",
    note: "Clean reps."
  });
  const heavierSession = createWorkoutSession({
    exercise,
    sets: 4,
    reps: 10,
    loadKg: 10
  });
  const prs = calculateWorkoutPrs([session, heavierSession]);

  assert.equal(session.volumeKg, 288);
  assert.equal(session.rpe, 8.5);
  assert.equal(formatWorkoutSession(session), "Dumbbell lateral raise: 3 x 12 x 8 kg");
  assert.equal(prs[0].exerciseId, "dumbbell-lateral-raise");
  assert.equal(prs[0].maxLoadKg, 10);
  assert.equal(prs[0].maxVolumeKg, 400);
  assert.equal(prs[0].sessionCount, 2);
});

test("builds per-lift history points and sparkline paths", () => {
  const exercise = library.exercises[0];
  const sessions = [
    {
      id: "first",
      createdAt: "2026-06-01T10:00:00.000Z",
      ...createWorkoutSession({ exercise, sets: 3, reps: 10, loadKg: 6 })
    },
    {
      id: "second",
      createdAt: "2026-06-03T10:00:00.000Z",
      ...createWorkoutSession({ exercise, sets: 3, reps: 10, loadKg: 8 })
    },
    {
      id: "third",
      createdAt: "2026-06-05T10:00:00.000Z",
      ...createWorkoutSession({ exercise, sets: 2, reps: 8, loadKg: 7 })
    }
  ];
  const histories = buildWorkoutHistories(sessions);
  const sparkline = buildWorkoutSparkline(histories[0].points, "bestVolumeKg");

  assert.equal(histories.length, 1);
  assert.equal(histories[0].sessionCount, 3);
  assert.equal(histories[0].maxLoadKg, 8);
  assert.equal(histories[0].maxVolumeKg, 240);
  assert.deepEqual(
    histories[0].points.map((point) => point.bestLoadKg),
    [6, 8, 8]
  );
  assert.match(histories[0].loadSparkline, /\d/);
  assert.equal(sparkline, histories[0].volumeSparkline);
});
