import {
  formatDisplayValue,
  getFieldUnitLabel,
  resolveFieldUnitSystem
} from "./units";

export const measurementFields = [
  {
    name: "height",
    label: "Height",
    category: "Profile",
    unit: "cm",
    min: 120,
    max: 240
  },
  {
    name: "weight",
    label: "Weight",
    category: "Profile",
    unit: "kg",
    min: 35,
    max: 250
  },
  {
    name: "sex",
    label: "Sex",
    category: "Profile",
    type: "select",
    options: [
      { value: "male", label: "Male" },
      { value: "female", label: "Female" }
    ]
  },
  {
    name: "headCircumference",
    label: "Head Circ",
    category: "Head",
    unit: "cm",
    min: 45,
    max: 70
  },
  {
    name: "neckCircumference",
    label: "Neck Circ",
    category: "Head",
    unit: "cm",
    min: 25,
    max: 65
  },
  {
    name: "biacromialWidth",
    label: "Biacromial Width",
    category: "Shoulders",
    unit: "cm",
    min: 28,
    max: 65
  },
  {
    name: "bideltoidWidth",
    label: "Bideltoid Width",
    category: "Shoulders",
    unit: "cm",
    min: 34,
    max: 85
  },
  {
    name: "bideltoidCircumference",
    label: "Bideltoid Circ",
    category: "Shoulders",
    unit: "cm",
    min: 70,
    max: 180
  },
  {
    name: "armpitCircumference",
    label: "Armpit Circ",
    category: "Chest",
    unit: "cm",
    min: 50,
    max: 190
  },
  {
    name: "nippleCircumference",
    label: "Nipple Circ",
    category: "Chest",
    unit: "cm",
    min: 50,
    max: 190
  },
  {
    name: "underbustCircumference",
    label: "Underbust",
    category: "Chest",
    unit: "cm",
    min: 50,
    max: 180
  },
  {
    name: "waistCircumference",
    label: "Waist",
    category: "Lower Body",
    unit: "cm",
    min: 45,
    max: 180
  },
  {
    name: "pantWaistCircumference",
    label: "Pant Waist",
    category: "Lower Body",
    unit: "cm",
    min: 45,
    max: 190
  },
  {
    name: "hipCircumference",
    label: "Hip/Buttock Circ",
    category: "Lower Body",
    unit: "cm",
    min: 60,
    max: 200
  },
  {
    name: "upperThighCircumference",
    label: "Upper Thigh Circ",
    category: "Legs",
    unit: "cm",
    min: 30,
    max: 110
  },
  {
    name: "midThighCircumference",
    label: "Mid Thigh Circ",
    category: "Legs",
    unit: "cm",
    min: 25,
    max: 95
  },
  {
    name: "calfCircumference",
    label: "Calf Circ",
    category: "Legs",
    unit: "cm",
    min: 20,
    max: 70
  },
  {
    name: "bicepCircumference",
    label: "Bicep Circ",
    category: "Arms",
    unit: "cm",
    min: 18,
    max: 75
  },
  {
    name: "upperForearmCircumference",
    label: "Upper Forearm Circ",
    category: "Arms",
    unit: "cm",
    min: 15,
    max: 55
  },
  {
    name: "wristCircumference",
    label: "Wrist Circ",
    category: "Arms",
    unit: "cm",
    min: 11,
    max: 30
  }
];

export const measurementCategories = [
  "Profile",
  "Head",
  "Shoulders",
  "Arms",
  "Chest",
  "Lower Body",
  "Legs"
];

const measurementDefaultsBySex = {
  male: {
    headCircumference: 57,
    neckCircumference: 39,
    biacromialWidth: 40,
    bideltoidWidth: 50,
    bideltoidCircumference: 118,
    armpitCircumference: 98,
    nippleCircumference: 96,
    underbustCircumference: 92,
    waistCircumference: 80,
    pantWaistCircumference: 86,
    hipCircumference: 96,
    upperThighCircumference: 58,
    midThighCircumference: 50,
    calfCircumference: 38,
    bicepCircumference: 34,
    upperForearmCircumference: 29,
    wristCircumference: 17
  },
  female: {
    headCircumference: 55,
    neckCircumference: 32,
    biacromialWidth: 35,
    bideltoidWidth: 43,
    bideltoidCircumference: 100,
    armpitCircumference: 86,
    nippleCircumference: 88,
    underbustCircumference: 78,
    waistCircumference: 70,
    pantWaistCircumference: 77,
    hipCircumference: 100,
    upperThighCircumference: 56,
    midThighCircumference: 48,
    calfCircumference: 35,
    bicepCircumference: 28,
    upperForearmCircumference: 23,
    wristCircumference: 15
  }
};

export const defaultMeasurements = {
  height: 180,
  weight: 82,
  sex: "male",
  ...measurementDefaultsBySex.male
};

export function normalizeMeasurements(measurements = {}) {
  const sex = measurements.sex || defaultMeasurements.sex;
  const baseline =
    measurementDefaultsBySex[sex] || measurementDefaultsBySex[defaultMeasurements.sex];

  return {
    ...defaultMeasurements,
    ...baseline,
    ...measurements,
    bideltoidCircumference:
      measurements.bideltoidCircumference ??
      measurements.shoulders ??
      baseline.bideltoidCircumference,
    underbustCircumference:
      measurements.underbustCircumference ??
      measurements.underbust ??
      baseline.underbustCircumference,
    waistCircumference:
      measurements.waistCircumference ??
      measurements.waist ??
      baseline.waistCircumference,
    hipCircumference:
      measurements.hipCircumference ??
      measurements.hips ??
      baseline.hipCircumference
  };
}

export function coerceMeasurements(formState) {
  return measurementFields.reduce((accumulator, field) => {
    if (field.type === "select") {
      accumulator[field.name] = formState[field.name];
      return accumulator;
    }

    accumulator[field.name] = Number(formState[field.name]);
    return accumulator;
  }, {});
}

export function validateMeasurements(
  formState,
  globalUnitSystem = "metric",
  fieldUnitOverrides = {}
) {
  const errors = {};

  for (const field of measurementFields) {
    const value = formState[field.name];

    if (field.type === "select") {
      if (!value) {
        errors[field.name] = "Required";
      }
      continue;
    }

    const numericValue = Number(value);

    if (Number.isNaN(numericValue)) {
      errors[field.name] = "Enter a number";
      continue;
    }

    if (numericValue < field.min || numericValue > field.max) {
      const unitSystem = resolveFieldUnitSystem(
        field.name,
        globalUnitSystem,
        fieldUnitOverrides
      );
      const min = formatDisplayValue(field.name, field.min, unitSystem);
      const max = formatDisplayValue(field.name, field.max, unitSystem);
      const label = getFieldUnitLabel(field.name, unitSystem);
      errors[field.name] = `Expected ${min}-${max} ${label}`;
    }
  }

  return errors;
}
