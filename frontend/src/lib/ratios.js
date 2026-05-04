function round(value, digits = 2) {
  return Number(value.toFixed(digits));
}

export function calculateRatios(measurements) {
  const heightMeters = Number(measurements.height) / 100;
  const weight = Number(measurements.weight);
  const waist = Number(measurements.waistCircumference);
  const hip = Number(measurements.hipCircumference);
  const shoulders = Number(measurements.bideltoidCircumference);
  const neck = Number(measurements.neckCircumference);
  const sex = measurements.sex;
  const bmi = heightMeters > 0 ? round(weight / (heightMeters * heightMeters), 1) : null;
  const estimatedBodyFat =
    heightMeters > 0 && waist > 0 && neck > 0
      ? sex === "female"
        ? round(Math.max(8, Math.min(55, 0.42 * waist + 0.18 * hip - 0.24 * neck - 10)), 1)
        : round(Math.max(5, Math.min(45, 0.45 * waist - 0.28 * neck - 8)), 1)
      : null;

  return [
    {
      id: "bmi",
      label: "BMI",
      value: bmi,
      note: "Body mass relative to height"
    },
    {
      id: "bodyFat",
      label: "Est BF%",
      value: estimatedBodyFat,
      note: "Rough circumference estimate"
    },
    {
      id: "shoulderHip",
      label: "SHR",
      value: hip > 0 ? round(shoulders / hip) : null,
      note: "Shoulder-to-hip ratio"
    },
    {
      id: "shoulderWaist",
      label: "SWR",
      value: waist > 0 ? round(shoulders / waist) : null,
      note: "Shoulder-to-waist ratio"
    },
    {
      id: "waistHip",
      label: "WHR",
      value: hip > 0 ? round(waist / hip) : null,
      note: "Waist-to-hip ratio"
    }
  ];
}
