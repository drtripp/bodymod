const CM_PER_INCH = 2.54;
const KG_PER_POUND = 0.45359237;

function round(value, digits = 1) {
  return Number(value.toFixed(digits));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function cmToInches(value) {
  return Number(value) / CM_PER_INCH;
}

function kgToPounds(value) {
  return Number(value) / KG_PER_POUND;
}

function poundsToKg(value) {
  return Number(value) * KG_PER_POUND;
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function calculateNavyBodyFat(measurements) {
  const height = cmToInches(positiveNumber(measurements.height));
  const waist = cmToInches(positiveNumber(measurements.waistCircumference));
  const neck = cmToInches(positiveNumber(measurements.neckCircumference));
  const hip = cmToInches(positiveNumber(measurements.hipCircumference));

  if (!height || !waist || !neck) {
    return null;
  }

  if (measurements.sex === "female") {
    const circumferenceTerm = waist + hip - neck;
    if (!hip || circumferenceTerm <= 0) {
      return null;
    }

    return round(
      clamp(
        163.205 * Math.log10(circumferenceTerm) -
          97.684 * Math.log10(height) -
          78.387,
        4,
        60
      )
    );
  }

  const circumferenceTerm = waist - neck;
  if (circumferenceTerm <= 0) {
    return null;
  }

  return round(
    clamp(
      86.01 * Math.log10(circumferenceTerm) -
        70.041 * Math.log10(height) +
        36.76,
      3,
      55
    )
  );
}

export function calculateRfmBodyFat(measurements) {
  const height = positiveNumber(measurements.height);
  const waist = positiveNumber(measurements.waistCircumference);

  if (!height || !waist) {
    return null;
  }

  const sexOffset = measurements.sex === "female" ? 76 : 64;
  return round(clamp(sexOffset - 20 * (height / waist), 3, 60));
}

export function calculateBodyFatMethods(measurements) {
  return [
    {
      id: "navy",
      label: "Navy",
      value: calculateNavyBodyFat(measurements),
      note: "Neck, waist, height, and hip for female profiles"
    },
    {
      id: "rfm",
      label: "RFM",
      value: calculateRfmBodyFat(measurements),
      note: "Relative fat mass from height and waist"
    }
  ];
}

export function averageBodyFatPercent(methods) {
  const values = methods
    .map((method) => method.value)
    .filter((value) => Number.isFinite(Number(value)));

  if (!values.length) {
    return null;
  }

  return round(values.reduce((total, value) => total + value, 0) / values.length);
}

export function calculateFfmi(measurements, bodyFatPercent) {
  const heightMeters = positiveNumber(measurements.height) / 100;
  const weightKg = positiveNumber(measurements.weight);
  const bodyFat = positiveNumber(bodyFatPercent);

  if (!heightMeters || !weightKg || !bodyFat || bodyFat >= 70) {
    return null;
  }

  const leanMassKg = weightKg * (1 - bodyFat / 100);
  const ffmi = leanMassKg / (heightMeters * heightMeters);
  const normalizedFfmi = ffmi + 6.1 * (1.8 - heightMeters);

  return {
    leanMassKg: round(leanMassKg),
    ffmi: round(ffmi, 1),
    normalizedFfmi: round(normalizedFfmi, 1),
    context:
      normalizedFfmi >= 25
        ? "Unusually high; not a drug-use classifier"
        : normalizedFfmi >= 22
          ? "High trained-muscularity context"
          : "Below common natural-ceiling discussion ranges"
  };
}

export function calculateCaseyButtPotential(measurements, bodyFatPercent) {
  if (measurements.sex !== "male") {
    return {
      eligible: false,
      note: "Frame-potential estimate is male-only in the available Casey Butt-style source data."
    };
  }

  const heightInches = cmToInches(positiveNumber(measurements.height));
  const wristInches = cmToInches(positiveNumber(measurements.wristCircumference));
  const ankleInches = cmToInches(positiveNumber(measurements.ankleCircumference));
  const weightKg = positiveNumber(measurements.weight);
  const bodyFat = positiveNumber(bodyFatPercent);

  if (!heightInches || !wristInches || !ankleInches || !weightKg || !bodyFat || bodyFat >= 70) {
    return {
      eligible: false,
      note: "Height, weight, wrist, ankle, and body-fat estimate are required."
    };
  }

  const potentialLeanMassLb =
    Math.pow(heightInches, 1.5) *
    (Math.sqrt(wristInches) / 22.667 + Math.sqrt(ankleInches) / 17.0104) *
    (1 + 10 / 224);
  const potentialLeanMassKg = poundsToKg(potentialLeanMassLb);
  const currentLeanMassKg = weightKg * (1 - bodyFat / 100);
  const potentialWeightAtCurrentBodyFatKg = potentialLeanMassKg / (1 - bodyFat / 100);

  return {
    eligible: true,
    leanMassPotentialKg: round(potentialLeanMassKg),
    currentLeanMassKg: round(currentLeanMassKg),
    remainingLeanMassKg: round(potentialLeanMassKg - currentLeanMassKg),
    potentialWeightAtCurrentBodyFatKg: round(potentialWeightAtCurrentBodyFatKg),
    potentialFfmi: round(potentialLeanMassKg / Math.pow(heightInches * CM_PER_INCH / 100, 2), 1),
    note: "Frame-based male natural-potential estimate; use as planning context only."
  };
}

export function calculateBodyComposition(measurements) {
  const methods = calculateBodyFatMethods(measurements);
  const bodyFatAverage = averageBodyFatPercent(methods);
  const ffmi = calculateFfmi(measurements, bodyFatAverage);
  const potential = calculateCaseyButtPotential(measurements, bodyFatAverage);

  return {
    methods,
    bodyFatAverage,
    leanMassKg: ffmi?.leanMassKg ?? null,
    ffmi,
    potential,
    weightLb: round(kgToPounds(measurements.weight || 0), 1)
  };
}
