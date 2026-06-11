const DAY_MS = 24 * 60 * 60 * 1000;
const KJ_PER_KCAL = 4.184;
const DEFAULT_HALL_AGE_YEARS = 35;
const DEFAULT_HALL_PAL = 1.5;

const hallConstants = {
  betaTef: 0.1,
  betaAdaptiveThermogenesis: 0.14,
  fatEnergyDensityKjPerKg: 39500,
  leanEnergyDensityKjPerKg: 7600,
  fatSynthesisEfficiencyKjPerKg: 750,
  leanSynthesisEfficiencyKjPerKg: 960,
  fatRmrCoefficientKjPerKgDay: 13,
  leanRmrCoefficientKjPerKgDay: 92,
  forbesLeanFatKg: 10.4
};

const trackedOutcomeMetrics = [
  ["weight", "Weight", "kg"],
  ["waistCircumference", "Waist", "cm"],
  ["hipCircumference", "Hip", "cm"],
  ["bideltoidCircumference", "Bideltoid Circ", "cm"]
];

function numeric(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateMs(value) {
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function daysBetween(start, end) {
  return Math.max(1, Math.round((dateMs(end) - dateMs(start)) / DAY_MS));
}

function signed(value, unit) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} ${unit}`;
}

function roundTenth(value) {
  return Number(value.toFixed(1));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizedSex(value) {
  return String(value || "").toLowerCase().startsWith("female") ? "female" : "male";
}

function estimateMifflinRmrKcal({ weightKg, heightCm, ageYears, sex }) {
  const sexConstant = normalizedSex(sex) === "female" ? -161 : 5;
  return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + sexConstant;
}

export function estimateHallInitialFatMassKg({ weightKg, heightCm, ageYears, sex }) {
  const heightMeters = heightCm / 100;
  if (!heightMeters || !weightKg || !Number.isFinite(heightMeters) || !Number.isFinite(weightKg)) {
    return null;
  }

  const bmi = weightKg / heightMeters ** 2;
  const sexCoefficient = normalizedSex(sex) === "female" ? 39.96 : 37.31;
  const sexIntercept = normalizedSex(sex) === "female" ? -102.01 : -103.94;
  const bodyFatPercent = 0.14 * ageYears + sexCoefficient * Math.log(bmi) + sexIntercept;
  return clamp((weightKg * bodyFatPercent) / 100, weightKg * 0.05, weightKg * 0.65);
}

export function buildHallLinearizedParameters(measurements = {}, options = {}) {
  const weightKg = numeric(measurements.weight);
  const heightCm = numeric(measurements.height);
  if (weightKg === null || heightCm === null) {
    return null;
  }

  const ageYears = clamp(
    numeric(options.ageYears ?? measurements.ageYears ?? measurements.age) ?? DEFAULT_HALL_AGE_YEARS,
    18,
    90
  );
  const physicalActivityLevel = clamp(
    numeric(options.physicalActivityLevel ?? measurements.physicalActivityLevel) ?? DEFAULT_HALL_PAL,
    1.1,
    2.5
  );
  const sex = normalizedSex(measurements.sex);
  const fatMassKg = estimateHallInitialFatMassKg({
    weightKg,
    heightCm,
    ageYears,
    sex
  });

  if (fatMassKg === null) {
    return null;
  }

  const beta = hallConstants.betaTef + hallConstants.betaAdaptiveThermogenesis;
  const alpha = hallConstants.forbesLeanFatKg / fatMassKg;
  const restingMetabolicRateKj =
    estimateMifflinRmrKcal({ weightKg, heightCm, ageYears, sex }) * KJ_PER_KCAL;
  const activityCoefficientKjPerKgDay =
    (((1 - hallConstants.betaTef) * physicalActivityLevel - 1) * restingMetabolicRateKj) /
    weightKg;
  const expenditureSlopeKjPerKgDay =
    ((hallConstants.fatRmrCoefficientKjPerKgDay +
      alpha * hallConstants.leanRmrCoefficientKjPerKgDay) /
      (1 + alpha) +
      activityCoefficientKjPerKgDay) /
    (1 - beta);
  const effectiveEnergyDensityKjPerKg =
    (hallConstants.fatSynthesisEfficiencyKjPerKg +
      hallConstants.fatEnergyDensityKjPerKg +
      alpha *
        (hallConstants.leanSynthesisEfficiencyKjPerKg +
          hallConstants.leanEnergyDensityKjPerKg)) /
    ((1 - beta) * (1 + alpha));

  return {
    sex,
    ageYears,
    physicalActivityLevel,
    estimatedFatMassKg: fatMassKg,
    alpha,
    restingMetabolicRateKcal: restingMetabolicRateKj / KJ_PER_KCAL,
    activityCoefficientKjPerKgDay,
    expenditureSlopeKjPerKgDay,
    effectiveEnergyDensityKjPerKg,
    timeConstantDays: effectiveEnergyDensityKjPerKg / expenditureSlopeKjPerKgDay
  };
}

export function splitAffectedFields(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function protocolSnapshots(protocol, snapshots = []) {
  const start = dateMs(protocol.startDate || protocol.createdAt);
  const end = protocol.endDate ? dateMs(protocol.endDate) + DAY_MS : Number.POSITIVE_INFINITY;

  return snapshots
    .filter((snapshot) => {
      const createdAt = dateMs(snapshot.createdAt);
      return createdAt >= start && createdAt <= end;
    })
    .sort((left, right) => dateMs(left.createdAt) - dateMs(right.createdAt));
}

export function buildProtocolOutcomeSummary(protocol, currentMeasurements = {}, snapshots = []) {
  const linkedSnapshots = protocolSnapshots(protocol, snapshots);
  const baseline = protocol.startingMeasurements || linkedSnapshots[0]?.measurements;
  const latest = linkedSnapshots[linkedSnapshots.length - 1]?.measurements || currentMeasurements;

  const rows = trackedOutcomeMetrics
    .map(([key, label, unit]) => {
      const start = numeric(baseline?.[key]);
      const current = numeric(latest?.[key]);
      if (start === null || current === null) {
        return null;
      }

      const delta = current - start;
      return {
        key,
        label,
        unit,
        start,
        current,
        delta,
        displayDelta: signed(delta, unit)
      };
    })
    .filter(Boolean);

  const checkIns = Array.isArray(protocol.checkIns) ? protocol.checkIns : [];
  const scored = checkIns.filter((checkIn) => numeric(checkIn.score) !== null);
  const averageScore = scored.length
    ? scored.reduce((total, checkIn) => total + Number(checkIn.score), 0) / scored.length
    : null;

  return {
    snapshotCount: linkedSnapshots.length,
    rows,
    adherenceCount: checkIns.length,
    averageScore,
    summary: rows.length
      ? rows.map((row) => `${row.label} ${row.displayDelta}`).join(", ")
      : "No outcome measurements yet."
  };
}

export function buildEnergyProjection(protocol, currentMeasurements = {}) {
  const dailyDelta = numeric(protocol.calorieDelta);
  if (dailyDelta === null || dailyDelta === 0) {
    return null;
  }

  const startDate = protocol.startDate || protocol.createdAt || new Date().toISOString();
  const endDate = protocol.endDate || new Date(dateMs(startDate) + 84 * DAY_MS).toISOString();
  const durationDays = Math.min(365, Math.max(14, daysBetween(startDate, endDate)));
  const baseline = {
    ...currentMeasurements,
    ...(protocol.startingMeasurements || {})
  };
  const startWeight = numeric(protocol.startingMeasurements?.weight) ?? numeric(currentMeasurements.weight);

  if (startWeight === null) {
    return null;
  }

  const parameters = buildHallLinearizedParameters(baseline, {
    ageYears: protocol.ageYears,
    physicalActivityLevel: protocol.physicalActivityLevel
  });

  if (!parameters) {
    return null;
  }

  const dailyDeltaKj = dailyDelta * KJ_PER_KCAL;
  const steadyStateKg = dailyDeltaKj / parameters.expenditureSlopeKjPerKgDay;
  const dynamicFraction = 1 - Math.exp(-durationDays / parameters.timeConstantDays);
  const projectedDeltaKg = steadyStateKg * dynamicFraction;
  const uncertainty = Math.max(0.5, Math.abs(projectedDeltaKg) * 0.35);
  const waistDelta = projectedDeltaKg * 0.75;
  const monthCount = Math.max(2, Math.ceil(durationDays / 30));
  const points = Array.from({ length: monthCount + 1 }, (_, index) => {
    const day = Math.round((durationDays / monthCount) * index);
    const fraction = 1 - Math.exp(-day / parameters.timeConstantDays);
    const delta = steadyStateKg * fraction;

    return {
      day,
      weight: Number((startWeight + delta).toFixed(1)),
      low: Number((startWeight + delta - uncertainty).toFixed(1)),
      high: Number((startWeight + delta + uncertainty).toFixed(1))
    };
  });

  return {
    model: "NIDDK/Hall 2011 linearized planning band",
    dailyDelta,
    durationDays,
    startWeight,
    steadyStateDeltaKg: Number(steadyStateKg.toFixed(1)),
    projectedDeltaKg: Number(projectedDeltaKg.toFixed(1)),
    lowDeltaKg: Number((projectedDeltaKg - uncertainty).toFixed(1)),
    highDeltaKg: Number((projectedDeltaKg + uncertainty).toFixed(1)),
    waistDeltaCm: Number(waistDelta.toFixed(1)),
    assumptions: {
      ageYears: parameters.ageYears,
      physicalActivityLevel: Number(parameters.physicalActivityLevel.toFixed(2)),
      estimatedFatMassKg: Number(parameters.estimatedFatMassKg.toFixed(1)),
      timeConstantDays: Math.round(parameters.timeConstantDays)
    },
    points,
    note: "Planning context only; ports the documented long-term linearized Hall equation, not the full NIH Body Weight Planner early-phase model."
  };
}

export function buildProjectedMeasurements(protocol, currentMeasurements = {}) {
  const projection = buildEnergyProjection(protocol, currentMeasurements);
  if (!projection) {
    return null;
  }

  const baseline = {
    ...currentMeasurements,
    ...(protocol.startingMeasurements || {})
  };
  const startWaist =
    numeric(protocol.startingMeasurements?.waistCircumference) ??
    numeric(currentMeasurements.waistCircumference);
  const startPantWaist =
    numeric(protocol.startingMeasurements?.pantWaistCircumference) ??
    numeric(currentMeasurements.pantWaistCircumference);

  if (startWaist === null) {
    return null;
  }

  const projectedWeight = clamp(
    projection.startWeight + projection.projectedDeltaKg,
    35,
    250
  );
  const projectedWaist = clamp(startWaist + projection.waistDeltaCm, 45, 180);
  const measurements = {
    ...baseline,
    weight: roundTenth(projectedWeight),
    waistCircumference: roundTenth(projectedWaist)
  };

  if (startPantWaist !== null) {
    measurements.pantWaistCircumference = roundTenth(
      clamp(startPantWaist + projection.waistDeltaCm, 45, 190)
    );
  }

  return {
    measurements,
    projection,
    adjustedFields: ["weight", "waistCircumference", "pantWaistCircumference"].filter(
      (field) => field in measurements
    ),
    note: "Projected silhouette adjusts only calorie-linked weight and waist fields; other measurements are held at the protocol start."
  };
}

export function buildPlanRetro(protocol, currentMeasurements = {}, snapshots = []) {
  const projection = buildEnergyProjection(protocol, currentMeasurements);
  const outcome = buildProtocolOutcomeSummary(protocol, currentMeasurements, snapshots);
  const weightRow = outcome.rows.find((row) => row.key === "weight");

  if (!projection || !weightRow) {
    return null;
  }

  const actual = Number(weightRow.delta.toFixed(1));
  const isInsideBand =
    actual >= projection.lowDeltaKg && actual <= projection.highDeltaKg;

  return {
    actualDeltaKg: actual,
    projectedDeltaKg: projection.projectedDeltaKg,
    projectedBand: `${signed(projection.lowDeltaKg, "kg")} to ${signed(projection.highDeltaKg, "kg")}`,
    isInsideBand,
    label: isInsideBand ? "Actual stayed inside the planning band." : "Actual landed outside the planning band."
  };
}

export function buildProtocolCaseLog(protocol, currentMeasurements = {}, snapshots = []) {
  const outcome = buildProtocolOutcomeSummary(protocol, currentMeasurements, snapshots);
  const projection = buildEnergyProjection(protocol, currentMeasurements);

  return {
    protocolId: protocol.id,
    label: protocol.label,
    category: protocol.category,
    status: protocol.status,
    dose: protocol.dose,
    frequency: protocol.frequency,
    window: `${protocol.startDate || "open"} - ${protocol.endDate || "open"}`,
    adherenceCount: outcome.adherenceCount,
    averageScore: outcome.averageScore,
    snapshotCount: outcome.snapshotCount,
    outcomeSummary: outcome.summary,
    projectionSummary: projection
      ? `${projection.model}: ${signed(projection.projectedDeltaKg, "kg")} over ${projection.durationDays} days`
      : "No defensible projection configured."
  };
}

export function formatProtocolSchemaSummary(taxonomy = []) {
  if (!taxonomy.length) {
    return "Protocol schema unavailable.";
  }

  return taxonomy
    .map((item) => `${item.label}: ${item.doseFields.join(", ")}`)
    .join(" / ");
}
