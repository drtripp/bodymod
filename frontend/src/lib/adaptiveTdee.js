import { filterReliableEntries } from "./reliabilityEvents.js";

const ENERGY_PER_KG = 7700;

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function timestampMs(value) {
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundTo(value, increment = 1) {
  return Math.round(value / increment) * increment;
}

function datedWeightCalorieEntries(checkIns = []) {
  return checkIns
    .filter((checkIn) => checkIn?.type === "daily-weight")
    .map((checkIn) => ({
      id: checkIn.id,
      createdAt: checkIn.createdAt,
      weight: numeric(checkIn.weight),
      calories: numeric(checkIn.calories)
    }))
    .filter(
      (entry) =>
        entry.createdAt &&
        Number.isFinite(timestampMs(entry.createdAt)) &&
        entry.weight !== null &&
        entry.calories !== null
    )
    .sort((left, right) => timestampMs(left.createdAt) - timestampMs(right.createdAt));
}

function confidenceForWindow(daySpan, entriesUsed) {
  if (daySpan >= 28 && entriesUsed >= 18) {
    return { id: "higher", label: "higher confidence", band: 150 };
  }

  if (daySpan >= 14 && entriesUsed >= 10) {
    return { id: "medium", label: "medium confidence", band: 225 };
  }

  return { id: "early", label: "early estimate", band: 325 };
}

export function buildAdaptiveTdeeEstimate(
  checkIns = [],
  { minEntries = 4, minDays = 7 } = {}
) {
  const calorieWeightEntries = datedWeightCalorieEntries(checkIns);
  const reliableEntries = filterReliableEntries(calorieWeightEntries, checkIns, "weight");

  if (reliableEntries.length < minEntries) {
    return {
      status: "needs-data",
      reason: `Needs ${minEntries} reliable daily weight+calorie logs.`,
      entriesUsed: reliableEntries.length,
      excludedEntries: calorieWeightEntries.length - reliableEntries.length
    };
  }

  const first = reliableEntries[0];
  const last = reliableEntries[reliableEntries.length - 1];
  const daySpan = Math.max(0, (timestampMs(last.createdAt) - timestampMs(first.createdAt)) / 86400000);

  if (daySpan < minDays) {
    return {
      status: "needs-data",
      reason: `Needs at least ${minDays} days between reliable logs.`,
      entriesUsed: reliableEntries.length,
      excludedEntries: calorieWeightEntries.length - reliableEntries.length,
      daySpan: Number(daySpan.toFixed(1))
    };
  }

  const averageCalories =
    reliableEntries.reduce((total, entry) => total + entry.calories, 0) /
    reliableEntries.length;
  const weightDeltaKg = last.weight - first.weight;
  const dailyTissueEnergy = (weightDeltaKg * ENERGY_PER_KG) / daySpan;
  const estimatedTdee = Math.max(0, averageCalories - dailyTissueEnergy);
  const confidence = confidenceForWindow(daySpan, reliableEntries.length);
  const roundedTdee = roundTo(estimatedTdee, 10);
  const roundedAverageCalories = roundTo(averageCalories, 10);

  return {
    status: "ready",
    entriesUsed: reliableEntries.length,
    excludedEntries: calorieWeightEntries.length - reliableEntries.length,
    startAt: first.createdAt,
    endAt: last.createdAt,
    daySpan: Number(daySpan.toFixed(1)),
    startWeight: Number(first.weight.toFixed(1)),
    endWeight: Number(last.weight.toFixed(1)),
    weightDeltaKg: Number(weightDeltaKg.toFixed(2)),
    averageCalories: roundedAverageCalories,
    estimatedTdee: roundedTdee,
    rangeLow: Math.max(0, roundedTdee - confidence.band),
    rangeHigh: roundedTdee + confidence.band,
    confidence: confidence.id,
    confidenceLabel: confidence.label,
    summary: `${roundedTdee} kcal/day from ${reliableEntries.length} reliable log(s) over ${Math.round(daySpan)} day(s).`
  };
}
