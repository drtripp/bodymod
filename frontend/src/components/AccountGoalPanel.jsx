import { useEffect, useMemo, useRef, useState } from "react";
import FaceMeasurementPanel from "./FaceMeasurementPanel";
import SilhouetteView from "./SilhouetteView";
import SnapshotPanel from "./SnapshotPanel";
import {
  createShareDashboard,
  fetchAttractivenessEvidence,
  fetchBloodworkLibrary,
  fetchExerciseLibrary,
  fetchLiveUpdateManifest,
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
  deleteUserPhotoAsset,
  hydrateUserPhotoAssets,
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
  persistUserPhotoAsset,
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
  latestLimbSymmetryCheckIn,
  limbSplitFields,
  summarizeLimbSymmetrySplits
} from "../lib/limbSymmetry";
import {
  buildCycleCheckIn,
  buildCycleTrendContext,
  cycleFlowOptions,
  cyclePhaseOptions,
  latestCycleCheckIn
} from "../lib/cycleTracking";
import {
  parseHistoricalWeightCsv
} from "../lib/historyImport";
import {
  buildLocalBackupBundle,
  decryptLocalBackup,
  encryptLocalBackup,
  mergeLocalBackupBundles,
  summarizeLocalBackupBundle
} from "../lib/localBackup";
import {
  deleteNativeEncryptedBackup,
  loadNativeBackupState,
  persistNativeBackupState,
  readNativeEncryptedBackup,
  saveNativeEncryptedBackup
} from "../lib/nativeBackup";
import {
  buildAutoSyncReadiness,
  clearAutoSyncState,
  clearSyncVaultState,
  createSyncVault,
  defaultAutoSyncState,
  loadAutoSyncState,
  loadSyncVaultState,
  persistAutoSyncState,
  persistSyncVaultState,
  readSyncVault,
  revokeSyncVault,
  shouldRunAutoSync,
  syncBlobToEncryptedBackup,
  updateSyncVault
} from "../lib/encryptedSync";
import {
  createPersonalDataToken,
  readPersonalDataSyncVault,
  revokePersonalDataToken
} from "../lib/personalDataApi";
import {
  clearAccountIdentitySession,
  loadAccountIdentitySession,
  persistAccountIdentitySession,
  requestAccountMagicLink,
  revokeAccountIdentitySession,
  verifyAccountMagicLink
} from "../lib/magicLinkAccount";
import {
  buildPlainJsonExport,
  serializePlainJsonExport,
  summarizePlainJsonExport
} from "../lib/localExport";
import {
  loadDietLog,
  loadFluidLog
} from "../lib/storage";
import {
  buildCheckInHeatmap,
  buildCheckInInsights,
  buildMilestones,
  buildWeeklyDigest,
  buildWeeklyStreak
} from "../lib/checkInLoop";
import {
  buildHomeWidgetSnapshot,
  formatWidgetDate,
  loadHomeWidgetSnapshot,
  syncHomeWidgetSnapshot
} from "../lib/widgetSnapshot";
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
import { buildDataExplainerResponse } from "../lib/dataExplainer";
import {
  buildHealthWriteBatch,
  loadHealthSyncState,
  persistHealthSyncState,
  summarizeHealthWriteBatch
} from "../lib/healthSync";
import {
  APP_VERSION,
  buildLiveUpdateStatus,
  loadLiveUpdateCheck,
  persistLiveUpdateCheck
} from "../lib/liveUpdates";
import { loadStrategyCorpusBundle } from "../lib/strategyCorpus";
import {
  loadNotificationPreference,
  sendTrendReminderNotificationIfDue,
  syncTrendPushReminderSchedule,
  subscribeTrendPushNotifications,
  trendPushStatusFromPreference,
  unsubscribeTrendPushNotifications
} from "../lib/notifications";
import { notifyCheckInSaved } from "../lib/haptics";
import {
  buildShareDashboardPayload,
  clearShareDashboardState,
  defaultShareDashboardState,
  loadShareDashboardState,
  persistShareDashboardState,
  publicShareDashboardUrl
} from "../lib/shareDashboard";
import { createTranslator } from "../lib/i18n";

const emptyPlanningData = {
  personas: [],
  goalPresets: [],
  protocolTemplates: [],
  protocolTaxonomy: []
};

function formatDate(timestamp, locale) {
  return new Intl.DateTimeFormat(locale || undefined, { dateStyle: "medium" }).format(
    new Date(timestamp)
  );
}

function recordTimestamp(record = {}) {
  return record.updatedAt || record.createdAt || record.date || record.procedureDate || "";
}

function firstRecordTimestamp(records = []) {
  return Array.isArray(records) && records[0] ? recordTimestamp(records[0]) : "";
}

