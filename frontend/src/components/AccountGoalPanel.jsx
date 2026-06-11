import { useEffect, useMemo, useState } from "react";
import FaceMeasurementPanel from "./FaceMeasurementPanel";
import SilhouetteView from "./SilhouetteView";
import SnapshotPanel from "./SnapshotPanel";
import {
  createShareDashboard,
  fetchAttractivenessEvidence,
  fetchBloodworkLibrary,
  fetchExerciseLibrary,
  fetchPlanningData,
  fetchProcedureLibrary,
  revokeShareDashboard,
  updateShareDashboard
} from "../lib/api";
import {
  buildAdaptiveTdeeEstimate
} from "../lib/adaptiveTdee";
import {
  appendGoalCheckIn,
  appendProtocolCheckIn,
  archiveUserProtocol,
  buildLocalProfileSummaries,
  buildTrendWeightSeries,
  calculateTrendWeight,
  clearSession,
  createLocalAccount,
  deleteUserCheckInsByType,
  deleteUserPhoto,
  loadAccounts,
  loadUserCheckIns,
  loadUserBloodworkResults,
  loadUserFaceMeasurements,
  loadSessionAccount,
  loadUserGoals,
  loadUserPhotos,
  loadUserProcedures,
  loadUserProtocols,
  loadUserWorkoutSessions,
  loginLocalAccount,
  persistSession,
  persistUserCheckIn,
  persistUserCheckIns,
  persistUserBloodworkResult,
  persistUserFaceMeasurement,
  persistUserGoal,
  persistUserPhoto,
  persistUserProcedure,
  persistUserProtocol,
  persistUserWorkoutSession,
  restoreUserBackupData,
  updateUserProtocol
} from "../lib/account";
import {
  buildMeasurementDueState
} from "../lib/measurementCadence";
import {
  buildLimbSymmetryCheckIn,
  formatLimbSymmetryItem,
  latestLimbSymmetryCheckIn,
  limbSplitFields,
  summarizeLimbSymmetrySplits
} from "../lib/limbSymmetry";
import {
  buildCycleCheckIn,
  buildCycleTrendContext,
  cycleFlowOptions,
  cyclePhaseOptions,
  formatCycleCheckIn,
  latestCycleCheckIn
} from "../lib/cycleTracking";
import {
  parseHistoricalWeightCsv,
  summarizeHistoricalWeightImport
} from "../lib/historyImport";
import {
  buildLocalBackupBundle,
  decryptLocalBackup,
  encryptLocalBackup,
  summarizeLocalBackupBundle
} from "../lib/localBackup";
import {
  clearSyncVaultState,
  createSyncVault,
  loadSyncVaultState,
  persistSyncVaultState,
  readSyncVault,
  revokeSyncVault,
  syncBlobToEncryptedBackup,
  updateSyncVault
} from "../lib/encryptedSync";
import {
  buildPlainJsonExport,
  serializePlainJsonExport,
  summarizePlainJsonExport
} from "../lib/localExport";
import {
  buildCheckInHeatmap,
  buildCheckInInsights,
  buildMilestones,
  buildWeeklyDigest,
  buildWeeklyStreak
} from "../lib/checkInLoop";
import {
  buildReliabilityPauseSummary
} from "../lib/reliabilityEvents";
import {
  buildEnergyProjection,
  buildPlanRetro,
  buildProjectedMeasurements,
  buildProtocolCaseLog,
  buildProtocolOutcomeSummary,
  formatProtocolSchemaSummary,
  splitAffectedFields
} from "../lib/protocolPlanning";
import {
  bloodworkMarkerById,
  buildBloodworkTrendRows,
  createBloodworkResult,
  fallbackBloodworkLibrary,
  formatBloodworkResult,
  formatReferenceRange,
  normalizeBloodworkLibrary,
  referenceRangeForMarker
} from "../lib/bloodwork";
import {
  evidenceForGoal,
  evidenceSourceSummary,
  fallbackAttractivenessEvidence,
  normalizeAttractivenessEvidence,
  verdictLabel
} from "../lib/attractivenessEvidence";
import {
  buildProcedureCaseLog,
  buildProcedureReliabilityCheckIn,
  createProcedureRecord,
  fallbackProcedureLibrary,
  formatProcedureRecord,
  normalizeProcedureLibrary
} from "../lib/procedures";
import {
  buildMeasurementTargetMetrics,
  buildSnapshotTargets
} from "../lib/localTargets";
import {
  buildMaintenanceDriftAlerts,
  buildGoalProgress,
  buildGoalPauseSummary,
  CUSTOM_GOAL_TARGET_ID,
  customGoalMetricOptions,
  goalTargetSourceLabel,
  parseCustomGoalMetrics
} from "../lib/goalTargets";
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
import {
  canAccessEntitlementFeature,
  entitlementTier,
  fallbackEntitlementConfig,
  loadReferralCredits,
  loadProWaitlistSignups,
  normalizeEntitlementConfig,
  referralCodeForAccount,
  restoreReferralCredits,
  saveReferralCredit,
  summarizeReferralCredits,
  saveProWaitlistSignup
} from "../lib/entitlements";
import {
  loadNotificationPreference,
  sendTrendReminderNotificationIfDue,
  syncTrendPushReminderSchedule,
  subscribeTrendPushNotifications,
  unsubscribeTrendPushNotifications
} from "../lib/notifications";
import {
  buildShareDashboardPayload,
  clearShareDashboardState,
  defaultShareDashboardState,
  loadShareDashboardState,
  persistShareDashboardState,
  publicShareDashboardUrl
} from "../lib/shareDashboard";

