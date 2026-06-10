import { measurementFields } from "./measurements.js";

export const measurementCadenceLabels = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  profile: "Profile"
};

const cadenceByField = {
  sex: "profile",
  weight: "daily",
  height: "monthly",
  headCircumference: "monthly",
  ankleCircumference: "monthly",
  biacromialWidth: "monthly",
  bideltoidWidth: "monthly",
  wristCircumference: "monthly"
};

const cadenceThresholdDays = {
  daily: 0.75,
  weekly: 6,
  monthly: 27
};

function daysSince(timestamp, now = Date.now()) {
  if (!timestamp) {
    return Number.POSITIVE_INFINITY;
  }

  return (now - new Date(timestamp).getTime()) / (1000 * 60 * 60 * 24);
}

function latestCheckIn(checkIns, type) {
  return checkIns
    .filter((checkIn) => checkIn.type === type)
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))[0];
}

export function getMeasurementCadence(fieldName) {
  return cadenceByField[fieldName] || "weekly";
}

export function buildMeasurementCadenceGroups(fields = measurementFields) {
  const groups = {
    daily: [],
    weekly: [],
    monthly: [],
    profile: []
  };

  for (const field of fields) {
    const cadence = getMeasurementCadence(field.name);
    groups[cadence].push({
      name: field.name,
      label: field.label,
      cadence
    });
  }

  return groups;
}

export function buildMeasurementDueState(checkIns = [], now = Date.now()) {
  const groups = buildMeasurementCadenceGroups();
  const latestDaily = latestCheckIn(checkIns, "daily-weight");
  const latestWeekly = latestCheckIn(checkIns, "weekly-measurements");
  const latestMonthly = latestCheckIn(checkIns, "monthly-measurements") || latestWeekly;

  return {
    daily: {
      label: measurementCadenceLabels.daily,
      fields: groups.daily,
      latestAt: latestDaily?.createdAt || null,
      isDue: daysSince(latestDaily?.createdAt, now) >= cadenceThresholdDays.daily
    },
    weekly: {
      label: measurementCadenceLabels.weekly,
      fields: groups.weekly,
      latestAt: latestWeekly?.createdAt || null,
      isDue: daysSince(latestWeekly?.createdAt, now) >= cadenceThresholdDays.weekly
    },
    monthly: {
      label: measurementCadenceLabels.monthly,
      fields: groups.monthly,
      latestAt: latestMonthly?.createdAt || null,
      isDue: daysSince(latestMonthly?.createdAt, now) >= cadenceThresholdDays.monthly
    },
    profile: {
      label: measurementCadenceLabels.profile,
      fields: groups.profile,
      latestAt: null,
      isDue: false
    }
  };
}
