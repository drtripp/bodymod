import { useEffect, useMemo, useState } from "react";
import SilhouetteView from "./SilhouetteView";
import SnapshotPanel from "./SnapshotPanel";
import { fetchExerciseLibrary, fetchPlanningData } from "../lib/api";
import {
  appendGoalCheckIn,
  appendProtocolCheckIn,
  archiveUserProtocol,
  buildTrendWeightSeries,
  calculateTrendWeight,
  clearSession,
  createLocalAccount,
  deleteUserPhoto,
  loadAccounts,
  loadUserCheckIns,
  loadSessionAccount,
  loadUserGoals,
  loadUserPhotos,
  loadUserProtocols,
  loadUserWorkoutSessions,
  loginLocalAccount,
  persistUserCheckIn,
  persistUserGoal,
  persistUserPhoto,
  persistUserProtocol,
  persistUserWorkoutSession
} from "../lib/account";
import {
  buildMeasurementDueState
} from "../lib/measurementCadence";
import {
  createPhotoRecord,
  defaultPhotoComparison,
  photoCategoryCounts,
  photoCategoryOptions,
  photosForCategory
} from "../lib/photos";
import { downloadProgressReport } from "../lib/progressReport";
import {
  buildWorkoutHistories,
  calculateWorkoutPrs,
  createWorkoutSession,
  emptyExerciseLibrary,
  exerciseById,
  formatWorkoutSession,
  normalizeExerciseLibrary,
  programsForGoal,
  suggestedExerciseTargets
} from "../lib/workouts";

const emptyPlanningData = {
  personas: [],
  goalPresets: [],
  protocolTemplates: []
};

const goalMetricLabels = {
  weight: ["Weight", "kg"],
  waistCircumference: ["Waist", "cm"],
  hipCircumference: ["Hip", "cm"],
  bideltoidCircumference: ["Bideltoid Circ", "cm"],
  bicepCircumference: ["Bicep Circ", "cm"],
  upperThighCircumference: ["Upper Thigh Circ", "cm"]
};

function formatDate(timestamp) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(timestamp)
  );
}

function protocolLabels(protocolIds, protocolTemplates) {
  return protocolIds
    .map((id) => protocolTemplates.find((protocol) => protocol.id === id)?.label || id)
    .join(", ");
}

