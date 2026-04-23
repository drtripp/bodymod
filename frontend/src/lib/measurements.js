export const measurementFields = [
  {
    name: "height",
    label: "Height",
    unit: "cm",
    min: 120,
    max: 240
  },
  {
    name: "weight",
    label: "Weight",
    unit: "kg",
    min: 35,
    max: 250
  },
  {
    name: "sex",
    label: "Sex",
    type: "select",
    options: [
      { value: "male", label: "Male" },
      { value: "female", label: "Female" }
    ]
  },
  {
    name: "shoulders",
    label: "Shoulders",
    unit: "cm",
    min: 70,
    max: 180
  },
  {
    name: "underbust",
    label: "Underbust",
    unit: "cm",
    min: 50,
    max: 180
  },
  {
    name: "waist",
    label: "Waist",
    unit: "cm",
    min: 45,
    max: 180
  },
  {
    name: "hips",
    label: "Hips",
    unit: "cm",
    min: 60,
    max: 200
  }
];

export const defaultMeasurements = {
  height: 180,
  weight: 82,
  sex: "male",
  shoulders: 118,
  underbust: 92,
  waist: 80,
  hips: 96
};

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

export function validateMeasurements(formState) {
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
      errors[field.name] = `Expected ${field.min}-${field.max} ${field.unit}`;
    }
  }

  return errors;
}