const emptyPlanningData = {
  personas: [],
  goalPresets: [],
  protocolTemplates: [],
  protocolTaxonomy: []
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

function remotePushStatusLabel(status) {
  switch (status) {
    case "subscribed":
      return "Remote stale-trend reminders are subscribed for this browser.";
    case "permission-required":
      return "Save Snapshot #1 and allow notifications before remote reminders can subscribe.";
    case "not-configured":
      return "Remote web push is not configured on this backend yet.";
    case "unsupported":
      return "Remote web push is not supported in this browser.";
    case "unsubscribed":
      return "Remote stale-trend reminders are unsubscribed for this browser.";
    case "failed":
      return "Remote reminder setup failed. Local reminders still work when this browser is open.";
    case "checking":
      return "Checking remote reminder support...";
    default:
      return "Local reminders work in this browser; remote push is optional.";
  }
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
    const hasCalories =
      checkIn.calories !== null &&
      checkIn.calories !== undefined &&
      checkIn.calories !== "" &&
      Number.isFinite(Number(checkIn.calories));
    const calories = hasCalories
      ? ` / ${Number(checkIn.calories)} kcal`
      : "";
    return `Daily weight: ${Number(checkIn.weight).toFixed(1)} kg${calories}`;
  }

  if (checkIn.type === "streak-freeze") {
    return "Weekly streak freeze";
  }

  if (checkIn.type === "life-event") {
    return `Reliability event: ${checkIn.eventMode} / ${Number(checkIn.durationDays || 0)} day window`;
  }

  if (checkIn.type === "limb-symmetry") {
    const summary = summarizeLimbSymmetrySplits(checkIn.splits);
    const summaryText = summary.items.slice(0, 2).map(formatLimbSymmetryItem).join("; ");
    return `Limb symmetry: ${summaryText || "split log"}`;
  }

  if (checkIn.type === "cycle-phase") {
    return `Cycle context: ${formatCycleCheckIn(checkIn)}`;
  }

  const prefix = checkIn.source === "guided" ? "Guided weekly measurements" : "Weekly measurements";
  return `${prefix}: waist ${Number(checkIn.measurements?.waistCircumference).toFixed(1)} cm`;
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
  entitlements = fallbackEntitlementConfig,
  onApplyMeasurements,
  snapshotProps,
  targetProfiles = [],
  onOpenStrategies,
  onClose,
  silhouetteView = "front"
}) {
  const [planningData, setPlanningData] = useState(emptyPlanningData);
  const [planningStatus, setPlanningStatus] = useState("Loading planning data...");
  const [exerciseLibrary, setExerciseLibrary] = useState(emptyExerciseLibrary);
  const [exerciseStatus, setExerciseStatus] = useState("Loading workout library...");
  const [procedureLibrary, setProcedureLibrary] = useState(() =>
    normalizeProcedureLibrary(fallbackProcedureLibrary)
  );
  const [procedureStatus, setProcedureStatus] = useState("Loading procedure library...");
  const [bloodworkLibrary, setBloodworkLibrary] = useState(() =>
    normalizeBloodworkLibrary(fallbackBloodworkLibrary)
  );
  const [bloodworkStatus, setBloodworkStatus] = useState("Loading bloodwork library...");
  const [attractivenessEvidence, setAttractivenessEvidence] = useState(() =>
    normalizeAttractivenessEvidence(fallbackAttractivenessEvidence)
  );
  const [attractivenessEvidenceStatus, setAttractivenessEvidenceStatus] = useState(
    "Loading attractiveness evidence notes..."
  );
  const [accounts, setAccounts] = useState(() => loadAccounts());
  const initialAccount = loadSessionAccount();
  const [account, setAccount] = useState(() => initialAccount);
  const initialSyncVaultState = loadSyncVaultState();
  const [goals, setGoals] = useState(() => loadUserGoals(initialAccount?.id));
  const [protocols, setProtocols] = useState(() => loadUserProtocols(initialAccount?.id));
  const [checkIns, setCheckIns] = useState(() => loadUserCheckIns(initialAccount?.id));
  const [workoutSessions, setWorkoutSessions] = useState(() =>
    loadUserWorkoutSessions(initialAccount?.id)
  );
  const [procedures, setProcedures] = useState(() =>
    loadUserProcedures(initialAccount?.id)
  );
  const [bloodworkResults, setBloodworkResults] = useState(() =>
    loadUserBloodworkResults(initialAccount?.id)
  );
  const [photos, setPhotos] = useState(() => loadUserPhotos(initialAccount?.id));
  const [faceMeasurements, setFaceMeasurements] = useState(() =>
    loadUserFaceMeasurements(initialAccount?.id)
  );
  const [syncVaultState, setSyncVaultState] = useState(() => initialSyncVaultState);
  const [syncVaultId, setSyncVaultId] = useState(() => initialSyncVaultState.vaultId);
  const [syncVaultToken, setSyncVaultToken] = useState(() => initialSyncVaultState.syncToken);
  const [syncDeviceId, setSyncDeviceId] = useState(
    () => initialSyncVaultState.deviceId || "browser-local"
  );
  const [syncStatus, setSyncStatus] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [selectedPersonaId, setSelectedPersonaId] = useState("");
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [selectedGoalTargetId, setSelectedGoalTargetId] = useState("");
  const [customGoalDeltas, setCustomGoalDeltas] = useState({});
  const [selectedProtocolTemplateId, setSelectedProtocolTemplateId] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [goalNote, setGoalNote] = useState("");
  const [protocolDose, setProtocolDose] = useState("");
  const [protocolFrequency, setProtocolFrequency] = useState("");
  const [protocolStartDate, setProtocolStartDate] = useState("");
  const [protocolEndDate, setProtocolEndDate] = useState("");
  const [protocolConfounders, setProtocolConfounders] = useState("");
  const [protocolCalorieDelta, setProtocolCalorieDelta] = useState("");
  const [protocolEditId, setProtocolEditId] = useState("");
  const [protocolAdherenceScore, setProtocolAdherenceScore] = useState("4");
  const [lifeEventMode, setLifeEventMode] = useState("procedure");
  const [lifeEventFields, setLifeEventFields] = useState("waistCircumference");
  const [lifeEventDurationDays, setLifeEventDurationDays] = useState("42");
  const [lifeEventNote, setLifeEventNote] = useState("");
  const [selectedProcedureTypeId, setSelectedProcedureTypeId] = useState("");
  const [procedureDate, setProcedureDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [procedureHealingDays, setProcedureHealingDays] = useState("");
  const [procedureAffectedFields, setProcedureAffectedFields] = useState("");
  const [procedureNote, setProcedureNote] = useState("");
  const [selectedBloodworkMarkerId, setSelectedBloodworkMarkerId] = useState("");
  const [bloodworkValue, setBloodworkValue] = useState("");
  const [bloodworkCollectedAt, setBloodworkCollectedAt] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [bloodworkProtocolId, setBloodworkProtocolId] = useState("");
  const [bloodworkNote, setBloodworkNote] = useState("");
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
  const [limbSplitValues, setLimbSplitValues] = useState({});
  const [limbSplitNote, setLimbSplitNote] = useState("");
  const [limbSplitErrors, setLimbSplitErrors] = useState({});
  const [cyclePhase, setCyclePhase] = useState("");
  const [cycleDay, setCycleDay] = useState("");
  const [cycleFlow, setCycleFlow] = useState("not-tracked");
  const [cycleSymptoms, setCycleSymptoms] = useState("");
  const [cycleNote, setCycleNote] = useState("");
  const [cycleErrors, setCycleErrors] = useState({});
  const [historyImportText, setHistoryImportText] = useState("");
  const [historyImportStatus, setHistoryImportStatus] = useState("");
  const [backupPassphrase, setBackupPassphrase] = useState("");
  const [backupStatus, setBackupStatus] = useState("");
  const [jsonExportStatus, setJsonExportStatus] = useState("");
  const [shareDashboardState, setShareDashboardState] = useState(() =>
    loadShareDashboardState()
  );
  const [shareDashboardStatus, setShareDashboardStatus] = useState("");
  const [remotePushStatus, setRemotePushStatus] = useState(
    () => loadNotificationPreference().remotePushStatus
  );
  const [proWaitlistEmail, setProWaitlistEmail] = useState("");
  const [proWaitlistStatus, setProWaitlistStatus] = useState("");
  const [referralCredits, setReferralCredits] = useState(() =>
    loadReferralCredits(initialAccount?.id)
  );
  const [referralCodeInput, setReferralCodeInput] = useState("");
  const [referralStatus, setReferralStatus] = useState("");
  const [selectedProtocolIds, setSelectedProtocolIds] = useState([]);
  const [status, setStatus] = useState("");

  const entitlementConfig = normalizeEntitlementConfig(entitlements);
  const currentTier = entitlementTier(entitlementConfig);
  const freeEntitlementFeatures = entitlementConfig.features.filter((feature) =>
    canAccessEntitlementFeature(entitlementConfig, feature.id)
  );
  const proPreviewFeatures = entitlementConfig.features.filter((feature) =>
    !canAccessEntitlementFeature(entitlementConfig, feature.id)
  );
  const accountReferralCode = account ? referralCodeForAccount(account) : "";
  const referralSummary = summarizeReferralCredits(referralCredits, entitlementConfig);
  const localProfileSummaries = useMemo(
    () => buildLocalProfileSummaries({ accounts }),
    [
      accounts,
      goals.length,
      protocols.length,
      checkIns.length,
      workoutSessions.length,
      procedures.length,
      bloodworkResults.length,
      photos.length,
      faceMeasurements.length
    ]
  );

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
    if (account?.email) {
      setProWaitlistEmail(account.email);
    }
  }, [account?.email]);

  useEffect(() => {
    const stored = loadSyncVaultState();
    if (account?.id && stored.accountId === account.id) {
      setSyncVaultState(stored);
      setSyncVaultId(stored.vaultId);
      setSyncVaultToken(stored.syncToken);
      setSyncDeviceId(stored.deviceId || `browser-${account.id.slice(0, 8)}`);
      return;
    }

    const nextDeviceId = account?.id ? `browser-${account.id.slice(0, 8)}` : "browser-local";
    setSyncVaultState({
      ...stored,
      accountId: "",
      vaultId: "",
      syncToken: "",
      deviceId: nextDeviceId,
      revision: 0,
      createdAt: "",
      updatedAt: ""
    });
    setSyncVaultId("");
    setSyncVaultToken("");
    setSyncDeviceId(nextDeviceId);
    setSyncStatus("");
  }, [account?.id]);

  useEffect(() => {
    const storedState = loadShareDashboardState();
    setShareDashboardState(
      storedState.accountId && storedState.accountId === account?.id
        ? storedState
        : defaultShareDashboardState()
    );
    setShareDashboardStatus("");
  }, [account?.id]);

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

  useEffect(() => {
    let isMounted = true;

    fetchProcedureLibrary()
      .then((data) => {
        if (!isMounted) {
          return;
        }

        const normalized = normalizeProcedureLibrary(data);
        setProcedureLibrary(normalized);
        setProcedureStatus(
          `Loaded ${normalized.procedureTypes.length} procedure type seed(s).`
        );
        setSelectedProcedureTypeId((current) => current || normalized.procedureTypes[0]?.id || "");
        setProcedureHealingDays(
          (current) => current || String(normalized.procedureTypes[0]?.defaultHealingDays || "")
        );
        setProcedureAffectedFields(
          (current) => current || normalized.procedureTypes[0]?.affectedFields.join(", ") || ""
        );
      })
      .catch(() => {
        if (isMounted) {
          const fallback = normalizeProcedureLibrary(fallbackProcedureLibrary);
          setProcedureLibrary(fallback);
          setProcedureStatus("Procedure library unavailable. Local fallback seed loaded.");
          setSelectedProcedureTypeId((current) => current || fallback.procedureTypes[0]?.id || "");
          setProcedureHealingDays(
            (current) => current || String(fallback.procedureTypes[0]?.defaultHealingDays || "")
          );
          setProcedureAffectedFields(
            (current) => current || fallback.procedureTypes[0]?.affectedFields.join(", ") || ""
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetchBloodworkLibrary()
      .then((data) => {
        if (!isMounted) {
          return;
        }

        const normalized = normalizeBloodworkLibrary(data);
        setBloodworkLibrary(normalized);
        setBloodworkStatus(`Loaded ${normalized.markers.length} bloodwork marker seed(s).`);
        setSelectedBloodworkMarkerId((current) => current || normalized.markers[0]?.id || "");
      })
      .catch(() => {
        if (isMounted) {
          const fallback = normalizeBloodworkLibrary(fallbackBloodworkLibrary);
          setBloodworkLibrary(fallback);
          setBloodworkStatus("Bloodwork library unavailable. Local fallback seed loaded.");
          setSelectedBloodworkMarkerId((current) => current || fallback.markers[0]?.id || "");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetchAttractivenessEvidence()
      .then((data) => {
        if (!isMounted) {
          return;
        }

        const normalized = normalizeAttractivenessEvidence(data);
        setAttractivenessEvidence(normalized);
        setAttractivenessEvidenceStatus(
          `Loaded ${normalized.metrics.length} evidence note seed(s).`
        );
      })
      .catch(() => {
        if (isMounted) {
          const fallback = normalizeAttractivenessEvidence(fallbackAttractivenessEvidence);
          setAttractivenessEvidence(fallback);
          setAttractivenessEvidenceStatus("Evidence notes unavailable. Local fallback framing loaded.");
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
  const selectedGoalEvidence = useMemo(
    () => evidenceForGoal(attractivenessEvidence, selectedGoal?.id),
    [attractivenessEvidence, selectedGoal?.id]
  );
  const profileGoalTargets = useMemo(
    () =>
      targetProfiles
        .filter((target) => target?.id && target?.measurements)
        .map((target) => ({
          ...target,
          id: `target:${target.id}`,
          targetId: target.id,
          label: `Target profile: ${target.label}`,
          goalTargetType: "target-profile"
        })),
    [targetProfiles]
  );
  const snapshotGoalTargets = useMemo(
    () => buildSnapshotTargets(snapshotProps.snapshots),
    [snapshotProps.snapshots]
  );
  const measurementGoalTargets = useMemo(
    () => [...profileGoalTargets, ...snapshotGoalTargets],
    [profileGoalTargets, snapshotGoalTargets]
  );
  const selectedGoalTarget = measurementGoalTargets.find(
    (target) => target.id === selectedGoalTargetId
  );
  const isCustomGoalTarget = selectedGoalTargetId === CUSTOM_GOAL_TARGET_ID;
  const selectedProtocolTemplate = planningData.protocolTemplates.find(
    (protocol) => protocol.id === selectedProtocolTemplateId
  );
  const selectedProcedureType = procedureLibrary.procedureTypes.find(
    (procedure) => procedure.id === selectedProcedureTypeId
  );
  const selectedBloodworkMarker = bloodworkMarkerById(
    bloodworkLibrary,
    selectedBloodworkMarkerId
  );
  const selectedBloodworkRange = selectedBloodworkMarker
    ? referenceRangeForMarker(selectedBloodworkMarker, currentMeasurements.sex)
    : null;
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
  const bloodworkTrends = useMemo(
    () => buildBloodworkTrendRows(bloodworkResults),
    [bloodworkResults]
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
  const adaptiveTdee = useMemo(() => buildAdaptiveTdeeEstimate(checkIns), [checkIns]);
  const weightReliabilityPause = useMemo(
    () =>
      buildReliabilityPauseSummary({
        checkIns,
        fieldName: "weight",
        entries: checkIns.filter((checkIn) => checkIn.type === "daily-weight")
      }),
    [checkIns]
  );
  const trendWeightChart = useMemo(
    () => buildTrendWeightChart(trendWeightSeries),
    [trendWeightSeries]
  );
  const cadenceDueState = useMemo(() => buildMeasurementDueState(checkIns), [checkIns]);
  const latestLimbSymmetry = useMemo(
    () => latestLimbSymmetryCheckIn(checkIns),
    [checkIns]
  );
  const latestLimbSymmetrySummary = useMemo(
    () => summarizeLimbSymmetrySplits(latestLimbSymmetry?.splits),
    [latestLimbSymmetry]
  );
  const latestCycleContext = useMemo(() => latestCycleCheckIn(checkIns), [checkIns]);
  const cycleTrendContext = useMemo(
    () => buildCycleTrendContext(checkIns),
    [checkIns]
  );
  const weeklyStreak = useMemo(() => buildWeeklyStreak(checkIns), [checkIns]);
  const checkInHeatmap = useMemo(() => buildCheckInHeatmap(checkIns), [checkIns]);
  const milestones = useMemo(
    () =>
      buildMilestones({
        checkIns,
        snapshots: snapshotProps.snapshots,
        goals,
        protocols,
        currentMeasurements
      }),
    [checkIns, currentMeasurements, goals, protocols, snapshotProps.snapshots]
  );
  const insightDrops = useMemo(
    () =>
      buildCheckInInsights({
        checkIns,
        trendWeight,
        goals,
        protocols,
        snapshots: snapshotProps.snapshots
      }),
    [checkIns, goals, protocols, snapshotProps.snapshots, trendWeight]
  );
  const weeklyDigest = useMemo(
    () =>
      buildWeeklyDigest({
        checkIns,
        trendWeight,
        weeklyStreak,
        protocols,
        milestones
      }),
    [checkIns, milestones, protocols, trendWeight, weeklyStreak]
  );
  const shareDashboardPayload = useMemo(
    () =>
      buildShareDashboardPayload({
        account,
        currentMeasurements,
        snapshots: snapshotProps.snapshots,
        goals,
        protocols,
        procedures,
        checkIns,
        workoutSessions,
        faceMeasurements,
        weeklyStreak,
        trendWeight
      }),
    [
      account,
      checkIns,
      currentMeasurements,
      faceMeasurements,
      goals,
      procedures,
      protocols,
      snapshotProps.snapshots,
      trendWeight,
      weeklyStreak,
      workoutSessions
    ]
  );
  useEffect(() => {
    if (!account) {
      return;
    }

    void sendTrendReminderNotificationIfDue({ weeklyStreak });
  }, [account?.id, weeklyStreak.latestAt, weeklyStreak.status]);

  useEffect(() => {
    if (!account || remotePushStatus !== "subscribed") {
      return;
    }

    void syncTrendPushReminderSchedule({ weeklyStreak });
  }, [
    account?.id,
    remotePushStatus,
    weeklyStreak.graceEndsAt,
    weeklyStreak.latestAt,
    weeklyStreak.status
  ]);

  const protocolSchemaSummary = useMemo(
    () => formatProtocolSchemaSummary(planningData.protocolTaxonomy),
    [planningData.protocolTaxonomy]
  );
  const lifeEvents = useMemo(
    () => checkIns.filter((checkIn) => checkIn.type === "life-event"),
    [checkIns]
  );

  useEffect(() => {
    setSelectedProtocolIds(selectedGoal?.suggestedProtocols || []);
  }, [selectedGoal?.id]);

  useEffect(() => {
    if (
      selectedGoalTargetId &&
      selectedGoalTargetId !== CUSTOM_GOAL_TARGET_ID &&
      !measurementGoalTargets.some((target) => target.id === selectedGoalTargetId)
    ) {
      setSelectedGoalTargetId("");
    }
  }, [measurementGoalTargets, selectedGoalTargetId]);

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
    setProcedures(loadUserProcedures(nextAccount?.id));
    setBloodworkResults(loadUserBloodworkResults(nextAccount?.id));
    setReferralCredits(loadReferralCredits(nextAccount?.id));
    setPhotos(loadUserPhotos(nextAccount?.id));
    setFaceMeasurements(loadUserFaceMeasurements(nextAccount?.id));
    setReferralCodeInput("");
    setReferralStatus("");
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

  function handleSwitchProfile(accountId) {
    const nextAccount = accounts.find((item) => item.id === accountId);
    if (!nextAccount) {
      setStatus("Local profile not found on this browser.");
      return;
    }

    persistSession(nextAccount.id);
    refreshAccountState(nextAccount);
    setLoginEmail("");
    setStatus(`Switched to ${nextAccount.displayName}.`);
  }

  function handleCustomGoalDeltaChange(metric, value) {
    setCustomGoalDeltas((current) => ({
      ...current,
      [metric]: value
    }));
  }

  function handleSetGoal(event) {
    event.preventDefault();
    if (!account || !selectedGoal) {
      return;
    }

    let targetMetrics = selectedGoal.targetMetrics;
    let targetSource = {
      type: "preset",
      label: "Preset deltas"
    };
    let targetMeasurements = null;

    if (isCustomGoalTarget) {
      targetMetrics = parseCustomGoalMetrics(customGoalDeltas);
      if (!Object.keys(targetMetrics).length) {
        setStatus("Enter at least one custom target delta.");
        return;
      }

      targetSource = {
        type: "custom",
        label: "Custom deltas"
      };
    } else if (selectedGoalTarget) {
      targetMetrics = buildMeasurementTargetMetrics(
        currentMeasurements,
        selectedGoalTarget.measurements
      );
      targetMeasurements = selectedGoalTarget.measurements;
      targetSource =
        selectedGoalTarget.goalTargetType === "target-profile"
          ? {
              type: "target-profile",
              targetId: selectedGoalTarget.targetId,
              label: selectedGoalTarget.label.replace(/^Target profile:\s*/, ""),
              sourceType: selectedGoalTarget.source_type
            }
          : {
              type: "past-self",
              snapshotId: selectedGoalTarget.snapshotId,
              label: selectedGoalTarget.label,
              createdAt: selectedGoalTarget.createdAt
            };
    }

    const nextGoal = persistUserGoal(account.id, {
      presetId: selectedGoal.id,
      label: selectedGoal.label,
      category: selectedGoal.category,
      summary: selectedGoal.summary,
      targetMetrics,
      targetSource,
      targetMeasurements,
      targetDate,
      note: goalNote.trim(),
      protocolIds: selectedProtocolIds,
      startingMeasurements: currentMeasurements
    });

    setGoals([nextGoal, ...goals]);
    setGoalNote("");
    if (isCustomGoalTarget) {
      setCustomGoalDeltas({});
    }
    setStatus(
      targetSource.type !== "preset"
        ? `Goal saved: ${selectedGoal.label} toward ${targetSource.label}.`
        : `Goal saved: ${selectedGoal.label}.`
    );
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

  function handleLimbSplitChange(name, value) {
    setLimbSplitValues((current) => ({
      ...current,
      [name]: value
    }));

    setLimbSplitErrors((current) => {
      if (!current[name] && !current.form) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[name];
      delete nextErrors.form;
      return nextErrors;
    });
  }

  function handleLimbSymmetryCheckIn(event) {
    event.preventDefault();
    if (!account) {
      return;
    }

    const result = buildLimbSymmetryCheckIn(limbSplitValues, limbSplitNote);
    setLimbSplitErrors(result.errors);

    if (!result.checkIn) {
      setStatus(result.errors.form || "Fix the highlighted limb split values.");
      return;
    }

    const nextCheckIn = persistUserCheckIn(account.id, result.checkIn);
    setCheckIns([nextCheckIn, ...checkIns]);
    setLimbSplitValues({});
    setLimbSplitNote("");
    setStatus("Limb symmetry split logged.");
  }

  function handleCycleCheckIn(event) {
    event.preventDefault();
    if (!account) {
      return;
    }

    const result = buildCycleCheckIn({
      phase: cyclePhase,
      cycleDay,
      flow: cycleFlow,
      symptoms: cycleSymptoms,
      note: cycleNote
    });
    setCycleErrors(result.errors);

    if (!result.checkIn) {
      setStatus(result.errors.phase || result.errors.cycleDay || "Fix the cycle context values.");
      return;
    }

    const nextCheckIn = persistUserCheckIn(account.id, result.checkIn);
    setCheckIns([nextCheckIn, ...checkIns]);
    setCyclePhase("");
    setCycleDay("");
    setCycleFlow("not-tracked");
    setCycleSymptoms("");
    setCycleNote("");
    setStatus("Cycle context logged locally.");
  }

  function handleDeleteCycleLogs() {
    if (!account) {
      return;
    }

    const nextCheckIns = deleteUserCheckInsByType(account.id, "cycle-phase");
    setCheckIns(nextCheckIns);
    setCycleErrors({});
    setStatus("Cycle logs deleted from this browser account.");
  }

  function importHistoricalWeightCsv(rawValue) {
    if (!account) {
      return;
    }

    const result = parseHistoricalWeightCsv(rawValue, {
      existingCheckIns: checkIns
    });

    if (!result.entries.length) {
      const reason =
        result.invalidRows[0]?.reason ||
        (result.duplicateRows ? "All dated rows were already logged." : "No weight rows found.");
      setHistoryImportStatus(reason);
      setStatus(`Historical import skipped: ${reason}`);
      return;
    }

    const nextCheckIns = persistUserCheckIns(account.id, result.entries);
    setCheckIns(nextCheckIns);
    setHistoryImportText("");
    const summary = summarizeHistoricalWeightImport(result);
    setHistoryImportStatus(summary);
    setStatus(summary);
  }

  function handleHistoricalWeightImport(event) {
    event.preventDefault();
    importHistoricalWeightCsv(historyImportText);
  }

  function handleHistoricalWeightFile(event) {
    const [file] = event.target.files || [];
    if (!file || !account) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      importHistoricalWeightCsv(String(reader.result || ""));
    };
    reader.onerror = () => {
      setHistoryImportStatus("CSV file import failed.");
      setStatus("Historical import failed.");
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function createWeeklyCheckIn({ source = "quick", saveSnapshot = false } = {}) {
    if (!account) {
      return;
    }

    const dueFields = [
      ...cadenceDueState.weekly.fields,
      ...(cadenceDueState.monthly.isDue ? cadenceDueState.monthly.fields : [])
    ].map((field) => field.label);
    const nextCheckIn = persistUserCheckIn(account.id, {
      type: "weekly-measurements",
      source,
      measurements: currentMeasurements,
      dueFields,
      note: checkInNote.trim()
    });

    setCheckIns([nextCheckIn, ...checkIns]);
    setCheckInNote("");
    const activeProtocols = protocols.filter((protocol) => protocol.status !== "archived");
    if (source === "guided" && activeProtocols.length) {
      let nextProtocols = protocols;
      for (const protocol of activeProtocols) {
        nextProtocols = appendProtocolCheckIn(account.id, protocol.id, {
          adherence: "weekly review",
          score: Number(protocolAdherenceScore),
          measurements: currentMeasurements,
          snapshotCount: snapshotProps.snapshots.length,
          confounders: checkInNote.trim()
        });
      }
      setProtocols(nextProtocols);
    }
    if (saveSnapshot) {
      const saved = snapshotProps.onSaveSnapshot({
        label: "Weekly check-in",
        note: checkInNote.trim() || `Guided weekly check-in: ${dueFields.join(", ")}.`,
        source: "weekly-check-in"
      });
      setStatus(
        saved === false
          ? "Weekly measurements logged. Fix measurement errors before saving the snapshot."
          : activeProtocols.length
            ? "Guided weekly check-in saved with snapshot and protocol review."
            : "Guided weekly check-in saved with snapshot."
      );
    } else {
      setStatus("Weekly measurements logged.");
    }
  }

  function handleWeeklyCheckIn() {
    createWeeklyCheckIn({ source: "quick" });
  }

  function handleGuidedWeeklyCheckIn() {
    createWeeklyCheckIn({ source: "guided", saveSnapshot: true });
  }

  function handleUseStreakFreeze() {
    if (!account || !weeklyStreak.freezeAvailable) {
      return;
    }

    const nextCheckIn = persistUserCheckIn(account.id, {
      type: "streak-freeze",
      note: "Used weekly grace freeze."
    });

    setCheckIns([nextCheckIn, ...checkIns]);
    setStatus("Weekly streak freeze used.");
  }

  async function handleEnableRemoteTrendPush() {
    setRemotePushStatus("checking");
    const result = await subscribeTrendPushNotifications({ weeklyStreak });
    setRemotePushStatus(result.preference.remotePushStatus);
    setStatus(
      result.subscribed
        ? result.deliveryConfigured
          ? "Remote stale-trend reminders subscribed for this browser."
          : "Remote reminder subscription saved; server delivery still needs VAPID send configuration."
        : remotePushStatusLabel(result.preference.remotePushStatus)
    );
  }

  async function handleDisableRemoteTrendPush() {
    setRemotePushStatus("checking");
    const result = await unsubscribeTrendPushNotifications();
    setRemotePushStatus(result.preference.remotePushStatus);
    setStatus(
      result.unsubscribed
        ? "Remote stale-trend reminders unsubscribed for this browser."
        : remotePushStatusLabel(result.preference.remotePushStatus)
    );
  }

  function clearProtocolForm() {
    setProtocolDose("");
    setProtocolFrequency("");
    setProtocolStartDate("");
    setProtocolEndDate("");
    setProtocolConfounders("");
    setProtocolCalorieDelta("");
    setProtocolEditId("");
  }

  function protocolFormPayload() {
    const calorieDelta = Number(protocolCalorieDelta);
    return {
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
      calorieDelta: Number.isFinite(calorieDelta) ? calorieDelta : null
    };
  }

  function handleStartProtocol(event) {
    event.preventDefault();
    if (!account || !selectedProtocolTemplate) {
      return;
    }

    const payload = protocolFormPayload();

    if (protocolEditId) {
      setProtocols(updateUserProtocol(account.id, protocolEditId, payload));
      clearProtocolForm();
      setStatus(`Protocol updated: ${payload.label}.`);
      return;
    }

    const nextProtocol = persistUserProtocol(account.id, {
      schemaVersion: 1,
      ...payload,
      startingMeasurements: currentMeasurements,
      startingSnapshotCount: snapshotProps.snapshots.length
    });

    setProtocols([nextProtocol, ...protocols]);
    clearProtocolForm();
    setStatus(`Protocol started: ${selectedProtocolTemplate.label}.`);
  }

  function handleProtocolCheckIn(protocolId, adherence) {
    const nextProtocols = appendProtocolCheckIn(account.id, protocolId, {
      adherence,
      score: Number(protocolAdherenceScore),
      measurements: currentMeasurements,
      snapshotCount: snapshotProps.snapshots.length,
      confounders: protocolConfounders.trim()
    });
    setProtocols(nextProtocols);
    setStatus("Protocol adherence check-in logged.");
  }

  function handleEditProtocol(protocol) {
    setProtocolEditId(protocol.id);
    setSelectedProtocolTemplateId(protocol.templateId);
    setProtocolDose(protocol.dose || "");
    setProtocolFrequency(protocol.frequency || "");
    setProtocolStartDate(protocol.startDate || "");
    setProtocolEndDate(protocol.endDate || "");
    setProtocolConfounders(protocol.confounders || "");
    setProtocolCalorieDelta(
      Number.isFinite(Number(protocol.calorieDelta)) ? String(protocol.calorieDelta) : ""
    );
    setStatus(`Editing protocol: ${protocol.label}.`);
  }

  function handleArchiveProtocol(protocolId) {
    setProtocols(archiveUserProtocol(account.id, protocolId));
    setStatus("Protocol archived.");
  }

  function handleLifeEvent(event) {
    event.preventDefault();
    if (!account) {
      return;
    }

    const nextCheckIn = persistUserCheckIn(account.id, {
      type: "life-event",
      eventMode: lifeEventMode,
      affectedFields: splitAffectedFields(lifeEventFields),
      durationDays: Number(lifeEventDurationDays) || 0,
      note: lifeEventNote.trim()
    });

    setCheckIns([nextCheckIn, ...checkIns]);
    setLifeEventNote("");
    setStatus("Reliability event logged.");
  }

  function handleProcedureTypeChange(procedureId) {
    setSelectedProcedureTypeId(procedureId);
    const nextProcedureType = procedureLibrary.procedureTypes.find(
      (procedure) => procedure.id === procedureId
    );

    if (!nextProcedureType) {
      return;
    }

    setProcedureHealingDays(String(nextProcedureType.defaultHealingDays));
    setProcedureAffectedFields(nextProcedureType.affectedFields.join(", "));
  }

  function handleLogProcedure(event) {
    event.preventDefault();
    if (!account || !selectedProcedureType) {
      return;
    }

    try {
      const procedureRecord = createProcedureRecord({
        template: selectedProcedureType,
        procedureDate,
        healingDays: procedureHealingDays,
        affectedFields: procedureAffectedFields,
        note: procedureNote,
        baselineMeasurements: currentMeasurements,
        snapshotCount: snapshotProps.snapshots.length
      });
      const nextProcedure = persistUserProcedure(account.id, procedureRecord);
      const reliabilityCheckIn = persistUserCheckIn(
        account.id,
        buildProcedureReliabilityCheckIn(nextProcedure)
      );

      setProcedures([nextProcedure, ...procedures]);
      setCheckIns([reliabilityCheckIn, ...checkIns]);
      setLifeEventMode("procedure");
      setLifeEventFields(nextProcedure.affectedFields.join(", "));
      setLifeEventDurationDays(String(nextProcedure.healingDays));
      setProcedureNote("");
      setStatus(`Procedure logged: ${nextProcedure.label}. Healing window added to reliability events.`);
    } catch (error) {
      setStatus(error.message);
    }
  }

  function handleBloodworkMarkerChange(markerId) {
    setSelectedBloodworkMarkerId(markerId);
  }

  function handleLogBloodwork(event) {
    event.preventDefault();
    if (!account || !selectedBloodworkMarker) {
      return;
    }

    try {
      const result = createBloodworkResult({
        marker: selectedBloodworkMarker,
        value: bloodworkValue,
        collectedAt: bloodworkCollectedAt,
        note: bloodworkNote,
        protocolId: bloodworkProtocolId,
        sex: currentMeasurements.sex
      });
      const nextResult = persistUserBloodworkResult(account.id, result);
      setBloodworkResults([nextResult, ...bloodworkResults]);
      setBloodworkValue("");
      setBloodworkNote("");
      setStatus(`Bloodwork logged locally: ${formatBloodworkResult(nextResult)}.`);
    } catch (error) {
      setStatus(error.message);
    }
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

  function handleSaveFaceMeasurement(faceMeasurement) {
    if (!account) {
      return;
    }

    const nextFaceMeasurement = persistUserFaceMeasurement(account.id, faceMeasurement);
    setFaceMeasurements([nextFaceMeasurement, ...faceMeasurements]);
  }

  function currentBackupBundle() {
    return buildLocalBackupBundle({
      account,
      snapshots: snapshotProps.snapshots,
      goals,
      protocols,
      checkIns,
      workoutSessions,
      procedures,
      bloodworkResults,
      referralCredits,
      photos,
      faceMeasurements
    });
  }

  function currentPlainJsonExport() {
    return buildPlainJsonExport({
      account,
      snapshots: snapshotProps.snapshots,
      goals,
      protocols,
      checkIns,
      workoutSessions,
      procedures,
      bloodworkResults,
      referralCredits,
      photos,
      faceMeasurements,
      proWaitlistSignups: loadProWaitlistSignups()
    });
  }

  function restoreBackupBundle(bundle) {
    const snapshotRestore = snapshotProps.onRestoreSnapshots
      ? snapshotProps.onRestoreSnapshots(bundle.snapshots)
      : { importedCount: 0, skippedCount: bundle.snapshots.length };
    const restoreResult = restoreUserBackupData(account.id, bundle);
    const referralRestore = restoreReferralCredits(account.id, bundle.referralCredits);
    const summary = summarizeLocalBackupBundle(bundle);

    setGoals(restoreResult.goals);
    setProtocols(restoreResult.protocols);
    setCheckIns(restoreResult.checkIns);
    setWorkoutSessions(restoreResult.workoutSessions);
    setProcedures(restoreResult.procedures);
    setBloodworkResults(restoreResult.bloodworkResults);
    setReferralCredits(referralRestore.credits);
    setFaceMeasurements(restoreResult.faceMeasurements);

    return `Restored backup: ${snapshotRestore.importedCount} snapshot(s), ${restoreResult.imported.checkIns} check-in(s), ${restoreResult.imported.goals} goal(s), ${restoreResult.imported.protocols} protocol(s), ${restoreResult.imported.workoutSessions} workout(s), ${restoreResult.imported.procedures} procedure(s), ${restoreResult.imported.bloodworkResults} lab result(s), ${referralRestore.importedCount} referral credit(s), ${restoreResult.imported.faceMeasurements} face scan(s). Photo manifest: ${summary.photoManifest} item(s); image files are not included.`;
  }

  function persistSyncRecord(record, token = syncVaultToken) {
    const nextState = persistSyncVaultState({
      accountId: account?.id || "",
      vaultId: record.vaultId || syncVaultId,
      syncToken: record.syncToken || token,
      deviceId: record.deviceId || syncDeviceId,
      revision: record.revision || 0,
      createdAt: record.createdAt || syncVaultState.createdAt,
      updatedAt: record.updatedAt || syncVaultState.updatedAt
    });

    setSyncVaultState(nextState);
    setSyncVaultId(nextState.vaultId);
    setSyncVaultToken(nextState.syncToken);
    setSyncDeviceId(nextState.deviceId || syncDeviceId);
    return nextState;
  }

  async function encryptedBackupForSync() {
    const bundle = currentBackupBundle();
    return {
      encryptedBackup: await encryptLocalBackup(bundle, backupPassphrase),
      summary: summarizeLocalBackupBundle(bundle)
    };
  }

  function missingSyncCredentials() {
    return !syncVaultId.trim() || !syncVaultToken.trim();
  }

  async function handlePublishShareDashboard() {
    if (!account) {
      return;
    }

    try {
      setShareDashboardStatus("Publishing read-only dashboard...");
      const response = await createShareDashboard(shareDashboardPayload);
      const nextState = persistShareDashboardState({
        accountId: account.id,
        publicToken: response.publicToken,
        revokeToken: response.revokeToken,
        publicUrl: publicShareDashboardUrl(response.publicToken),
        createdAt: response.createdAt,
        updatedAt: response.updatedAt
      });
      setShareDashboardState(nextState);
      setShareDashboardStatus("Read-only share dashboard published.");
    } catch (error) {
      setShareDashboardStatus("Share dashboard publish failed.");
    }
  }

  async function handleUpdateShareDashboard() {
    if (!shareDashboardState.publicToken || !shareDashboardState.revokeToken) {
      setShareDashboardStatus("Publish a share dashboard before updating it.");
      return;
    }

    try {
      setShareDashboardStatus("Updating read-only dashboard...");
      const response = await updateShareDashboard(
        shareDashboardState.publicToken,
        shareDashboardState.revokeToken,
        shareDashboardPayload
      );
      const nextState = persistShareDashboardState({
        ...shareDashboardState,
        accountId: account?.id || shareDashboardState.accountId,
        publicUrl:
          shareDashboardState.publicUrl || publicShareDashboardUrl(response.publicToken),
        updatedAt: response.updatedAt
      });
      setShareDashboardState(nextState);
      setShareDashboardStatus("Read-only share dashboard updated.");
    } catch (error) {
      setShareDashboardStatus("Share dashboard update failed.");
    }
  }

  async function handleCopyShareDashboardLink() {
    if (!shareDashboardState.publicUrl) {
      setShareDashboardStatus("Publish a share dashboard before copying it.");
      return;
    }

    try {
      await navigator.clipboard.writeText(shareDashboardState.publicUrl);
      setShareDashboardStatus("Read-only share link copied.");
    } catch (error) {
      setShareDashboardStatus(shareDashboardState.publicUrl);
    }
  }

  async function handleRevokeShareDashboard() {
    if (!shareDashboardState.publicToken || !shareDashboardState.revokeToken) {
      setShareDashboardState(clearShareDashboardState());
      setShareDashboardStatus("No active share dashboard to revoke.");
      return;
    }

    try {
      setShareDashboardStatus("Revoking read-only dashboard...");
      await revokeShareDashboard(
        shareDashboardState.publicToken,
        shareDashboardState.revokeToken
      );
      setShareDashboardState(clearShareDashboardState());
      setShareDashboardStatus("Read-only share dashboard revoked.");
    } catch (error) {
      setShareDashboardStatus("Share dashboard revoke failed.");
    }
  }

  function handleDownloadJsonExport() {
    const bundle = currentPlainJsonExport();
    const summary = summarizePlainJsonExport(bundle);
    const blob = new Blob([serializePlainJsonExport(bundle)], {
      type: "application/json"
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = account
      ? `bodymod-${account.email.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-export.json`
      : "bodymod-local-export.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    setJsonExportStatus(
      `JSON export downloaded: ${summary.snapshots} snapshot(s), ${summary.checkIns} check-in(s), ${summary.procedures} procedure(s), ${summary.bloodworkResults} lab result(s), ${summary.referralCredits} referral credit(s), ${summary.dietEntries} diet log(s), ${summary.fluidEntries} fluid log(s), and ${summary.photoManifest} photo manifest item(s).`
    );
  }

  async function handleDownloadEncryptedBackup() {
    if (!account) {
      return;
    }

    try {
      const bundle = currentBackupBundle();
      const encryptedBackup = await encryptLocalBackup(bundle, backupPassphrase);
      const summary = summarizeLocalBackupBundle(bundle);
      const blob = new Blob([encryptedBackup], {
        type: "application/json"
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "bodymod-encrypted-backup.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setBackupStatus(
        `Encrypted backup downloaded: ${summary.snapshots} snapshot(s), ${summary.checkIns} check-in(s), ${summary.goals} goal(s), ${summary.protocols} protocol(s), ${summary.procedures} procedure(s), ${summary.bloodworkResults} lab result(s), ${summary.referralCredits} referral credit(s), and ${summary.photoManifest} photo manifest item(s).`
      );
    } catch (error) {
      setBackupStatus(error.message);
    }
  }

  function handleRestoreEncryptedBackup(event) {
    const [file] = event.target.files || [];
    if (!account || !file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const bundle = await decryptLocalBackup(String(reader.result || ""), backupPassphrase);
        setBackupStatus(restoreBackupBundle(bundle));
      } catch (error) {
        setBackupStatus(error.message);
      } finally {
        event.target.value = "";
      }
    };
    reader.onerror = () => {
      setBackupStatus("Encrypted backup restore failed.");
      event.target.value = "";
    };
    reader.readAsText(file);
  }

  async function handleCreateSyncVault() {
    if (!account) {
      return;
    }

    try {
      setSyncStatus("Creating encrypted sync vault...");
      const deviceId = syncDeviceId.trim() || `browser-${account.id.slice(0, 8)}`;
      const { encryptedBackup, summary } = await encryptedBackupForSync();
      const record = await createSyncVault({
        encryptedBackup,
        deviceId
      });
      persistSyncRecord(record, record.syncToken);
      setSyncStatus(
        `Encrypted sync vault created at revision ${record.revision}. Store the sync token before using another browser. Uploaded ${summary.checkIns} check-in(s), ${summary.goals} goal(s), and ${summary.photoManifest} photo manifest item(s).`
      );
    } catch (error) {
      setSyncStatus(error.message || "Encrypted sync vault creation failed.");
    }
  }

  async function handlePushSyncVault({ force = false } = {}) {
    if (!account) {
      return;
    }
    if (missingSyncCredentials()) {
      setSyncStatus("Enter a sync vault ID and token before pushing.");
      return;
    }

    try {
      setSyncStatus(force ? "Force pushing encrypted sync vault..." : "Pushing encrypted sync vault...");
      const { encryptedBackup, summary } = await encryptedBackupForSync();
      const record = await updateSyncVault({
        vaultId: syncVaultId.trim(),
        syncToken: syncVaultToken.trim(),
        expectedRevision: Math.max(1, Number(syncVaultState.revision || 1)),
        encryptedBackup,
        deviceId: syncDeviceId.trim() || "browser-local",
        force
      });
      persistSyncRecord(record);
      setSyncStatus(
        `Encrypted sync vault pushed at revision ${record.revision}: ${summary.checkIns} check-in(s), ${summary.goals} goal(s), and ${summary.protocols} protocol(s).`
      );
    } catch (error) {
      if (error.status === 409) {
        setSyncStatus(
          `Encrypted sync conflict at server revision ${error.detail?.currentRevision || "unknown"}. Pull first, or force push to overwrite.`
        );
      } else {
        setSyncStatus(error.message || "Encrypted sync push failed.");
      }
    }
  }

  async function handlePullSyncVault() {
    if (!account) {
      return;
    }
    if (missingSyncCredentials()) {
      setSyncStatus("Enter a sync vault ID and token before pulling.");
      return;
    }

    try {
      setSyncStatus("Pulling encrypted sync vault...");
      const record = await readSyncVault({
        vaultId: syncVaultId.trim(),
        syncToken: syncVaultToken.trim()
      });
      const encryptedBackup = syncBlobToEncryptedBackup(record.blob, record.updatedAt);
      const bundle = await decryptLocalBackup(encryptedBackup, backupPassphrase);
      const restoreSummary = restoreBackupBundle(bundle);
      persistSyncRecord(record);
      setSyncStatus(`Pulled encrypted sync vault revision ${record.revision}. ${restoreSummary}`);
    } catch (error) {
      setSyncStatus(error.message || "Encrypted sync pull failed.");
    }
  }

  async function handleRevokeSyncVault() {
    if (missingSyncCredentials()) {
      setSyncVaultState(clearSyncVaultState());
      setSyncVaultId("");
      setSyncVaultToken("");
      setSyncStatus("No sync vault credentials to revoke.");
      return;
    }

    try {
      setSyncStatus("Revoking encrypted sync vault...");
      await revokeSyncVault({
        vaultId: syncVaultId.trim(),
        syncToken: syncVaultToken.trim()
      });
      const cleared = clearSyncVaultState();
      setSyncVaultState(cleared);
      setSyncVaultId("");
      setSyncVaultToken("");
      setSyncStatus("Encrypted sync vault revoked and local credentials cleared.");
    } catch (error) {
      setSyncStatus(error.message || "Encrypted sync revoke failed.");
    }
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
      procedures,
      bloodworkResults,
      photos,
      faceMeasurements
    });
    setStatus("Progress report downloaded.");
  }

  function handleProWaitlistSubmit(event) {
    event.preventDefault();

    try {
      const signup = saveProWaitlistSignup({
        email: proWaitlistEmail || account?.email,
        accountId: account?.id || "",
        source: "account-panel"
      });
      const count = loadProWaitlistSignups().length;
      setProWaitlistStatus(
        signup.duplicate
          ? `Already on the local Pro waitlist. ${count} saved signup(s) on this browser.`
          : `Saved to the local Pro waitlist. ${count} saved signup(s) on this browser.`
      );
    } catch (error) {
      setProWaitlistStatus(error.message);
    }
  }

  async function handleCopyReferralInvite() {
    if (!accountReferralCode) {
      return;
    }

    const text = `Try Body Cafe with my referral code ${accountReferralCode}. Future Pro credits are optional; tracking and exports stay free.`;
    try {
      await navigator.clipboard.writeText(text);
      setReferralStatus("Referral invite copied.");
    } catch (error) {
      setReferralStatus(text);
    }
  }

  function handleReferralSubmit(event) {
    event.preventDefault();

    try {
      const credit = saveReferralCredit(
        {
          accountId: account?.id || "",
          accountEmail: account?.email || "",
          referralCode: referralCodeInput,
          ownReferralCode: accountReferralCode
        },
        entitlementConfig
      );
      setReferralCredits(loadReferralCredits(account?.id));
      setReferralCodeInput("");
      setReferralStatus(
        credit.duplicate
          ? "Referral credit already logged locally."
          : `Referral credit logged locally: ${credit.rewardLabel}.`
      );
    } catch (error) {
      setReferralStatus(error.message);
    }
  }

  return (
    <div className="account-overlay" role="presentation">
      <section
        className="account-panel panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-panel-heading"
      >
        <button className="modal-close account-close" type="button" aria-label="Close account panel" onClick={onClose}>
          x
        </button>

        <div className="panel-header account-header">
          <div>
            <h2 id="account-panel-heading">Account, logs, and goals</h2>
            <p>Local-first profile tools for persona walkthroughs, snapshots, and build plans.</p>
          </div>
          <span className="account-status" role="status" aria-live="polite">
            {planningStatus}
          </span>
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

            {localProfileSummaries.length ? (
              <section className="profile-switcher" aria-label="Local profiles on this browser">
                <div>
                  <h3>Local profiles</h3>
                  <p>
                    Switch between separate browser-local profile stores for
                    household, coach, or personal experiments.
                  </p>
                </div>
                <ul className="profile-switcher-list">
                  {localProfileSummaries.map((profile) => (
                    <li key={profile.id}>
                      <div>
                        <strong>{profile.displayName}</strong>
                        <span>{profile.email}</span>
                        <small>{profile.totalRecords} local record(s)</small>
                      </div>
                      <button
                        className="button"
                        type="button"
                        onClick={() => handleSwitchProfile(profile.id)}
                      >
                        Switch
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="local-json-export-section" aria-label="Local JSON export">
              <div>
                <h3>Local JSON export</h3>
                <p>
                  Download readable local data anytime. Without an account,
                  this includes snapshots, diet logs, food library rows, fluid
                  logs, and local waitlist records on this browser.
                </p>
              </div>
              <button className="button" type="button" onClick={handleDownloadJsonExport}>
                Download JSON export
              </button>
              {jsonExportStatus ? (
                <small className="local-json-export-status" role="status" aria-live="polite">
                  {jsonExportStatus}
                </small>
              ) : null}
            </section>
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

            {localProfileSummaries.length > 1 ? (
              <section className="profile-switcher" aria-label="Profile switcher">
                <div>
                  <h3>Profile switcher</h3>
                  <p>
                    Each local profile has separate goals, protocols, check-ins,
                    procedures, workouts, photos, labs, and face metric logs.
                  </p>
                </div>
                <ul className="profile-switcher-list">
                  {localProfileSummaries.map((profile) => (
                    <li key={profile.id} className={profile.id === account.id ? "is-active" : ""}>
                      <div>
                        <strong>{profile.displayName}</strong>
                        <span>{profile.email}</span>
                        <small>
                          {profile.counts.checkIns} check-in(s), {profile.counts.goals} goal(s),{" "}
                          {profile.counts.protocols} protocol(s)
                        </small>
                      </div>
                      <button
                        className="button"
                        type="button"
                        onClick={() => handleSwitchProfile(profile.id)}
                        disabled={profile.id === account.id}
                      >
                        {profile.id === account.id ? "Current" : "Switch"}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="entitlement-section" aria-label="Plan and access">
              <div className="entitlement-current">
                <div>
                  <h3>{currentTier.label} plan</h3>
                  <p>{currentTier.summary}</p>
                </div>
                <strong>{entitlementConfig.waitlist.storage}</strong>
              </div>
              <div className="entitlement-grid">
                <div className="entitlement-free" aria-label="Free included features">
                  <h4>Included now</h4>
                  <ul>
                    {freeEntitlementFeatures.map((feature) => (
                      <li key={feature.id}>
                        <strong>{feature.label}</strong>
                        <span>{feature.summary}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <form
                  className="pro-waitlist-card"
                  aria-label="Pro waitlist signup"
                  onSubmit={handleProWaitlistSubmit}
                >
                  <h4>Pro preview</h4>
                  <p>{entitlementConfig.waitlist.message}</p>
                  <div className="pro-preview-list" aria-label="Locked Pro previews">
                    {proPreviewFeatures.map((feature) => (
                      <article key={feature.id} className="pro-preview-card">
                        <strong>{feature.label}</strong>
                        <span>{feature.category} / {feature.status}</span>
                        <p>{feature.summary}</p>
                      </article>
                    ))}
                  </div>
                  <label className="field">
                    <span className="field-label">Waitlist email</span>
                    <input
                      aria-label="Pro waitlist email"
                      type="email"
                      value={proWaitlistEmail}
                      onChange={(event) => setProWaitlistEmail(event.target.value)}
                      placeholder={account.email}
                    />
                  </label>
                  <button className="button" type="submit">
                    Join Pro waitlist
                  </button>
                  {proWaitlistStatus ? (
                    <small className="pro-waitlist-status" role="status" aria-live="polite">
                      {proWaitlistStatus}
                    </small>
                  ) : null}
                </form>
              </div>
              <form
                className="referral-card"
                aria-label="Referral credits"
                onSubmit={handleReferralSubmit}
              >
                <div>
                  <h4>Honest referral</h4>
                  <p>{entitlementConfig.referral.message}</p>
                  <small>{entitlementConfig.referral.disclaimer}</small>
                </div>
                <div className="referral-code-row">
                  <span>Your code</span>
                  <strong>{accountReferralCode}</strong>
                  <button className="button" type="button" onClick={handleCopyReferralInvite}>
                    Copy invite
                  </button>
                </div>
                <label className="field">
                  <span className="field-label">Friend referral code</span>
                  <input
                    aria-label="Friend referral code"
                    value={referralCodeInput}
                    onChange={(event) => setReferralCodeInput(event.target.value)}
                    placeholder="BM-FRIEND1"
                  />
                </label>
                <button className="button" type="submit">
                  Log referral credit
                </button>
                <span>
                  {referralSummary.count} local credit(s), {referralSummary.earnedMonths} future Pro month(s).
                </span>
                {referralCredits.length ? (
                  <ul className="referral-credit-list" aria-label="Logged referral entries">
                    {referralCredits.slice(0, 3).map((credit) => (
                      <li key={credit.id}>
                        <strong>{credit.referralCode}</strong>
                        <span>{credit.rewardLabel} / {credit.status}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {referralStatus ? (
                  <small className="referral-status" role="status" aria-live="polite">
                    {referralStatus}
                  </small>
                ) : null}
              </form>
            </section>

            <section className="progress-report-section" aria-label="Progress report">
              <div>
                <h3>Progress report</h3>
                <p>
                  Printable local summary of measurements, snapshots, goals,
                  protocol adherence, procedures, bloodwork, workout PRs, and
                  the photo manifest.
                </p>
                <span>
                  {snapshotProps.snapshots.length} snapshot(s) / {protocols.length} protocol(s) / {procedures.length} procedure(s) / {bloodworkResults.length} lab result(s) / {workoutSessions.length} workout(s) / {photos.length} photo(s) / {faceMeasurements.length} face scan(s)
                </span>
              </div>
              <button className="button" type="button" onClick={handleDownloadProgressReport}>
                Download progress report
              </button>
            </section>

            <section className="share-dashboard-section" aria-label="Read-only share dashboard">
              <div>
                <h3>Read-only share dashboard</h3>
                <p>
                  Publish an opt-in public profile summary with current
                  measurements, recent snapshots, goals, and active protocols.
                  Email, private notes, photo files, and local account IDs stay
                  out of the payload.
                </p>
                <span>
                  {shareDashboardState.publicUrl
                    ? `Active link: ${shareDashboardState.publicUrl}`
                    : "No active read-only share link."}
                </span>
              </div>
              <div className="share-dashboard-actions">
                <button className="button" type="button" onClick={handlePublishShareDashboard}>
                  Publish share dashboard
                </button>
                <button
                  className="button"
                  type="button"
                  onClick={handleUpdateShareDashboard}
                  disabled={!shareDashboardState.publicToken}
                >
                  Update share dashboard
                </button>
                <button
                  className="button"
                  type="button"
                  onClick={handleCopyShareDashboardLink}
                  disabled={!shareDashboardState.publicUrl}
                >
                  Copy share link
                </button>
                <button
                  className="button"
                  type="button"
                  onClick={handleRevokeShareDashboard}
                  disabled={!shareDashboardState.publicToken}
                >
                  Revoke share dashboard
                </button>
              </div>
              {shareDashboardStatus ? (
                <small className="share-dashboard-status" role="status" aria-live="polite">
                  {shareDashboardStatus}
                </small>
              ) : null}
            </section>

            <section className="local-json-export-section" aria-label="Local JSON export">
              <div>
                <h3>Local JSON export</h3>
                <p>
                  Download a readable JSON copy of snapshots, account logs,
                  goals, protocols, procedures, local-only bloodwork, workouts,
                  face metric logs, diet data, and photo manifests. This is
                  portable, not encrypted.
                </p>
              </div>
              <button className="button" type="button" onClick={handleDownloadJsonExport}>
                Download JSON export
              </button>
              {jsonExportStatus ? (
                <small className="local-json-export-status" role="status" aria-live="polite">
                  {jsonExportStatus}
                </small>
              ) : null}
            </section>

            <section className="encrypted-backup-section" aria-label="Encrypted local backup">
              <div>
                <h3>Encrypted backup</h3>
                <p>
                  Download a passphrase-encrypted local backup for snapshots,
                  check-ins, goals, protocols, procedures, local-only
                  bloodwork, workouts, and face metric logs.
                  Photos are included as a manifest only.
                </p>
              </div>
              <label className="field">
                <span className="field-label">Backup passphrase</span>
                <input
                  aria-label="Backup passphrase"
                  type="password"
                  value={backupPassphrase}
                  onChange={(event) => setBackupPassphrase(event.target.value)}
                  placeholder="8+ characters"
                />
              </label>
              <div className="encrypted-backup-actions">
                <button className="button" type="button" onClick={handleDownloadEncryptedBackup}>
                  Download encrypted backup
                </button>
                <label className="button file-button">
                  Restore encrypted backup
                  <input
                    aria-label="Restore encrypted backup file"
                    type="file"
                    accept=".json,application/json"
                    onChange={handleRestoreEncryptedBackup}
                  />
                </label>
              </div>
              {backupStatus ? (
                <small className="encrypted-backup-status" role="status" aria-live="polite">
                  {backupStatus}
                </small>
              ) : null}
            </section>

            <section className="encrypted-sync-section" aria-label="Encrypted sync vault">
              <div>
                <h3>Encrypted sync vault</h3>
                <p>
                  Prototype cross-device sync stores only the encrypted backup
                  blob on the server. Keep the sync token private; it cannot
                  be recovered if lost.
                </p>
              </div>
              <div className="encrypted-sync-fields">
                <label className="field">
                  <span className="field-label">Device ID</span>
                  <input
                    aria-label="Sync device ID"
                    value={syncDeviceId}
                    onChange={(event) => setSyncDeviceId(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Vault ID</span>
                  <input
                    aria-label="Sync vault ID"
                    value={syncVaultId}
                    onChange={(event) => setSyncVaultId(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Sync token</span>
                  <input
                    aria-label="Sync token"
                    type="password"
                    value={syncVaultToken}
                    onChange={(event) => setSyncVaultToken(event.target.value)}
                  />
                </label>
              </div>
              <div className="encrypted-sync-actions">
                <button className="button" type="button" onClick={handleCreateSyncVault}>
                  Create sync vault
                </button>
                <button className="button" type="button" onClick={() => handlePushSyncVault()}>
                  Push encrypted sync
                </button>
                <button className="button" type="button" onClick={handlePullSyncVault}>
                  Pull encrypted sync
                </button>
                <button className="button" type="button" onClick={() => handlePushSyncVault({ force: true })}>
                  Force push
                </button>
                <button className="button" type="button" onClick={handleRevokeSyncVault}>
                  Revoke sync vault
                </button>
              </div>
              {syncVaultState.vaultId ? (
                <small className="encrypted-sync-meta">
                  Revision {syncVaultState.revision || 0}
                  {syncVaultState.updatedAt ? ` / updated ${formatDate(syncVaultState.updatedAt)}` : ""}
                </small>
              ) : null}
              {syncStatus ? (
                <small className="encrypted-sync-status" role="status" aria-live="polite">
                  {syncStatus}
                </small>
              ) : null}
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
                <button className="button" type="button" onClick={handleGuidedWeeklyCheckIn}>
                  Finish guided weekly check-in
                </button>
              </form>
              <form
                className="limb-symmetry-card"
                aria-label="Limb symmetry tracker"
                onSubmit={handleLimbSymmetryCheckIn}
              >
                <div className="limb-symmetry-copy">
                  <strong>Optional left/right limb splits</strong>
                  <p>
                    Keep the single body measurement as the default, or log dated
                    side-to-side values for symmetry tracking.
                  </p>
                </div>
                <div className="limb-split-grid">
                  {limbSplitFields.map((field) => {
                    const singleValue = Number(currentMeasurements[field.id]);
                    const singleLabel = Number.isFinite(singleValue)
                      ? `${singleValue.toFixed(1)} cm single value`
                      : "single value unchanged";

                    return (
                      <div key={field.id} className="limb-split-row">
                        <div className="limb-split-label">
                          <strong>{field.label}</strong>
                          <span>{singleLabel}</span>
                        </div>
                        <label className="field compact-field">
                          <span className="field-label">Left</span>
                          <input
                            aria-label={`${field.label} left`}
                            inputMode="decimal"
                            value={limbSplitValues[field.leftKey] || ""}
                            onChange={(event) =>
                              handleLimbSplitChange(field.leftKey, event.target.value)
                            }
                            placeholder={Number.isFinite(singleValue) ? singleValue.toFixed(1) : ""}
                          />
                          {limbSplitErrors[field.leftKey] ? (
                            <span className="field-error">{limbSplitErrors[field.leftKey]}</span>
                          ) : null}
                        </label>
                        <label className="field compact-field">
                          <span className="field-label">Right</span>
                          <input
                            aria-label={`${field.label} right`}
                            inputMode="decimal"
                            value={limbSplitValues[field.rightKey] || ""}
                            onChange={(event) =>
                              handleLimbSplitChange(field.rightKey, event.target.value)
                            }
                            placeholder={Number.isFinite(singleValue) ? singleValue.toFixed(1) : ""}
                          />
                          {limbSplitErrors[field.rightKey] ? (
                            <span className="field-error">{limbSplitErrors[field.rightKey]}</span>
                          ) : null}
                        </label>
                      </div>
                    );
                  })}
                </div>
                <label className="field limb-split-note">
                  <span className="field-label">Limb split note</span>
                  <textarea
                    aria-label="Limb split note"
                    value={limbSplitNote}
                    onChange={(event) => setLimbSplitNote(event.target.value)}
                    placeholder="Right arm usually pumped after tennis."
                  />
                </label>
                <button className="button" type="submit">
                  Log limb symmetry
                </button>
                {limbSplitErrors.form ? (
                  <small className="history-import-status" role="alert">
                    {limbSplitErrors.form}
                  </small>
                ) : null}
                {latestLimbSymmetry ? (
                  <div className="limb-symmetry-summary" aria-label="Latest limb symmetry">
                    <strong>
                      Latest symmetry: {latestLimbSymmetrySummary.status === "watch" ? "watch" : "balanced"}
                    </strong>
                    <span>{formatDate(latestLimbSymmetry.createdAt)}</span>
                    <ul>
                      {latestLimbSymmetrySummary.items.map((item) => (
                        <li key={item.field}>{formatLimbSymmetryItem(item)}</li>
                      ))}
                    </ul>
                    {latestLimbSymmetry.note ? <p>{latestLimbSymmetry.note}</p> : null}
                  </div>
                ) : (
                  <p className="muted-text">
                    No limb split logs yet. Leave this blank unless side-to-side
                    tracking matters for your current goal.
                  </p>
                )}
              </form>
              <form
                className="cycle-context-card"
                aria-label="Cycle-aware tracking"
                onSubmit={handleCycleCheckIn}
              >
                <div className="cycle-context-copy">
                  <strong>Optional cycle context</strong>
                  <p>
                    Strictly local phase labels for interpreting short-term
                    weight or waist noise. Leave it off if it is not relevant.
                  </p>
                </div>
                <label className="field">
                  <span className="field-label">Cycle phase</span>
                  <select
                    aria-label="Cycle phase"
                    value={cyclePhase}
                    onChange={(event) => {
                      setCyclePhase(event.target.value);
                      setCycleErrors((current) => {
                        const nextErrors = { ...current };
                        delete nextErrors.phase;
                        return nextErrors;
                      });
                    }}
                  >
                    <option value="">Off / not logging</option>
                    {cyclePhaseOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {cycleErrors.phase ? (
                    <span className="field-error">{cycleErrors.phase}</span>
                  ) : null}
                </label>
                <label className="field">
                  <span className="field-label">Cycle day optional</span>
                  <input
                    aria-label="Cycle day"
                    inputMode="numeric"
                    value={cycleDay}
                    onChange={(event) => {
                      setCycleDay(event.target.value);
                      setCycleErrors((current) => {
                        const nextErrors = { ...current };
                        delete nextErrors.cycleDay;
                        return nextErrors;
                      });
                    }}
                    placeholder="21"
                  />
                  {cycleErrors.cycleDay ? (
                    <span className="field-error">{cycleErrors.cycleDay}</span>
                  ) : null}
                </label>
                <label className="field">
                  <span className="field-label">Flow optional</span>
                  <select
                    aria-label="Cycle flow"
                    value={cycleFlow}
                    onChange={(event) => setCycleFlow(event.target.value)}
                  >
                    {cycleFlowOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field cycle-symptoms-field">
                  <span className="field-label">Symptoms optional</span>
                  <input
                    aria-label="Cycle symptoms"
                    value={cycleSymptoms}
                    onChange={(event) => setCycleSymptoms(event.target.value)}
                    placeholder="bloating, cramps"
                  />
                </label>
                <label className="field cycle-note-field">
                  <span className="field-label">Cycle note</span>
                  <textarea
                    aria-label="Cycle note"
                    value={cycleNote}
                    onChange={(event) => setCycleNote(event.target.value)}
                    placeholder="Expect water retention this week."
                  />
                </label>
                <div className="cycle-actions">
                  <button className="button" type="submit">
                    Log cycle context
                  </button>
                  <button
                    className="button"
                    type="button"
                    onClick={handleDeleteCycleLogs}
                    disabled={!latestCycleContext}
                  >
                    Delete cycle logs
                  </button>
                </div>
                <div className="cycle-context-summary" aria-label="Latest cycle context">
                  <strong>{cycleTrendContext.label}</strong>
                  <span>{cycleTrendContext.insight}</span>
                  {latestCycleContext ? (
                    <>
                      <small>
                        Latest saved {formatDate(latestCycleContext.createdAt)}; included
                        in encrypted backup check-ins until deleted.
                      </small>
                      {latestCycleContext.symptoms ? (
                        <small>Symptoms: {latestCycleContext.symptoms}</small>
                      ) : null}
                      {latestCycleContext.note ? <p>{latestCycleContext.note}</p> : null}
                    </>
                  ) : (
                    <small>
                      No cycle logs saved. This feature is off by default and
                      never leaves this browser unless you export a backup.
                    </small>
                  )}
                </div>
              </form>
              <form
                className="history-import-card"
                aria-label="Historical weight CSV import"
                onSubmit={handleHistoricalWeightImport}
              >
                <div className="history-import-copy">
                  <strong>Import weight history</strong>
                  <p>
                    Paste a CSV with date and weight columns. Weight in pounds is converted when the header
                    or unit column says lb/lbs; calories or kcal are optional.
                  </p>
                </div>
                <label className="field history-import-input">
                  <span className="field-label">Historical CSV</span>
                  <textarea
                    aria-label="Historical weight CSV"
                    value={historyImportText}
                    onChange={(event) => setHistoryImportText(event.target.value)}
                    placeholder={"date,weight_lbs,calories,note\n2026-06-01,190.2,2400,scale import"}
                  />
                </label>
                <div className="history-import-actions">
                  <button className="button" type="submit">
                    Import pasted CSV
                  </button>
                  <label className="button file-button">
                    Import CSV file
                    <input
                      aria-label="Import historical weight CSV file"
                      type="file"
                      accept=".csv,text/csv,text/plain"
                      onChange={handleHistoricalWeightFile}
                    />
                  </label>
                </div>
                {historyImportStatus ? (
                  <small className="history-import-status" role="status" aria-live="polite">
                    {historyImportStatus}
                  </small>
                ) : null}
              </form>
              <div className="guided-checkin-card" aria-label="Guided weekly check-in">
                <div>
                  <strong>Due in guided check-in</strong>
                  <span>
                    {formatCadenceFields([
                      ...cadenceDueState.weekly.fields,
                      ...(cadenceDueState.monthly.isDue ? cadenceDueState.monthly.fields : [])
                    ])}
                  </span>
                </div>
                <p>
                  Guided weekly check-in logs the due fields and saves a snapshot so
                  comparisons, reports, and trends have a dated anchor.
                </p>
              </div>
              <div className="checkin-summary" aria-label="Check-in summary">
                <strong>
                  Trend weight: {trendWeight ? `${trendWeight.value.toFixed(1)} kg` : "--"}
                </strong>
                <span>
                  {trendWeight
                    ? `${trendWeight.count} log(s), ${formatSignedDelta(trendWeight.delta)} kg last trend step`
                    : "No daily logs yet."}
                </span>
                {weightReliabilityPause.pausedEntryCount ? (
                  <small>
                    {weightReliabilityPause.pausedEntryCount} weight log(s) excluded by reliability pause.
                  </small>
                ) : null}
                {weightReliabilityPause.isPaused && weightReliabilityPause.latestWindow ? (
                  <small>
                    Weight trend paused until {formatDate(weightReliabilityPause.latestWindow.endAt)}.
                  </small>
                ) : null}
                <strong>
                  Adaptive TDEE: {adaptiveTdee.status === "ready" ? `${adaptiveTdee.estimatedTdee} kcal` : "--"}
                </strong>
                <span>
                  {adaptiveTdee.status === "ready"
                    ? `${adaptiveTdee.confidenceLabel}; ${adaptiveTdee.rangeLow}-${adaptiveTdee.rangeHigh} kcal/day band`
                    : adaptiveTdee.reason}
                </span>
                {adaptiveTdee.excludedEntries ? (
                  <small>
                    {adaptiveTdee.excludedEntries} calorie log(s) excluded by reliability pause.
                  </small>
                ) : null}
              </div>
              <div className="streak-panel" aria-label="Check-in streak">
                <div>
                  <strong>{weeklyStreak.label}</strong>
                  <span>
                    {weeklyStreak.latestAt
                      ? `Last weekly check-in ${formatDate(weeklyStreak.latestAt)}`
                      : "Start with a weekly check-in."}
                  </span>
                </div>
                <div>
                  <small>
                    {weeklyStreak.graceEndsAt
                      ? `Grace ends ${formatDate(weeklyStreak.graceEndsAt)}`
                      : "Grace window begins after each weekly check-in."}
                  </small>
                  <small>{weeklyStreak.freezeCount} freeze(s) used</small>
                </div>
                <div className="streak-actions">
                  <button
                    className="button"
                    type="button"
                    onClick={handleUseStreakFreeze}
                    disabled={!weeklyStreak.freezeAvailable}
                  >
                    Use freeze
                  </button>
                  <button
                    className="button"
                    type="button"
                    onClick={
                      remotePushStatus === "subscribed"
                        ? handleDisableRemoteTrendPush
                        : handleEnableRemoteTrendPush
                    }
                    disabled={remotePushStatus === "checking"}
                  >
                    {remotePushStatus === "subscribed" ? "Disable reminders" : "Enable reminders"}
                  </button>
                </div>
                <small className="remote-push-status" role="status" aria-live="polite">
                  {remotePushStatusLabel(remotePushStatus)}
                </small>
              </div>
              <div className="body-tea-panel" aria-label="Weekly body tea digest">
                <h4>Your body tea</h4>
                <ul>
                  {weeklyDigest.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="checkin-heatmap" aria-label="Check-in calendar heatmap">
                {checkInHeatmap.map((day) => (
                  <span
                    key={day.key}
                    className={`heatmap-cell heatmap-cell--${day.intensity}`}
                    title={`${day.date}: ${day.count} check-in(s)`}
                    aria-label={`${day.date}: ${day.count} check-in(s)`}
                  />
                ))}
              </div>
              <div className="milestone-grid" aria-label="Check-in milestones">
                {milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className={`milestone-chip ${milestone.achieved ? "is-achieved" : ""}`}
                  >
                    <strong>{milestone.label}</strong>
                    {Number.isFinite(milestone.progress) && milestone.target ? (
                      <span>{milestone.progress}/{milestone.target}</span>
                    ) : (
                      <span>{milestone.achieved ? "done" : "open"}</span>
                    )}
                  </div>
                ))}
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
                <label className="field">
                  <span className="field-label">Target measurement set</span>
                  <select
                    aria-label="Goal target source"
                    value={selectedGoalTargetId}
                    onChange={(event) => setSelectedGoalTargetId(event.target.value)}
                  >
                    <option value="">Preset deltas</option>
                    <option value={CUSTOM_GOAL_TARGET_ID}>Custom deltas</option>
                    {profileGoalTargets.length ? (
                      <optgroup label="Target profiles">
                        {profileGoalTargets.map((target) => (
                          <option key={target.id} value={target.id}>
                            {target.label}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                    {snapshotGoalTargets.length ? (
                      <optgroup label="Past self snapshots">
                        {snapshotGoalTargets.map((target) => (
                          <option key={target.id} value={target.id}>
                            {target.label}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                  </select>
                </label>
                {isCustomGoalTarget ? (
                  <div className="custom-goal-delta-grid" aria-label="Custom goal deltas">
                    {customGoalMetricOptions.map((option) => (
                      <label key={option.key} className="field">
                        <span className="field-label">{option.label} delta</span>
                        <input
                          aria-label={`Custom ${option.label} delta`}
                          inputMode="decimal"
                          value={customGoalDeltas[option.key] || ""}
                          onChange={(event) =>
                            handleCustomGoalDeltaChange(option.key, event.target.value)
                          }
                          placeholder={option.key === "waistCircumference" ? "-4" : "0"}
                        />
                        <small>{option.unit}</small>
                      </label>
                    ))}
                  </div>
                ) : null}
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
                {selectedGoalEvidence.length ? (
                  <div className="goal-evidence-note" aria-label="Goal evidence notes">
                    <strong>Evidence notes</strong>
                    <small>{attractivenessEvidenceStatus}</small>
                    <ul>
                      {selectedGoalEvidence.map((metric) => (
                        <li key={metric.id}>
                          <span>{verdictLabel(metric.verdict)} / {metric.evidenceStrength}</span>
                          <p>{metric.userFacingSummary}</p>
                          {evidenceSourceSummary(attractivenessEvidence, metric) ? (
                            <small>{evidenceSourceSummary(attractivenessEvidence, metric)}</small>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {selectedGoalTarget ? (
                  <p className="muted-text goal-target-copy">
                    Using {selectedGoalTarget.label} as the target measurement set.
                  </p>
                ) : null}
                {isCustomGoalTarget ? (
                  <p className="muted-text goal-target-copy">
                    Enter signed deltas from the current measurements. Leave unused fields blank.
                  </p>
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
                          const pauseSummary = buildGoalPauseSummary(goal, checkIns);
                          const progress = buildGoalProgress(goal, currentMeasurements);
                          const driftAlerts = buildMaintenanceDriftAlerts(
                            goal,
                            currentMeasurements,
                            snapshotProps.snapshots
                          );
                          return (
                            <>
                              {pauseSummary ? (
                                <div
                                  className="goal-pause-alert"
                                  aria-label={`${goal.label} pause status`}
                                >
                                  <strong>Goal paused</strong>
                                  <span>
                                    {pauseSummary.message} Resume after {formatDate(pauseSummary.latestEndAt)} or delete/update the reliability event.
                                  </span>
                                </div>
                              ) : null}
                              {progress && !pauseSummary ? (
                                <div className="goal-progress" aria-label={`${goal.label} progress`}>
                                  <strong>Progress: {Math.round(progress.average)}%</strong>
                                  <div className="goal-progress-track">
                                    <i style={{ width: `${progress.average}%` }} />
                                  </div>
                                  <ul>
                                    {progress.rows.map((row) => (
                                      <li key={row.key}>
                                        <span>
                                          {row.label}: {row.current.toFixed(1)} / target {row.target.toFixed(1)} {row.unit}
                                        </span>
                                        <small>{row.targetDistance}</small>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                              {driftAlerts && !pauseSummary ? (
                                <div
                                  className="maintenance-alerts"
                                  aria-label={`${goal.label} maintenance drift alerts`}
                                >
                                  <strong>Maintenance drift alert</strong>
                                  <span>
                                    Target band last seen at {driftAlerts.reachedLabel} on {formatDate(driftAlerts.reachedAt)}.
                                  </span>
                                  <ul>
                                    {driftAlerts.alerts.map((alert) => (
                                      <li key={alert.key}>{alert.message}</li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                            </>
                          );
                        })()}
                        <strong>{goal.label}</strong>
                        <span>{goal.category} / created {formatDate(goal.createdAt)}</span>
                        {goalTargetSourceLabel(goal) ? <span>{goalTargetSourceLabel(goal)}</span> : null}
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
              <div className="protocol-schema-panel" aria-label="Protocol schema">
                <strong>Intervention taxonomy</strong>
                <p>{protocolSchemaSummary}</p>
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
                  <span className="field-label">Daily calorie delta</span>
                  <input
                    aria-label="Protocol calorie delta"
                    inputMode="numeric"
                    value={protocolCalorieDelta}
                    onChange={(event) => setProtocolCalorieDelta(event.target.value)}
                    placeholder="-300"
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
                  {protocolEditId ? "Save protocol edits" : "Start protocol"}
                </button>
                {protocolEditId ? (
                  <button className="button" type="button" onClick={clearProtocolForm}>
                    Cancel edit
                  </button>
                ) : null}
              </form>

              <form className="life-event-form" aria-label="Reliability event form" onSubmit={handleLifeEvent}>
                <label className="field">
                  <span className="field-label">Event mode</span>
                  <select
                    aria-label="Life event mode"
                    value={lifeEventMode}
                    onChange={(event) => setLifeEventMode(event.target.value)}
                  >
                    <option value="procedure">Procedure / healing</option>
                    <option value="postpartum">Pregnancy / postpartum</option>
                    <option value="injury">Injury</option>
                    <option value="illness">Illness</option>
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Affected fields</span>
                  <input
                    aria-label="Reliability affected fields"
                    value={lifeEventFields}
                    onChange={(event) => setLifeEventFields(event.target.value)}
                    placeholder="waistCircumference, hipCircumference"
                  />
                </label>
                <label className="field">
                  <span className="field-label">Pause days</span>
                  <input
                    aria-label="Reliability pause days"
                    inputMode="numeric"
                    value={lifeEventDurationDays}
                    onChange={(event) => setLifeEventDurationDays(event.target.value)}
                  />
                </label>
                <label className="field life-event-note">
                  <span className="field-label">Event note</span>
                  <textarea
                    aria-label="Reliability event note"
                    value={lifeEventNote}
                    onChange={(event) => setLifeEventNote(event.target.value)}
                  />
                </label>
                <button className="button" type="submit">
                  Log reliability event
                </button>
              </form>
              {lifeEvents.length ? (
                <div className="life-event-list" aria-label="Reliability events">
                  {lifeEvents.slice(0, 3).map((event) => (
                    <div key={event.id}>
                      <strong>{event.eventMode}</strong>
                      <span>
                        {event.affectedFields?.join(", ") || "affected fields not set"} / {event.durationDays} day pause
                      </span>
                      {event.note ? <p>{event.note}</p> : null}
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="procedure-panel" aria-label="Procedure tracker">
                <div>
                  <h4>Procedure tracker</h4>
                  <p>{procedureStatus}</p>
                </div>
                <form className="procedure-form" onSubmit={handleLogProcedure}>
                  <label className="field">
                    <span className="field-label">Procedure type</span>
                    <select
                      aria-label="Procedure type"
                      value={selectedProcedureTypeId}
                      onChange={(event) => handleProcedureTypeChange(event.target.value)}
                    >
                      {procedureLibrary.procedureTypes.map((procedure) => (
                        <option key={procedure.id} value={procedure.id}>
                          {procedure.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Date</span>
                    <input
                      aria-label="Procedure date"
                      type="date"
                      value={procedureDate}
                      onChange={(event) => setProcedureDate(event.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Healing days</span>
                    <input
                      aria-label="Procedure healing days"
                      inputMode="numeric"
                      value={procedureHealingDays}
                      onChange={(event) => setProcedureHealingDays(event.target.value)}
                    />
                  </label>
                  <label className="field procedure-fields">
                    <span className="field-label">Affected fields</span>
                    <input
                      aria-label="Procedure affected fields"
                      value={procedureAffectedFields}
                      onChange={(event) => setProcedureAffectedFields(event.target.value)}
                      placeholder="waistCircumference, hipCircumference"
                    />
                  </label>
                  <label className="field procedure-note">
                    <span className="field-label">Procedure note</span>
                    <textarea
                      aria-label="Procedure note"
                      value={procedureNote}
                      onChange={(event) => setProcedureNote(event.target.value)}
                      placeholder="Placement, provider-reviewed constraints, or aftercare notes."
                    />
                  </label>
                  {selectedProcedureType ? (
                    <div className="procedure-template-summary" aria-label="Selected procedure guidance">
                      <p>
                        {selectedProcedureType.summary} Photo stream:{" "}
                        {selectedProcedureType.photoCategory}. Risk:{" "}
                        {selectedProcedureType.riskLevel}. Review:{" "}
                        {selectedProcedureType.reviewStatus}.
                      </p>
                      {selectedProcedureType.timeline.length ? (
                        <ul>
                          {selectedProcedureType.timeline.slice(0, 3).map((item) => (
                            <li key={`${selectedProcedureType.id}-${item.day}`}>
                              Day {item.day}: {item.label}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                  <button className="button" type="submit">
                    Log procedure
                  </button>
                </form>

                {procedures.length ? (
                  <ul className="procedure-list" aria-label="Procedure logs">
                    {procedures.slice(0, 5).map((procedure) => {
                      const caseLog = buildProcedureCaseLog(
                        procedure,
                        snapshotProps.snapshots,
                        photos
                      );

                      return (
                        <li key={procedure.id}>
                          <div>
                            <strong>{formatProcedureRecord(procedure)}</strong>
                            <span>
                              {procedure.category} / {procedure.riskLevel} / photo stream {procedure.photoCategory}
                            </span>
                            <span>Healing window: {caseLog.window}</span>
                            {procedure.note ? <p>{procedure.note}</p> : null}
                          </div>
                          <div aria-label={`${procedure.label} procedure case log`}>
                            <h5>Case log</h5>
                            <p>{caseLog.summary}</p>
                            <small>{caseLog.reviewStatus}</small>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="muted-text">No procedure logs yet.</p>
                )}
              </div>

              <div aria-label="Active protocols">
                {protocols.length ? (
                  <ul className="protocol-list">
                    {protocols.map((protocol) => {
                      const outcome = buildProtocolOutcomeSummary(
                        protocol,
                        currentMeasurements,
                        snapshotProps.snapshots
                      );
                      const projection = buildEnergyProjection(protocol, currentMeasurements);
                      const projectedSilhouette = buildProjectedMeasurements(
                        protocol,
                        currentMeasurements
                      );
                      const retro =
                        protocol.status === "archived"
                          ? buildPlanRetro(protocol, currentMeasurements, snapshotProps.snapshots)
                          : null;
                      const caseLog = buildProtocolCaseLog(
                        protocol,
                        currentMeasurements,
                        snapshotProps.snapshots
                      );

                      return (
                        <li key={protocol.id} className={`protocol-row protocol-row--${protocol.status}`}>
                          <div>
                            <strong>{protocol.label}</strong>
                            <span>
                              {protocol.category} / {protocol.evidence} / {protocol.status}
                            </span>
                            <span>Dose: {protocol.dose}; frequency: {protocol.frequency}</span>
                            {protocol.calorieDelta !== null &&
                            protocol.calorieDelta !== undefined &&
                            protocol.calorieDelta !== "" &&
                            Number.isFinite(Number(protocol.calorieDelta)) ? (
                              <span>Daily energy delta: {protocol.calorieDelta} kcal</span>
                            ) : null}
                            {protocol.startDate || protocol.endDate ? (
                              <span>
                                Window: {protocol.startDate || "open"} - {protocol.endDate || "open"}
                              </span>
                            ) : null}
                            {protocol.confounders ? <p>{protocol.confounders}</p> : null}
                            <span>{protocol.checkIns?.length || 0} adherence check-in(s)</span>
                            {outcome.averageScore !== null ? (
                              <span>{outcome.averageScore.toFixed(1)}/5 average adherence</span>
                            ) : null}
                            <span>{protocolDelta(protocol, currentMeasurements)}</span>
                          </div>
                          <div className="button-row">
                            <label className="field compact-score-field">
                              <span className="field-label">Adherence score</span>
                              <select
                                aria-label="Protocol adherence score"
                                value={protocolAdherenceScore}
                                onChange={(event) => setProtocolAdherenceScore(event.target.value)}
                              >
                                {[5, 4, 3, 2, 1, 0].map((score) => (
                                  <option key={score} value={score}>
                                    {score}
                                  </option>
                                ))}
                              </select>
                            </label>
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
                              onClick={() => handleEditProtocol(protocol)}
                              disabled={protocol.status === "archived"}
                            >
                              Edit protocol
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
                          <div className="protocol-outcome-grid">
                            <div aria-label={`${protocol.label} outcome attribution`}>
                              <h4>Outcome attribution</h4>
                              <p>{outcome.snapshotCount} snapshot(s) linked during the protocol window.</p>
                              <ul>
                                {outcome.rows.map((row) => (
                                  <li key={row.key}>
                                    {row.label}: {row.displayDelta}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            {projection ? (
                              <div aria-label={`${protocol.label} projection band`}>
                                <h4>Projection band</h4>
                                <p>
                                  {projection.model}: {projection.lowDeltaKg} to {projection.highDeltaKg} kg over {projection.durationDays} days.
                                </p>
                                {projection.assumptions ? (
                                  <small>
                                    Adult model assumptions: age {projection.assumptions.ageYears}, PAL{" "}
                                    {projection.assumptions.physicalActivityLevel}, estimated fat mass{" "}
                                    {projection.assumptions.estimatedFatMassKg} kg, time constant{" "}
                                    {projection.assumptions.timeConstantDays} days.
                                  </small>
                                ) : null}
                                <small>{projection.note}</small>
                                {projectedSilhouette ? (
                                  <div
                                    className="projection-silhouette-card"
                                    aria-label={`${protocol.label} projected silhouette`}
                                  >
                                    <div className="projection-silhouette-grid">
                                      <SilhouetteView
                                        label={`${protocol.label} protocol start`}
                                        measurements={protocol.startingMeasurements || currentMeasurements}
                                        view={silhouetteView}
                                      />
                                      <SilhouetteView
                                        label={`${protocol.label} projected endpoint`}
                                        measurements={projectedSilhouette.measurements}
                                        view={silhouetteView}
                                      />
                                    </div>
                                    <p>
                                      Projected endpoint: {projectedSilhouette.measurements.weight.toFixed(1)} kg,
                                      waist {projectedSilhouette.measurements.waistCircumference.toFixed(1)} cm.
                                    </p>
                                    <small>{projectedSilhouette.note}</small>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                            {retro ? (
                              <div aria-label={`${protocol.label} plan retro`}>
                                <h4>Plan retro</h4>
                                <p>{retro.label}</p>
                                <small>
                                  Actual {retro.actualDeltaKg} kg / projected {retro.projectedBand}
                                </small>
                              </div>
                            ) : null}
                            <div aria-label={`${protocol.label} case log`}>
                              <h4>Case log</h4>
                              <p>{caseLog.outcomeSummary}</p>
                              <small>{caseLog.projectionSummary}</small>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="muted-text">No protocols started yet.</p>
                )}
              </div>
            </section>

            <section className="bloodwork-log-section" aria-label="Bloodwork log">
              <div className="panel-header">
                <h3>Bloodwork log</h3>
                <p>{bloodworkStatus}</p>
              </div>
              <p className="muted-text">
                Local-only lab notes for review conversations. These records are included in
                local export/backup, not server share dashboards.
              </p>

              <form className="bloodwork-form" onSubmit={handleLogBloodwork}>
                <label className="field">
                  <span className="field-label">Marker</span>
                  <select
                    aria-label="Bloodwork marker"
                    value={selectedBloodworkMarkerId}
                    onChange={(event) => handleBloodworkMarkerChange(event.target.value)}
                  >
                    {bloodworkLibrary.markers.map((marker) => (
                      <option key={marker.id} value={marker.id}>
                        {marker.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Collection date</span>
                  <input
                    aria-label="Bloodwork collection date"
                    type="date"
                    value={bloodworkCollectedAt}
                    onChange={(event) => setBloodworkCollectedAt(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="field-label">
                    Value {selectedBloodworkMarker?.unit ? `(${selectedBloodworkMarker.unit})` : ""}
                  </span>
                  <input
                    aria-label="Bloodwork value"
                    inputMode="decimal"
                    value={bloodworkValue}
                    onChange={(event) => setBloodworkValue(event.target.value)}
                    placeholder="86"
                  />
                </label>
                <label className="field">
                  <span className="field-label">Linked protocol</span>
                  <select
                    aria-label="Bloodwork linked protocol"
                    value={bloodworkProtocolId}
                    onChange={(event) => setBloodworkProtocolId(event.target.value)}
                  >
                    <option value="">No protocol link</option>
                    {protocols.map((protocol) => (
                      <option key={protocol.id} value={protocol.id}>
                        {protocol.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field bloodwork-note">
                  <span className="field-label">Lab note</span>
                  <textarea
                    aria-label="Bloodwork note"
                    value={bloodworkNote}
                    onChange={(event) => setBloodworkNote(event.target.value)}
                    placeholder="Fasting status, lab name, protocol context, or clinician notes."
                  />
                </label>
                {selectedBloodworkMarker ? (
                  <div className="bloodwork-marker-summary" aria-label="Lab reference details">
                    <p>
                      {selectedBloodworkMarker.summary} Reference range:{" "}
                      {formatReferenceRange(selectedBloodworkRange)}.
                    </p>
                    <small>{bloodworkLibrary.reference}</small>
                  </div>
                ) : null}
                <button className="button" type="submit">
                  Log bloodwork
                </button>
              </form>

              <div className="bloodwork-grid">
                <div aria-label="Bloodwork trends">
                  <h4>Marker trends</h4>
                  {bloodworkTrends.length ? (
                    <ul className="bloodwork-trend-list">
                      {bloodworkTrends.slice(0, 6).map((trend) => (
                        <li key={trend.markerId}>
                          <div>
                            <strong>{trend.markerLabel}</strong>
                            <span>
                              Latest {trend.latestValue} {trend.unit} / {trend.latestStatus}
                            </span>
                            <small>
                              {trend.count} result(s)
                              {trend.delta === null ? "" : ` / delta ${trend.delta} ${trend.unit}`}
                            </small>
                          </div>
                          <svg
                            className="bloodwork-sparkline"
                            role="img"
                            aria-label={`${trend.markerLabel} bloodwork trend`}
                            viewBox="0 0 100 36"
                          >
                            <title>{trend.markerLabel} bloodwork trend</title>
                            <desc>Local lab result trend for this marker.</desc>
                            <line x1="4" y1="32" x2="96" y2="32" />
                            {trend.points ? <polyline points={trend.points} /> : null}
                          </svg>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted-text">No repeated markers yet.</p>
                  )}
                </div>

                <div aria-label="Recent bloodwork results">
                  <h4>Recent lab results</h4>
                  {bloodworkResults.length ? (
                    <ul className="bloodwork-result-list">
                      {bloodworkResults.slice(0, 6).map((result) => {
                        const linkedProtocol = protocols.find(
                          (protocol) => protocol.id === result.protocolId
                        );

                        return (
                          <li key={result.id}>
                            <strong>{formatBloodworkResult(result)}</strong>
                            <span>
                              {result.collectedAt} / {result.rangeStatus}
                              {linkedProtocol ? ` / ${linkedProtocol.label}` : ""}
                            </span>
                            {result.referenceRange ? (
                              <small>Range: {formatReferenceRange(result.referenceRange)}</small>
                            ) : null}
                            {result.note ? <p>{result.note}</p> : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="muted-text">No bloodwork logged yet.</p>
                  )}
                </div>
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
                {selectedExercise ? (
                  <div className="exercise-detail-card" aria-label="Selected workout movement details">
                    <div>
                      <strong>{selectedExercise.label}</strong>
                      <span>
                        {[
                          selectedExercise.category,
                          selectedExercise.movementPattern,
                          selectedExercise.equipment,
                          selectedExercise.difficulty
                        ]
                          .filter(Boolean)
                          .join(" / ")}
                      </span>
                    </div>
                    {selectedExercise.instructions.length ? (
                      <ol>
                        {selectedExercise.instructions.map((instruction) => (
                          <li key={instruction}>{instruction}</li>
                        ))}
                      </ol>
                    ) : null}
                    <p>{selectedExercise.riskNotes}</p>
                    <small>
                      {selectedExercise.reviewStatus || "Needs source review"} /{" "}
                      {selectedExercise.sourceLicense || selectedExercise.source || "dummy seed"}
                    </small>
                  </div>
                ) : null}
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

            <FaceMeasurementPanel
              faceMeasurements={faceMeasurements}
              onSaveFaceMeasurement={handleSaveFaceMeasurement}
            />

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
                  <SilhouetteView
                    measurements={currentMeasurements}
                    label="Photo reference profile"
                    view={silhouetteView}
                  />
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

        {status ? (
          <p className="account-status-line" role="status" aria-live="polite">
            {status}
          </p>
        ) : null}
      </section>
    </div>
  );
}
