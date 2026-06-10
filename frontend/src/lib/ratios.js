import { calculateBodyComposition } from "./bodyComposition.js";

function round(value, digits = 2) {
  return Number(value.toFixed(digits));
}

export function calculateRatios(measurements) {
  const heightMeters = Number(measurements.height) / 100;
  const weight = Number(measurements.weight);
  const waist = Number(measurements.waistCircumference);
  const hip = Number(measurements.hipCircumference);
  const shoulders = Number(measurements.bideltoidCircumference);
  const bodyComposition = calculateBodyComposition(measurements);
  const bmi = heightMeters > 0 ? round(weight / (heightMeters * heightMeters), 1) : null;

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
      value: bodyComposition.bodyFatAverage,
      note: "Average of Navy and RFM circumference estimates"
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
    },
    {
      id: "waistHeight",
      label: "WHTR",
      value: Number(measurements.height) > 0 ? round(waist / Number(measurements.height)) : null,
      note: "Waist-to-height ratio"
    }
  ];
}
