const CM_PER_INCH = 2.54;
const KG_PER_POUND = 0.45359237;

export function getFieldDimension(name) {
  if (name === "height") {
    return "height";
  }

  if (name === "weight") {
    return "weight";
  }

  return "length";
}

export function getFieldUnitLabel(name, unitSystem) {
  if (name === "sex") {
    return "";
  }

  if (unitSystem === "imperial") {
    return name === "weight" ? "lb" : "in";
  }

  return name === "weight" ? "kg" : "cm";
}

export function resolveFieldUnitSystem(name, globalUnitSystem, fieldUnitOverrides) {
  return fieldUnitOverrides[name] || globalUnitSystem;
}

export function metricToDisplayValue(name, metricValue, unitSystem) {
  if (metricValue === "" || Number.isNaN(Number(metricValue))) {
    return "";
  }

  const numericValue = Number(metricValue);

  if (unitSystem === "imperial") {
    if (name === "weight") {
      return numericValue / KG_PER_POUND;
    }

    return numericValue / CM_PER_INCH;
  }

  return numericValue;
}

export function displayToMetricValue(name, displayValue, unitSystem) {
  if (displayValue === "" || Number.isNaN(Number(displayValue))) {
    return "";
  }

  const numericValue = Number(displayValue);

  if (unitSystem === "imperial") {
    if (name === "weight") {
      return numericValue * KG_PER_POUND;
    }

    return numericValue * CM_PER_INCH;
  }

  return numericValue;
}

export function formatDisplayValue(name, metricValue, unitSystem) {
  const displayValue = metricToDisplayValue(name, metricValue, unitSystem);

  if (displayValue === "") {
    return "";
  }

  if (unitSystem === "imperial") {
    return displayValue.toFixed(1).replace(/\.0$/, "");
  }

  return String(Math.round(displayValue * 10) / 10).replace(/\.0$/, "");
}

export function buildDisplayFormState(formState, globalUnitSystem, fieldUnitOverrides) {
  const nextState = {
    sex: formState.sex
  };
  const numericFields = [
    "height",
    "weight",
    "headCircumference",
    "neckCircumference",
    "biacromialWidth",
    "bideltoidWidth",
    "bideltoidCircumference",
    "armpitCircumference",
    "nippleCircumference",
    "underbustCircumference",
    "waistCircumference",
    "pantWaistCircumference",
    "hipCircumference",
    "upperThighCircumference",
    "midThighCircumference",
    "calfCircumference",
    "bicepCircumference",
    "upperForearmCircumference",
    "wristCircumference"
  ];

  for (const fieldName of numericFields) {
    const unitSystem = resolveFieldUnitSystem(
      fieldName,
      globalUnitSystem,
      fieldUnitOverrides
    );

    nextState[fieldName] = formatDisplayValue(
      fieldName,
      formState[fieldName],
      unitSystem
    );
  }

  return nextState;
}