function backupBundleSignature(accountId, bundle = {}, currentPhotos = []) {
  return [
    accountId || "",
    Array.isArray(bundle.snapshots) ? bundle.snapshots.length : 0,
    firstRecordTimestamp(bundle.snapshots),
    Array.isArray(bundle.goals) ? bundle.goals.length : 0,
    Array.isArray(bundle.protocols) ? bundle.protocols.length : 0,
    Array.isArray(bundle.checkIns) ? bundle.checkIns.length : 0,
    firstRecordTimestamp(bundle.checkIns),
    Array.isArray(bundle.workoutSessions) ? bundle.workoutSessions.length : 0,
    Array.isArray(bundle.procedures) ? bundle.procedures.length : 0,
    Array.isArray(bundle.bloodworkResults) ? bundle.bloodworkResults.length : 0,
    Array.isArray(bundle.referralCredits) ? bundle.referralCredits.length : 0,
    Array.isArray(currentPhotos) ? currentPhotos.length : 0,
    Array.isArray(bundle.faceMeasurements) ? bundle.faceMeasurements.length : 0
  ].join("|");
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

function remotePushStatusLabel(status, t) {
  switch (status) {
    case "subscribed":
      return t("account.tracking.remotePush.subscribed");
    case "permission-required":
      return t("account.tracking.remotePush.permissionRequired");
    case "not-configured":
      return t("account.tracking.remotePush.notConfigured");
    case "unsupported":
      return t("account.tracking.remotePush.unsupported");
    case "unsubscribed":
      return t("account.tracking.remotePush.unsubscribed");
    case "failed":
      return t("account.tracking.remotePush.failed");
    case "checking":
      return t("account.tracking.remotePush.checking");
    default:
      return t("account.tracking.remotePush.local");
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

function formatLimbSplitFieldLabel(field, t) {
  return t(`account.tracking.limb.field.${field.id}`, {}, field.label);
}

function formatSideLabel(side, t) {
  return t(`account.tracking.side.${side}`, {}, side);
}

function formatLimbSymmetryDisplayItem(item, t) {
  if (!item) {
    return "";
  }

  const label = t(`account.tracking.limb.field.${item.field}`, {}, item.label);
  if (item.dominantSide === "even") {
    return t("account.tracking.limb.itemEven", {
      label,
      delta: item.absoluteDelta.toFixed(1)
    });
  }

  return t("account.tracking.limb.itemDominant", {
    label,
    side: formatSideLabel(item.dominantSide, t),
    delta: item.absoluteDelta.toFixed(1),
    percent: item.percentDelta.toFixed(1)
  });
}

function formatLifeEventMode(mode, t) {
  return t(`account.tracking.lifeEventMode.${mode}`, {}, mode);
}

function formatCyclePhaseLabel(phase, t) {
  const option = cyclePhaseOptions.find((item) => item.id === phase) || cyclePhaseOptions[4];
  return t(`account.tracking.cycle.phase.${option.id}`, {}, option.label);
}

function formatCyclePhaseValue(phase, t) {
  return t(`account.tracking.cycle.phaseValue.${phase}`, {}, String(phase || "").toLowerCase());
}

function formatCycleFlowLabel(flow, t) {
  const option = cycleFlowOptions.find((item) => item.id === flow) || cycleFlowOptions[0];
  return t(`account.tracking.cycle.flow.${option.id}`, {}, option.label);
}

function formatCycleFlowValue(flow, t) {
  return t(`account.tracking.cycle.flowValue.${flow}`, {}, String(flow || "").toLowerCase());
}

function formatCycleCheckInSummary(checkIn, t) {
  if (!checkIn) {
    return "";
  }

  const phase = formatCyclePhaseLabel(checkIn.phase, t);
  const base = Number.isFinite(Number(checkIn.cycleDay))
    ? t("account.tracking.cycle.summaryWithDay", {
        phase,
        day: Number(checkIn.cycleDay)
      })
    : phase;
  return checkIn.flow && checkIn.flow !== "not-tracked"
    ? t("account.tracking.cycle.summaryWithFlow", {
        base,
        flow: formatCycleFlowValue(checkIn.flow, t)
      })
    : base;
}

function formatCycleTrendContext(context, t) {
  if (!context?.latest || context.status === "off") {
    return {
      label: t("account.tracking.cycle.offLabel"),
      insight: t("account.tracking.cycle.offInsight")
    };
  }

  const phase = formatCyclePhaseLabel(context.latest.phase, t);
  const phaseValue = formatCyclePhaseValue(context.latest.phase, t);
  const label = Number.isFinite(Number(context.latest.cycleDay))
    ? t("account.tracking.cycle.summaryWithDay", {
        phase,
        day: Number(context.latest.cycleDay)
      })
    : phase;

  if (context.status === "stale") {
    return {
      label,
      insight: t("account.tracking.cycle.staleInsight", {
        ageDays: context.ageDays
      })
    };
  }

  return {
    label,
    insight:
      context.status === "noisy"
        ? t("account.tracking.cycle.noisyInsight", { phase: phaseValue })
        : t("account.tracking.cycle.baselineInsight", { phase: phaseValue })
  };
}

function formatLimbSymmetryError(message, t) {
  if (!message) {
    return "";
  }

  if (message === "Enter a number") {
    return t("account.tracking.error.enterNumber");
  }
  if (message === "Enter at least one left/right pair.") {
    return t("account.tracking.error.leftRightPair");
  }

  const rangeMatch = String(message).match(/^Expected (.+)$/);
  return rangeMatch
    ? t("account.tracking.error.expectedRange", { range: rangeMatch[1] })
    : message;
}

function formatCycleError(message, t) {
  switch (message) {
    case "Choose a cycle phase.":
      return t("account.tracking.error.chooseCyclePhase");
    case "Expected day 1-60.":
      return t("account.tracking.error.cycleDayRange");
    default:
      return message || "";
  }
}

function formatHistoricalImportReason(reason, t) {
  if (!reason) {
    return "";
  }

  switch (reason) {
    case "Empty CSV.":
      return t("account.tracking.historyImport.emptyCsv");
    case "CSV needs a header and at least one data row.":
      return t("account.tracking.historyImport.needsRows");
    case "Invalid date.":
      return t("account.tracking.historyImport.invalidDate");
    case "Invalid weight.":
      return t("account.tracking.historyImport.invalidWeight");
    case "All dated rows were already logged.":
      return t("account.tracking.historyImport.allDuplicates");
    case "No weight rows found.":
      return t("account.tracking.historyImport.noWeightRows");
    default: {
      const missingMatch = String(reason).match(/^Missing required (.+) column\.$/);
      return missingMatch
        ? t("account.tracking.historyImport.missingColumn", {
            columns: missingMatch[1]
          })
        : reason;
    }
  }
}

function formatHistoricalWeightImportSummary(result, t) {
  const imported = result?.importedCount || 0;
  const duplicate = result?.duplicateRows || 0;
  const invalid = result?.invalidRows?.length || 0;
  const details = [];

  if (duplicate) {
    details.push(t("account.tracking.historyImport.duplicateDetail", { count: duplicate }));
  }
  if (invalid) {
    details.push(t("account.tracking.historyImport.invalidDetail", { count: invalid }));
  }

  return details.length
    ? t("account.tracking.historyImport.importedWithDetails", {
        count: imported,
        details: details.join(", ")
      })
    : t("account.tracking.historyImport.imported", { count: imported });
}

function formatWeeklyStreakLabel(weeklyStreak, t) {
  switch (weeklyStreak.status) {
    case "current":
      return t("account.tracking.streak.current", { count: weeklyStreak.current });
    case "grace":
      return t("account.tracking.streak.grace", { count: weeklyStreak.current });
    case "needs-check-in":
      return t("account.tracking.streak.due");
    default:
      return t("account.tracking.streak.empty");
  }
}

function formatMilestoneLabel(milestone, t) {
  return t(`account.tracking.milestone.${milestone.id}`, {}, milestone.label);
}

function formatCheckIn(checkIn, t) {
  if (checkIn.type === "daily-weight") {
    const hasCalories =
      checkIn.calories !== null &&
      checkIn.calories !== undefined &&
      checkIn.calories !== "" &&
      Number.isFinite(Number(checkIn.calories));
    const calories = hasCalories
      ? t("account.tracking.history.caloriesSegment", {
          calories: Number(checkIn.calories)
        })
      : "";
    return t("account.tracking.history.dailyWeight", {
      weight: Number(checkIn.weight).toFixed(1),
      calories
    });
  }

  if (checkIn.type === "streak-freeze") {
    return t("account.tracking.history.streakFreeze");
  }

  if (checkIn.type === "life-event") {
    return t("account.tracking.history.lifeEvent", {
      mode: formatLifeEventMode(checkIn.eventMode, t),
      days: Number(checkIn.durationDays || 0)
    });
  }

  if (checkIn.type === "limb-symmetry") {
    const summary = summarizeLimbSymmetrySplits(checkIn.splits);
    const summaryText = summary.items
      .slice(0, 2)
      .map((item) => formatLimbSymmetryDisplayItem(item, t))
      .join("; ");
    return t("account.tracking.history.limbSymmetry", {
      summary: summaryText || t("account.tracking.history.limbSplitLog")
    });
  }

  if (checkIn.type === "cycle-phase") {
    return t("account.tracking.history.cycleContext", {
      summary: formatCycleCheckInSummary(checkIn, t)
    });
  }

  return t(
    checkIn.source === "guided"
      ? "account.tracking.history.guidedWeekly"
      : "account.tracking.history.weekly",
    {
      waist: Number(checkIn.measurements?.waistCircumference).toFixed(1)
    }
  );
}

function formatLoad(value) {
  const load = Number(value || 0);
  return load.toFixed(load % 1 ? 1 : 0);
}

function photoCategoryLabel(categoryId, t, fallback = categoryId) {
  return t(`account.photo.category.${categoryId}`, {}, fallback);
}

function photoOptionLabel(photo, locale, t) {
  const category =
    t && locale !== "en" ? photoCategoryLabel(photo.category, t, photo.category) : photo.category;
  return `${category} / ${formatDate(photo.createdAt, locale)} / ${photo.fileName}`;
}

function findPhoto(photos, photoId) {
  return photos.find((photo) => photo.id === photoId) || null;
}

function PhotoImage({ photo, alt, className = "", loadingLabel = "Photo loading", ...props }) {
  if (!photo?.dataUrl) {
    return (
      <b
        className={`photo-image-placeholder ${className}`.trim()}
        role="img"
        aria-label={alt}
        {...props}
      >
        {loadingLabel}
      </b>
    );
  }

  return <img src={photo.dataUrl} alt={alt} className={className || undefined} {...props} />;
}

function formatCadenceFields(fields, t) {
  return fields
    .map((field) => t(`measurement.field.${field.name}.label`, {}, field.label))
    .join(", ");
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

function formatLocalAccountCount(count, t) {
  return count
    ? t("account.login.localCount", { count })
    : t("account.login.noLocalAccounts");
}

function formatProfileRecordCount(profile, t) {
  return t("account.profiles.records", {
    count: profile.totalRecords
  });
}

function formatProfileCounts(profile, t) {
  return t("account.profiles.counts", {
    checkIns: profile.counts.checkIns,
    goals: profile.counts.goals,
    protocols: profile.counts.protocols
  });
}

function formatJsonExportStatus(summary, t) {
  return t("account.export.jsonStatus", {
    snapshots: summary.snapshots,
    checkIns: summary.checkIns,
    procedures: summary.procedures,
    labs: summary.bloodworkResults,
    referrals: summary.referralCredits,
    diet: summary.dietEntries,
    fluids: summary.fluidEntries,
    photos: summary.photoManifest
  });
}

function formatBackupDownloadStatus(summary, t) {
  return t("account.backup.downloadStatus", {
    snapshots: summary.snapshots,
    checkIns: summary.checkIns,
    goals: summary.goals,
    protocols: summary.protocols,
    procedures: summary.procedures,
    labs: summary.bloodworkResults,
    referrals: summary.referralCredits,
    photos: summary.photoManifest
  });
}

function formatBackupRestoreStatus({
  snapshotRestore,
  restoreResult,
  referralRestore,
  summary
}, t) {
  return t("account.backup.restoreStatus", {
    snapshots: snapshotRestore.importedCount,
    checkIns: restoreResult.imported.checkIns,
    goals: restoreResult.imported.goals,
    protocols: restoreResult.imported.protocols,
    workouts: restoreResult.imported.workoutSessions,
    procedures: restoreResult.imported.procedures,
    labs: restoreResult.imported.bloodworkResults,
    referrals: referralRestore.importedCount,
    faces: restoreResult.imported.faceMeasurements,
    photos: summary.photoManifest
  });
}

function formatNativeBackupSavedStatus(summary, t) {
  return t("account.nativeBackup.status.saved", {
    snapshots: summary.snapshots,
    checkIns: summary.checkIns,
    photos: summary.photoManifest
  });
}

function formatNativeBackupLastSaved(nativeBackupState, t) {
  if (nativeBackupState.lastBackupAt) {
    return t("account.nativeBackup.lastSaved", {
      date: formatDate(nativeBackupState.lastBackupAt),
      bytes: nativeBackupState.byteLength
    });
  }

  return t("account.nativeBackup.none");
}

function formatProgressReportCounts(model, t) {
  return t("account.report.counts", {
    snapshots: model.snapshots,
    protocols: model.protocols,
    procedures: model.procedures,
    labs: model.labs,
    workouts: model.workouts,
    photos: model.photos,
    faces: model.faces
  });
}

function formatShareDashboardLinkState(shareDashboardState, t) {
  if (shareDashboardState.publicUrl) {
    return t("account.share.activeLink", { url: shareDashboardState.publicUrl });
  }

  return t("account.share.noActiveLink");
}

function formatHomeWidgetSavedStatus(snapshot, t) {
  return t("account.widget.status.saved", {
    streak: snapshot.streakLabel,
    next: snapshot.nextCheckInLabel
  });
}

function formatHealthPreparedCount(healthSyncState, t) {
  return t("account.health.preparedCount", {
    count: healthSyncState.recordCount
  });
}

function formatHealthPreparedAt(healthSyncState, t) {
  if (healthSyncState.lastPreparedAt) {
    return t("account.health.lastPrepared", {
      date: formatDate(healthSyncState.lastPreparedAt)
    });
  }

  return t("account.health.notPrepared");
}

function formatHealthPreviewLines(healthSyncPreview, t) {
  const counts = healthSyncPreview?.counts || {};
  return [
    t("account.health.preview.weightSamples", { count: counts.bodyMass || 0 }),
    t("account.health.preview.measurementSamples", { count: counts.measurements || 0 }),
    t("account.health.preview.workoutSamples", { count: counts.workouts || 0 }),
    t("account.health.preview.nutritionDaySamples", { count: counts.nutritionDays || 0 }),
    t("account.health.preview.fluidDaySamples", { count: counts.fluidDays || 0 })
  ];
}

function formatLiveUpdateStatusLabel(liveUpdateState, t) {
  return t(
    `account.live.status.${liveUpdateState.status}`,
    {},
    liveUpdateState.statusLabel || "Not checked"
  );
}

function formatLiveUpdateVersionLine(liveUpdateState, t) {
  if (liveUpdateState.latestVersion) {
    return t("account.live.versionLatest", {
      current: liveUpdateState.currentVersion,
      latest: liveUpdateState.latestVersion
    });
  }

  return t("account.live.versionNotChecked", {
    current: liveUpdateState.currentVersion
  });
}

function formatLiveUpdateDetail(liveUpdateState, t) {
  if (liveUpdateState.status === "current") {
    return t("account.live.detail.current", {
      channel: liveUpdateState.channelLabel,
      current: liveUpdateState.currentVersion
    });
  }

  if (liveUpdateState.status === "unavailable") {
    return t("account.live.detail.unavailable");
  }

  return t("account.live.detail.latest", {
    channel: liveUpdateState.channelLabel,
    latest: liveUpdateState.latestVersion,
    current: liveUpdateState.currentVersion
  });
}

function formatSyncVaultCreatedStatus(record, summary, t) {
  return t("account.sync.status.created", {
    revision: record.revision,
    checkIns: summary.checkIns,
    goals: summary.goals,
    photos: summary.photoManifest
  });
}

function formatSyncVaultPushedStatus(record, summary, t) {
  return t("account.sync.status.pushed", {
    revision: record.revision,
    checkIns: summary.checkIns,
    goals: summary.goals,
    protocols: summary.protocols
  });
}

function formatSyncConflictStatus(error, t) {
  return t("account.sync.status.conflict", {
    revision: error.detail?.currentRevision || "unknown"
  });
}

function formatSyncChangedAgainStatus(error, t) {
  return t("account.sync.status.changedAgain", {
    revision: error.detail?.currentRevision || "unknown"
  });
}

function formatSyncVaultPulledStatus(record, restoreSummary, t) {
  return t("account.sync.status.pulled", {
    revision: record.revision,
    restore: restoreSummary
  });
}

function formatSyncVaultMergedStatus(updatedRecord, summary, restoreSummary, t) {
  return t("account.sync.status.merged", {
    revision: updatedRecord.revision,
    snapshots: summary.snapshots,
    checkIns: summary.checkIns,
    goals: summary.goals,
    protocols: summary.protocols,
    restore: restoreSummary
  });
}

function formatSyncVaultMeta(syncVaultState, t) {
  if (syncVaultState.updatedAt) {
    return t("account.sync.meta.updated", {
      revision: syncVaultState.revision || 0,
      date: formatDate(syncVaultState.updatedAt)
    });
  }

  return t("account.sync.meta.revision", {
    revision: syncVaultState.revision || 0
  });
}

function formatAutoSyncReadinessReason(reason, t) {
  const reasonMap = new Map([
    [
      "Sign in before enabling automatic sync preview.",
      "account.autoSync.readiness.signIn"
    ],
    [
      "Enter an 8+ character backup passphrase before automatic sync can run.",
      "account.autoSync.readiness.passphrase"
    ],
    [
      "Create or enter a sync vault ID before automatic sync can run.",
      "account.autoSync.readiness.vault"
    ],
    [
      "Enter the sync token before automatic sync can run.",
      "account.autoSync.readiness.token"
    ],
    [
      "Automatic sync preview is ready.",
      "account.autoSync.readiness.ready"
    ]
  ]);
  const key = reasonMap.get(reason);
  return key ? t(key) : reason;
}

function formatAutoSyncLastChecked(autoSyncState, autoSyncReadiness, t) {
  if (!autoSyncState.lastRunAt) {
    return formatAutoSyncReadinessReason(autoSyncReadiness.reason, t);
  }

  if (autoSyncState.lastRevision) {
    return t("account.autoSync.lastCheckedRevision", {
      date: formatDate(autoSyncState.lastRunAt),
      revision: autoSyncState.lastRevision
    });
  }

  return t("account.autoSync.lastChecked", {
    date: formatDate(autoSyncState.lastRunAt)
  });
}

function formatAutoSyncEnabledStatus(nextState, t) {
  return t("account.autoSync.status.enabled", {
    date: formatDate(nextState.lastRunAt)
  });
}

function formatAutoSyncRanStatus(trigger, updatedRecord, restoreSummary, t) {
  const key =
    trigger === "manual"
      ? "account.autoSync.status.ran"
      : "account.autoSync.status.backgroundRan";
  return t(key, {
    revision: updatedRecord.revision,
    restore: restoreSummary
  });
}

function formatAutoSyncConflictStatus(error, t) {
  return t("account.autoSync.status.conflict", {
    revision: error.detail?.currentRevision || "unknown"
  });
}

function formatPersonalDataApiIssuedStatus(record, t) {
  return t("account.api.status.issued", {
    vaultId: record.vaultId
  });
}

function formatPersonalDataApiReadStatus(record, t) {
  return t("account.api.status.read", {
    revision: record.revision
  });
}

function formatPersonalDataApiMeta(meta, t) {
  const scopes = meta.scopes.join(", ");
  if (meta.createdAt) {
    return t("account.api.meta.created", {
      scopes,
      date: formatDate(meta.createdAt)
    });
  }

  return t("account.api.meta.scope", { scopes });
}

function formatProWaitlistStatus(signup, count, t) {
  return signup.duplicate
    ? t("account.entitlements.status.waitlistDuplicate", { count })
    : t("account.entitlements.status.waitlistSaved", { count });
}

function formatProWaitlistError(error, t) {
  const message = error?.message || "";
  if (message === "Enter a valid email for the Pro waitlist.") {
    return t("account.entitlements.status.waitlistInvalidEmail");
  }
  return message || t("account.entitlements.status.waitlistFailed");
}

function formatReferralInviteText(accountReferralCode, t) {
  return t("account.entitlements.referral.inviteText", {
    code: accountReferralCode
  });
}

function formatReferralSummary(referralSummary, t) {
  return t("account.entitlements.referral.summary", {
    count: referralSummary.count,
    months: referralSummary.earnedMonths
  });
}

function formatReferralCreditStatus(credit, t) {
  return credit.duplicate
    ? t("account.entitlements.status.referralDuplicate")
    : t("account.entitlements.status.referralLogged", {
      reward: credit.rewardLabel
    });
}

function formatReferralError(error, t) {
  const message = error?.message || "";
  const errorKeyByMessage = new Map([
    ["Referral credits are not enabled.", "account.entitlements.status.referralDisabled"],
    ["Create a local account before logging a referral.", "account.entitlements.status.referralNoAccount"],
    ["Enter a referral code.", "account.entitlements.status.referralMissingCode"],
    ["Use someone else's referral code, not your own.", "account.entitlements.status.referralOwnCode"]
  ]);

  return errorKeyByMessage.has(message)
    ? t(errorKeyByMessage.get(message))
    : message || t("account.entitlements.status.referralFailed");
}

function formatMagicLinkRequestStatus(request, t) {
  if (request.deliveryStatus === "dev-token-returned") {
    return t("account.identity.status.devToken", {
      email: request.maskedEmail
    });
  }

  if (request.deliveryStatus === "provider-configured") {
    return t("account.identity.status.provider", {
      email: request.maskedEmail
    });
  }

  return t("account.identity.status.stored", {
    email: request.maskedEmail
  });
}

function formatBloodworkError(error, t) {
  const message = error?.message || "";
  const errorKeyByMessage = new Map([
    ["Choose a bloodwork marker.", "account.bloodwork.status.chooseMarker"],
    ["Enter a numeric lab value.", "account.bloodwork.status.numericValue"]
  ]);

  return errorKeyByMessage.has(message)
    ? t(errorKeyByMessage.get(message))
    : message || t("account.bloodwork.status.failed");
}

function formatWorkoutError(error, t) {
  const message = error?.message || "";
  const errorKeyByMessage = new Map([
    ["Choose an exercise.", "account.workout.status.chooseExercise"],
    ["Enter a valid set count.", "account.workout.status.validSets"],
    ["Enter valid reps.", "account.workout.status.validReps"],
    ["Enter a valid load.", "account.workout.status.validLoad"],
    ["RPE must be between 1 and 10.", "account.workout.status.validRpe"]
  ]);

  return errorKeyByMessage.has(message)
    ? t(errorKeyByMessage.get(message))
    : message || t("account.workout.status.failed");
}

function formatProcedureError(error, t) {
  const message = error?.message || "";
  const errorKeyByMessage = new Map([
    ["Choose a procedure type.", "account.procedure.status.chooseType"]
  ]);

  return errorKeyByMessage.has(message)
    ? t(errorKeyByMessage.get(message))
    : message || t("account.procedure.status.failed");
}

function formatRangeStatus(status, t) {
  return t(`report.rangeStatus.${status}`, {}, status);
}

function formatProcedureRecordLine(procedure, locale, t) {
  if (locale === "en") {
    return formatProcedureRecord(procedure);
  }

  return t("account.procedure.recordLine", {
    label: procedure.label || "Procedure",
    date: procedure.procedureDate || procedure.createdAt || "",
    days: Number(procedure.healingDays) || 0
  });
}

function formatProcedureCaseSummary(caseLog, t) {
  return t("account.procedure.caseSummary", {
    label: caseLog.label,
    fields: caseLog.affectedFields.length ? caseLog.affectedFields.join(", ") : t("account.procedure.noFields"),
    days: caseLog.healingDays,
    snapshots: caseLog.snapshotCount,
    photos: caseLog.photoCount,
    category: caseLog.photoCategory
  });
}

export default function AccountGoalPanel({
  currentMeasurements,
  entitlements = fallbackEntitlementConfig,
  locale = "en",
  onApplyMeasurements,
  snapshotProps,
  targetProfiles = [],
  initialMagicLinkToken = "",
  onOpenStrategies,
  onClose,
  silhouetteView = "front"
}) {
  const t = useMemo(() => createTranslator(locale), [locale]);
  const [planningData, setPlanningData] = useState(emptyPlanningData);
  const [planningStatus, setPlanningStatus] = useState("Loading planning data...");
  const [exerciseLibrary, setExerciseLibrary] = useState(emptyExerciseLibrary);
  const [exerciseStatus, setExerciseStatus] = useState(() =>
    t("account.workout.status.loading")
  );
  const [procedureLibrary, setProcedureLibrary] = useState(() =>
    normalizeProcedureLibrary(fallbackProcedureLibrary)
  );
  const [procedureStatus, setProcedureStatus] = useState(() =>
    t("account.procedure.status.loading")
  );
  const [bloodworkLibrary, setBloodworkLibrary] = useState(() =>
    normalizeBloodworkLibrary(fallbackBloodworkLibrary)
  );
  const [bloodworkStatus, setBloodworkStatus] = useState(() =>
    t("account.bloodwork.status.loading")
  );
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
  const initialAutoSyncState = loadAutoSyncState();
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
  const [autoSyncState, setAutoSyncState] = useState(() => initialAutoSyncState);
  const [autoSyncStatus, setAutoSyncStatus] = useState("");
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const autoSyncInFlightRef = useRef(false);
  const [accountIdentitySession, setAccountIdentitySession] = useState(() =>
    loadAccountIdentitySession()
  );
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  const [magicLinkToken, setMagicLinkToken] = useState(() => initialMagicLinkToken);
  const [magicLinkStatus, setMagicLinkStatus] = useState(() =>
    initialMagicLinkToken ? t("account.identity.status.loaded") : ""
  );
  const [personalDataApiLabel, setPersonalDataApiLabel] = useState(() =>
    t("account.api.defaultLabel")
  );
  const [personalDataApiToken, setPersonalDataApiToken] = useState("");
  const [personalDataApiTokenMeta, setPersonalDataApiTokenMeta] = useState(null);
  const [personalDataApiStatus, setPersonalDataApiStatus] = useState("");
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
  const [nativeBackupState, setNativeBackupState] = useState(() => loadNativeBackupState());
  const [nativeBackupAutoEnabled, setNativeBackupAutoEnabled] = useState(
    () => loadNativeBackupState().autoBackupEnabled
  );
  const [nativeBackupStatus, setNativeBackupStatus] = useState("");
  const [jsonExportStatus, setJsonExportStatus] = useState("");
  const [shareDashboardState, setShareDashboardState] = useState(() =>
    loadShareDashboardState()
  );
  const [shareDashboardStatus, setShareDashboardStatus] = useState("");
  const [remotePushStatus, setRemotePushStatus] = useState(
    () => trendPushStatusFromPreference(loadNotificationPreference())
  );
  const [proWaitlistEmail, setProWaitlistEmail] = useState("");
  const [proWaitlistStatus, setProWaitlistStatus] = useState("");
  const [dataExplainerQuestion, setDataExplainerQuestion] = useState(
    () => t("account.explainer.defaultQuestion")
  );
  const [dataExplainerResponse, setDataExplainerResponse] = useState(null);
  const [referralCredits, setReferralCredits] = useState(() =>
    loadReferralCredits(initialAccount?.id)
  );
  const [referralCodeInput, setReferralCodeInput] = useState("");
  const [referralStatus, setReferralStatus] = useState("");
  const [homeWidgetSnapshot, setHomeWidgetSnapshot] = useState(() =>
    loadHomeWidgetSnapshot()
  );
  const [homeWidgetStatus, setHomeWidgetStatus] = useState("");
  const [healthSyncState, setHealthSyncState] = useState(() => loadHealthSyncState());
  const [healthSyncPreview, setHealthSyncPreview] = useState(null);
  const [healthSyncStatus, setHealthSyncStatus] = useState("");
  const [liveUpdateState, setLiveUpdateState] = useState(() => loadLiveUpdateCheck());
  const [liveUpdateStatus, setLiveUpdateStatus] = useState("");
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
  const strategyCorpusBundle = useMemo(
    () => loadStrategyCorpusBundle(),
    [account?.id]
  );
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
    if (!initialMagicLinkToken) {
      return;
    }
    setMagicLinkToken(initialMagicLinkToken);
    setMagicLinkStatus(t("account.identity.status.loaded"));
  }, [initialMagicLinkToken, locale]);

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
      setMagicLinkEmail(account.email);
    }
  }, [account?.email]);

  useEffect(() => {
    setPersonalDataApiToken("");
    setPersonalDataApiTokenMeta(null);
    setPersonalDataApiStatus("");
    const stored = loadSyncVaultState();
    const storedAutoSync = loadAutoSyncState();
    if (account?.id && storedAutoSync.accountId === account.id) {
      setAutoSyncState(storedAutoSync);
      setAutoSyncStatus("");
    } else {
      setAutoSyncState(defaultAutoSyncState());
      setAutoSyncStatus("");
    }
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
          t("account.workout.status.loaded", {
            exercises: normalized.exercises.length,
            programs: normalized.programTemplates.length
          })
        );
        setSelectedExerciseId((current) => current || normalized.exercises[0]?.id || "");
        setSelectedProgramId((current) => current || normalized.programTemplates[0]?.id || "");
      })
      .catch(() => {
        if (isMounted) {
          setExerciseStatus(t("account.workout.status.unavailable"));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [t]);

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
          t("account.procedure.status.loaded", {
            count: normalized.procedureTypes.length
          })
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
          setProcedureStatus(t("account.procedure.status.unavailable"));
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
  }, [t]);

  useEffect(() => {
    let isMounted = true;

    fetchBloodworkLibrary()
      .then((data) => {
        if (!isMounted) {
          return;
        }

        const normalized = normalizeBloodworkLibrary(data);
        setBloodworkLibrary(normalized);
        setBloodworkStatus(
          t("account.bloodwork.status.loaded", {
            count: normalized.markers.length
          })
        );
        setSelectedBloodworkMarkerId((current) => current || normalized.markers[0]?.id || "");
      })
      .catch(() => {
        if (isMounted) {
          const fallback = normalizeBloodworkLibrary(fallbackBloodworkLibrary);
          setBloodworkLibrary(fallback);
          setBloodworkStatus(t("account.bloodwork.status.unavailable"));
          setSelectedBloodworkMarkerId((current) => current || fallback.markers[0]?.id || "");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [t]);

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
  const localizedCycleTrendContext = useMemo(
    () => formatCycleTrendContext(cycleTrendContext, t),
    [cycleTrendContext, t]
  );
  const weeklyStreak = useMemo(() => buildWeeklyStreak(checkIns), [checkIns]);
  const homeWidgetPreview = useMemo(
    () =>
      buildHomeWidgetSnapshot({
        checkIns,
        weeklyStreak,
        cadenceDueState
      }),
    [cadenceDueState, checkIns, weeklyStreak]
  );
  const visibleHomeWidgetSnapshot = homeWidgetSnapshot.updatedAt
    ? homeWidgetSnapshot
    : homeWidgetPreview;
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
  const nativeBackupSignature = useMemo(
    () =>
      [
        account?.id || "",
        snapshotProps.snapshots.length,
        snapshotProps.snapshots[0]?.updatedAt || snapshotProps.snapshots[0]?.createdAt || "",
        goals.length,
        protocols.length,
        checkIns.length,
        checkIns[0]?.updatedAt || checkIns[0]?.createdAt || "",
        workoutSessions.length,
        procedures.length,
        bloodworkResults.length,
        referralCredits.length,
        photos.length,
        faceMeasurements.length
      ].join("|"),
    [
      account?.id,
      bloodworkResults.length,
      checkIns,
      faceMeasurements.length,
      goals.length,
      photos.length,
      procedures.length,
      protocols.length,
      referralCredits.length,
      snapshotProps.snapshots,
      workoutSessions.length
    ]
  );
  const autoSyncReadiness = useMemo(
    () =>
      buildAutoSyncReadiness({
        accountId: account?.id || "",
        vaultId: syncVaultId,
        syncToken: syncVaultToken,
        passphrase: backupPassphrase
      }),
    [account?.id, backupPassphrase, syncVaultId, syncVaultToken]
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

  useEffect(() => {
    if (!account) {
      return;
    }

    setHomeWidgetSnapshot(syncHomeWidgetSnapshot({
      checkIns,
      weeklyStreak,
      cadenceDueState
    }));
  }, [account?.id, cadenceDueState, checkIns, weeklyStreak]);

  useEffect(() => {
    if (!account || !nativeBackupAutoEnabled || backupPassphrase.length < 8) {
      return;
    }

    let isCancelled = false;
    saveNativeBackupFile({ automatic: true }).then((record) => {
      if (!isCancelled && record) {
        setNativeBackupStatus(
          t("account.nativeBackup.status.autosaved", {
            date: formatDate(record.lastBackupAt)
          })
        );
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [account?.id, backupPassphrase, nativeBackupAutoEnabled, nativeBackupSignature]);

  useEffect(() => {
    if (!autoSyncState.enabled) {
      return;
    }

    if (!autoSyncReadiness.ready) {
      persistAutoSyncRecord({
        enabled: true,
        pendingReason: autoSyncReadiness.reason
      });
      setAutoSyncStatus(formatAutoSyncReadinessReason(autoSyncReadiness.reason, t));
      return;
    }

    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    let isCancelled = false;
    const intervalMs = Math.max(1, Number(autoSyncState.intervalMinutes || 15)) * 60 * 1000;

    function attemptAutoSync(trigger) {
      if (isCancelled || autoSyncInFlightRef.current) {
        return;
      }

      const storedState = loadAutoSyncState();
      if (
        !shouldRunAutoSync({
          state: storedState,
          currentBackupSignature: nativeBackupSignature
        })
      ) {
        return;
      }

      void runAutoSyncCycle(trigger);
    }

    const kickoffTimer = window.setTimeout(() => attemptAutoSync("background"), 750);
    const intervalTimer = window.setInterval(
      () => attemptAutoSync("background"),
      intervalMs
    );
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        attemptAutoSync("background");
      }
    };

    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      isCancelled = true;
      window.clearTimeout(kickoffTimer);
      window.clearInterval(intervalTimer);
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [
    account?.id,
    autoSyncReadiness.ready,
    autoSyncReadiness.reason,
    autoSyncState.enabled,
    autoSyncState.intervalMinutes,
    backupPassphrase,
    nativeBackupSignature,
    syncDeviceId,
    syncVaultId,
    syncVaultToken
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
    let cancelled = false;
    const storedPhotos = loadUserPhotos(account?.id);

    if (!storedPhotos.length) {
      setPhotos([]);
      return () => {
        cancelled = true;
      };
    }

    hydrateUserPhotoAssets(storedPhotos).then((hydratedPhotos) => {
      if (!cancelled) {
        setPhotos(hydratedPhotos);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [account?.id]);

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

  async function handleRequestMagicLink() {
    const emailForLink = (magicLinkEmail || account?.email || email || loginEmail).trim();
    if (!emailForLink) {
      setMagicLinkStatus(t("account.identity.status.emailRequired"));
      return;
    }

    try {
      setMagicLinkStatus(t("account.identity.status.requesting"));
      const request = await requestAccountMagicLink({
        email: emailForLink,
        displayName: account?.displayName || displayName,
        userAgentFamily: "browser"
      });
      if (request.devLoginToken) {
        setMagicLinkToken(request.devLoginToken);
      }

      setMagicLinkStatus(formatMagicLinkRequestStatus(request, t));
    } catch (error) {
      setMagicLinkStatus(error.message || t("account.identity.status.requestFailed"));
    }
  }

  async function handleVerifyMagicLink() {
    const token = magicLinkToken.trim();
    if (!token) {
      setMagicLinkStatus(t("account.identity.status.tokenRequired"));
      return;
    }

    try {
      setMagicLinkStatus(t("account.identity.status.verifying"));
      const session = await verifyAccountMagicLink({ token });
      const persisted = persistAccountIdentitySession(session);
      setAccountIdentitySession(persisted);
      setMagicLinkToken("");
      setMagicLinkStatus(
        t("account.identity.status.verified", {
          email: persisted.maskedEmail
        })
      );
    } catch (error) {
      setMagicLinkStatus(error.message || t("account.identity.status.verifyFailed"));
    }
  }

  async function handleRevokeAccountIdentity() {
    if (!accountIdentitySession.sessionToken) {
      const cleared = clearAccountIdentitySession();
      setAccountIdentitySession(cleared);
      setMagicLinkStatus(t("account.identity.status.noSession"));
      return;
    }

    try {
      await revokeAccountIdentitySession({
        sessionToken: accountIdentitySession.sessionToken
      });
      const cleared = clearAccountIdentitySession();
      setAccountIdentitySession(cleared);
      setMagicLinkStatus(t("account.identity.status.cleared"));
    } catch (error) {
      setMagicLinkStatus(error.message || t("account.identity.status.logoutFailed"));
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

  function triggerCheckInHaptic() {
    void notifyCheckInSaved();
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
    triggerCheckInHaptic();
    setStatus("Goal check-in logged.");
  }

  function handleDailyCheckIn(event) {
    event.preventDefault();
    if (!account) {
      return;
    }

    const weight = Number(dailyWeight || currentMeasurements.weight);
    if (!Number.isFinite(weight)) {
      setStatus(t("account.tracking.status.validDailyWeight"));
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
    triggerCheckInHaptic();
    setStatus(t("account.tracking.status.dailyLogged"));
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
      setStatus(
        result.errors.form
          ? formatLimbSymmetryError(result.errors.form, t)
          : t("account.tracking.status.fixLimbSplits")
      );
      return;
    }

    const nextCheckIn = persistUserCheckIn(account.id, result.checkIn);
    setCheckIns([nextCheckIn, ...checkIns]);
    setLimbSplitValues({});
    setLimbSplitNote("");
    triggerCheckInHaptic();
    setStatus(t("account.tracking.status.limbLogged"));
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
      setStatus(
        formatCycleError(result.errors.phase || result.errors.cycleDay, t) ||
          t("account.tracking.status.fixCycle")
      );
      return;
    }

    const nextCheckIn = persistUserCheckIn(account.id, result.checkIn);
    setCheckIns([nextCheckIn, ...checkIns]);
    setCyclePhase("");
    setCycleDay("");
    setCycleFlow("not-tracked");
    setCycleSymptoms("");
    setCycleNote("");
    triggerCheckInHaptic();
    setStatus(t("account.tracking.status.cycleLogged"));
  }

  function handleDeleteCycleLogs() {
    if (!account) {
      return;
    }

    const nextCheckIns = deleteUserCheckInsByType(account.id, "cycle-phase");
    setCheckIns(nextCheckIns);
    setCycleErrors({});
    setStatus(t("account.tracking.status.cycleDeleted"));
  }

  function importHistoricalWeightCsv(rawValue) {
    if (!account) {
      return;
    }

    const result = parseHistoricalWeightCsv(rawValue, {
      existingCheckIns: checkIns
    });

    if (!result.entries.length) {
      const reason = formatHistoricalImportReason(
        result.invalidRows[0]?.reason ||
          (result.duplicateRows ? "All dated rows were already logged." : "No weight rows found."),
        t
      );
      setHistoryImportStatus(reason);
      setStatus(t("account.tracking.status.historyImportSkipped", { reason }));
      return;
    }

    const nextCheckIns = persistUserCheckIns(account.id, result.entries);
    setCheckIns(nextCheckIns);
    setHistoryImportText("");
    const summary = formatHistoricalWeightImportSummary(result, t);
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
      setHistoryImportStatus(t("account.tracking.status.csvFileFailed"));
      setStatus(t("account.tracking.status.historyImportFailed"));
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
    triggerCheckInHaptic();
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
          ? t("account.tracking.status.weeklySnapshotFix")
          : activeProtocols.length
            ? t("account.tracking.status.guidedSavedWithProtocol")
            : t("account.tracking.status.guidedSaved")
      );
    } else {
      setStatus(t("account.tracking.status.weeklyLogged"));
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
    triggerCheckInHaptic();
    setStatus(t("account.tracking.status.freezeUsed"));
  }

  async function handleEnableRemoteTrendPush() {
    setRemotePushStatus("checking");
    const result = await subscribeTrendPushNotifications({ weeklyStreak });
    setRemotePushStatus(trendPushStatusFromPreference(result.preference));
    setStatus(
      result.subscribed
        ? result.deliveryConfigured
          ? t("account.tracking.status.remoteSubscribed")
          : t("account.tracking.status.remoteSavedNeedsProvider")
        : remotePushStatusLabel(trendPushStatusFromPreference(result.preference), t)
    );
  }

  async function handleDisableRemoteTrendPush() {
    setRemotePushStatus("checking");
    const result = await unsubscribeTrendPushNotifications();
    setRemotePushStatus(trendPushStatusFromPreference(result.preference));
    setStatus(
      result.unsubscribed
        ? t("account.tracking.status.remoteUnsubscribed")
        : remotePushStatusLabel(trendPushStatusFromPreference(result.preference), t)
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
    triggerCheckInHaptic();
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
    triggerCheckInHaptic();
    setStatus(t("account.tracking.status.reliabilityLogged"));
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
      triggerCheckInHaptic();
      setStatus(
        t("account.procedure.status.logged", {
          label: nextProcedure.label
        })
      );
    } catch (error) {
      setStatus(formatProcedureError(error, t));
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
      setStatus(
        t("account.bloodwork.status.logged", {
          result: formatBloodworkResult(nextResult)
        })
      );
    } catch (error) {
      setStatus(formatBloodworkError(error, t));
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
      setStatus(
        t("account.workout.status.logged", {
          workout: formatWorkoutSession(nextWorkout)
        })
      );
    } catch (error) {
      setStatus(formatWorkoutError(error, t));
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
    setStatus(
      t("account.workout.status.repeated", {
        workout: formatWorkoutSession(nextWorkout)
      })
    );
  }

  function handlePhotoImport(event) {
    const [file] = event.target.files || [];
    if (!account || !file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setStatus(t("account.photo.status.chooseImage"));
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const record = createPhotoRecord({
          dataUrl: reader.result,
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          category: photoCategory,
          note: photoNote
        });
        const nextPhoto = await persistUserPhotoAsset(account.id, record);
        const nextPhotos = [nextPhoto, ...photos];
        setPhotos(nextPhotos);
        setPhotoNote("");
        setPhotoAfterId(nextPhoto.id);
        setPhotoGhostId(nextPhoto.id);
        if (!photoBeforeId && photos[0]) {
          setPhotoBeforeId(photos[0].id);
        }
        setStatus(
          t("account.photo.status.saved", {
            category: record.category
          })
        );
      } catch (error) {
        setStatus(error.message);
      }
    };
    reader.onerror = () => setStatus(t("account.photo.status.importFailed"));
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  async function handleDeletePhoto(photoId) {
    const nextPhotos = await deleteUserPhotoAsset(account.id, photoId);
    const hydratedPhotos = await hydrateUserPhotoAssets(nextPhotos);
    setPhotos(hydratedPhotos);
    setStatus(t("account.photo.status.deleted"));
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

    return formatBackupRestoreStatus({
      snapshotRestore,
      restoreResult,
      referralRestore,
      summary
    }, t);
  }

  function persistAutoSyncRecord(partial = {}) {
    const nextState = persistAutoSyncState({
      ...autoSyncState,
      ...partial,
      accountId: partial.accountId ?? account?.id ?? autoSyncState.accountId,
      vaultId: partial.vaultId ?? syncVaultId.trim(),
      deviceId: partial.deviceId ?? (syncDeviceId.trim() || "browser-local")
    });

    setAutoSyncState(nextState);
    return nextState;
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
    setAutoSyncState(
      persistAutoSyncState({
        ...autoSyncState,
        accountId: account?.id || autoSyncState.accountId,
        vaultId: nextState.vaultId,
        deviceId: nextState.deviceId || syncDeviceId,
        lastRevision: Number(nextState.revision || autoSyncState.lastRevision || 0)
      })
    );
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

  async function mergeAndPushSyncVault() {
    const localBundle = currentBackupBundle();
    const remoteRecord = await readSyncVault({
      vaultId: syncVaultId.trim(),
      syncToken: syncVaultToken.trim()
    });
    const remoteEncryptedBackup = syncBlobToEncryptedBackup(remoteRecord.blob, remoteRecord.updatedAt);
    const remoteBundle = await decryptLocalBackup(remoteEncryptedBackup, backupPassphrase);
    const mergedBundle = mergeLocalBackupBundles(localBundle, remoteBundle);
    const restoreSummary = restoreBackupBundle(remoteBundle);
    const encryptedBackup = await encryptLocalBackup(mergedBundle, backupPassphrase);
    const summary = summarizeLocalBackupBundle(mergedBundle);
    const mergedBackupSignature = backupBundleSignature(account?.id || "", mergedBundle, photos);
    const updatedRecord = await updateSyncVault({
      vaultId: syncVaultId.trim(),
      syncToken: syncVaultToken.trim(),
      expectedRevision: Math.max(1, Number(remoteRecord.revision || 1)),
      encryptedBackup,
      deviceId: syncDeviceId.trim() || "browser-local",
      force: false
    });

    persistSyncRecord(updatedRecord);
    return {
      updatedRecord,
      summary,
      backupSignature: mergedBackupSignature,
      restoreSummary
    };
  }

  async function handlePublishShareDashboard() {
    if (!account) {
      return;
    }

    try {
      setShareDashboardStatus(t("account.share.status.publishing"));
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
      setShareDashboardStatus(t("account.share.status.published"));
    } catch (error) {
      setShareDashboardStatus(t("account.share.status.publishFailed"));
    }
  }

  async function handleUpdateShareDashboard() {
    if (!shareDashboardState.publicToken || !shareDashboardState.revokeToken) {
      setShareDashboardStatus(t("account.share.status.publishBeforeUpdate"));
      return;
    }

    try {
      setShareDashboardStatus(t("account.share.status.updating"));
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
      setShareDashboardStatus(t("account.share.status.updated"));
    } catch (error) {
      setShareDashboardStatus(t("account.share.status.updateFailed"));
    }
  }

  async function handleCopyShareDashboardLink() {
    if (!shareDashboardState.publicUrl) {
      setShareDashboardStatus(t("account.share.status.publishBeforeCopy"));
      return;
    }

    try {
      await navigator.clipboard.writeText(shareDashboardState.publicUrl);
      setShareDashboardStatus(t("account.share.status.copied"));
    } catch (error) {
      setShareDashboardStatus(shareDashboardState.publicUrl);
    }
  }

  async function handleRevokeShareDashboard() {
    if (!shareDashboardState.publicToken || !shareDashboardState.revokeToken) {
      setShareDashboardState(clearShareDashboardState());
      setShareDashboardStatus(t("account.share.status.noActive"));
      return;
    }

    try {
      setShareDashboardStatus(t("account.share.status.revoking"));
      await revokeShareDashboard(
        shareDashboardState.publicToken,
        shareDashboardState.revokeToken
      );
      setShareDashboardState(clearShareDashboardState());
      setShareDashboardStatus(t("account.share.status.revoked"));
    } catch (error) {
      setShareDashboardStatus(t("account.share.status.revokeFailed"));
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
    setJsonExportStatus(formatJsonExportStatus(summary, t));
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
      setBackupStatus(formatBackupDownloadStatus(summary, t));
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
      setBackupStatus(t("account.backup.status.restoreFailed"));
      event.target.value = "";
    };
    reader.readAsText(file);
  }

  async function saveNativeBackupFile({ automatic = false } = {}) {
    if (!account) {
      return null;
    }

    try {
      if (!automatic) {
        setNativeBackupStatus(t("account.nativeBackup.status.saving"));
      }
      const bundle = currentBackupBundle();
      const summary = summarizeLocalBackupBundle(bundle);
      const encryptedBackup = await encryptLocalBackup(bundle, backupPassphrase);
      const record = await saveNativeEncryptedBackup({
        encryptedBackup,
        summary,
        previousState: {
          ...nativeBackupState,
          autoBackupEnabled: nativeBackupAutoEnabled
        }
      });
      setNativeBackupState(record);
      if (!automatic) {
        setNativeBackupStatus(formatNativeBackupSavedStatus(summary, t));
      }
      return record;
    } catch (error) {
      setNativeBackupStatus(error.message || t("account.nativeBackup.status.saveFailed"));
      return null;
    }
  }

  async function handleSaveNativeBackupFile() {
    await saveNativeBackupFile();
  }

  async function handleRestoreNativeBackupFile() {
    if (!account) {
      return;
    }

    try {
      setNativeBackupStatus(t("account.nativeBackup.status.restoring"));
      const encryptedBackup = await readNativeEncryptedBackup({
        state: nativeBackupState
      });
      const bundle = await decryptLocalBackup(encryptedBackup, backupPassphrase);
      setNativeBackupStatus(restoreBackupBundle(bundle));
    } catch (error) {
      setNativeBackupStatus(error.message || t("account.nativeBackup.status.restoreFailed"));
    }
  }

  async function handleDeleteNativeBackupFile() {
    try {
      const result = await deleteNativeEncryptedBackup({
        state: nativeBackupState
      });
      setNativeBackupState(result.state);
      setNativeBackupStatus(
        result.deleted
          ? t("account.nativeBackup.status.deleted")
          : t("account.nativeBackup.status.noFile")
      );
    } catch (error) {
      setNativeBackupStatus(error.message || t("account.nativeBackup.status.deleteFailed"));
    }
  }

  function handleNativeBackupAutoChange(event) {
    const enabled = event.target.checked;
    const nextState = persistNativeBackupState({
      ...nativeBackupState,
      autoBackupEnabled: enabled
    });
    setNativeBackupAutoEnabled(enabled);
    setNativeBackupState(nextState);
    setNativeBackupStatus(
      enabled
        ? t("account.nativeBackup.status.autosaveEnabled")
        : t("account.nativeBackup.status.autosaveDisabled")
    );
  }

  async function handleCreateSyncVault() {
    if (!account) {
      return;
    }

    try {
      setSyncStatus(t("account.sync.status.creating"));
      const deviceId = syncDeviceId.trim() || `browser-${account.id.slice(0, 8)}`;
      const { encryptedBackup, summary } = await encryptedBackupForSync();
      const record = await createSyncVault({
        encryptedBackup,
        deviceId
      });
      persistSyncRecord(record, record.syncToken);
      setSyncStatus(formatSyncVaultCreatedStatus(record, summary, t));
    } catch (error) {
      setSyncStatus(error.message || t("account.sync.status.createFailed"));
    }
  }

  async function handlePushSyncVault({ force = false } = {}) {
    if (!account) {
      return;
    }
    if (missingSyncCredentials()) {
      setSyncStatus(t("account.sync.status.missingPush"));
      return;
    }

    try {
      setSyncStatus(
        force ? t("account.sync.status.forcePushing") : t("account.sync.status.pushing")
      );
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
      setSyncStatus(formatSyncVaultPushedStatus(record, summary, t));
    } catch (error) {
      if (error.status === 409) {
        setSyncStatus(formatSyncConflictStatus(error, t));
      } else {
        setSyncStatus(error.message || t("account.sync.status.pushFailed"));
      }
    }
  }

  async function handlePullSyncVault() {
    if (!account) {
      return;
    }
    if (missingSyncCredentials()) {
      setSyncStatus(t("account.sync.status.missingPull"));
      return;
    }

    try {
      setSyncStatus(t("account.sync.status.pulling"));
      const record = await readSyncVault({
        vaultId: syncVaultId.trim(),
        syncToken: syncVaultToken.trim()
      });
      const encryptedBackup = syncBlobToEncryptedBackup(record.blob, record.updatedAt);
      const bundle = await decryptLocalBackup(encryptedBackup, backupPassphrase);
      const restoreSummary = restoreBackupBundle(bundle);
      persistSyncRecord(record);
      setSyncStatus(formatSyncVaultPulledStatus(record, restoreSummary, t));
    } catch (error) {
      setSyncStatus(error.message || t("account.sync.status.pullFailed"));
    }
  }

  async function handleMergeSyncVault() {
    if (!account) {
      return;
    }
    if (missingSyncCredentials()) {
      setSyncStatus(t("account.sync.status.missingMerge"));
      return;
    }

    try {
      setSyncStatus(t("account.sync.status.merging"));
      const { updatedRecord, summary, restoreSummary } = await mergeAndPushSyncVault();
      setSyncStatus(formatSyncVaultMergedStatus(updatedRecord, summary, restoreSummary, t));
    } catch (error) {
      if (error.status === 409) {
        setSyncStatus(formatSyncChangedAgainStatus(error, t));
      } else {
        setSyncStatus(error.message || t("account.sync.status.mergeFailed"));
      }
    }
  }

  function handleAutoSyncToggle(event) {
    const enabled = event.target.checked;
    const now = new Date().toISOString();
    const nextState = persistAutoSyncRecord({
      enabled,
      accountId: account?.id || "",
      vaultId: syncVaultId.trim(),
      deviceId: syncDeviceId.trim() || "browser-local",
      pendingReason: enabled && !autoSyncReadiness.ready ? autoSyncReadiness.reason : "",
      lastError: "",
      lastRunAt: enabled ? now : autoSyncState.lastRunAt,
      lastBackupSignature: enabled ? nativeBackupSignature : autoSyncState.lastBackupSignature
    });

    setAutoSyncStatus(
      enabled
        ? autoSyncReadiness.ready
          ? formatAutoSyncEnabledStatus(nextState, t)
          : formatAutoSyncReadinessReason(autoSyncReadiness.reason, t)
        : t("account.autoSync.status.disabled")
    );
  }

  async function runAutoSyncCycle(trigger = "manual") {
    if (!account) {
      return null;
    }

    if (!autoSyncReadiness.ready) {
      persistAutoSyncRecord({
        enabled: autoSyncState.enabled,
        pendingReason: autoSyncReadiness.reason
      });
      setAutoSyncStatus(formatAutoSyncReadinessReason(autoSyncReadiness.reason, t));
      return null;
    }

    if (autoSyncInFlightRef.current) {
      return null;
    }

    autoSyncInFlightRef.current = true;
    setIsAutoSyncing(true);
    setAutoSyncStatus(
      trigger === "manual"
        ? t("account.autoSync.status.running")
        : t("account.autoSync.status.backgroundRunning")
    );

    try {
      const { updatedRecord, summary, backupSignature, restoreSummary } = await mergeAndPushSyncVault();
      const ranAt = new Date().toISOString();
      const result = `Revision ${updatedRecord.revision}: ${summary.snapshots} snapshot(s), ${summary.checkIns} check-in(s), ${summary.goals} goal(s), and ${summary.protocols} protocol(s).`;
      persistAutoSyncRecord({
        enabled: true,
        accountId: account.id,
        vaultId: updatedRecord.vaultId || syncVaultId.trim(),
        deviceId: updatedRecord.deviceId || syncDeviceId.trim() || "browser-local",
        lastRunAt: ranAt,
        lastResult: result,
        lastRevision: updatedRecord.revision,
        lastTrigger: trigger,
        lastError: "",
        pendingReason: "",
        lastBackupSignature: backupSignature || nativeBackupSignature
      });
      setAutoSyncStatus(formatAutoSyncRanStatus(trigger, updatedRecord, restoreSummary, t));
      return updatedRecord;
    } catch (error) {
      const ranAt = new Date().toISOString();
      const message =
        error.status === 409
          ? formatAutoSyncConflictStatus(error, t)
          : error.message || t("account.autoSync.status.failed");
      persistAutoSyncRecord({
        enabled: autoSyncState.enabled,
        lastRunAt: ranAt,
        lastTrigger: trigger,
        lastError: message,
        pendingReason: message,
        lastBackupSignature: nativeBackupSignature
      });
      setAutoSyncStatus(message);
      return null;
    } finally {
      autoSyncInFlightRef.current = false;
      setIsAutoSyncing(false);
    }
  }

  async function handleRunAutoSyncNow() {
    await runAutoSyncCycle("manual");
  }

  async function handleRevokeSyncVault() {
    if (missingSyncCredentials()) {
      setSyncVaultState(clearSyncVaultState());
      setSyncVaultId("");
      setSyncVaultToken("");
      setAutoSyncState(clearAutoSyncState());
      setAutoSyncStatus(t("account.autoSync.status.clearedLocal"));
      setSyncStatus(t("account.sync.status.noCredentialsToRevoke"));
      return;
    }

    try {
      setSyncStatus(t("account.sync.status.revoking"));
      await revokeSyncVault({
        vaultId: syncVaultId.trim(),
        syncToken: syncVaultToken.trim()
      });
      const cleared = clearSyncVaultState();
      const clearedAutoSync = clearAutoSyncState();
      setSyncVaultState(cleared);
      setAutoSyncState(clearedAutoSync);
      setSyncVaultId("");
      setSyncVaultToken("");
      setAutoSyncStatus(t("account.autoSync.status.clearedVault"));
      setSyncStatus(t("account.sync.status.revoked"));
    } catch (error) {
      setSyncStatus(error.message || t("account.sync.status.revokeFailed"));
    }
  }

  async function handleCreatePersonalDataApiToken() {
    if (missingSyncCredentials()) {
      setPersonalDataApiStatus(t("account.api.status.missingSync"));
      return;
    }

    try {
      setPersonalDataApiStatus(t("account.api.status.issuing"));
      const record = await createPersonalDataToken({
        vaultId: syncVaultId.trim(),
        syncToken: syncVaultToken.trim(),
        label: personalDataApiLabel.trim() || t("account.api.defaultLabel")
      });
      setPersonalDataApiToken(record.accessToken);
      setPersonalDataApiTokenMeta(record);
      setPersonalDataApiStatus(formatPersonalDataApiIssuedStatus(record, t));
    } catch (error) {
      setPersonalDataApiStatus(error.message || t("account.api.status.createFailed"));
    }
  }

  async function handleTestPersonalDataApiToken() {
    if (!personalDataApiToken.trim()) {
      setPersonalDataApiStatus(t("account.api.status.missingReadToken"));
      return;
    }

    try {
      setPersonalDataApiStatus(t("account.api.status.reading"));
      const record = await readPersonalDataSyncVault({
        accessToken: personalDataApiToken.trim()
      });
      setPersonalDataApiStatus(formatPersonalDataApiReadStatus(record, t));
    } catch (error) {
      setPersonalDataApiStatus(error.message || t("account.api.status.readFailed"));
    }
  }

  async function handleCopyPersonalDataApiToken() {
    if (!personalDataApiToken.trim()) {
      setPersonalDataApiStatus(t("account.api.status.missingCopyToken"));
      return;
    }

    try {
      await navigator.clipboard.writeText(personalDataApiToken.trim());
      setPersonalDataApiStatus(t("account.api.status.copied"));
    } catch {
      setPersonalDataApiStatus(t("account.api.status.copyFailed"));
    }
  }

  async function handleRevokePersonalDataApiToken() {
    if (!personalDataApiToken.trim()) {
      setPersonalDataApiStatus(t("account.api.status.missingRevokeToken"));
      return;
    }

    try {
      setPersonalDataApiStatus(t("account.api.status.revoking"));
      const result = await revokePersonalDataToken({
        accessToken: personalDataApiToken.trim()
      });
      setPersonalDataApiToken("");
      setPersonalDataApiTokenMeta(null);
      setPersonalDataApiStatus(
        result.revoked
          ? t("account.api.status.revoked")
          : t("account.api.status.noActive")
      );
    } catch (error) {
      setPersonalDataApiStatus(error.message || t("account.api.status.revokeFailed"));
    }
  }

  function handleRefreshHomeWidgetSnapshot() {
    const snapshot = syncHomeWidgetSnapshot({
      checkIns,
      weeklyStreak,
      cadenceDueState
    });
    setHomeWidgetSnapshot(snapshot);
    setHomeWidgetStatus(formatHomeWidgetSavedStatus(snapshot, t));
  }

  function handlePrepareHealthSyncPreview() {
    const batch = buildHealthWriteBatch({
      currentMeasurements,
      snapshots: snapshotProps.snapshots,
      checkIns,
      workoutSessions,
      dietLog: loadDietLog(),
      fluidLog: loadFluidLog()
    });
    const preview = summarizeHealthWriteBatch(batch);
    const nextState = persistHealthSyncState(preview);

    setHealthSyncPreview(preview);
    setHealthSyncState(nextState);
    setHealthSyncStatus(
      t("account.health.status.prepared", {
        count: preview.counts.total
      })
    );
  }

  async function handleCheckLiveUpdates() {
    try {
      setLiveUpdateStatus(t("account.live.status.checking"));
      const manifest = await fetchLiveUpdateManifest({
        channel: liveUpdateState.channel || "production",
        currentVersion: APP_VERSION,
        platform: "web"
      });
      const status = buildLiveUpdateStatus({
        manifest,
        requestedChannel: liveUpdateState.channel || "production",
        currentVersion: APP_VERSION
      });
      const persistedStatus = persistLiveUpdateCheck(status);
      setLiveUpdateState(persistedStatus);
      setLiveUpdateStatus(formatLiveUpdateDetail(persistedStatus, t));
    } catch (error) {
      const status = persistLiveUpdateCheck({
        ...liveUpdateState,
        status: "unavailable",
        statusLabel: "Manifest unavailable",
        checkedAt: new Date().toISOString(),
        detail: error.message || "Live-update manifest check failed."
      });
      setLiveUpdateState(status);
      setLiveUpdateStatus(error.message || formatLiveUpdateDetail(status, t));
    }
  }

  function handleDownloadProgressReport() {
    downloadProgressReport({
      account,
      locale,
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
    setStatus(t("account.report.downloaded"));
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
      setProWaitlistStatus(formatProWaitlistStatus(signup, count, t));
    } catch (error) {
      setProWaitlistStatus(formatProWaitlistError(error, t));
    }
  }

  function handleGenerateDataExplainer() {
    setDataExplainerResponse(
      buildDataExplainerResponse({
        question: dataExplainerQuestion,
        currentMeasurements,
        snapshots: snapshotProps.snapshots,
        goals,
        protocols,
        checkIns,
        workoutSessions,
        procedures,
        bloodworkResults,
        photos,
        faceMeasurements,
        strategyCorpus: strategyCorpusBundle,
        weeklyStreak,
        trendWeight,
        insightDrops
      })
    );
  }

  async function handleCopyReferralInvite() {
    if (!accountReferralCode) {
      return;
    }

    const text = formatReferralInviteText(accountReferralCode, t);
    try {
      await navigator.clipboard.writeText(text);
      setReferralStatus(t("account.entitlements.status.inviteCopied"));
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
      setReferralStatus(formatReferralCreditStatus(credit, t));
    } catch (error) {
      setReferralStatus(formatReferralError(error, t));
    }
  }

  const emailIdentityCard = (
    <section className="auth-card email-identity-card" aria-label={t("account.identity.aria")}>
      <div>
        <h3>{t("account.identity.title")}</h3>
        <p>
          {t("account.identity.body")}
        </p>
      </div>
      {accountIdentitySession.sessionToken ? (
        <div className="account-status-line">
          <strong>{t("account.identity.verified")}</strong>
          <span>{accountIdentitySession.maskedEmail || accountIdentitySession.emailDomain}</span>
        </div>
      ) : null}
      <label className="field">
        <span className="field-label">{t("account.identity.email")}</span>
        <input
          aria-label={t("account.identity.email")}
          type="email"
          value={magicLinkEmail}
          onChange={(event) => setMagicLinkEmail(event.target.value)}
          placeholder={account?.email || email || loginEmail || "you@example.com"}
        />
      </label>
      <label className="field">
        <span className="field-label">{t("account.identity.token")}</span>
        <input
          aria-label={t("account.identity.token")}
          value={magicLinkToken}
          onChange={(event) => setMagicLinkToken(event.target.value)}
          placeholder={t("account.identity.tokenPlaceholder")}
        />
      </label>
      <div className="button-row">
        <button className="button" type="button" onClick={handleRequestMagicLink}>
          {t("account.identity.request")}
        </button>
        <button className="button" type="button" onClick={handleVerifyMagicLink}>
          {t("account.identity.verify")}
        </button>
        <button className="button secondary" type="button" onClick={handleRevokeAccountIdentity}>
          {t("account.identity.clear")}
        </button>
      </div>
      {magicLinkStatus ? (
        <small className="account-status-line" role="status" aria-live="polite">
          {magicLinkStatus}
        </small>
      ) : null}
    </section>
  );

  return (
    <div className="account-overlay" role="presentation">
      <section
        className="account-panel panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-panel-heading"
      >
        <button className="modal-close account-close" type="button" aria-label={t("account.close.aria")} onClick={onClose}>
          x
        </button>

        <div className="panel-header account-header">
          <div>
            <h2 id="account-panel-heading">{t("account.title")}</h2>
            <p>{t("account.intro")}</p>
          </div>
          <span className="account-status" role="status" aria-live="polite">
            {planningStatus}
          </span>
        </div>

        {!account ? (
          <div className="account-auth-grid">
            <form className="auth-card" onSubmit={handleCreateAccount}>
              <h3>{t("account.create.title")}</h3>
              <label className="field">
                <span className="field-label">{t("account.create.displayName")}</span>
                <input
                  aria-label={t("account.create.displayName")}
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Mason"
                />
              </label>
              <label className="field">
                <span className="field-label">{t("account.email")}</span>
                <input
                  aria-label={t("account.create.emailAria")}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>
              <label className="field">
                <span className="field-label">{t("account.create.persona")}</span>
                <select
                  aria-label={t("account.create.persona")}
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
                {t("account.create.button")}
              </button>
            </form>

            <form className="auth-card" onSubmit={handleLogin}>
              <h3>{t("account.login.title")}</h3>
              <label className="field">
                <span className="field-label">{t("account.email")}</span>
                <input
                  aria-label={t("account.login.emailAria")}
                  type="email"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              <button className="button" type="submit" disabled={!accounts.length}>
                {t("account.login.button")}
              </button>
              <p className="muted-text">
                {formatLocalAccountCount(accounts.length, t)}
              </p>
            </form>

            {emailIdentityCard}

            {localProfileSummaries.length ? (
              <section className="profile-switcher" aria-label={t("account.profiles.localAria")}>
                <div>
                  <h3>{t("account.profiles.localTitle")}</h3>
                  <p>
                    {t("account.profiles.localBody")}
                  </p>
                </div>
                <ul className="profile-switcher-list">
                  {localProfileSummaries.map((profile) => (
                    <li key={profile.id}>
                      <div>
                        <strong>{profile.displayName}</strong>
                        <span>{profile.email}</span>
                        <small>{formatProfileRecordCount(profile, t)}</small>
                      </div>
                      <button
                        className="button"
                        type="button"
                        onClick={() => handleSwitchProfile(profile.id)}
                      >
                        {t("account.profiles.switch")}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="local-json-export-section" aria-label={t("account.export.aria")}>
              <div>
                <h3>{t("account.export.title")}</h3>
                <p>
                  {t("account.export.signedOutBody")}
                </p>
              </div>
              <button className="button" type="button" onClick={handleDownloadJsonExport}>
                {t("account.export.download")}
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
                {t("account.logout")}
              </button>
            </section>

            {emailIdentityCard}

            {localProfileSummaries.length > 1 ? (
              <section className="profile-switcher" aria-label={t("account.profiles.switcherAria")}>
                <div>
                  <h3>{t("account.profiles.switcherTitle")}</h3>
                  <p>
                    {t("account.profiles.switcherBody")}
                  </p>
                </div>
                <ul className="profile-switcher-list">
                  {localProfileSummaries.map((profile) => (
                    <li key={profile.id} className={profile.id === account.id ? "is-active" : ""}>
                      <div>
                        <strong>{profile.displayName}</strong>
                        <span>{profile.email}</span>
                        <small>
                          {formatProfileCounts(profile, t)}
                        </small>
                      </div>
                      <button
                        className="button"
                        type="button"
                        onClick={() => handleSwitchProfile(profile.id)}
                        disabled={profile.id === account.id}
                      >
                        {profile.id === account.id
                          ? t("account.profiles.current")
                          : t("account.profiles.switch")}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="entitlement-section" aria-label={t("account.entitlements.aria")}>
              <div className="entitlement-current">
                <div>
                  <h3>{t("account.entitlements.planLabel", { tier: currentTier.label })}</h3>
                  <p>{currentTier.summary}</p>
                </div>
                <strong>{entitlementConfig.waitlist.storage}</strong>
              </div>
              <div className="entitlement-grid">
                <div className="entitlement-free" aria-label={t("account.entitlements.freeAria")}>
                  <h4>{t("account.entitlements.includedTitle")}</h4>
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
                  aria-label={t("account.entitlements.waitlistAria")}
                  onSubmit={handleProWaitlistSubmit}
                >
                  <h4>{t("account.entitlements.proPreviewTitle")}</h4>
                  <p>{entitlementConfig.waitlist.message}</p>
                  <div className="pro-preview-list" aria-label={t("account.entitlements.lockedPreviewAria")}>
                    {proPreviewFeatures.map((feature) => (
                      <article key={feature.id} className="pro-preview-card">
                        <strong>{feature.label}</strong>
                        <span>{feature.category} / {feature.status}</span>
                        <p>{feature.summary}</p>
                      </article>
                    ))}
                  </div>
                  <label className="field">
                    <span className="field-label">{t("account.entitlements.waitlistEmail")}</span>
                    <input
                      aria-label={t("account.entitlements.waitlistEmailAria")}
                      type="email"
                      value={proWaitlistEmail}
                      onChange={(event) => setProWaitlistEmail(event.target.value)}
                      placeholder={account.email}
                    />
                  </label>
                  <button className="button" type="submit">
                    {t("account.entitlements.joinWaitlist")}
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
                aria-label={t("account.entitlements.referral.aria")}
                onSubmit={handleReferralSubmit}
              >
                <div>
                  <h4>{t("account.entitlements.referral.title")}</h4>
                  <p>{entitlementConfig.referral.message}</p>
                  <small>{entitlementConfig.referral.disclaimer}</small>
                </div>
                <div className="referral-code-row">
                  <span>{t("account.entitlements.referral.yourCode")}</span>
                  <strong>{accountReferralCode}</strong>
                  <button className="button" type="button" onClick={handleCopyReferralInvite}>
                    {t("account.entitlements.referral.copyInvite")}
                  </button>
                </div>
                <label className="field">
                  <span className="field-label">{t("account.entitlements.referral.friendCode")}</span>
                  <input
                    aria-label={t("account.entitlements.referral.friendCodeAria")}
                    value={referralCodeInput}
                    onChange={(event) => setReferralCodeInput(event.target.value)}
                    placeholder="BM-FRIEND1"
                  />
                </label>
                <button className="button" type="submit">
                  {t("account.entitlements.referral.logCredit")}
                </button>
                <span>
                  {formatReferralSummary(referralSummary, t)}
                </span>
                {referralCredits.length ? (
                  <ul className="referral-credit-list" aria-label={t("account.entitlements.referral.loggedAria")}>
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

            <section className="data-explainer-section" aria-label={t("account.explainer.aria")}>
              <div>
                <h3>{t("account.explainer.title")}</h3>
                <p>
                  {t("account.explainer.body")}
                </p>
                <small>
                  {t("account.explainer.boundaryNote")}
                </small>
              </div>
              <label className="field data-explainer-question">
                <span className="field-label">{t("account.explainer.question")}</span>
                <textarea
                  aria-label={t("account.explainer.questionAria")}
                  value={dataExplainerQuestion}
                  onChange={(event) => setDataExplainerQuestion(event.target.value)}
                  rows="4"
                />
              </label>
              <div className="data-explainer-actions">
                <button className="button" type="button" onClick={handleGenerateDataExplainer}>
                  {t("account.explainer.generate")}
                </button>
                <small>
                  {t("account.explainer.citationNote")}
                </small>
              </div>
              {dataExplainerResponse ? (
                <div className="data-explainer-response" aria-label={t("account.explainer.responseAria")}>
                  <div>
                    <strong>
                      {dataExplainerResponse.status === "boundary"
                        ? t("account.explainer.response.boundaryApplied")
                        : t("account.explainer.response.localSummary")}
                    </strong>
                    <p>{dataExplainerResponse.answerSummary}</p>
                  </div>
                  <div>
                    <h4>{t("account.explainer.response.snapshot")}</h4>
                    <ul>
                      {dataExplainerResponse.dataSnapshot.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4>{t("account.explainer.response.observations")}</h4>
                    <ul>
                      {dataExplainerResponse.observations.map((observation) => (
                        <li key={observation}>{observation}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="data-explainer-citations">
                    <h4>{t("account.explainer.response.citations")}</h4>
                    {dataExplainerResponse.citations.length ? (
                      <ul>
                        {dataExplainerResponse.citations.map((citation) => (
                          <li key={`${citation.outcome}-${citation.label}`}>
                            <strong>{citation.label}</strong>
                            <span>
                              {citation.outcome} / {citation.evidence}{" "}
                              {t("account.explainer.response.evidence")} /{" "}
                              {t("account.explainer.response.risk", { risk: citation.risk })}
                              {citation.contextOnly
                                ? ` / ${t("account.explainer.response.contextOnly")}`
                                : ""}
                            </span>
                            <p>{citation.summary}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>{t("account.explainer.response.noCitations")}</p>
                    )}
                  </div>
                  <div>
                    <h4>{t("account.explainer.response.nextQuestions")}</h4>
                    <ul>
                      {dataExplainerResponse.nextQuestions.map((question) => (
                        <li key={question}>{question}</li>
                      ))}
                    </ul>
                  </div>
                  <small>
                    {dataExplainerResponse.boundary} {dataExplainerResponse.reviewNote}
                  </small>
                </div>
              ) : null}
            </section>

            <section className="home-widget-section" aria-label={t("account.widget.aria")}>
              <div>
                <h3>{t("account.widget.title")}</h3>
                <div className="home-widget-preview">
                  <strong>{visibleHomeWidgetSnapshot.streakLabel}</strong>
                  <span>{visibleHomeWidgetSnapshot.nextCheckInLabel}</span>
                  <small>{visibleHomeWidgetSnapshot.dailyLabel}</small>
                </div>
              </div>
              <div className="home-widget-actions">
                <button className="button" type="button" onClick={handleRefreshHomeWidgetSnapshot}>
                  {t("account.widget.refresh")}
                </button>
                {visibleHomeWidgetSnapshot.updatedAt ? (
                  <small>
                    {t("account.widget.updated", {
                      date: formatWidgetDate(visibleHomeWidgetSnapshot.updatedAt)
                    })}
                  </small>
                ) : null}
              </div>
              {homeWidgetStatus ? (
                <small className="home-widget-status" role="status" aria-live="polite">
                  {homeWidgetStatus}
                </small>
              ) : null}
            </section>

            <section className="health-sync-section" aria-label={t("account.health.aria")}>
              <div>
                <h3>{t("account.health.title")}</h3>
                <p>
                  {t("account.health.body")}
                </p>
                <small>
                  {t("account.health.note")}
                </small>
              </div>
              <div className="health-sync-status-block">
                <strong>{formatHealthPreparedCount(healthSyncState, t)}</strong>
                <span>{formatHealthPreparedAt(healthSyncState, t)}</span>
                <small>{healthSyncState.privacy}</small>
              </div>
              <div className="health-sync-actions">
                <button className="button" type="button" onClick={handlePrepareHealthSyncPreview}>
                  {t("account.health.prepare")}
                </button>
                <small>{t("account.health.metadata")}</small>
              </div>
              {healthSyncPreview ? (
                <div className="health-sync-preview" aria-label={t("account.health.previewAria")}>
                  <h4>{t("account.health.previewTitle")}</h4>
                  <ul>
                    {formatHealthPreviewLines(healthSyncPreview, t).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  <p>{healthSyncPreview.privacy}</p>
                </div>
              ) : null}
              {healthSyncStatus ? (
                <small className="health-sync-status" role="status" aria-live="polite">
                  {healthSyncStatus}
                </small>
              ) : null}
            </section>

            <section className="live-update-section" aria-label={t("account.live.aria")}>
              <div>
                <h3>{t("account.live.title")}</h3>
                <p>
                  {t("account.live.body")}
                </p>
                <small>
                  {t("account.live.note")}
                </small>
              </div>
              <div className="live-update-status-block">
                <strong>{formatLiveUpdateStatusLabel(liveUpdateState, t)}</strong>
                <span>{t("account.live.channel", { channel: liveUpdateState.channelLabel })}</span>
                <small>{formatLiveUpdateVersionLine(liveUpdateState, t)}</small>
                <small>{liveUpdateState.reviewStatus}</small>
              </div>
              <div className="live-update-actions">
                <button className="button" type="button" onClick={handleCheckLiveUpdates}>
                  {t("account.live.check")}
                </button>
                <small>{liveUpdateState.privacy}</small>
              </div>
              {liveUpdateStatus ? (
                <small className="live-update-status" role="status" aria-live="polite">
                  {liveUpdateStatus}
                </small>
              ) : null}
            </section>

            <section className="progress-report-section" aria-label={t("account.report.aria")}>
              <div>
                <h3>{t("account.report.title")}</h3>
                <p>
                  {t("account.report.body")}
                </p>
                <span>
                  {formatProgressReportCounts(
                    {
                      snapshots: snapshotProps.snapshots.length,
                      protocols: protocols.length,
                      procedures: procedures.length,
                      labs: bloodworkResults.length,
                      workouts: workoutSessions.length,
                      photos: photos.length,
                      faces: faceMeasurements.length
                    },
                    t
                  )}
                </span>
              </div>
              <button className="button" type="button" onClick={handleDownloadProgressReport}>
                {t("account.report.download")}
              </button>
            </section>

            <section className="share-dashboard-section" aria-label={t("account.share.aria")}>
              <div>
                <h3>{t("account.share.title")}</h3>
                <p>
                  {t("account.share.body")}
                </p>
                <span>{formatShareDashboardLinkState(shareDashboardState, t)}</span>
              </div>
              <div className="share-dashboard-actions">
                <button className="button" type="button" onClick={handlePublishShareDashboard}>
                  {t("account.share.publish")}
                </button>
                <button
                  className="button"
                  type="button"
                  onClick={handleUpdateShareDashboard}
                  disabled={!shareDashboardState.publicToken}
                >
                  {t("account.share.update")}
                </button>
                <button
                  className="button"
                  type="button"
                  onClick={handleCopyShareDashboardLink}
                  disabled={!shareDashboardState.publicUrl}
                >
                  {t("account.share.copy")}
                </button>
                <button
                  className="button"
                  type="button"
                  onClick={handleRevokeShareDashboard}
                  disabled={!shareDashboardState.publicToken}
                >
                  {t("account.share.revoke")}
                </button>
              </div>
              {shareDashboardStatus ? (
                <small className="share-dashboard-status" role="status" aria-live="polite">
                  {shareDashboardStatus}
                </small>
              ) : null}
            </section>

            <section className="local-json-export-section" aria-label={t("account.export.aria")}>
              <div>
                <h3>{t("account.export.title")}</h3>
                <p>
                  {t("account.export.signedInBody")}
                </p>
              </div>
              <button className="button" type="button" onClick={handleDownloadJsonExport}>
                {t("account.export.download")}
              </button>
              {jsonExportStatus ? (
                <small className="local-json-export-status" role="status" aria-live="polite">
                  {jsonExportStatus}
                </small>
              ) : null}
            </section>

            <section className="encrypted-backup-section" aria-label={t("account.backup.aria")}>
              <div>
                <h3>{t("account.backup.title")}</h3>
                <p>
                  {t("account.backup.body")}
                </p>
              </div>
              <label className="field">
                <span className="field-label">{t("account.backup.passphrase")}</span>
                <input
                  aria-label={t("account.backup.passphrase")}
                  type="password"
                  value={backupPassphrase}
                  onChange={(event) => setBackupPassphrase(event.target.value)}
                  placeholder={t("account.backup.passphrasePlaceholder")}
                />
              </label>
              <div className="encrypted-backup-actions">
                <button className="button" type="button" onClick={handleDownloadEncryptedBackup}>
                  {t("account.backup.download")}
                </button>
                <label className="button file-button">
                  {t("account.backup.restore")}
                  <input
                    aria-label={t("account.backup.restoreFileAria")}
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
              <div className="native-backup-panel" aria-label={t("account.nativeBackup.aria")}>
                <div>
                  <h4>{t("account.nativeBackup.title")}</h4>
                  <p>
                    {t("account.nativeBackup.body")}
                  </p>
                  <small>{formatNativeBackupLastSaved(nativeBackupState, t)}</small>
                </div>
                <label className="native-backup-toggle">
                  <input
                    aria-label={t("account.nativeBackup.autosaveAria")}
                    type="checkbox"
                    checked={nativeBackupAutoEnabled}
                    onChange={handleNativeBackupAutoChange}
                  />
                  <span>{t("account.nativeBackup.autosave")}</span>
                </label>
                <div className="native-backup-actions">
                  <button className="button" type="button" onClick={handleSaveNativeBackupFile}>
                    {t("account.nativeBackup.save")}
                  </button>
                  <button className="button" type="button" onClick={handleRestoreNativeBackupFile}>
                    {t("account.nativeBackup.restore")}
                  </button>
                  <button className="button" type="button" onClick={handleDeleteNativeBackupFile}>
                    {t("account.nativeBackup.delete")}
                  </button>
                </div>
                {nativeBackupStatus ? (
                  <small className="native-backup-status" role="status" aria-live="polite">
                    {nativeBackupStatus}
                  </small>
                ) : null}
              </div>
            </section>

            <section className="encrypted-sync-section" aria-label={t("account.sync.aria")}>
              <div>
                <h3>{t("account.sync.title")}</h3>
                <p>
                  {t("account.sync.body")}
                </p>
              </div>
              <div className="encrypted-sync-fields">
                <label className="field">
                  <span className="field-label">{t("account.sync.deviceId")}</span>
                  <input
                    aria-label={t("account.sync.deviceIdAria")}
                    value={syncDeviceId}
                    onChange={(event) => setSyncDeviceId(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="field-label">{t("account.sync.vaultId")}</span>
                  <input
                    aria-label={t("account.sync.vaultIdAria")}
                    value={syncVaultId}
                    onChange={(event) => setSyncVaultId(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="field-label">{t("account.sync.token")}</span>
                  <input
                    aria-label={t("account.sync.tokenAria")}
                    type="password"
                    value={syncVaultToken}
                    onChange={(event) => setSyncVaultToken(event.target.value)}
                  />
                </label>
              </div>
              <div className="encrypted-sync-actions">
                <button className="button" type="button" onClick={handleCreateSyncVault}>
                  {t("account.sync.create")}
                </button>
                <button className="button" type="button" onClick={() => handlePushSyncVault()}>
                  {t("account.sync.push")}
                </button>
                <button className="button" type="button" onClick={handlePullSyncVault}>
                  {t("account.sync.pull")}
                </button>
                <button className="button" type="button" onClick={handleMergeSyncVault}>
                  {t("account.sync.merge")}
                </button>
                <button className="button" type="button" onClick={() => handlePushSyncVault({ force: true })}>
                  {t("account.sync.forcePush")}
                </button>
                <button className="button" type="button" onClick={handleRevokeSyncVault}>
                  {t("account.sync.revoke")}
                </button>
              </div>
              {syncVaultState.vaultId ? (
                <small className="encrypted-sync-meta">
                  {formatSyncVaultMeta(syncVaultState, t)}
                </small>
              ) : null}
              <div className="auto-sync-panel" aria-label={t("account.autoSync.aria")}>
                <div>
                  <h4>{t("account.autoSync.title")}</h4>
                  <p>
                    {t("account.autoSync.body")}
                  </p>
                  <small>{formatAutoSyncLastChecked(autoSyncState, autoSyncReadiness, t)}</small>
                </div>
                <label className="auto-sync-toggle">
                  <input
                    aria-label={t("account.autoSync.toggleAria")}
                    type="checkbox"
                    checked={autoSyncState.enabled}
                    onChange={handleAutoSyncToggle}
                    disabled={!account}
                  />
                  <span>{t("account.autoSync.enable")}</span>
                </label>
                <div className="auto-sync-actions">
                  <button
                    className="button"
                    type="button"
                    onClick={handleRunAutoSyncNow}
                    disabled={!autoSyncReadiness.ready || isAutoSyncing}
                  >
                    {isAutoSyncing
                      ? t("account.autoSync.syncing")
                      : t("account.autoSync.runNow")}
                  </button>
                </div>
                {autoSyncStatus ? (
                  <small className="auto-sync-status" role="status" aria-live="polite">
                    {autoSyncStatus}
                  </small>
                ) : null}
              </div>
              {syncStatus ? (
                <small className="encrypted-sync-status" role="status" aria-live="polite">
                  {syncStatus}
                </small>
              ) : null}
            </section>

            <section className="personal-data-api-section" aria-label={t("account.api.aria")}>
              <div>
                <h3>{t("account.api.title")}</h3>
                <p>
                  {t("account.api.body")}
                </p>
              </div>
              <div className="encrypted-sync-fields">
                <label className="field">
                  <span className="field-label">{t("account.api.tokenLabel")}</span>
                  <input
                    aria-label={t("account.api.tokenLabelAria")}
                    value={personalDataApiLabel}
                    onChange={(event) => setPersonalDataApiLabel(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="field-label">{t("account.api.token")}</span>
                  <input
                    aria-label={t("account.api.tokenAria")}
                    type="password"
                    value={personalDataApiToken}
                    onChange={(event) => setPersonalDataApiToken(event.target.value)}
                  />
                </label>
              </div>
              <div className="encrypted-sync-actions">
                <button className="button" type="button" onClick={handleCreatePersonalDataApiToken}>
                  {t("account.api.issue")}
                </button>
                <button className="button" type="button" onClick={handleTestPersonalDataApiToken}>
                  {t("account.api.testRead")}
                </button>
                <button className="button" type="button" onClick={handleCopyPersonalDataApiToken}>
                  {t("account.api.copy")}
                </button>
                <button className="button" type="button" onClick={handleRevokePersonalDataApiToken}>
                  {t("account.api.revoke")}
                </button>
              </div>
              {personalDataApiTokenMeta ? (
                <small className="personal-data-api-meta">
                  {formatPersonalDataApiMeta(personalDataApiTokenMeta, t)}
                </small>
              ) : null}
              {personalDataApiStatus ? (
                <small className="personal-data-api-status" role="status" aria-live="polite">
                  {personalDataApiStatus}
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

            <section className="checkin-loop" aria-label={t("account.tracking.aria")}>
              <div className="panel-header">
                <h3>{t("account.tracking.title")}</h3>
                <p>{t("account.tracking.body")}</p>
              </div>
              <div className="cadence-grid" aria-label={t("account.tracking.cadenceAria")}>
                <div>
                  <strong>
                    {cadenceDueState.daily.isDue
                      ? t("account.tracking.cadence.dueToday")
                      : t("account.tracking.cadence.loggedToday")}
                  </strong>
                  <span>
                    {t("account.tracking.cadence.dailyLine", {
                      fields: formatCadenceFields(cadenceDueState.daily.fields, t)
                    })}
                  </span>
                  <small>
                    {cadenceDueState.daily.latestAt
                      ? t("account.tracking.cadence.last", {
                          date: formatDate(cadenceDueState.daily.latestAt, locale)
                        })
                      : t("account.tracking.cadence.noDaily")}
                  </small>
                </div>
                <div>
                  <strong>
                    {cadenceDueState.weekly.isDue
                      ? t("account.tracking.cadence.weeklyDue")
                      : t("account.tracking.cadence.weeklyCurrent")}
                  </strong>
                  <span>{formatCadenceFields(cadenceDueState.weekly.fields, t)}</span>
                  <small>
                    {cadenceDueState.weekly.latestAt
                      ? t("account.tracking.cadence.last", {
                          date: formatDate(cadenceDueState.weekly.latestAt, locale)
                        })
                      : t("account.tracking.cadence.noWeekly")}
                  </small>
                </div>
                <div>
                  <strong>
                    {cadenceDueState.monthly.isDue
                      ? t("account.tracking.cadence.monthlyDue")
                      : t("account.tracking.cadence.monthlyCurrent")}
                  </strong>
                  <span>{formatCadenceFields(cadenceDueState.monthly.fields, t)}</span>
                  <small>
                    {cadenceDueState.monthly.latestAt
                      ? t("account.tracking.cadence.last", {
                          date: formatDate(cadenceDueState.monthly.latestAt, locale)
                        })
                      : t("account.tracking.cadence.noMonthly")}
                  </small>
                </div>
              </div>
              <form className="checkin-form" onSubmit={handleDailyCheckIn}>
                <label className="field">
                  <span className="field-label">{t("account.tracking.dailyWeight")}</span>
                  <input
                    aria-label={t("account.tracking.dailyWeight")}
                    inputMode="decimal"
                    value={dailyWeight}
                    onChange={(event) => setDailyWeight(event.target.value)}
                    placeholder={String(currentMeasurements.weight)}
                  />
                </label>
                <label className="field">
                  <span className="field-label">{t("account.tracking.caloriesOptional")}</span>
                  <input
                    aria-label={t("account.tracking.dailyCaloriesAria")}
                    inputMode="decimal"
                    value={dailyCalories}
                    onChange={(event) => setDailyCalories(event.target.value)}
                    placeholder="2400"
                  />
                </label>
                <label className="field checkin-note">
                  <span className="field-label">{t("account.tracking.checkInNote")}</span>
                  <textarea
                    aria-label={t("account.tracking.checkInNote")}
                    value={checkInNote}
                    onChange={(event) => setCheckInNote(event.target.value)}
                  />
                </label>
                <button className="button" type="submit">
                  {t("account.tracking.logDaily")}
                </button>
                <button className="button" type="button" onClick={handleWeeklyCheckIn}>
                  {t("account.tracking.saveWeekly")}
                </button>
                <button className="button" type="button" onClick={handleGuidedWeeklyCheckIn}>
                  {t("account.tracking.finishGuided")}
                </button>
              </form>
              <form
                className="limb-symmetry-card"
                aria-label={t("account.tracking.limb.aria")}
                onSubmit={handleLimbSymmetryCheckIn}
              >
                <div className="limb-symmetry-copy">
                  <strong>{t("account.tracking.limb.title")}</strong>
                  <p>{t("account.tracking.limb.body")}</p>
                </div>
                <div className="limb-split-grid">
                  {limbSplitFields.map((field) => {
                    const singleValue = Number(currentMeasurements[field.id]);
                    const fieldLabel = formatLimbSplitFieldLabel(field, t);
                    const singleLabel = Number.isFinite(singleValue)
                      ? t("account.tracking.limb.singleValue", {
                          value: singleValue.toFixed(1)
                        })
                      : t("account.tracking.limb.singleUnchanged");

                    return (
                      <div key={field.id} className="limb-split-row">
                        <div className="limb-split-label">
                          <strong>{fieldLabel}</strong>
                          <span>{singleLabel}</span>
                        </div>
                        <label className="field compact-field">
                          <span className="field-label">{t("account.tracking.limb.left")}</span>
                          <input
                            aria-label={t("account.tracking.limb.sideAria", {
                              field: fieldLabel,
                              side: t("account.tracking.limb.leftAriaSuffix")
                            })}
                            inputMode="decimal"
                            value={limbSplitValues[field.leftKey] || ""}
                            onChange={(event) =>
                              handleLimbSplitChange(field.leftKey, event.target.value)
                            }
                            placeholder={Number.isFinite(singleValue) ? singleValue.toFixed(1) : ""}
                          />
                          {limbSplitErrors[field.leftKey] ? (
                            <span className="field-error">
                              {formatLimbSymmetryError(limbSplitErrors[field.leftKey], t)}
                            </span>
                          ) : null}
                        </label>
                        <label className="field compact-field">
                          <span className="field-label">{t("account.tracking.limb.right")}</span>
                          <input
                            aria-label={t("account.tracking.limb.sideAria", {
                              field: fieldLabel,
                              side: t("account.tracking.limb.rightAriaSuffix")
                            })}
                            inputMode="decimal"
                            value={limbSplitValues[field.rightKey] || ""}
                            onChange={(event) =>
                              handleLimbSplitChange(field.rightKey, event.target.value)
                            }
                            placeholder={Number.isFinite(singleValue) ? singleValue.toFixed(1) : ""}
                          />
                          {limbSplitErrors[field.rightKey] ? (
                            <span className="field-error">
                              {formatLimbSymmetryError(limbSplitErrors[field.rightKey], t)}
                            </span>
                          ) : null}
                        </label>
                      </div>
                    );
                  })}
                </div>
                <label className="field limb-split-note">
                  <span className="field-label">{t("account.tracking.limb.note")}</span>
                  <textarea
                    aria-label={t("account.tracking.limb.note")}
                    value={limbSplitNote}
                    onChange={(event) => setLimbSplitNote(event.target.value)}
                    placeholder={t("account.tracking.limb.notePlaceholder")}
                  />
                </label>
                <button className="button" type="submit">
                  {t("account.tracking.limb.log")}
                </button>
                {limbSplitErrors.form ? (
                  <small className="history-import-status" role="alert">
                    {formatLimbSymmetryError(limbSplitErrors.form, t)}
                  </small>
                ) : null}
                {latestLimbSymmetry ? (
                  <div
                    className="limb-symmetry-summary"
                    aria-label={t("account.tracking.limb.latestAria")}
                  >
                    <strong>
                      {t("account.tracking.limb.latestStatus", {
                        status:
                          latestLimbSymmetrySummary.status === "watch"
                            ? t("account.tracking.limb.status.watch")
                            : t("account.tracking.limb.status.balanced")
                      })}
                    </strong>
                    <span>{formatDate(latestLimbSymmetry.createdAt, locale)}</span>
                    <ul>
                      {latestLimbSymmetrySummary.items.map((item) => (
                        <li key={item.field}>{formatLimbSymmetryDisplayItem(item, t)}</li>
                      ))}
                    </ul>
                    {latestLimbSymmetry.note ? <p>{latestLimbSymmetry.note}</p> : null}
                  </div>
                ) : (
                  <p className="muted-text">{t("account.tracking.limb.empty")}</p>
                )}
              </form>
              <form
                className="cycle-context-card"
                aria-label={t("account.tracking.cycle.aria")}
                onSubmit={handleCycleCheckIn}
              >
                <div className="cycle-context-copy">
                  <strong>{t("account.tracking.cycle.title")}</strong>
                  <p>{t("account.tracking.cycle.body")}</p>
                </div>
                <label className="field">
                  <span className="field-label">{t("account.tracking.cycle.phaseLabel")}</span>
                  <select
                    aria-label={t("account.tracking.cycle.phaseAria")}
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
                    <option value="">{t("account.tracking.cycle.offOption")}</option>
                    {cyclePhaseOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {formatCyclePhaseLabel(option.id, t)}
                      </option>
                    ))}
                  </select>
                  {cycleErrors.phase ? (
                    <span className="field-error">{formatCycleError(cycleErrors.phase, t)}</span>
                  ) : null}
                </label>
                <label className="field">
                  <span className="field-label">{t("account.tracking.cycle.dayOptional")}</span>
                  <input
                    aria-label={t("account.tracking.cycle.dayAria")}
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
                    <span className="field-error">{formatCycleError(cycleErrors.cycleDay, t)}</span>
                  ) : null}
                </label>
                <label className="field">
                  <span className="field-label">{t("account.tracking.cycle.flowOptional")}</span>
                  <select
                    aria-label={t("account.tracking.cycle.flowAria")}
                    value={cycleFlow}
                    onChange={(event) => setCycleFlow(event.target.value)}
                  >
                    {cycleFlowOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {formatCycleFlowLabel(option.id, t)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field cycle-symptoms-field">
                  <span className="field-label">{t("account.tracking.cycle.symptomsOptional")}</span>
                  <input
                    aria-label={t("account.tracking.cycle.symptomsAria")}
                    value={cycleSymptoms}
                    onChange={(event) => setCycleSymptoms(event.target.value)}
                    placeholder={t("account.tracking.cycle.symptomsPlaceholder")}
                  />
                </label>
                <label className="field cycle-note-field">
                  <span className="field-label">{t("account.tracking.cycle.note")}</span>
                  <textarea
                    aria-label={t("account.tracking.cycle.note")}
                    value={cycleNote}
                    onChange={(event) => setCycleNote(event.target.value)}
                    placeholder={t("account.tracking.cycle.notePlaceholder")}
                  />
                </label>
                <div className="cycle-actions">
                  <button className="button" type="submit">
                    {t("account.tracking.cycle.log")}
                  </button>
                  <button
                    className="button"
                    type="button"
                    onClick={handleDeleteCycleLogs}
                    disabled={!latestCycleContext}
                  >
                    {t("account.tracking.cycle.delete")}
                  </button>
                </div>
                <div
                  className="cycle-context-summary"
                  aria-label={t("account.tracking.cycle.latestAria")}
                >
                  <strong>{localizedCycleTrendContext.label}</strong>
                  <span>{localizedCycleTrendContext.insight}</span>
                  {latestCycleContext ? (
                    <>
                      <small>
                        {t("account.tracking.cycle.latestSaved", {
                          date: formatDate(latestCycleContext.createdAt, locale)
                        })}
                      </small>
                      {latestCycleContext.symptoms ? (
                        <small>
                          {t("account.tracking.cycle.symptomsLine", {
                            symptoms: latestCycleContext.symptoms
                          })}
                        </small>
                      ) : null}
                      {latestCycleContext.note ? <p>{latestCycleContext.note}</p> : null}
                    </>
                  ) : (
                    <small>{t("account.tracking.cycle.empty")}</small>
                  )}
                </div>
              </form>
              <form
                className="history-import-card"
                aria-label={t("account.tracking.historyImport.aria")}
                onSubmit={handleHistoricalWeightImport}
              >
                <div className="history-import-copy">
                  <strong>{t("account.tracking.historyImport.title")}</strong>
                  <p>{t("account.tracking.historyImport.body")}</p>
                </div>
                <label className="field history-import-input">
                  <span className="field-label">{t("account.tracking.historyImport.label")}</span>
                  <textarea
                    aria-label={t("account.tracking.historyImport.textareaAria")}
                    value={historyImportText}
                    onChange={(event) => setHistoryImportText(event.target.value)}
                    placeholder={"date,weight_lbs,calories,note\n2026-06-01,190.2,2400,scale import"}
                  />
                </label>
                <div className="history-import-actions">
                  <button className="button" type="submit">
                    {t("account.tracking.historyImport.importPasted")}
                  </button>
                  <label className="button file-button">
                    {t("account.tracking.historyImport.importFile")}
                    <input
                      aria-label={t("account.tracking.historyImport.fileAria")}
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
              <div className="guided-checkin-card" aria-label={t("account.tracking.guidedAria")}>
                <div>
                  <strong>{t("account.tracking.guidedDue")}</strong>
                  <span>
                    {formatCadenceFields([
                      ...cadenceDueState.weekly.fields,
                      ...(cadenceDueState.monthly.isDue ? cadenceDueState.monthly.fields : [])
                    ], t)}
                  </span>
                </div>
                <p>{t("account.tracking.guidedBody")}</p>
              </div>
              <div className="checkin-summary" aria-label={t("account.tracking.summaryAria")}>
                <strong>
                  {t("account.tracking.trendWeight", {
                    value: trendWeight ? `${trendWeight.value.toFixed(1)} kg` : "--"
                  })}
                </strong>
                <span>
                  {trendWeight
                    ? t("account.tracking.trendWeightDetail", {
                        count: trendWeight.count,
                        delta: formatSignedDelta(trendWeight.delta)
                      })
                    : t("account.tracking.noDailyLogs")}
                </span>
                {weightReliabilityPause.pausedEntryCount ? (
                  <small>
                    {t("account.tracking.weightLogsPaused", {
                      count: weightReliabilityPause.pausedEntryCount
                    })}
                  </small>
                ) : null}
                {weightReliabilityPause.isPaused && weightReliabilityPause.latestWindow ? (
                  <small>
                    {t("account.tracking.weightTrendPaused", {
                      date: formatDate(weightReliabilityPause.latestWindow.endAt, locale)
                    })}
                  </small>
                ) : null}
                <strong>
                  {t("account.tracking.adaptiveTdee", {
                    value: adaptiveTdee.status === "ready" ? `${adaptiveTdee.estimatedTdee} kcal` : "--"
                  })}
                </strong>
                <span>
                  {adaptiveTdee.status === "ready"
                    ? t("account.tracking.adaptiveTdeeDetail", {
                        confidence: adaptiveTdee.confidenceLabel,
                        low: adaptiveTdee.rangeLow,
                        high: adaptiveTdee.rangeHigh
                      })
                    : adaptiveTdee.reason}
                </span>
                {adaptiveTdee.excludedEntries ? (
                  <small>
                    {t("account.tracking.calorieLogsPaused", {
                      count: adaptiveTdee.excludedEntries
                    })}
                  </small>
                ) : null}
              </div>
              <div className="streak-panel" aria-label={t("account.tracking.streakAria")}>
                <div>
                  <strong>{formatWeeklyStreakLabel(weeklyStreak, t)}</strong>
                  <span>
                    {weeklyStreak.latestAt
                      ? t("account.tracking.streak.lastWeekly", {
                          date: formatDate(weeklyStreak.latestAt, locale)
                        })
                      : t("account.tracking.streak.start")}
                  </span>
                </div>
                <div>
                  <small>
                    {weeklyStreak.graceEndsAt
                      ? t("account.tracking.streak.graceEnds", {
                          date: formatDate(weeklyStreak.graceEndsAt, locale)
                        })
                      : t("account.tracking.streak.graceStart")}
                  </small>
                  <small>
                    {t("account.tracking.streak.freezeCount", {
                      count: weeklyStreak.freezeCount
                    })}
                  </small>
                </div>
                <div className="streak-actions">
                  <button
                    className="button"
                    type="button"
                    onClick={handleUseStreakFreeze}
                    disabled={!weeklyStreak.freezeAvailable}
                  >
                    {t("account.tracking.streak.useFreeze")}
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
                    {remotePushStatus === "subscribed"
                      ? t("account.tracking.streak.disableReminders")
                      : t("account.tracking.streak.enableReminders")}
                  </button>
                </div>
                <small className="remote-push-status" role="status" aria-live="polite">
                  {remotePushStatusLabel(remotePushStatus, t)}
                </small>
              </div>
              <div className="body-tea-panel" aria-label={t("account.tracking.digestAria")}>
                <h4>{t("account.tracking.digestTitle")}</h4>
                <ul>
                  {weeklyDigest.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="checkin-heatmap" aria-label={t("account.tracking.heatmapAria")}>
                {checkInHeatmap.map((day) => (
                  <span
                    key={day.key}
                    className={`heatmap-cell heatmap-cell--${day.intensity}`}
                    title={t("account.tracking.heatmapDay", {
                      date: day.date,
                      count: day.count
                    })}
                    aria-label={t("account.tracking.heatmapDay", {
                      date: day.date,
                      count: day.count
                    })}
                  />
                ))}
              </div>
              <div className="milestone-grid" aria-label={t("account.tracking.milestonesAria")}>
                {milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className={`milestone-chip ${milestone.achieved ? "is-achieved" : ""}`}
                  >
                    <strong>{formatMilestoneLabel(milestone, t)}</strong>
                    {Number.isFinite(milestone.progress) && milestone.target ? (
                      <span>{milestone.progress}/{milestone.target}</span>
                    ) : (
                      <span>
                        {milestone.achieved
                          ? t("account.tracking.milestone.done")
                          : t("account.tracking.milestone.open")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {trendWeightChart ? (
                <div
                  className="trend-weight-panel"
                  aria-label={t("account.tracking.trendChartAria")}
                >
                  <svg
                    className="trend-weight-chart"
                    role="img"
                    aria-label={t("account.tracking.trendChartTitle")}
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
                        <title>
                          {t("account.tracking.trendPoint", {
                            value: point.value.toFixed(1),
                            date: formatDate(point.createdAt, locale)
                          })}
                        </title>
                      </circle>
                    ))}
                  </svg>
                  <div className="trend-weight-legend">
                    <span>{t("account.tracking.rawDots")}</span>
                    <span>{t("account.tracking.smoothedLine")}</span>
                  </div>
                </div>
              ) : null}
              <div aria-label={t("account.tracking.historyAria")}>
                {checkIns.length ? (
                  <ul className="checkin-list">
                    {checkIns.slice(0, 5).map((checkIn) => (
                      <li key={checkIn.id}>
                        <strong>{formatCheckIn(checkIn, t)}</strong>
                        <span>{formatDate(checkIn.createdAt, locale)}</span>
                        {checkIn.note ? <p>{checkIn.note}</p> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted-text">{t("account.tracking.emptyHistory")}</p>
                )}
              </div>
              <div className="insight-drop-list" aria-label={t("account.tracking.insightsAria")}>
                <h4>{t("account.tracking.insightsTitle")}</h4>
                {insightDrops.length ? (
                  <ul>
                    {insightDrops.map((insight) => (
                      <li key={insight}>{insight}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted-text">{t("account.tracking.insightsEmpty")}</p>
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

              <form
                className="life-event-form"
                aria-label={t("account.tracking.reliability.formAria")}
                onSubmit={handleLifeEvent}
              >
                <label className="field">
                  <span className="field-label">{t("account.tracking.reliability.eventMode")}</span>
                  <select
                    aria-label={t("account.tracking.reliability.eventModeAria")}
                    value={lifeEventMode}
                    onChange={(event) => setLifeEventMode(event.target.value)}
                  >
                    <option value="procedure">{t("account.tracking.lifeEventOption.procedure")}</option>
                    <option value="postpartum">{t("account.tracking.lifeEventOption.postpartum")}</option>
                    <option value="injury">{t("account.tracking.lifeEventOption.injury")}</option>
                    <option value="illness">{t("account.tracking.lifeEventOption.illness")}</option>
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">{t("account.tracking.reliability.affectedFields")}</span>
                  <input
                    aria-label={t("account.tracking.reliability.affectedFieldsAria")}
                    value={lifeEventFields}
                    onChange={(event) => setLifeEventFields(event.target.value)}
                    placeholder="waistCircumference, hipCircumference"
                  />
                </label>
                <label className="field">
                  <span className="field-label">{t("account.tracking.reliability.pauseDays")}</span>
                  <input
                    aria-label={t("account.tracking.reliability.pauseDaysAria")}
                    inputMode="numeric"
                    value={lifeEventDurationDays}
                    onChange={(event) => setLifeEventDurationDays(event.target.value)}
                  />
                </label>
                <label className="field life-event-note">
                  <span className="field-label">{t("account.tracking.reliability.note")}</span>
                  <textarea
                    aria-label={t("account.tracking.reliability.noteAria")}
                    value={lifeEventNote}
                    onChange={(event) => setLifeEventNote(event.target.value)}
                  />
                </label>
                <button className="button" type="submit">
                  {t("account.tracking.reliability.log")}
                </button>
              </form>
              {lifeEvents.length ? (
                <div className="life-event-list" aria-label={t("account.tracking.reliability.eventsAria")}>
                  {lifeEvents.slice(0, 3).map((event) => (
                    <div key={event.id}>
                      <strong>{formatLifeEventMode(event.eventMode, t)}</strong>
                      <span>
                        {t("account.tracking.reliability.eventLine", {
                          fields:
                            event.affectedFields?.join(", ") ||
                            t("account.tracking.reliability.noAffectedFields"),
                          days: event.durationDays
                        })}
                      </span>
                      {event.note ? <p>{event.note}</p> : null}
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="procedure-panel" aria-label={t("account.procedure.aria")}>
                <div>
                  <h4>{t("account.procedure.title")}</h4>
                  <p>{procedureStatus}</p>
                </div>
                <form className="procedure-form" onSubmit={handleLogProcedure}>
                  <label className="field">
                    <span className="field-label">{t("account.procedure.type")}</span>
                    <select
                      aria-label={t("account.procedure.typeAria")}
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
                    <span className="field-label">{t("account.procedure.date")}</span>
                    <input
                      aria-label={t("account.procedure.dateAria")}
                      type="date"
                      value={procedureDate}
                      onChange={(event) => setProcedureDate(event.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">{t("account.procedure.healingDays")}</span>
                    <input
                      aria-label={t("account.procedure.healingDaysAria")}
                      inputMode="numeric"
                      value={procedureHealingDays}
                      onChange={(event) => setProcedureHealingDays(event.target.value)}
                    />
                  </label>
                  <label className="field procedure-fields">
                    <span className="field-label">{t("account.procedure.affectedFields")}</span>
                    <input
                      aria-label={t("account.procedure.affectedFieldsAria")}
                      value={procedureAffectedFields}
                      onChange={(event) => setProcedureAffectedFields(event.target.value)}
                      placeholder={t("account.procedure.affectedFieldsPlaceholder")}
                    />
                  </label>
                  <label className="field procedure-note">
                    <span className="field-label">{t("account.procedure.note")}</span>
                    <textarea
                      aria-label={t("account.procedure.noteAria")}
                      value={procedureNote}
                      onChange={(event) => setProcedureNote(event.target.value)}
                      placeholder={t("account.procedure.notePlaceholder")}
                    />
                  </label>
                  {selectedProcedureType ? (
                    <div className="procedure-template-summary" aria-label={t("account.procedure.guidanceAria")}>
                      <p>
                        {selectedProcedureType.summary}{" "}
                        {t("account.procedure.guidanceLine", {
                          photoCategory: selectedProcedureType.photoCategory,
                          risk: selectedProcedureType.riskLevel,
                          review: selectedProcedureType.reviewStatus
                        })}
                      </p>
                      {selectedProcedureType.timeline.length ? (
                        <ul>
                          {selectedProcedureType.timeline.slice(0, 3).map((item) => (
                            <li key={`${selectedProcedureType.id}-${item.day}`}>
                              {t("account.procedure.timelineDay", {
                                day: item.day,
                                label: item.label
                              })}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                  <button className="button" type="submit">
                    {t("account.procedure.log")}
                  </button>
                </form>

                {procedures.length ? (
                  <ul className="procedure-list" aria-label={t("account.procedure.logsAria")}>
                    {procedures.slice(0, 5).map((procedure) => {
                      const caseLog = buildProcedureCaseLog(
                        procedure,
                        snapshotProps.snapshots,
                        photos
                      );

                      return (
                        <li key={procedure.id}>
                          <div>
                            <strong>{formatProcedureRecordLine(procedure, locale, t)}</strong>
                            <span>
                              {t("account.procedure.metaLine", {
                                category: procedure.category,
                                risk: procedure.riskLevel,
                                photoCategory: procedure.photoCategory
                              })}
                            </span>
                            <span>
                              {t("account.procedure.healingWindow", {
                                window: caseLog.window
                              })}
                            </span>
                            {procedure.note ? <p>{procedure.note}</p> : null}
                          </div>
                          <div aria-label={t("account.procedure.caseLogAria", { label: procedure.label })}>
                            <h5>{t("account.procedure.caseLogTitle")}</h5>
                            <p>{formatProcedureCaseSummary(caseLog, t)}</p>
                            <small>{caseLog.reviewStatus}</small>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="muted-text">{t("account.procedure.emptyLogs")}</p>
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

            <section className="bloodwork-log-section" aria-label={t("account.bloodwork.aria")}>
              <div className="panel-header">
                <h3>{t("account.bloodwork.title")}</h3>
                <p>{bloodworkStatus}</p>
              </div>
              <p className="muted-text">
                {t("account.bloodwork.body")}
              </p>

              <form className="bloodwork-form" onSubmit={handleLogBloodwork}>
                <label className="field">
                  <span className="field-label">{t("account.bloodwork.marker")}</span>
                  <select
                    aria-label={t("account.bloodwork.markerAria")}
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
                  <span className="field-label">{t("account.bloodwork.collectionDate")}</span>
                  <input
                    aria-label={t("account.bloodwork.collectionDateAria")}
                    type="date"
                    value={bloodworkCollectedAt}
                    onChange={(event) => setBloodworkCollectedAt(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="field-label">
                    {t("account.bloodwork.value")}{" "}
                    {selectedBloodworkMarker?.unit ? `(${selectedBloodworkMarker.unit})` : ""}
                  </span>
                  <input
                    aria-label={t("account.bloodwork.valueAria")}
                    inputMode="decimal"
                    value={bloodworkValue}
                    onChange={(event) => setBloodworkValue(event.target.value)}
                    placeholder="86"
                  />
                </label>
                <label className="field">
                  <span className="field-label">{t("account.bloodwork.linkedProtocol")}</span>
                  <select
                    aria-label={t("account.bloodwork.linkedProtocolAria")}
                    value={bloodworkProtocolId}
                    onChange={(event) => setBloodworkProtocolId(event.target.value)}
                  >
                    <option value="">{t("account.bloodwork.noProtocolLink")}</option>
                    {protocols.map((protocol) => (
                      <option key={protocol.id} value={protocol.id}>
                        {protocol.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field bloodwork-note">
                  <span className="field-label">{t("account.bloodwork.note")}</span>
                  <textarea
                    aria-label={t("account.bloodwork.noteAria")}
                    value={bloodworkNote}
                    onChange={(event) => setBloodworkNote(event.target.value)}
                    placeholder={t("account.bloodwork.notePlaceholder")}
                  />
                </label>
                {selectedBloodworkMarker ? (
                  <div className="bloodwork-marker-summary" aria-label={t("account.bloodwork.referenceAria")}>
                    <p>
                      {selectedBloodworkMarker.summary} {t("account.bloodwork.referenceRange")}{" "}
                      {formatReferenceRange(selectedBloodworkRange)}.
                    </p>
                    <small>{bloodworkLibrary.reference}</small>
                  </div>
                ) : null}
                <button className="button" type="submit">
                  {t("account.bloodwork.log")}
                </button>
              </form>

              <div className="bloodwork-grid">
                <div aria-label={t("account.bloodwork.trendsAria")}>
                  <h4>{t("account.bloodwork.trendsTitle")}</h4>
                  {bloodworkTrends.length ? (
                    <ul className="bloodwork-trend-list">
                      {bloodworkTrends.slice(0, 6).map((trend) => (
                        <li key={trend.markerId}>
                          <div>
                            <strong>{trend.markerLabel}</strong>
                            <span>
                              {t("account.bloodwork.latestLine", {
                                value: trend.latestValue,
                                unit: trend.unit,
                                status: formatRangeStatus(trend.latestStatus, t)
                              })}
                            </span>
                            <small>
                              {t("account.bloodwork.resultCount", { count: trend.count })}
                              {trend.delta === null
                                ? ""
                                : t("account.bloodwork.delta", {
                                  delta: trend.delta,
                                  unit: trend.unit
                                })}
                            </small>
                          </div>
                          <svg
                            className="bloodwork-sparkline"
                            role="img"
                            aria-label={t("account.bloodwork.trendChartAria", {
                              marker: trend.markerLabel
                            })}
                            viewBox="0 0 100 36"
                          >
                            <title>
                              {t("account.bloodwork.trendChartTitle", {
                                marker: trend.markerLabel
                              })}
                            </title>
                            <desc>{t("account.bloodwork.trendChartDesc")}</desc>
                            <line x1="4" y1="32" x2="96" y2="32" />
                            {trend.points ? <polyline points={trend.points} /> : null}
                          </svg>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted-text">{t("account.bloodwork.emptyTrends")}</p>
                  )}
                </div>

                <div aria-label={t("account.bloodwork.recentAria")}>
                  <h4>{t("account.bloodwork.recentTitle")}</h4>
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
                              {result.collectedAt} / {formatRangeStatus(result.rangeStatus, t)}
                              {linkedProtocol ? ` / ${linkedProtocol.label}` : ""}
                            </span>
                            {result.referenceRange ? (
                              <small>
                                {t("account.bloodwork.range", {
                                  range: formatReferenceRange(result.referenceRange)
                                })}
                              </small>
                            ) : null}
                            {result.note ? <p>{result.note}</p> : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="muted-text">{t("account.bloodwork.emptyRecent")}</p>
                  )}
                </div>
              </div>
            </section>

            <section className="workout-library-section" aria-label={t("account.workout.aria")}>
              <div className="panel-header">
                <h3>{t("account.workout.title")}</h3>
                <p>{exerciseStatus}</p>
              </div>

              {exerciseTargets.length ? (
                <div className="exercise-map-grid" aria-label={t("account.workout.mappingAria")}>
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

              <div className="program-template-grid" aria-label={t("account.workout.programsAria")}>
                <label className="field">
                  <span className="field-label">{t("account.workout.programTemplate")}</span>
                  <select
                    aria-label={t("account.workout.programTemplateAria")}
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
                  <p className="muted-text">{t("account.workout.noProgram")}</p>
                )}
              </div>

              <form className="workout-log-form" onSubmit={persistWorkoutFromInput}>
                <label className="field">
                  <span className="field-label">{t("account.workout.exercise")}</span>
                  <select
                    aria-label={t("account.workout.exerciseAria")}
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
                  <div className="exercise-detail-card" aria-label={t("account.workout.detailAria")}>
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
                      {selectedExercise.reviewStatus || t("account.workout.needsSourceReview")} /{" "}
                      {selectedExercise.sourceLicense || selectedExercise.source || t("account.workout.dummySeed")}
                    </small>
                  </div>
                ) : null}
                <label className="field">
                  <span className="field-label">{t("account.workout.sets")}</span>
                  <input
                    aria-label={t("account.workout.setsAria")}
                    inputMode="numeric"
                    value={workoutSets}
                    onChange={(event) => setWorkoutSets(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="field-label">{t("account.workout.reps")}</span>
                  <input
                    aria-label={t("account.workout.repsAria")}
                    inputMode="numeric"
                    value={workoutReps}
                    onChange={(event) => setWorkoutReps(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="field-label">{t("account.workout.load")}</span>
                  <input
                    aria-label={t("account.workout.loadAria")}
                    inputMode="decimal"
                    value={workoutLoad}
                    onChange={(event) => setWorkoutLoad(event.target.value)}
                    placeholder="20"
                  />
                </label>
                <label className="field">
                  <span className="field-label">{t("account.workout.rpe")}</span>
                  <input
                    aria-label={t("account.workout.rpeAria")}
                    inputMode="decimal"
                    value={workoutRpe}
                    onChange={(event) => setWorkoutRpe(event.target.value)}
                    placeholder="8"
                  />
                </label>
                <label className="field workout-note">
                  <span className="field-label">{t("account.workout.note")}</span>
                  <textarea
                    aria-label={t("account.workout.noteAria")}
                    value={workoutNote}
                    onChange={(event) => setWorkoutNote(event.target.value)}
                  />
                </label>
                <button className="button" type="submit" disabled={!exerciseLibrary.exercises.length}>
                  {t("account.workout.log")}
                </button>
              </form>

              <div className="workout-history-grid">
                <div aria-label={t("account.workout.recentAria")}>
                  <h4>{t("account.workout.recentTitle")}</h4>
                  {workoutSessions.length ? (
                    <ul className="workout-session-list">
                      {workoutSessions.slice(0, 5).map((session, index) => (
                        <li key={session.id}>
                          <div>
                            <strong>{formatWorkoutSession(session)}</strong>
                            <span>
                              {t("account.workout.volumeLine", {
                                volume: formatLoad(session.volumeKg),
                                date: formatDate(session.createdAt, locale)
                              })}
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
                              {t("account.workout.repeatLatest")}
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted-text">{t("account.workout.emptyRecent")}</p>
                  )}
                </div>

                <div aria-label={t("account.workout.prsAria")}>
                  <h4>{t("account.workout.prsTitle")}</h4>
                  {workoutPrs.length ? (
                    <ul className="workout-pr-list">
                      {workoutPrs.map((record) => (
                        <li key={record.exerciseId}>
                          <strong>{record.exerciseLabel}</strong>
                          <span>
                            {t("account.workout.prLine", {
                              load: formatLoad(record.maxLoadKg),
                              volume: formatLoad(record.maxVolumeKg)
                            })}
                          </span>
                          <small>{t("account.workout.sessionCount", { count: record.sessionCount })}</small>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted-text">{t("account.workout.emptyPrs")}</p>
                  )}
                </div>

                <div className="workout-chart-panel" aria-label={t("account.workout.historyAria")}>
                  <h4>{t("account.workout.historyTitle")}</h4>
                  {workoutHistories.length ? (
                    <ul className="workout-chart-list">
                      {workoutHistories.map((history) => (
                        <li key={history.exerciseId}>
                          <div className="workout-chart-header">
                            <strong>{history.exerciseLabel}</strong>
                            <span>
                              {t("account.workout.historyMeta", {
                                count: history.sessionCount,
                                date: formatDate(history.latestAt, locale)
                              })}
                            </span>
                          </div>
                          <svg
                            className="workout-chart"
                            role="img"
                            aria-label={t("account.workout.chartAria", {
                              exercise: history.exerciseLabel
                            })}
                            viewBox="0 0 100 36"
                            preserveAspectRatio="none"
                          >
                            <line x1="4" y1="32" x2="96" y2="32" />
                            <polyline className="workout-chart-volume" points={history.volumeSparkline} />
                            <polyline className="workout-chart-load" points={history.loadSparkline} />
                          </svg>
                          <div className="workout-chart-legend">
                            <span>{t("account.workout.loadPr", { load: formatLoad(history.maxLoadKg) })}</span>
                            <span>{t("account.workout.volumePr", { volume: formatLoad(history.maxVolumeKg) })}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted-text">{t("account.workout.emptyHistory")}</p>
                  )}
                </div>
              </div>
            </section>

            <FaceMeasurementPanel
              faceMeasurements={faceMeasurements}
              locale={locale}
              onSaveFaceMeasurement={handleSaveFaceMeasurement}
            />

            <section className="photo-log-section" aria-label={t("account.photo.aria")}>
              <div className="panel-header">
                <h3>{t("account.photo.title")}</h3>
                <p>{t("account.photo.body")}</p>
              </div>

              <div className="photo-controls">
                <label className="field">
                  <span className="field-label">{t("account.photo.category")}</span>
                  <select
                    aria-label={t("account.photo.categoryAria")}
                    value={photoCategory}
                    onChange={(event) => setPhotoCategory(event.target.value)}
                  >
                    {photoCategoryOptions.map((category) => (
                      <option key={category.id} value={category.id}>
                        {photoCategoryLabel(category.id, t, category.label)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field photo-note-field">
                  <span className="field-label">{t("account.photo.note")}</span>
                  <textarea
                    aria-label={t("account.photo.noteAria")}
                    value={photoNote}
                    onChange={(event) => setPhotoNote(event.target.value)}
                    placeholder={t("account.photo.notePlaceholder")}
                  />
                </label>
                <label className="button file-button photo-import-button">
                  {t("account.photo.import")}
                  <input
                    aria-label={t("account.photo.importAria")}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoImport}
                  />
                </label>
              </div>

              {!photos.length ? (
                <p className="muted-text">
                  {t("account.photo.empty")}
                </p>
              ) : null}

              <div className="photo-stream-tabs" aria-label={t("account.photo.streamCountsAria")}>
                {photoCounts.map((category) => (
                  <button
                    key={category.id}
                    className={`button ${photoFilter === category.id ? "is-active" : ""}`}
                    type="button"
                    onClick={() => setPhotoFilter(category.id)}
                  >
                    {t("account.photo.streamCount", {
                      category: photoCategoryLabel(category.id, t, category.label),
                      count: category.count
                    })}
                  </button>
                ))}
                <button
                  className={`button ${photoFilter === "all" ? "is-active" : ""}`}
                  type="button"
                  onClick={() => setPhotoFilter("all")}
                >
                  {t("account.photo.allCount", { count: photos.length })}
                </button>
              </div>

              {ghostPhoto ? (
                <div className="photo-ghost-panel" aria-label={t("account.photo.ghostAria")}>
                  <div>
                    <h4>{t("account.photo.ghostTitle")}</h4>
                    <p>
                      {t("account.photo.ghostBody", {
                        category: photoCategoryLabel(photoCategory, t, photoCategory)
                      })}
                    </p>
                  </div>
                  <label className="field">
                    <span className="field-label">{t("account.photo.ghostReference")}</span>
                    <select
                      aria-label={t("account.photo.ghostReferenceAria")}
                      value={photoGhostId || ghostPhoto.id}
                      onChange={(event) => setPhotoGhostId(event.target.value)}
                    >
                      {categoryPhotos.map((photo) => (
                        <option key={photo.id} value={photo.id}>
                          {photoOptionLabel(photo, locale, t)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">{t("account.photo.ghostOpacity")}</span>
                    <input
                      aria-label={t("account.photo.ghostOpacityAria")}
                      type="range"
                      min="15"
                      max="70"
                      value={ghostOpacity}
                      onChange={(event) => setGhostOpacity(event.target.value)}
                    />
                  </label>
                  <div className="photo-ghost-frame">
                    <PhotoImage
                      photo={ghostPhoto}
                      alt={t("account.photo.alt.ghost", {
                        category: photoCategoryLabel(ghostPhoto.category, t, ghostPhoto.category)
                      })}
                      loadingLabel={t("account.photo.loading")}
                      style={{ opacity: Number(ghostOpacity) / 100 }}
                    />
                    <span />
                  </div>
                </div>
              ) : null}

              {photos.length >= 2 ? (
                <div className="photo-compare-panel" aria-label={t("account.photo.compareAria")}>
                  <div className="photo-compare-controls">
                    <label className="field">
                      <span className="field-label">{t("account.photo.before")}</span>
                      <select
                        aria-label={t("account.photo.beforeAria")}
                        value={photoBeforeId}
                        onChange={(event) => setPhotoBeforeId(event.target.value)}
                      >
                        {visiblePhotos.map((photo) => (
                          <option key={photo.id} value={photo.id}>
                            {photoOptionLabel(photo, locale, t)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span className="field-label">{t("account.photo.after")}</span>
                      <select
                        aria-label={t("account.photo.afterAria")}
                        value={photoAfterId}
                        onChange={(event) => setPhotoAfterId(event.target.value)}
                      >
                        {visiblePhotos.map((photo) => (
                          <option key={photo.id} value={photo.id}>
                            {photoOptionLabel(photo, locale, t)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span className="field-label">{t("account.photo.wipe")}</span>
                      <input
                        aria-label={t("account.photo.positionAria")}
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
                      <PhotoImage
                        photo={beforePhoto}
                        alt={t("account.photo.alt.before")}
                        loadingLabel={t("account.photo.loading")}
                      />
                      <PhotoImage
                        className="photo-compare-after"
                        photo={afterPhoto}
                        alt={t("account.photo.alt.after")}
                        loadingLabel={t("account.photo.loading")}
                        style={{ clipPath: `inset(0 ${100 - Number(photoSlider)}% 0 0)` }}
                      />
                      <i style={{ left: `${photoSlider}%` }} />
                    </div>
                  ) : null}
                </div>
              ) : null}

              {latestPhoto ? (
                <div className="photo-silhouette-pair" aria-label={t("account.photo.silhouetteAria")}>
                  <figure>
                    <PhotoImage
                      photo={latestPhoto}
                      alt={t("account.photo.alt.progress", {
                        category: photoCategoryLabel(latestPhoto.category, t, latestPhoto.category)
                      })}
                      loadingLabel={t("account.photo.loading")}
                    />
                    <figcaption>{photoOptionLabel(latestPhoto, locale, t)}</figcaption>
                  </figure>
                  <SilhouetteView
                    measurements={currentMeasurements}
                    label={t("account.photo.silhouetteLabel")}
                    view={silhouetteView}
                  />
                </div>
              ) : null}

              <div aria-label={t("account.photo.galleryAria")}>
                {visiblePhotos.length ? (
                  <ul className="photo-gallery-list">
                    {visiblePhotos.map((photo) => (
                      <li key={photo.id}>
                        <PhotoImage
                          photo={photo}
                          alt={t("account.photo.alt.thumbnail", {
                            category: photoCategoryLabel(photo.category, t, photo.category)
                          })}
                          loadingLabel={t("account.photo.loading")}
                        />
                        <div>
                          <strong>{photo.fileName}</strong>
                          <span>
                            {photoCategoryLabel(photo.category, t, photo.category)} /{" "}
                            {formatDate(photo.createdAt, locale)}
                          </span>
                          {photo.note ? <p>{photo.note}</p> : null}
                        </div>
                        <button
                          className="button"
                          type="button"
                          onClick={() => handleDeletePhoto(photo.id)}
                        >
                          {t("account.photo.delete")}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted-text">{t("account.photo.emptyStream")}</p>
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
