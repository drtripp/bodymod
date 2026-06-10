import {
  isFieldPausedAt
} from "./reliabilityEvents.js";
import {
  buildCycleTrendContext
} from "./cycleTracking.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function timestampMs(value) {
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function startOfLocalDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function dateKey(value) {
  return startOfLocalDay(value).toISOString().slice(0, 10);
}

function weekIndex(value) {
  const day = startOfLocalDay(value);
  const dayOfWeek = (day.getDay() + 6) % 7;
  day.setDate(day.getDate() - dayOfWeek);
  return Math.floor(day.getTime() / WEEK_MS);
}

function daysBetween(first, second) {
  return Math.floor((startOfLocalDay(second) - startOfLocalDay(first)) / DAY_MS);
}

function sortedCheckIns(checkIns = []) {
  return checkIns
    .slice()
    .sort((left, right) => timestampMs(left.createdAt) - timestampMs(right.createdAt));
}

function weeklyCheckIns(checkIns = []) {
  return sortedCheckIns(checkIns).filter((checkIn) => checkIn.type === "weekly-measurements");
}

function freezeCheckIns(checkIns = []) {
  return sortedCheckIns(checkIns).filter((checkIn) => checkIn.type === "streak-freeze");
}

function signed(value, unit = "") {
  const numeric = Number(value);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toFixed(1)}${unit ? ` ${unit}` : ""}`;
}

function readableField(fieldName) {
  return String(fieldName)
    .replace(/Circumference$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
}

function reliableFieldDelta(checkIns, latestWeekly, previousWeekly, fieldName) {
  if (
    !latestWeekly?.measurements ||
    !previousWeekly?.measurements ||
    isFieldPausedAt(checkIns, fieldName, latestWeekly.createdAt) ||
    isFieldPausedAt(checkIns, fieldName, previousWeekly.createdAt)
  ) {
    return null;
  }

  const latest = Number(latestWeekly.measurements[fieldName]);
  const previous = Number(previousWeekly.measurements[fieldName]);

  return Number.isFinite(latest) && Number.isFinite(previous)
    ? latest - previous
    : null;
}

export function buildCheckInHeatmap(checkIns = [], now = Date.now(), days = 35) {
  const today = startOfLocalDay(now);
  const counts = new Map();
  for (const checkIn of checkIns) {
    const key = dateKey(checkIn.createdAt);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return Array.from({ length: days }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (days - index - 1));
    const key = dateKey(day);
    const count = counts.get(key) || 0;

    return {
      key,
      date: key,
      count,
      intensity: Math.min(4, count)
    };
  });
}

export function buildWeeklyStreak(checkIns = [], now = Date.now()) {
  const weekly = weeklyCheckIns(checkIns);
  const freezes = freezeCheckIns(checkIns);
  const weeklyWeeks = new Set(weekly.map((checkIn) => weekIndex(checkIn.createdAt)));
  const freezeWeeks = new Set(freezes.map((checkIn) => weekIndex(checkIn.createdAt)));
  const latestWeekly = weekly[weekly.length - 1] || null;
  const currentWeek = weekIndex(now);
  const latestWeek = latestWeekly ? weekIndex(latestWeekly.createdAt) : null;
  const daysSinceLatest = latestWeekly
    ? Math.max(0, daysBetween(latestWeekly.createdAt, now))
    : Number.POSITIVE_INFINITY;

  let cursor = weeklyWeeks.has(currentWeek) || freezeWeeks.has(currentWeek)
    ? currentWeek
    : currentWeek - 1;
  let current = 0;
  while (weeklyWeeks.has(cursor) || freezeWeeks.has(cursor)) {
    current += 1;
    cursor -= 1;
  }

  let status = "not-started";
  if (latestWeekly) {
    status = daysSinceLatest <= 7 ? "current" : daysSinceLatest <= 10 ? "grace" : "needs-check-in";
  }

  const freezeAvailable =
    status === "needs-check-in" &&
    current >= 2 &&
    !freezeWeeks.has(currentWeek) &&
    latestWeek !== currentWeek;

  const nextDueAt = latestWeekly
    ? new Date(timestampMs(latestWeekly.createdAt) + 7 * DAY_MS).toISOString()
    : null;
  const graceEndsAt = latestWeekly
    ? new Date(timestampMs(latestWeekly.createdAt) + 10 * DAY_MS).toISOString()
    : null;

  return {
    current,
    status,
    latestAt: latestWeekly?.createdAt || null,
    nextDueAt,
    graceEndsAt,
    freezeAvailable,
    freezeCount: freezes.length,
    label:
      status === "current"
        ? `${current} week streak`
        : status === "grace"
          ? `${current} week streak, grace window`
          : status === "needs-check-in"
            ? "Weekly check-in due"
            : "No weekly streak yet"
  };
}

export function buildMilestones({
  checkIns = [],
  snapshots = [],
  goals = [],
  protocols = [],
  currentMeasurements = {},
  now = Date.now()
} = {}) {
  const ordered = sortedCheckIns(checkIns);
  const dailyCount = checkIns.filter((checkIn) => checkIn.type === "daily-weight").length;
  const weeklyCount = checkIns.filter((checkIn) => checkIn.type === "weekly-measurements").length;
  const firstCheckIn = ordered[0] || null;
  const trackedDays = firstCheckIn ? daysBetween(firstCheckIn.createdAt, now) : 0;
  const targetReached = goals.some((goal) => {
    const metrics = Object.entries(goal.targetMetrics || {});
    if (!metrics.length || !goal.startingMeasurements) {
      return false;
    }

    return metrics.every(([key, delta]) => {
      const start = Number(goal.startingMeasurements[key]);
      const current = Number(currentMeasurements[key]);
      const targetDelta = Number(delta);
      if (!Number.isFinite(start) || !Number.isFinite(current) || !Number.isFinite(targetDelta)) {
        return false;
      }

      return targetDelta > 0 ? current >= start + targetDelta : current <= start + targetDelta;
    });
  });

  return [
    {
      id: "first-check-in",
      label: "First check-in",
      achieved: Boolean(firstCheckIn)
    },
    {
      id: "five-daily-logs",
      label: "5 daily logs",
      achieved: dailyCount >= 5,
      progress: Math.min(5, dailyCount),
      target: 5
    },
    {
      id: "first-weekly-snapshot",
      label: "Weekly snapshot saved",
      achieved: weeklyCount > 0 && snapshots.length > 0
    },
    {
      id: "ten-check-ins",
      label: "10 check-ins",
      achieved: checkIns.length >= 10,
      progress: Math.min(10, checkIns.length),
      target: 10
    },
    {
      id: "first-month",
      label: "First month tracked",
      achieved: trackedDays >= 28,
      progress: Math.min(28, trackedDays),
      target: 28
    },
    {
      id: "first-protocol",
      label: "Protocol started",
      achieved: protocols.length > 0
    },
    {
      id: "goal-target",
      label: "Measurement target reached",
      achieved: targetReached
    }
  ];
}

export function buildCheckInInsights({
  checkIns = [],
  trendWeight = null,
  goals = [],
  protocols = [],
  snapshots = []
} = {}) {
  const insights = [];
  const weekly = weeklyCheckIns(checkIns);
  const latestWeekly = weekly[weekly.length - 1] || null;
  const previousWeekly = weekly[weekly.length - 2] || null;
  const trackedFields = [
    "weight",
    "waistCircumference",
    "hipCircumference",
    "bideltoidCircumference"
  ];
  const pausedFields = latestWeekly
    ? trackedFields.filter((field) => isFieldPausedAt(checkIns, field, latestWeekly.createdAt))
    : [];

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

  if (pausedFields.length) {
    insights.push(
      `Reliability pause covers ${pausedFields.map(readableField).join(", ")} in the latest check-in; affected trend deltas are held until the pause window ends.`
    );
  }

  if (
    latestWeekly?.measurements &&
    !isFieldPausedAt(checkIns, "waistCircumference", latestWeekly.createdAt) &&
    !isFieldPausedAt(checkIns, "hipCircumference", latestWeekly.createdAt)
  ) {
    insights.push(
      `Latest weekly check-in saved waist ${Number(latestWeekly.measurements.waistCircumference).toFixed(1)} cm and hip ${Number(latestWeekly.measurements.hipCircumference).toFixed(1)} cm.`
    );
  }

  if (latestWeekly?.measurements && previousWeekly?.measurements) {
    const waistDelta = reliableFieldDelta(
      checkIns,
      latestWeekly,
      previousWeekly,
      "waistCircumference"
    );
    const hipDelta = reliableFieldDelta(
      checkIns,
      latestWeekly,
      previousWeekly,
      "hipCircumference"
    );
    const shoulderDelta = reliableFieldDelta(
      checkIns,
      latestWeekly,
      previousWeekly,
      "bideltoidCircumference"
    );

    if ([waistDelta, hipDelta, shoulderDelta].every((value) => value !== null)) {
      insights.push(
        `Weekly deltas: waist ${signed(waistDelta, "cm")}, hip ${signed(hipDelta, "cm")}, deltoid ${signed(shoulderDelta, "cm")}.`
      );
    }
  }

  const activeProtocols = protocols.filter((protocol) => protocol.status !== "archived");
  if (activeProtocols.length) {
    insights.push(`${activeProtocols.length} active protocol(s) need adherence review.`);
  }

  const cycleContext = buildCycleTrendContext(checkIns);
  if (cycleContext.status !== "off") {
    insights.push(cycleContext.insight);
  }

  if (goals.length) {
    insights.push(`${goals.length} saved goal(s) are using the current measurement set as their reference.`);
  }

  if (snapshots.length >= 2) {
    insights.push("Snapshot comparison unlocked: compare this check-in against an earlier saved profile.");
  }

  return insights;
}

export function buildWeeklyDigest({
  checkIns = [],
  trendWeight = null,
  weeklyStreak = null,
  protocols = [],
  milestones = []
} = {}) {
  const weekly = weeklyCheckIns(checkIns);
  const latestWeekly = weekly[weekly.length - 1] || null;
  const activeProtocolCount = protocols.filter((protocol) => protocol.status !== "archived").length;
  const achievedMilestone = milestones.find((milestone) => milestone.achieved);

  return [
    trendWeight
      ? `Tea: trend weight is ${trendWeight.value.toFixed(1)} kg, ${signed(trendWeight.delta, "kg")} from the last smoothed step.`
      : "Tea: log daily weights to separate signal from water noise.",
    weeklyStreak?.status === "grace"
      ? "Cadence: still in the weekly grace window."
      : weeklyStreak?.status === "current"
        ? `Cadence: ${weeklyStreak.current} weekly check-in(s) chained.`
        : "Cadence: a weekly measurement check-in is due.",
    latestWeekly?.measurements
      ? `Last tape: waist ${Number(latestWeekly.measurements.waistCircumference).toFixed(1)} cm, hip ${Number(latestWeekly.measurements.hipCircumference).toFixed(1)} cm.`
      : "Last tape: none saved yet.",
    activeProtocolCount
      ? `Plan: ${activeProtocolCount} active protocol(s) need an adherence note.`
      : "Plan: no active protocol needs review.",
    achievedMilestone
      ? `Marker: ${achievedMilestone.label} is complete.`
      : "Marker: first milestone is waiting on a check-in."
  ];
}
