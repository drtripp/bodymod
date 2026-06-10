export const emptyExerciseLibrary = {
  version: 0,
  reference: "Exercise library unavailable.",
  notes: [],
  exercises: [],
  muscleTargets: [],
  programTemplates: []
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function normalizeExerciseLibrary(library = {}) {
  return {
    version: Number(library.version) || 0,
    reference: String(library.reference || emptyExerciseLibrary.reference),
    notes: asArray(library.notes).map(String),
    exercises: asArray(library.exercises).map((exercise) => ({
      ...exercise,
      primaryMuscles: asArray(exercise.primaryMuscles).map(String),
      secondaryMuscles: asArray(exercise.secondaryMuscles).map(String),
      measurementTargets: asArray(exercise.measurementTargets).map(String),
      instructions: asArray(exercise.instructions).map(String)
    })),
    muscleTargets: asArray(library.muscleTargets).map((target) => ({
      ...target,
      measurementTargets: asArray(target.measurementTargets).map(String),
      muscleGroups: asArray(target.muscleGroups).map(String),
      exerciseIds: asArray(target.exerciseIds).map(String)
    })),
    programTemplates: asArray(library.programTemplates).map((program) => ({
      ...program,
      goalIds: asArray(program.goalIds).map(String),
      days: asArray(program.days).map((day) => ({
        ...day,
        exercises: asArray(day.exercises)
      }))
    }))
  };
}

export function exerciseById(library, exerciseId) {
  return normalizeExerciseLibrary(library).exercises.find((exercise) => exercise.id === exerciseId);
}

export function suggestedExerciseTargets(goal = {}, library = emptyExerciseLibrary) {
  const normalized = normalizeExerciseLibrary(library);
  const targetMetrics = Object.keys(goal.targetMetrics || {});

  if (!targetMetrics.length) {
    return normalized.muscleTargets;
  }

  return normalized.muscleTargets.filter((target) =>
    target.measurementTargets.some((metric) => targetMetrics.includes(metric))
  );
}

export function programsForGoal(goal = {}, library = emptyExerciseLibrary) {
  const normalized = normalizeExerciseLibrary(library);
  if (!goal.id) {
    return normalized.programTemplates;
  }

  return normalized.programTemplates.filter((program) => program.goalIds.includes(goal.id));
}

export function createWorkoutSession({
  exercise,
  programId = "",
  sets,
  reps,
  loadKg,
  rpe = "",
  note = ""
}) {
  const setCount = Number(sets);
  const repCount = Number(reps);
  const load = Number(loadKg);
  const effort = rpe === "" ? null : Number(rpe);

  if (!exercise?.id) {
    throw new Error("Choose an exercise.");
  }

  if (!Number.isFinite(setCount) || setCount <= 0) {
    throw new Error("Enter a valid set count.");
  }

  if (!Number.isFinite(repCount) || repCount <= 0) {
    throw new Error("Enter valid reps.");
  }

  if (!Number.isFinite(load) || load < 0) {
    throw new Error("Enter a valid load.");
  }

  if (effort !== null && (!Number.isFinite(effort) || effort < 1 || effort > 10)) {
    throw new Error("RPE must be between 1 and 10.");
  }

  return {
    exerciseId: exercise.id,
    exerciseLabel: exercise.label,
    programId,
    sets: Math.round(setCount),
    reps: Math.round(repCount),
    loadKg: Number(load.toFixed(1)),
    rpe: effort === null ? null : Number(effort.toFixed(1)),
    volumeKg: Number((Math.round(setCount) * Math.round(repCount) * load).toFixed(1)),
    note: String(note || "").trim(),
    measurementTargets: asArray(exercise.measurementTargets),
    primaryMuscles: asArray(exercise.primaryMuscles)
  };
}

export function formatWorkoutSession(session) {
  const load = Number(session.loadKg || 0).toFixed(Number(session.loadKg || 0) % 1 ? 1 : 0);
  return `${session.exerciseLabel}: ${session.sets} x ${session.reps} x ${load} kg`;
}

export function calculateWorkoutPrs(sessions = []) {
  const grouped = new Map();

  for (const session of sessions) {
    if (!session.exerciseId) {
      continue;
    }

    const current = grouped.get(session.exerciseId) || {
      exerciseId: session.exerciseId,
      exerciseLabel: session.exerciseLabel,
      maxLoadKg: 0,
      maxVolumeKg: 0,
      sessionCount: 0
    };

    grouped.set(session.exerciseId, {
      ...current,
      exerciseLabel: session.exerciseLabel || current.exerciseLabel,
      maxLoadKg: Math.max(current.maxLoadKg, Number(session.loadKg) || 0),
      maxVolumeKg: Math.max(current.maxVolumeKg, Number(session.volumeKg) || 0),
      sessionCount: current.sessionCount + 1
    });
  }

  return [...grouped.values()].sort((left, right) => right.maxVolumeKg - left.maxVolumeKg);
}

function sessionTimestamp(session) {
  const time = new Date(session.createdAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function buildWorkoutSparkline(points = [], metric, width = 100, height = 36, padding = 4) {
  const values = points
    .map((point) => Number(point[metric]))
    .filter((value) => Number.isFinite(value));

  if (!values.length) {
    return "";
  }

  const maxValue = Math.max(...values, 1);
  const xSpan = width - padding * 2;
  const ySpan = height - padding * 2;
  const usablePoints = points.filter((point) => Number.isFinite(Number(point[metric])));

  return usablePoints
    .map((point, index) => {
      const x =
        usablePoints.length === 1
          ? padding + xSpan / 2
          : padding + (index / (usablePoints.length - 1)) * xSpan;
      const y = height - padding - (Number(point[metric]) / maxValue) * ySpan;
      return `${Number(x.toFixed(1))},${Number(y.toFixed(1))}`;
    })
    .join(" ");
}

export function buildWorkoutHistories(sessions = []) {
  const grouped = new Map();
  const orderedSessions = sessions
    .slice()
    .sort((left, right) => sessionTimestamp(left) - sessionTimestamp(right));

  for (const session of orderedSessions) {
    if (!session.exerciseId) {
      continue;
    }

    const current = grouped.get(session.exerciseId) || {
      exerciseId: session.exerciseId,
      exerciseLabel: session.exerciseLabel,
      points: [],
      maxLoadKg: 0,
      maxVolumeKg: 0
    };
    const loadKg = Number(session.loadKg) || 0;
    const volumeKg = Number(session.volumeKg) || 0;
    const nextPoint = {
      id: session.id,
      createdAt: session.createdAt,
      loadKg,
      volumeKg,
      bestLoadKg: Math.max(current.maxLoadKg, loadKg),
      bestVolumeKg: Math.max(current.maxVolumeKg, volumeKg)
    };

    grouped.set(session.exerciseId, {
      ...current,
      exerciseLabel: session.exerciseLabel || current.exerciseLabel,
      maxLoadKg: nextPoint.bestLoadKg,
      maxVolumeKg: nextPoint.bestVolumeKg,
      points: [...current.points, nextPoint]
    });
  }

  return [...grouped.values()]
    .map((history) => ({
      ...history,
      sessionCount: history.points.length,
      latestAt: history.points.at(-1)?.createdAt || "",
      loadSparkline: buildWorkoutSparkline(history.points, "bestLoadKg"),
      volumeSparkline: buildWorkoutSparkline(history.points, "bestVolumeKg")
    }))
    .sort((left, right) => sessionTimestamp(right.points.at(-1)) - sessionTimestamp(left.points.at(-1)));
}
