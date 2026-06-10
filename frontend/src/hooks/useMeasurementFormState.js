import { useMemo, useState } from "react";
import {
  coerceMeasurements,
  defaultMeasurements,
  normalizeMeasurements,
  validateMeasurements
} from "../lib/measurements";
import {
  buildDisplayFormState,
  displayToMetricValue,
  formatDisplayValue,
  resolveFieldUnitSystem
} from "../lib/units";

export function useMeasurementFormState() {
  const [formState, setFormState] = useState(defaultMeasurements);
  const [displayFormState, setDisplayFormState] = useState(() =>
    buildDisplayFormState(defaultMeasurements, "metric", {})
  );
  const [errors, setErrors] = useState({});
  const [globalUnitSystem, setGlobalUnitSystem] = useState("metric");
  const [fieldUnitOverrides, setFieldUnitOverrides] = useState({});
  const [hoveredMeasurement, setHoveredMeasurement] = useState(null);

  const currentMeasurements = useMemo(() => coerceMeasurements(formState), [formState]);

  function clearFieldError(name) {
    setErrors((current) => {
      if (!current[name]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[name];
      return nextErrors;
    });
  }

  function setMeasurementSet(measurements) {
    const normalized = normalizeMeasurements(measurements);
    setFormState(normalized);
    setDisplayFormState(
      buildDisplayFormState(normalized, globalUnitSystem, fieldUnitOverrides)
    );
    setErrors({});
  }

  function setMeasurementValue(name, value) {
    const unitSystem = resolveFieldUnitSystem(
      name,
      globalUnitSystem,
      fieldUnitOverrides
    );

    setDisplayFormState((current) => ({
      ...current,
      [name]: value
    }));

    setFormState((current) => ({
      ...current,
      [name]: name === "sex" ? value : displayToMetricValue(name, value, unitSystem)
    }));

    clearFieldError(name);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setMeasurementValue(name, value);
  }

  function handleFieldBlur(name) {
    const unitSystem = resolveFieldUnitSystem(
      name,
      globalUnitSystem,
      fieldUnitOverrides
    );

    setDisplayFormState((current) => ({
      ...current,
      [name]: formatDisplayValue(name, formState[name], unitSystem)
    }));
  }

  function validateCurrentMeasurements() {
    const nextErrors = validateMeasurements(
      formState,
      globalUnitSystem,
      fieldUnitOverrides
    );
    setErrors(nextErrors);

    return {
      errors: nextErrors,
      isValid: !Object.keys(nextErrors).length,
      measurements: coerceMeasurements(formState)
    };
  }

  function handleGlobalUnitChange(nextUnitSystem) {
    setGlobalUnitSystem(nextUnitSystem);
    setDisplayFormState(buildDisplayFormState(formState, nextUnitSystem, fieldUnitOverrides));
  }

  function handleFieldUnitChange(name, nextUnitSystem) {
    setFieldUnitOverrides((current) => {
      const nextOverrides = { ...current };

      if (nextUnitSystem === globalUnitSystem) {
        delete nextOverrides[name];
      } else {
        nextOverrides[name] = nextUnitSystem;
      }

      return nextOverrides;
    });

    setDisplayFormState((current) => ({
      ...current,
      [name]: formatDisplayValue(name, formState[name], nextUnitSystem)
    }));
  }

  function handleFieldUnitReset(name) {
    setFieldUnitOverrides((current) => {
      if (!current[name]) {
        return current;
      }

      const nextOverrides = { ...current };
      delete nextOverrides[name];
      return nextOverrides;
    });

    setDisplayFormState((current) => ({
      ...current,
      [name]: formatDisplayValue(name, formState[name], globalUnitSystem)
    }));
  }

  return {
    formState,
    displayFormState,
    errors,
    globalUnitSystem,
    fieldUnitOverrides,
    hoveredMeasurement,
    currentMeasurements,
    setErrors,
    setHoveredMeasurement,
    setMeasurementSet,
    setMeasurementValue,
    handleChange,
    handleFieldBlur,
    validateCurrentMeasurements,
    handleGlobalUnitChange,
    handleFieldUnitChange,
    handleFieldUnitReset
  };
}
