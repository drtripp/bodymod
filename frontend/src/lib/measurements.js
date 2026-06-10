import measurementSchema from "../../../shared/measurement_schema.json" with { type: "json" };
import {
  formatDisplayValue,
  getFieldUnitLabel,
  resolveFieldUnitSystem
} from "./units.js";

export { measurementSchema };

export const measurementFields = measurementSchema.fields;

export const measurementCategories = measurementSchema.categories;

const measurementDefaultsBySex = measurementSchema.defaultsBySex;

export const defaultMeasurements = {
  ...measurementSchema.defaults,
  ...measurementDefaultsBySex[measurementSchema.defaults.sex]
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

    if (value === "" || value === null || value === undefined) {
      errors[field.name] = "Required";
      continue;
    }

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