function formatSignedDelta(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}`;
}

function protocolDelta(protocol, currentMeasurements) {
  const starting = protocol.startingMeasurements;
  if (!starting) {
    return "";
  }

  const weightDelta = Number(currentMeasurements.weight) - Number(starting.weight);
  const waistDelta =
    Number(currentMeasurements.waistCircumference) - Number(starting.waistCircumference);

  return `Since start: weight ${formatSignedDelta(weightDelta)} kg, waist ${formatSignedDelta(waistDelta)} cm`;
}

function formatCheckIn(checkIn) {
  if (checkIn.type === "daily-weight") {
    const calories = Number.isFinite(Number(checkIn.calories))
      ? ` / ${Number(checkIn.calories)} kcal`
      : "";
    return `Daily weight: ${Number(checkIn.weight).toFixed(1)} kg${calories}`;
  }

  return `Weekly measurements: waist ${Number(checkIn.measurements?.waistCircumference).toFixed(1)} cm`;
}

function formatLoad(value) {
  const load = Number(value || 0);
  return load.toFixed(load % 1 ? 1 : 0);
}

function photoOptionLabel(photo) {
  return `${photo.category} / ${formatDate(photo.createdAt)} / ${photo.fileName}`;
}

function findPhoto(photos, photoId) {
  return photos.find((photo) => photo.id === photoId) || null;
}

function clampProgress(value) {
  return Math.max(0, Math.min(100, value));
}

function buildGoalProgress(goal, currentMeasurements) {
  const starting = goal.startingMeasurements;
  const targetMetrics = goal.targetMetrics || {};
  const rows = Object.entries(targetMetrics)
    .map(([key, targetDelta]) => {
      const [label, unit] = goalMetricLabels[key] || [key, ""];
      const start = Number(starting?.[key]);
      const current = Number(currentMeasurements[key]);
      const delta = Number(targetDelta);

      if (!Number.isFinite(start) || !Number.isFinite(current) || !Number.isFinite(delta) || delta === 0) {
        return null;
      }

      const target = start + delta;
      const progress = clampProgress(((current - start) / delta) * 100);

      return {
        key,
        label,
        unit,
        start,
        current,
        target,
        progress
      };
    })
    .filter(Boolean);

  if (!rows.length) {
    return null;
  }

  const average = rows.reduce((total, row) => total + row.progress, 0) / rows.length;
  return {
    average,
    rows
  };
}

function buildInsightDrops({ checkIns, trendWeight, goals, protocols }) {
  const insights = [];
  const latestWeekly = checkIns.find((checkIn) => checkIn.type === "weekly-measurements");

  if (trendWeight) {
    const direction =
      trendWeight.delta < -0.05
        ? "down"
        : trendWeight.delta > 0.05
          ? "up"
          : "stable";
    insights.push(
      `Trend weight is ${direction}: ${trendWeight.value.toFixed(1)} kg across ${trendWeight.count} daily log(s).`
    );
  }

  if (latestWeekly?.measurements) {
    insights.push(
      `Latest weekly check-in saved waist ${Number(latestWeekly.measurements.waistCircumference).toFixed(1)} cm and hip ${Number(latestWeekly.measurements.hipCircumference).toFixed(1)} cm.`
    );
  }

  const activeProtocols = protocols.filter((protocol) => protocol.status !== "archived");
  if (activeProtocols.length) {
    insights.push(`${activeProtocols.length} active protocol(s) need adherence review.`);
  }

  if (goals.length) {
    insights.push(`${goals.length} saved goal(s) are using the current measurement set as their reference.`);
  }

  return insights;
}

function formatCadenceFields(fields) {
  return fields.map((field) => field.label).join(", ");
}

function buildTrendWeightChart(series) {
  if (series.length < 2) {
    return null;
  }

  const values = series.flatMap((point) => [point.raw, point.trend]);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = Math.max(0.1, maxValue - minValue);
  const xStep = series.length > 1 ? 92 / (series.length - 1) : 0;

  const toPoint = (point, index, key) => {
    const x = 4 + index * xStep;
    const y = 32 - ((point[key] - minValue) / range) * 26;
    return {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      value: point[key],
      createdAt: point.createdAt
    };
  };

  const rawPoints = series.map((point, index) => toPoint(point, index, "raw"));
  const trendPoints = series.map((point, index) => toPoint(point, index, "trend"));

  return {
    rawPoints,
    trendPoints: trendPoints.map((point) => `${point.x},${point.y}`).join(" "),
    minValue,
    maxValue
  };
}

export default function AccountGoalPanel({
  currentMeasurements,
  onApplyMeasurements,
  snapshotProps,
  onOpenStrategies,
  onClose
}) {
  const [planningData, setPlanningData] = useState(emptyPlanningData);
  const [planningStatus, setPlanningStatus] = useState("Loading planning data...");
  const [exerciseLibrary, setExerciseLibrary] = useState(emptyExerciseLibrary);
  const [exerciseStatus, setExerciseStatus] = useState("Loading workout library...");
  const [accounts, setAccounts] = useState(() => loadAccounts());
  const initialAccount = loadSessionAccount();
  const [account, setAccount] = useState(() => initialAccount);
  const [goals, setGoals] = useState(() => loadUserGoals(initialAccount?.id));
  const [protocols, setProtocols] = useState(() => loadUserProtocols(initialAccount?.id));
  const [checkIns, setCheckIns] = useState(() => loadUserCheckIns(initialAccount?.id));
  const [workoutSessions, setWorkoutSessions] = useState(() =>
    loadUserWorkoutSessions(initialAccount?.id)
  );
  const [photos, setPhotos] = useState(() => loadUserPhotos(initialAccount?.id));
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [selectedPersonaId, setSelectedPersonaId] = useState("");
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [selectedProtocolTemplateId, setSelectedProtocolTemplateId] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [goalNote, setGoalNote] = useState("");
  const [protocolDose, setProtocolDose] = useState("");
  const [protocolFrequency, setProtocolFrequency] = useState("");
  const [protocolStartDate, setProtocolStartDate] = useState("");
  const [protocolEndDate, setProtocolEndDate] = useState("");
  const [protocolConfounders, setProtocolConfounders] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [workoutSets, setWorkoutSets] = useState("3");
  const [workoutReps, setWorkoutReps] = useState("10");
  const [workoutLoad, setWorkoutLoad] = useState("");
  const [workoutRpe, setWorkoutRpe] = useState("");
  const [workoutNote, setWorkoutNote] = useState("");
  const [photoCategory, setPhotoCategory] = useState("body");
  const [photoFilter, setPhotoFilter] = useState("all");
  const [photoNote, setPhotoNote] = useState("");
  const [photoGhostId, setPhotoGhostId] = useState("");
  const [photoBeforeId, setPhotoBeforeId] = useState("");
  const [photoAfterId, setPhotoAfterId] = useState("");
  const [photoSlider, setPhotoSlider] = useState("50");
  const [ghostOpacity, setGhostOpacity] = useState("35");
  const [dailyWeight, setDailyWeight] = useState("");
  const [dailyCalories, setDailyCalories] = useState("");
  const [checkInNote, setCheckInNote] = useState("");
  const [selectedProtocolIds, setSelectedProtocolIds] = useState([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let isMounted = true;

    fetchPlanningData()
      .then((data) => {
        if (!isMounted) {
          return;
        }
        setPlanningData(data);
        setPlanningStatus(
          `Loaded ${data.personas.length} personas, ${data.goalPresets.length} goals, and ${data.protocolTemplates.length} protocols.`
        );
        setSelectedPersonaId((current) => current || data.personas[0]?.id || "");
        setSelectedGoalId((current) => current || data.goalPresets[0]?.id || "");
        setSelectedProtocolTemplateId(
          (current) => current || data.protocolTemplates[0]?.id || ""
        );
      })
      .catch(() => {
        if (isMounted) {
          setPlanningStatus("Planning data unavailable. Local account tools still work.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetchExerciseLibrary()
      .then((data) => {
        if (!isMounted) {
          return;
        }

        const normalized = normalizeExerciseLibrary(data);
        setExerciseLibrary(normalized);
        setExerciseStatus(
          `Loaded ${normalized.exercises.length} exercise seeds and ${normalized.programTemplates.length} programs.`
        );
        setSelectedExerciseId((current) => current || normalized.exercises[0]?.id || "");
        setSelectedProgramId((current) => current || normalized.programTemplates[0]?.id || "");
      })
      .catch(() => {
        if (isMounted) {
          setExerciseStatus("Workout library unavailable. Local protocol logs still work.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedPersona = planningData.personas.find(
    (persona) => persona.id === selectedPersonaId
  );
  const selectedGoal = planningData.goalPresets.find((goal) => goal.id === selectedGoalId);
  const selectedProtocolTemplate = planningData.protocolTemplates.find(
    (protocol) => protocol.id === selectedProtocolTemplateId
  );
  const selectedExercise = exerciseById(exerciseLibrary, selectedExerciseId);
  const goalPrograms = useMemo(
    () => programsForGoal(selectedGoal, exerciseLibrary),
    [exerciseLibrary, selectedGoal]
  );
  const visiblePrograms = goalPrograms.length ? goalPrograms : exerciseLibrary.programTemplates;
  const selectedProgram =
    visiblePrograms.find((program) => program.id === selectedProgramId) ||
    exerciseLibrary.programTemplates.find((program) => program.id === selectedProgramId);
  const exerciseTargets = useMemo(
    () => suggestedExerciseTargets(selectedGoal, exerciseLibrary),
    [exerciseLibrary, selectedGoal]
  );
  const workoutPrs = useMemo(() => calculateWorkoutPrs(workoutSessions), [workoutSessions]);
  const workoutHistories = useMemo(
    () => buildWorkoutHistories(workoutSessions),
    [workoutSessions]
  );
  const photoCounts = useMemo(() => photoCategoryCounts(photos), [photos]);
  const visiblePhotos = useMemo(
    () => photosForCategory(photos, photoFilter),
    [photoFilter, photos]
  );
  const categoryPhotos = useMemo(
    () => photosForCategory(photos, photoCategory),
    [photoCategory, photos]
  );
  const ghostPhoto = findPhoto(photos, photoGhostId) || categoryPhotos[0] || null;
  const beforePhoto = findPhoto(photos, photoBeforeId);
  const afterPhoto = findPhoto(photos, photoAfterId) || visiblePhotos[0] || null;
  const latestPhoto = visiblePhotos[0] || photosForCategory(photos, "all")[0] || null;
  const trendWeight = useMemo(() => calculateTrendWeight(checkIns), [checkIns]);
  const trendWeightSeries = useMemo(() => buildTrendWeightSeries(checkIns), [checkIns]);
  const trendWeightChart = useMemo(
    () => buildTrendWeightChart(trendWeightSeries),
    [trendWeightSeries]
  );
  const cadenceDueState = useMemo(() => buildMeasurementDueState(checkIns), [checkIns]);
  const insightDrops = useMemo(
    () => buildInsightDrops({ checkIns, trendWeight, goals, protocols }),
    [checkIns, goals, protocols, trendWeight]
  );

  useEffect(() => {
    setSelectedProtocolIds(selectedGoal?.suggestedProtocols || []);
  }, [selectedGoal?.id]);

  useEffect(() => {
    setSelectedProgramId((current) => {
      if (visiblePrograms.some((program) => program.id === current)) {
        return current;
      }

      return visiblePrograms[0]?.id || "";
    });
  }, [visiblePrograms]);

  useEffect(() => {
    setSelectedExerciseId((current) => {
      if (exerciseLibrary.exercises.some((exercise) => exercise.id === current)) {
        return current;
      }

      return exerciseLibrary.exercises[0]?.id || "";
    });
  }, [exerciseLibrary.exercises]);

  useEffect(() => {
    const defaults = defaultPhotoComparison(photos, photoFilter);
    if (!findPhoto(photos, photoBeforeId)) {
      setPhotoBeforeId(defaults.beforeId);
    }
    if (!findPhoto(photos, photoAfterId)) {
      setPhotoAfterId(defaults.afterId);
    }
  }, [photoAfterId, photoBeforeId, photoFilter, photos]);

  useEffect(() => {
    const defaults = defaultPhotoComparison(photos, photoCategory);
    if (!findPhoto(photos, photoGhostId)) {
      setPhotoGhostId(defaults.ghostId);
    }
  }, [photoCategory, photoGhostId, photos]);

  const suggestedProtocols = useMemo(() => {
    if (!selectedProtocolIds.length) {
      return [];
    }

    return selectedProtocolIds
      .map((id) => planningData.protocolTemplates.find((protocol) => protocol.id === id))
      .filter(Boolean);
  }, [planningData.protocolTemplates, selectedProtocolIds]);

  function refreshAccountState(nextAccount) {
    setAccount(nextAccount);
    setAccounts(loadAccounts());
    setGoals(loadUserGoals(nextAccount?.id));
    setProtocols(loadUserProtocols(nextAccount?.id));
    setCheckIns(loadUserCheckIns(nextAccount?.id));
    setWorkoutSessions(loadUserWorkoutSessions(nextAccount?.id));
    setPhotos(loadUserPhotos(nextAccount?.id));
  }

  function handleCreateAccount(event) {
    event.preventDefault();
    try {
      const nextAccount = createLocalAccount({
        displayName,
        email,
        personaId: selectedPersonaId
      });
      refreshAccountState(nextAccount);
      setStatus(`Signed in as ${nextAccount.displayName}.`);
      if (selectedPersona?.startingMeasurements) {
        onApplyMeasurements(selectedPersona.startingMeasurements);
        setStatus(`Signed in as ${nextAccount.displayName}. Persona measurements loaded.`);
      }
    } catch (error) {
      setStatus(error.message);
    }
  }

  function handleApplyPersona() {
    if (!selectedPersona?.startingMeasurements) {
      return;
    }

    onApplyMeasurements(selectedPersona.startingMeasurements);
    setStatus(`${selectedPersona.label} measurements loaded into the form.`);
  }

  function handleLogin(event) {
    event.preventDefault();
    try {
      const nextAccount = loginLocalAccount(loginEmail);
      refreshAccountState(nextAccount);
      setStatus(`Signed in as ${nextAccount.displayName}.`);
    } catch (error) {
      setStatus(error.message);
    }
  }

  function handleLogout() {
    clearSession();
    refreshAccountState(null);
    setStatus("Logged out of this browser profile.");
  }

  function handleSetGoal(event) {
    event.preventDefault();
    if (!account || !selectedGoal) {
      return;
    }

    const nextGoal = persistUserGoal(account.id, {
      presetId: selectedGoal.id,
      label: selectedGoal.label,
      category: selectedGoal.category,
      summary: selectedGoal.summary,
      targetMetrics: selectedGoal.targetMetrics,
      targetDate,
      note: goalNote.trim(),
      protocolIds: selectedProtocolIds,
      startingMeasurements: currentMeasurements
    });

    setGoals([nextGoal, ...goals]);
    setGoalNote("");
    setStatus(`Goal saved: ${selectedGoal.label}.`);
  }

  function handleGoalCheckIn(goalId, adherence) {
    const nextGoals = appendGoalCheckIn(account.id, goalId, {
      adherence,
      snapshotCount: snapshotProps.snapshots.length
    });
    setGoals(nextGoals);
    setStatus("Goal check-in logged.");
  }

  function handleDailyCheckIn(event) {
    event.preventDefault();
    if (!account) {
      return;
    }

    const weight = Number(dailyWeight || currentMeasurements.weight);
    if (!Number.isFinite(weight)) {
      setStatus("Enter a valid daily weight.");
      return;
    }

    const calories = dailyCalories === "" ? null : Number(dailyCalories);
    const nextCheckIn = persistUserCheckIn(account.id, {
      type: "daily-weight",
      weight,
      calories: Number.isFinite(calories) ? calories : null,
      note: checkInNote.trim(),
      measurements: {
        weight
      }
    });

    setCheckIns([nextCheckIn, ...checkIns]);
    setDailyWeight("");
    setDailyCalories("");
    setStatus("Daily check-in logged.");
  }

  function handleWeeklyCheckIn() {
    if (!account) {
      return;
    }

    const nextCheckIn = persistUserCheckIn(account.id, {
      type: "weekly-measurements",
      measurements: currentMeasurements,
      dueFields: cadenceDueState.weekly.fields.map((field) => field.label),
      note: checkInNote.trim()
    });

    setCheckIns([nextCheckIn, ...checkIns]);
    setCheckInNote("");
    setStatus("Weekly measurements logged.");
  }

  function handleStartProtocol(event) {
    event.preventDefault();
    if (!account || !selectedProtocolTemplate) {
      return;
    }

    const nextProtocol = persistUserProtocol(account.id, {
      templateId: selectedProtocolTemplate.id,
      label: selectedProtocolTemplate.label,
      category: selectedProtocolTemplate.category,
      summary: selectedProtocolTemplate.summary,
      evidence: selectedProtocolTemplate.evidence,
      riskLevel: selectedProtocolTemplate.riskLevel,
      dose: protocolDose.trim() || "not specified",
      frequency: protocolFrequency.trim() || selectedProtocolTemplate.cadence,
      startDate: protocolStartDate,
      endDate: protocolEndDate,
      confounders: protocolConfounders.trim(),
      startingMeasurements: currentMeasurements,
      startingSnapshotCount: snapshotProps.snapshots.length
    });

    setProtocols([nextProtocol, ...protocols]);
    setProtocolDose("");
    setProtocolFrequency("");
    setProtocolConfounders("");
    setStatus(`Protocol started: ${selectedProtocolTemplate.label}.`);
  }

  function handleProtocolCheckIn(protocolId, adherence) {
    const nextProtocols = appendProtocolCheckIn(account.id, protocolId, {
      adherence,
      measurements: currentMeasurements,
      snapshotCount: snapshotProps.snapshots.length,
      confounders: protocolConfounders.trim()
    });
    setProtocols(nextProtocols);
    setStatus("Protocol adherence check-in logged.");
  }

  function handleArchiveProtocol(protocolId) {
    setProtocols(archiveUserProtocol(account.id, protocolId));
    setStatus("Protocol archived.");
  }

  function persistWorkoutFromInput(event) {
    event.preventDefault();
    if (!account) {
      return;
    }

    try {
      const workout = createWorkoutSession({
        exercise: selectedExercise,
        programId: selectedProgramId,
        sets: workoutSets,
        reps: workoutReps,
        loadKg: workoutLoad || 0,
        rpe: workoutRpe,
        note: workoutNote
      });
      const nextWorkout = persistUserWorkoutSession(account.id, workout);
      setWorkoutSessions([nextWorkout, ...workoutSessions]);
      setWorkoutNote("");
      setStatus(`Workout logged: ${formatWorkoutSession(nextWorkout)}.`);
    } catch (error) {
      setStatus(error.message);
    }
  }

  function handleRepeatWorkout(session) {
    if (!account) {
      return;
    }

    const exercise = exerciseById(exerciseLibrary, session.exerciseId) || {
      id: session.exerciseId,
      label: session.exerciseLabel,
      measurementTargets: session.measurementTargets,
      primaryMuscles: session.primaryMuscles
    };
    const workout = createWorkoutSession({
      exercise,
      programId: session.programId,
      sets: session.sets,
      reps: session.reps,
      loadKg: session.loadKg,
      rpe: session.rpe ?? "",
      note: session.note
    });
    const nextWorkout = persistUserWorkoutSession(account.id, workout);
    setWorkoutSessions([nextWorkout, ...workoutSessions]);
    setStatus(`Repeated workout: ${formatWorkoutSession(nextWorkout)}.`);
  }

  function handlePhotoImport(event) {
    const [file] = event.target.files || [];
    if (!account || !file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setStatus("Choose an image file for the photo log.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const record = createPhotoRecord({
          dataUrl: reader.result,
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          category: photoCategory,
          note: photoNote
        });
        const nextPhoto = persistUserPhoto(account.id, record);
        const nextPhotos = [nextPhoto, ...photos];
        setPhotos(nextPhotos);
        setPhotoNote("");
        setPhotoAfterId(nextPhoto.id);
        setPhotoGhostId(nextPhoto.id);
        if (!photoBeforeId && photos[0]) {
          setPhotoBeforeId(photos[0].id);
        }
        setStatus(`Saved ${record.category} photo locally.`);
      } catch (error) {
        setStatus(error.message);
      }
    };
    reader.onerror = () => setStatus("Photo import failed.");
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function handleDeletePhoto(photoId) {
    const nextPhotos = deleteUserPhoto(account.id, photoId);
    setPhotos(nextPhotos);
    setStatus("Photo deleted from this browser profile.");
  }

  function handleDownloadProgressReport() {
    downloadProgressReport({
      account,
      measurements: currentMeasurements,
      snapshots: snapshotProps.snapshots,
      goals,
      protocols,
      checkIns,
      workoutSessions,
      photos
    });
    setStatus("Progress report downloaded.");
  }

  return (
    <div className="account-overlay" role="presentation">
      <section className="account-panel panel" role="dialog" aria-modal="true" aria-label="Account, logs, and goals">
        <button className="modal-close account-close" type="button" aria-label="Close account panel" onClick={onClose}>
          x
        </button>

        <div className="panel-header account-header">
          <div>
            <h2>Account, logs, and goals</h2>
            <p>Local-first profile tools for persona walkthroughs, snapshots, and build plans.</p>
          </div>
          <span className="account-status">{planningStatus}</span>
        </div>

        {!account ? (
          <div className="account-auth-grid">
            <form className="auth-card" onSubmit={handleCreateAccount}>
              <h3>Create local account</h3>
              <label className="field">
                <span className="field-label">Display name</span>
                <input
                  aria-label="Display name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Mason"
                />
              </label>
              <label className="field">
                <span className="field-label">Email</span>
                <input
                  aria-label="Account email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>
              <label className="field">
                <span className="field-label">Persona sample</span>
                <select
                  aria-label="Persona sample"
                  value={selectedPersonaId}
                  onChange={(event) => setSelectedPersonaId(event.target.value)}
                >
                  {planningData.personas.map((persona) => (
                    <option key={persona.id} value={persona.id}>
                      {persona.label}
                    </option>
                  ))}
                </select>
              </label>
              {selectedPersona ? (
                <p className="muted-text">{selectedPersona.motivation}</p>
              ) : null}
              <button className="button" type="submit">
                Create account
              </button>
            </form>

            <form className="auth-card" onSubmit={handleLogin}>
              <h3>Log in on this device</h3>
              <label className="field">
                <span className="field-label">Email</span>
                <input
                  aria-label="Login email"
                  type="email"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              <button className="button" type="submit" disabled={!accounts.length}>
                Log in
              </button>
              <p className="muted-text">
                {accounts.length
                  ? `${accounts.length} local account(s) on this browser.`
                  : "No local accounts on this browser yet."}
              </p>
            </form>
          </div>
        ) : (
          <div className="account-workspace">
            <section className="account-summary">
              <div>
                <h3>{account.displayName}</h3>
                <p>{account.email}</p>
              </div>
              <button className="button" type="button" onClick={handleLogout}>
                Log out
              </button>
            </section>

            <section className="progress-report-section" aria-label="Progress report">
              <div>
                <h3>Progress report</h3>
                <p>
                  Printable local summary of measurements, snapshots, goals,
                  protocol adherence, workout PRs, and the photo manifest.
                </p>
                <span>
                  {snapshotProps.snapshots.length} snapshot(s) / {protocols.length} protocol(s) / {workoutSessions.length} workout(s) / {photos.length} photo(s)
                </span>
              </div>
              <button className="button" type="button" onClick={handleDownloadProgressReport}>
                Download progress report
              </button>
            </section>

            <section className="persona-loader" aria-label="Persona sample loader">
              <label className="field">
                <span className="field-label">Persona sample</span>
                <select
                  aria-label="Signed-in persona sample"
                  value={selectedPersonaId}
                  onChange={(event) => setSelectedPersonaId(event.target.value)}
                >
                  {planningData.personas.map((persona) => (
                    <option key={persona.id} value={persona.id}>
                      {persona.label}
                    </option>
                  ))}
                </select>
              </label>
              {selectedPersona ? <p className="muted-text">{selectedPersona.motivation}</p> : null}
              <button className="button" type="button" onClick={handleApplyPersona}>
                Load persona measurements
              </button>
            </section>

            <section className="checkin-loop" aria-label="Check-in loop">
              <div className="panel-header">
                <h3>Check-in loop</h3>
                <p>Daily weight is quick; tape measurements stay weekly unless a protocol needs closer notes.</p>
              </div>
              <div className="cadence-grid" aria-label="Measurement cadence">
                <div>
                  <strong>{cadenceDueState.daily.isDue ? "Due today" : "Logged today"}</strong>
                  <span>Daily: {formatCadenceFields(cadenceDueState.daily.fields)}</span>
                  <small>
                    {cadenceDueState.daily.latestAt
                      ? `Last ${formatDate(cadenceDueState.daily.latestAt)}`
                      : "No daily log yet"}
                  </small>
                </div>
                <div>
                  <strong>{cadenceDueState.weekly.isDue ? "Weekly due" : "Weekly current"}</strong>
                  <span>{formatCadenceFields(cadenceDueState.weekly.fields)}</span>
                  <small>
                    {cadenceDueState.weekly.latestAt
                      ? `Last ${formatDate(cadenceDueState.weekly.latestAt)}`
                      : "No weekly log yet"}
                  </small>
                </div>
                <div>
                  <strong>{cadenceDueState.monthly.isDue ? "Monthly due" : "Monthly current"}</strong>
                  <span>{formatCadenceFields(cadenceDueState.monthly.fields)}</span>
                  <small>
                    {cadenceDueState.monthly.latestAt
                      ? `Last ${formatDate(cadenceDueState.monthly.latestAt)}`
                      : "No monthly proxy yet"}
                  </small>
                </div>
              </div>
              <form className="checkin-form" onSubmit={handleDailyCheckIn}>
                <label className="field">
                  <span className="field-label">Daily weight</span>
                  <input
                    aria-label="Daily weight"
                    inputMode="decimal"
                    value={dailyWeight}
                    onChange={(event) => setDailyWeight(event.target.value)}
                    placeholder={String(currentMeasurements.weight)}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Calories optional</span>
                  <input
                    aria-label="Daily calories"
                    inputMode="decimal"
                    value={dailyCalories}
                    onChange={(event) => setDailyCalories(event.target.value)}
                    placeholder="2400"
                  />
                </label>
                <label className="field checkin-note">
                  <span className="field-label">Check-in note</span>
                  <textarea
                    aria-label="Check-in note"
                    value={checkInNote}
                    onChange={(event) => setCheckInNote(event.target.value)}
                  />
                </label>
                <button className="button" type="submit">
                  Log daily check-in
                </button>
                <button className="button" type="button" onClick={handleWeeklyCheckIn}>
                  Save weekly check-in
                </button>
              </form>
              <div className="checkin-summary" aria-label="Check-in summary">
                <strong>
                  Trend weight: {trendWeight ? `${trendWeight.value.toFixed(1)} kg` : "--"}
                </strong>
                <span>
                  {trendWeight
                    ? `${trendWeight.count} log(s), ${formatSignedDelta(trendWeight.delta)} kg last trend step`
                    : "No daily logs yet."}
                </span>
              </div>
              {trendWeightChart ? (
                <div
                  className="trend-weight-panel"
                  aria-label="Trend weight line vs raw daily weight dots"
                >
                  <svg
                    className="trend-weight-chart"
                    role="img"
                    aria-label="Trend weight chart"
                    viewBox="0 0 100 36"
                    preserveAspectRatio="none"
                  >
                    <line x1="4" y1="32" x2="96" y2="32" />
                    <polyline className="trend-weight-line" points={trendWeightChart.trendPoints} />
                    {trendWeightChart.rawPoints.map((point) => (
                      <circle
                        key={`${point.createdAt}-${point.value}`}
                        className="trend-weight-dot"
                        cx={point.x}
                        cy={point.y}
                        r="1.8"
                      >
                        <title>{`${point.value.toFixed(1)} kg on ${formatDate(point.createdAt)}`}</title>
                      </circle>
                    ))}
                  </svg>
                  <div className="trend-weight-legend">
                    <span>Raw daily dots</span>
                    <span>Smoothed trend line</span>
                  </div>
                </div>
              ) : null}
              <div aria-label="Check-in history">
                {checkIns.length ? (
                  <ul className="checkin-list">
                    {checkIns.slice(0, 5).map((checkIn) => (
                      <li key={checkIn.id}>
                        <strong>{formatCheckIn(checkIn)}</strong>
                        <span>{formatDate(checkIn.createdAt)}</span>
                        {checkIn.note ? <p>{checkIn.note}</p> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted-text">No check-ins logged yet.</p>
                )}
              </div>
              <div className="insight-drop-list" aria-label="Insight drops">
                <h4>Insight drops</h4>
                {insightDrops.length ? (
                  <ul>
                    {insightDrops.map((insight) => (
                      <li key={insight}>{insight}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted-text">Log a check-in to generate insights.</p>
                )}
              </div>
            </section>

            <section className="goal-builder" aria-label="Goal builder">
              <div className="panel-header">
                <h3>Set a goal</h3>
                <p>Goals are local records attached to this browser account.</p>
              </div>
              <form className="goal-form" onSubmit={handleSetGoal}>
                <label className="field">
                  <span className="field-label">Goal preset</span>
                  <select
                    aria-label="Goal preset"
                    value={selectedGoalId}
                    onChange={(event) => setSelectedGoalId(event.target.value)}
                  >
                    {planningData.goalPresets.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Target date</span>
                  <input
                    aria-label="Goal target date"
                    type="date"
                    value={targetDate}
                    onChange={(event) => setTargetDate(event.target.value)}
                  />
                </label>
                <label className="field goal-note">
                  <span className="field-label">Goal note</span>
                  <textarea
                    aria-label="Goal note"
                    value={goalNote}
                    onChange={(event) => setGoalNote(event.target.value)}
                  />
                </label>
                {selectedGoal ? (
                  <p className="muted-text">{selectedGoal.summary}</p>
                ) : null}
                <button className="button" type="submit">
                  Save goal
                </button>
              </form>

              {suggestedProtocols.length ? (
                <div className="protocol-card-grid" aria-label="Suggested protocols">
                  {suggestedProtocols.map((protocol) => (
                    <article key={protocol.id} className="protocol-card">
                      <strong>{protocol.label}</strong>
                      <span>{protocol.category} / {protocol.evidence}</span>
                      <p>{protocol.summary}</p>
                      <small>{protocol.cadence}</small>
                    </article>
                  ))}
                </div>
              ) : null}
              <button className="button" type="button" onClick={onOpenStrategies}>
                Learn from strategy corpus
              </button>
            </section>

            <section className="goal-list-section" aria-label="Saved goals">
              <h3>Saved goals</h3>
              {goals.length ? (
                <ul className="goal-list">
                  {goals.map((goal) => (
                    <li key={goal.id} className="goal-row">
                      <div>
                        {(() => {
                          const progress = buildGoalProgress(goal, currentMeasurements);
                          return progress ? (
                            <div className="goal-progress" aria-label={`${goal.label} progress`}>
                              <strong>Progress: {Math.round(progress.average)}%</strong>
                              <div className="goal-progress-track">
                                <i style={{ width: `${progress.average}%` }} />
                              </div>
                              <ul>
                                {progress.rows.map((row) => (
                                  <li key={row.key}>
                                    {row.label}: {row.current.toFixed(1)} / target {row.target.toFixed(1)} {row.unit}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null;
                        })()}
                        <strong>{goal.label}</strong>
                        <span>{goal.category} / created {formatDate(goal.createdAt)}</span>
                        {goal.targetDate ? <span>Target date: {goal.targetDate}</span> : null}
                        {goal.protocolIds?.length ? (
                          <span>{protocolLabels(goal.protocolIds, planningData.protocolTemplates)}</span>
                        ) : null}
                        {goal.note ? <p>{goal.note}</p> : null}
                        <span>{goal.checkIns?.length || 0} check-in(s)</span>
                      </div>
                      <div className="button-row">
                        <button
                          className="button"
                          type="button"
                          onClick={() => handleGoalCheckIn(goal.id, "on track")}
                        >
                          On track
                        </button>
                        <button
                          className="button"
                          type="button"
                          onClick={() => handleGoalCheckIn(goal.id, "needs adjustment")}
                        >
                          Needs adjustment
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted-text">No goals saved yet.</p>
              )}
            </section>

            <section className="protocol-tracker" aria-label="Protocol tracker">
              <div className="panel-header">
                <h3>Protocol tracker</h3>
                <p>Track planned workouts, procedures, routines, or hacks against snapshots.</p>
              </div>
              <form className="protocol-form" onSubmit={handleStartProtocol}>
                <label className="field">
                  <span className="field-label">Protocol template</span>
                  <select
                    aria-label="Protocol template"
                    value={selectedProtocolTemplateId}
                    onChange={(event) => setSelectedProtocolTemplateId(event.target.value)}
                  >
                    {planningData.protocolTemplates.map((protocol) => (
                      <option key={protocol.id} value={protocol.id}>
                        {protocol.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Dose / plan</span>
                  <input
                    aria-label="Protocol dose"
                    value={protocolDose}
                    onChange={(event) => setProtocolDose(event.target.value)}
                    placeholder="4-day upper/lower split"
                  />
                </label>
                <label className="field">
                  <span className="field-label">Frequency</span>
                  <input
                    aria-label="Protocol frequency"
                    value={protocolFrequency}
                    onChange={(event) => setProtocolFrequency(event.target.value)}
                    placeholder={selectedProtocolTemplate?.cadence || "weekly"}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Start date</span>
                  <input
                    aria-label="Protocol start date"
                    type="date"
                    value={protocolStartDate}
                    onChange={(event) => setProtocolStartDate(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="field-label">End date</span>
                  <input
                    aria-label="Protocol end date"
                    type="date"
                    value={protocolEndDate}
                    onChange={(event) => setProtocolEndDate(event.target.value)}
                  />
                </label>
                <label className="field protocol-confounders">
                  <span className="field-label">Confounders / notes</span>
                  <textarea
                    aria-label="Protocol confounders"
                    value={protocolConfounders}
                    onChange={(event) => setProtocolConfounders(event.target.value)}
                  />
                </label>
                {selectedProtocolTemplate ? (
                  <p className="muted-text">
                    {selectedProtocolTemplate.summary} Evidence:{" "}
                    {selectedProtocolTemplate.evidence}; risk:{" "}
                    {selectedProtocolTemplate.riskLevel}.
                  </p>
                ) : null}
                <button className="button" type="submit">
                  Start protocol
                </button>
              </form>

              <div aria-label="Active protocols">
                {protocols.length ? (
                  <ul className="protocol-list">
                    {protocols.map((protocol) => (
                      <li key={protocol.id} className={`protocol-row protocol-row--${protocol.status}`}>
                        <div>
                          <strong>{protocol.label}</strong>
                          <span>
                            {protocol.category} / {protocol.evidence} / {protocol.status}
                          </span>
                          <span>Dose: {protocol.dose}; frequency: {protocol.frequency}</span>
                          {protocol.startDate || protocol.endDate ? (
                            <span>
                              Window: {protocol.startDate || "open"} - {protocol.endDate || "open"}
                            </span>
                          ) : null}
                          {protocol.confounders ? <p>{protocol.confounders}</p> : null}
                          <span>{protocol.checkIns?.length || 0} adherence check-in(s)</span>
                          <span>{protocolDelta(protocol, currentMeasurements)}</span>
                        </div>
                        <div className="button-row">
                          <button
                            className="button"
                            type="button"
                            onClick={() => handleProtocolCheckIn(protocol.id, "on track")}
                          >
                            Protocol on track
                          </button>
                          <button
                            className="button"
                            type="button"
                            onClick={() => handleProtocolCheckIn(protocol.id, "missed")}
                          >
                            Protocol missed
                          </button>
                          <button
                            className="button"
                            type="button"
                            onClick={() => handleArchiveProtocol(protocol.id)}
                            disabled={protocol.status === "archived"}
                          >
                            Archive protocol
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted-text">No protocols started yet.</p>
                )}
              </div>
            </section>

            <section className="workout-library-section" aria-label="Workout library">
              <div className="panel-header">
                <h3>Workout library</h3>
                <p>{exerciseStatus}</p>
              </div>

              {exerciseTargets.length ? (
                <div className="exercise-map-grid" aria-label="Aesthetic movement mapping">
                  {exerciseTargets.map((target) => (
                    <article key={target.id} className="exercise-map-card">
                      <strong>{target.label}</strong>
                      <span>{target.muscleGroups.join(", ")}</span>
                      <p>{target.rationale}</p>
                      <small>
                        {target.exerciseIds
                          .map((id) => exerciseById(exerciseLibrary, id)?.label || id)
                          .join(", ")}
                      </small>
                    </article>
                  ))}
                </div>
              ) : null}

              <div className="program-template-grid" aria-label="Program templates">
                <label className="field">
                  <span className="field-label">Program template</span>
                  <select
                    aria-label="Workout program template"
                    value={selectedProgramId}
                    onChange={(event) => setSelectedProgramId(event.target.value)}
                  >
                    {visiblePrograms.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.label}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedProgram ? (
                  <div className="program-template-preview">
                    <strong>{selectedProgram.label}</strong>
                    <p>{selectedProgram.summary}</p>
                    <ul>
                      {selectedProgram.days.map((day) => (
                        <li key={day.label}>
                          {day.label}:{" "}
                          {day.exercises
                            .map((item) => {
                              const exercise = exerciseById(exerciseLibrary, item.exerciseId);
                              return `${exercise?.label || item.exerciseId} ${item.sets}x${item.reps}`;
                            })
                            .join("; ")}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="muted-text">No seeded program matches this goal yet.</p>
                )}
              </div>

              <form className="workout-log-form" onSubmit={persistWorkoutFromInput}>
                <label className="field">
                  <span className="field-label">Exercise</span>
                  <select
                    aria-label="Exercise"
                    value={selectedExerciseId}
                    onChange={(event) => setSelectedExerciseId(event.target.value)}
                  >
                    {exerciseLibrary.exercises.map((exercise) => (
                      <option key={exercise.id} value={exercise.id}>
                        {exercise.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Sets</span>
                  <input
                    aria-label="Workout sets"
                    inputMode="numeric"
                    value={workoutSets}
                    onChange={(event) => setWorkoutSets(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Reps</span>
                  <input
                    aria-label="Workout reps"
                    inputMode="numeric"
                    value={workoutReps}
                    onChange={(event) => setWorkoutReps(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Load kg</span>
                  <input
                    aria-label="Workout load"
                    inputMode="decimal"
                    value={workoutLoad}
                    onChange={(event) => setWorkoutLoad(event.target.value)}
                    placeholder="20"
                  />
                </label>
                <label className="field">
                  <span className="field-label">RPE</span>
                  <input
                    aria-label="Workout RPE"
                    inputMode="decimal"
                    value={workoutRpe}
                    onChange={(event) => setWorkoutRpe(event.target.value)}
                    placeholder="8"
                  />
                </label>
                <label className="field workout-note">
                  <span className="field-label">Workout note</span>
                  <textarea
                    aria-label="Workout note"
                    value={workoutNote}
                    onChange={(event) => setWorkoutNote(event.target.value)}
                  />
                </label>
                <button className="button" type="submit" disabled={!exerciseLibrary.exercises.length}>
                  Log workout
                </button>
              </form>

              <div className="workout-history-grid">
                <div aria-label="Recent workout sessions">
                  <h4>Workout sessions</h4>
                  {workoutSessions.length ? (
                    <ul className="workout-session-list">
                      {workoutSessions.slice(0, 5).map((session, index) => (
                        <li key={session.id}>
                          <div>
                            <strong>{formatWorkoutSession(session)}</strong>
                            <span>
                              Volume {formatLoad(session.volumeKg)} kg / {formatDate(session.createdAt)}
                            </span>
                            {session.rpe ? <span>RPE {session.rpe}</span> : null}
                            {session.note ? <p>{session.note}</p> : null}
                          </div>
                          {index === 0 ? (
                            <button
                              className="button"
                              type="button"
                              onClick={() => handleRepeatWorkout(session)}
                            >
                              Repeat latest workout
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted-text">No workout sessions logged yet.</p>
                  )}
                </div>

                <div aria-label="Lift PRs">
                  <h4>Lift PRs</h4>
                  {workoutPrs.length ? (
                    <ul className="workout-pr-list">
                      {workoutPrs.map((record) => (
                        <li key={record.exerciseId}>
                          <strong>{record.exerciseLabel}</strong>
                          <span>
                            {formatLoad(record.maxLoadKg)} kg best / {formatLoad(record.maxVolumeKg)} kg volume
                          </span>
                          <small>{record.sessionCount} session(s)</small>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted-text">Log a session to build lift history.</p>
                  )}
                </div>

                <div className="workout-chart-panel" aria-label="Lift history charts">
                  <h4>Lift history</h4>
                  {workoutHistories.length ? (
                    <ul className="workout-chart-list">
                      {workoutHistories.map((history) => (
                        <li key={history.exerciseId}>
                          <div className="workout-chart-header">
                            <strong>{history.exerciseLabel}</strong>
                            <span>
                              {history.sessionCount} session(s), latest {formatDate(history.latestAt)}
                            </span>
                          </div>
                          <svg
                            className="workout-chart"
                            role="img"
                            aria-label={`${history.exerciseLabel} load and volume progression`}
                            viewBox="0 0 100 36"
                            preserveAspectRatio="none"
                          >
                            <line x1="4" y1="32" x2="96" y2="32" />
                            <polyline className="workout-chart-volume" points={history.volumeSparkline} />
                            <polyline className="workout-chart-load" points={history.loadSparkline} />
                          </svg>
                          <div className="workout-chart-legend">
                            <span>Load PR {formatLoad(history.maxLoadKg)} kg</span>
                            <span>Volume PR {formatLoad(history.maxVolumeKg)} kg</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted-text">Log multiple sessions to see per-lift charts.</p>
                  )}
                </div>
              </div>
            </section>

            <section className="photo-log-section" aria-label="Photo log">
              <div className="panel-header">
                <h3>Photo log</h3>
                <p>Local-only progress photos for body, face, and hair streams. No photo leaves this browser.</p>
              </div>

              <div className="photo-controls">
                <label className="field">
                  <span className="field-label">Photo category</span>
                  <select
                    aria-label="Photo category"
                    value={photoCategory}
                    onChange={(event) => setPhotoCategory(event.target.value)}
                  >
                    {photoCategoryOptions.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field photo-note-field">
                  <span className="field-label">Photo note</span>
                  <textarea
                    aria-label="Photo note"
                    value={photoNote}
                    onChange={(event) => setPhotoNote(event.target.value)}
                    placeholder="Day-0 front pose, same lighting."
                  />
                </label>
                <label className="button file-button photo-import-button">
                  Capture / import
                  <input
                    aria-label="Import progress photo"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoImport}
                  />
                </label>
              </div>

              {!photos.length ? (
                <p className="muted-text">
                  Add a day-0 photo when ready. It is a commitment marker, not a measurement.
                </p>
              ) : null}

              <div className="photo-stream-tabs" aria-label="Photo stream counts">
                {photoCounts.map((category) => (
                  <button
                    key={category.id}
                    className={`button ${photoFilter === category.id ? "is-active" : ""}`}
                    type="button"
                    onClick={() => setPhotoFilter(category.id)}
                  >
                    {category.label} {category.count}
                  </button>
                ))}
                <button
                  className={`button ${photoFilter === "all" ? "is-active" : ""}`}
                  type="button"
                  onClick={() => setPhotoFilter("all")}
                >
                  All {photos.length}
                </button>
              </div>

              {ghostPhoto ? (
                <div className="photo-ghost-panel" aria-label="Pose ghost overlay">
                  <div>
                    <h4>Pose ghost</h4>
                    <p>Use the selected previous {photoCategory} photo as a framing reference before the next import.</p>
                  </div>
                  <label className="field">
                    <span className="field-label">Ghost reference</span>
                    <select
                      aria-label="Ghost reference photo"
                      value={photoGhostId || ghostPhoto.id}
                      onChange={(event) => setPhotoGhostId(event.target.value)}
                    >
                      {categoryPhotos.map((photo) => (
                        <option key={photo.id} value={photo.id}>
                          {photoOptionLabel(photo)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Ghost opacity</span>
                    <input
                      aria-label="Ghost opacity"
                      type="range"
                      min="15"
                      max="70"
                      value={ghostOpacity}
                      onChange={(event) => setGhostOpacity(event.target.value)}
                    />
                  </label>
                  <div className="photo-ghost-frame">
                    <img
                      src={ghostPhoto.dataUrl}
                      alt={`${ghostPhoto.category} ghost reference`}
                      style={{ opacity: Number(ghostOpacity) / 100 }}
                    />
                    <span />
                  </div>
                </div>
              ) : null}

              {photos.length >= 2 ? (
                <div className="photo-compare-panel" aria-label="Photo comparison slider">
                  <div className="photo-compare-controls">
                    <label className="field">
                      <span className="field-label">Before photo</span>
                      <select
                        aria-label="Before photo"
                        value={photoBeforeId}
                        onChange={(event) => setPhotoBeforeId(event.target.value)}
                      >
                        {visiblePhotos.map((photo) => (
                          <option key={photo.id} value={photo.id}>
                            {photoOptionLabel(photo)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span className="field-label">After photo</span>
                      <select
                        aria-label="After photo"
                        value={photoAfterId}
                        onChange={(event) => setPhotoAfterId(event.target.value)}
                      >
                        {visiblePhotos.map((photo) => (
                          <option key={photo.id} value={photo.id}>
                            {photoOptionLabel(photo)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span className="field-label">Wipe</span>
                      <input
                        aria-label="Photo comparison position"
                        type="range"
                        min="0"
                        max="100"
                        value={photoSlider}
                        onChange={(event) => setPhotoSlider(event.target.value)}
                      />
                    </label>
                  </div>
                  {beforePhoto && afterPhoto ? (
                    <div className="photo-compare-frame">
                      <img src={beforePhoto.dataUrl} alt="Before progress" />
                      <img
                        className="photo-compare-after"
                        src={afterPhoto.dataUrl}
                        alt="After progress"
                        style={{ clipPath: `inset(0 ${100 - Number(photoSlider)}% 0 0)` }}
                      />
                      <i style={{ left: `${photoSlider}%` }} />
                    </div>
                  ) : null}
                </div>
              ) : null}

              {latestPhoto ? (
                <div className="photo-silhouette-pair" aria-label="Photo beside silhouette">
                  <figure>
                    <img src={latestPhoto.dataUrl} alt={`${latestPhoto.category} progress`} />
                    <figcaption>{photoOptionLabel(latestPhoto)}</figcaption>
                  </figure>
                  <SilhouetteView measurements={currentMeasurements} label="Photo reference profile" />
                </div>
              ) : null}

              <div aria-label="Progress photo gallery">
                {visiblePhotos.length ? (
                  <ul className="photo-gallery-list">
                    {visiblePhotos.map((photo) => (
                      <li key={photo.id}>
                        <img src={photo.dataUrl} alt={`${photo.category} progress thumbnail`} />
                        <div>
                          <strong>{photo.fileName}</strong>
                          <span>{photo.category} / {formatDate(photo.createdAt)}</span>
                          {photo.note ? <p>{photo.note}</p> : null}
                        </div>
                        <button
                          className="button"
                          type="button"
                          onClick={() => handleDeletePhoto(photo.id)}
                        >
                          Delete photo
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted-text">No photos in this stream yet.</p>
                )}
              </div>
            </section>

            <SnapshotPanel {...snapshotProps} />
          </div>
        )}

        {selectedPersona && account ? (
          <section className="persona-walkthrough" aria-label="Persona walkthrough">
            <h3>{selectedPersona.label} walkthrough</h3>
            <ol>
              {selectedPersona.walkthrough.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>
        ) : null}

        {status ? <p className="account-status-line">{status}</p> : null}
      </section>
    </div>
  );
}
