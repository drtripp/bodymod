import { readJsonSync, removeStoredItemSync, writeJsonSync } from "./storageAdapter.js";
import { buildGoalPauseSummary, buildGoalProgress, goalTargetSourceLabel } from "./goalTargets.js";
import { buildProtocolOutcomeSummary } from "./protocolPlanning.js";
import { buildProcedureCaseLog } from "./procedures.js";

export const SHARE_DASHBOARD_STATE_KEY = "bodymod:share-dashboard:v1";

export function defaultShareDashboardState() {
  return {
    version: 1,
    accountId: "",
    publicToken: "",
    revokeToken: "",
    publicUrl: "",
    createdAt: "",
    updatedAt: ""
  };
}

export function loadShareDashboardState(adapter) {
  try {
    return {
      ...defaultShareDashboardState(),
      ...(readJsonSync(SHARE_DASHBOARD_STATE_KEY, null, adapter) || {})
    };
  } catch {
    return defaultShareDashboardState();
  }
}

export function persistShareDashboardState(state, adapter) {
  const nextState = {
    ...defaultShareDashboardState(),
    ...state
  };
  writeJsonSync(SHARE_DASHBOARD_STATE_KEY, nextState, adapter);
  return nextState;
}

export function clearShareDashboardState(adapter) {
  removeStoredItemSync(SHARE_DASHBOARD_STATE_KEY, adapter);
  return defaultShareDashboardState();
}

export function publicShareDashboardUrl(publicToken, locationLike = globalThis.location) {
  if (!publicToken || !locationLike) {
    return "";
  }

  const path = locationLike.pathname || "/";
  return `${locationLike.origin}${path}?share=${encodeURIComponent(publicToken)}`;
}

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stripMeasurementSet(measurements = {}) {
  return Object.fromEntries(
    Object.entries(measurements).filter(([, value]) => value !== undefined && value !== null)
  );
}

function latestTimestamp(records = []) {
  const timestamps = records
    .map((record) => new Date(record?.createdAt || record?.loggedAt || 0).getTime())
    .filter(Number.isFinite);

  if (!timestamps.length) {
    return "";
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

function goalSummary(goal, currentMeasurements, checkIns) {
  const progress = buildGoalProgress(goal, currentMeasurements);
  const pauseSummary = buildGoalPauseSummary(goal, checkIns);

  return {
    id: goal.id,
    label: goal.label,
    category: goal.category || "",
    targetDate: goal.targetDate || "",
    targetSource: goalTargetSourceLabel(goal),
    progressPercent: progress ? Number(progress.average.toFixed(0)) : null,
    targetDistances: progress?.rows?.slice(0, 4).map((row) => `${row.label}: ${row.targetDistance}`) || [],
    pausedReason: pauseSummary?.message || ""
  };
}

function protocolSummary(protocol, snapshots, currentMeasurements) {
  const outcome = buildProtocolOutcomeSummary(protocol, currentMeasurements, snapshots);
  const scored = (protocol.checkIns || [])
    .map((checkIn) => Number(checkIn.score))
    .filter(Number.isFinite);
  const averageScore = scored.length
    ? Number((scored.reduce((total, score) => total + score, 0) / scored.length).toFixed(1))
    : null;

  return {
    id: protocol.id,
    label: protocol.label,
    category: protocol.category || "",
    status: protocol.status || "active",
    adherenceCount: Array.isArray(protocol.checkIns) ? protocol.checkIns.length : 0,
    averageScore,
    projectionSummary: outcome?.summary || ""
  };
}

function procedureSummary(procedure, snapshots) {
  const caseLog = buildProcedureCaseLog(procedure, snapshots, []);

  return {
    id: procedure.id,
    label: procedure.label,
    category: procedure.category || "",
    window: caseLog.window,
    healingDays: caseLog.healingDays,
    snapshotCount: caseLog.snapshotCount,
    photoCategory: caseLog.photoCategory,
    reviewStatus: caseLog.reviewStatus,
    summary: caseLog.summary
  };
}

export function buildShareDashboardPayload({
  account,
  currentMeasurements,
  snapshots = [],
  goals = [],
  protocols = [],
  procedures = [],
  checkIns = [],
  workoutSessions = [],
  faceMeasurements = [],
  weeklyStreak = {},
  trendWeight = null,
  now = new Date()
} = {}) {
  const displayName = String(account?.displayName || "bodymod user").trim();
  const publicSnapshots = snapshots.slice(0, 6).map((snapshot) => ({
    id: snapshot.id,
    label: snapshot.label || "Snapshot",
    createdAt: snapshot.createdAt,
    measurements: stripMeasurementSet(snapshot.measurements)
  }));
  const activeProtocols = protocols.filter((protocol) => protocol.status !== "archived");

  return {
    version: 1,
    title: `${displayName} bodymod dashboard`,
    displayName,
    publishedAt: now.toISOString(),
    privacyNote:
      "Opt-in read-only share. Email, private notes, local account IDs, photo files, and face scan images are not included.",
    measurements: stripMeasurementSet(currentMeasurements),
    stats: {
      snapshotCount: snapshots.length,
      checkInCount: checkIns.length,
      goalCount: goals.length,
      protocolCount: protocols.length,
      procedureCount: procedures.length,
      workoutCount: workoutSessions.length,
      faceScanCount: faceMeasurements.length
    },
    snapshots: publicSnapshots,
    goals: goals.slice(0, 6).map((goal) => goalSummary(goal, currentMeasurements, checkIns)),
    protocols: activeProtocols
      .slice(0, 6)
      .map((protocol) => protocolSummary(protocol, snapshots, currentMeasurements)),
    procedures: procedures
      .slice(0, 6)
      .map((procedure) => procedureSummary(procedure, snapshots)),
    weeklyStreak: {
      status: weeklyStreak.status || "not-started",
      count: numeric(weeklyStreak.count) || 0,
      latestAt: weeklyStreak.latestAt || latestTimestamp(checkIns)
    },
    trendWeight: trendWeight
      ? {
          value: trendWeight.value,
          delta: trendWeight.delta,
          count: trendWeight.count
        }
      : {}
  };
}
