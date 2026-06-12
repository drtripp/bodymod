import { useEffect, useMemo, useState } from "react";
import { measurementCategories, measurementFields } from "../lib/measurements";
import {
  emptyMeasurementGuideLibrary,
  getDefaultMeasurementGuideField,
  indexMeasurementGuides,
  publicMeasurementGuidePath
} from "../lib/measurementGuides";
import { getFieldUnitLabel, resolveFieldUnitSystem } from "../lib/units";

function buildCategoryGroups() {
  return measurementCategories
    .map((category) => ({
      category,
      fields: measurementFields.filter((field) => field.category === category)
    }))
    .filter((group) => group.fields.length);
}

const categoryKeyByName = {
  Profile: "profile",
  Head: "head",
  Shoulders: "shoulders",
  Arms: "arms",
  Chest: "chest",
  "Lower Body": "lowerBody",
  Legs: "legs"
};

function copy(t, key, fallback, values = {}) {
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    t(key, values, fallback)
  );
}

function fieldLabel(t, field) {
  return copy(t, `measurement.field.${field.name}.label`, field.label);
}

function fieldHelp(t, field) {
  return copy(t, `measurement.field.${field.name}.help`, field.help || "");
}

function optionLabel(t, field, option) {
  return copy(
    t,
    `measurement.field.${field.name}.option.${option.value}`,
    option.label
  );
}

export default function MeasurementForm({
  formState,
  errors,
  onChange,
  onSubmit,
  onFieldBlur,
  globalUnitSystem,
  fieldUnitOverrides,
  onGlobalUnitChange,
  onFieldUnitChange,
  onFieldUnitReset,
  hoveredMeasurement,
  onMeasurementHover,
  measurementGuideLibrary = emptyMeasurementGuideLibrary,
  t = (key, values, fallback) => fallback || key
}) {
  const categoryGroups = buildCategoryGroups();
  const guidesByField = useMemo(
    () => indexMeasurementGuides(measurementGuideLibrary),
    [measurementGuideLibrary]
  );
  const guideOptions = useMemo(
    () =>
      measurementFields
        .filter((field) => guidesByField[field.name])
        .map((field) => ({
          field: field.name,
          label: fieldLabel(t, field) || guidesByField[field.name].label || field.label
        })),
    [guidesByField, t]
  );
  const defaultGuideField = useMemo(
    () => getDefaultMeasurementGuideField(measurementGuideLibrary),
    [measurementGuideLibrary]
  );
  const [selectedGuideField, setSelectedGuideField] = useState("");
  const selectedGuide =
    guidesByField[selectedGuideField] ||
    guidesByField[defaultGuideField] ||
    null;
  const selectedGuideDefinition = selectedGuide
    ? measurementFields.find((field) => field.name === selectedGuide.field)
    : null;
  const selectedGuideLabel = selectedGuideDefinition
    ? fieldLabel(t, selectedGuideDefinition)
    : selectedGuide?.label;

  useEffect(() => {
    if (!guideOptions.length) {
      setSelectedGuideField("");
      return;
    }

    if (!guidesByField[selectedGuideField]) {
      setSelectedGuideField(defaultGuideField || guideOptions[0].field);
    }
  }, [defaultGuideField, guideOptions, guidesByField, selectedGuideField]);

  return (
    <section id="measurement-form" className="panel" aria-labelledby="measurement-form-heading">
      <div className="panel-header panel-header-row">
        <div>
          <h2 id="measurement-form-heading">{copy(t, "measurement.title", "Measurements")}</h2>
          <p>
            {copy(
              t,
              "measurement.intro",
              "Enter the core values for the current comparison. Results update live."
            )}
          </p>
        </div>

        <div
          className="unit-toggle"
          aria-label={copy(t, "measurement.unit.aria", "Measurement unit system")}
        >
          <button
            className={`button ${globalUnitSystem === "metric" ? "is-active" : ""}`}
            type="button"
            onClick={() => onGlobalUnitChange("metric")}
          >
            {copy(t, "measurement.unit.metric", "Metric")}
          </button>
          <button
            className={`button ${globalUnitSystem === "imperial" ? "is-active" : ""}`}
            type="button"
            onClick={() => onGlobalUnitChange("imperial")}
          >
            {copy(t, "measurement.unit.imperial", "Imperial")}
          </button>
        </div>
      </div>

      {selectedGuide ? (
        <div
          className="measurement-guide-panel"
          aria-label={copy(t, "measurement.guides.aria", "Measurement guides")}
        >
          <div className="measurement-guide-header">
            <div>
              <h3>{copy(t, "measurement.guides.title", "Measurement guides")}</h3>
              <p>{selectedGuide.summary}</p>
            </div>

            <label className="measurement-guide-select">
              <span>{copy(t, "measurement.guide.field", "Field")}</span>
              <select
                aria-label={copy(t, "measurement.guide.field.aria", "Measurement guide field")}
                value={selectedGuide.field}
                onChange={(event) => setSelectedGuideField(event.target.value)}
              >
                {guideOptions.map((option) => (
                  <option key={option.field} value={option.field}>
                    {option.label}
                  </option>
                ))}
              </select>
              <a
                className="button public-guide-link"
                href={publicMeasurementGuidePath(selectedGuide.field)}
              >
                {copy(t, "measurement.guide.public", "Public guide")}
              </a>
            </label>
          </div>

          <div
            className="measurement-guide-body"
            aria-label={copy(t, "measurement.guide.selected.aria", "Selected measurement guide")}
          >
            <div
              className={`guide-illustration guide-illustration--${selectedGuide.illustration}`}
              aria-hidden="true"
            >
              <i className="guide-head" />
              <i className="guide-torso" />
              <i className="guide-limb guide-limb-left" />
              <i className="guide-limb guide-limb-right" />
              <i className="guide-tape guide-tape-primary" />
              <i className="guide-tape guide-tape-secondary" />
              <i className="guide-wall" />
            </div>

            <div className="measurement-guide-copy">
              <div className="guide-meta">
                <strong>{selectedGuideLabel}</strong>
                <span>{selectedGuide.cadence}</span>
              </div>

              <div className="guide-list-grid">
                <div>
                  <h4>{copy(t, "measurement.guide.steps", "Steps")}</h4>
                  <ol>
                    {selectedGuide.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>

                {selectedGuide.commonMistakes.length ? (
                  <div>
                    <h4>{copy(t, "measurement.guide.commonMistakes", "Common mistakes")}</h4>
                    <ul>
                      {selectedGuide.commonMistakes.map((mistake) => (
                        <li key={mistake}>{mistake}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <form className="measurement-form" onSubmit={onSubmit}>
        {categoryGroups.map((group) => (
          <fieldset key={group.category} className="measurement-group">
            <legend>
              {copy(
                t,
                `measurement.category.${categoryKeyByName[group.category] || group.category}`,
                group.category
              )}
            </legend>

            <div className="measurement-group-fields">
              {group.fields.map((field) => {
                const localizedFieldLabel = fieldLabel(t, field);
                const localizedFieldHelp = fieldHelp(t, field);
                const resolvedUnitSystem = resolveFieldUnitSystem(
                  field.name,
                  globalUnitSystem,
                  fieldUnitOverrides
                );
                const hasOverride = Boolean(fieldUnitOverrides[field.name]);
                const isHighlighted = hoveredMeasurement === field.name;
                const errorId = `${field.name}-error`;
                const hasError = Boolean(errors[field.name]);

                return (
                  <label
                    key={field.name}
                    className={`field ${isHighlighted ? "is-highlighted" : ""}`}
                    onMouseEnter={() => onMeasurementHover?.(field.name)}
                    onMouseLeave={() => onMeasurementHover?.(null)}
                  >
                    <span className="field-label">
                      <span>
                        {localizedFieldLabel}
                        {field.help ? (
                          <span className="field-info">
                            i
                            <span className="field-tooltip" role="tooltip">
                              {localizedFieldHelp}
                            </span>
                          </span>
                        ) : null}
                      </span>
                    </span>

                    <span className="field-control-row">
                      {field.type === "select" ? (
                        <select
                          name={field.name}
                          value={formState[field.name]}
                          onChange={onChange}
                          onFocus={() => onMeasurementHover?.(field.name)}
                          onBlur={() => onMeasurementHover?.(null)}
                          aria-invalid={hasError ? "true" : undefined}
                          aria-describedby={hasError ? errorId : undefined}
                        >
                          {field.options.map((option) => (
                            <option key={option.value} value={option.value}>
                              {optionLabel(t, field, option)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          name={field.name}
                          type="number"
                          inputMode="decimal"
                          value={formState[field.name]}
                          onChange={onChange}
                          onFocus={() => onMeasurementHover?.(field.name)}
                          onBlur={() => {
                            onFieldBlur(field.name);
                            onMeasurementHover?.(null);
                          }}
                          aria-invalid={hasError ? "true" : undefined}
                          aria-describedby={hasError ? errorId : undefined}
                        />
                      )}

                      {field.unit ? (
                        <span
                          className={`field-unit-group ${
                            hasOverride ? "is-overridden" : ""
                          }`}
                        >
                          <div
                            className="mini-unit-toggle"
                            aria-label={copy(
                              t,
                              "measurement.fieldUnit.aria",
                              "{field} unit",
                              { field: localizedFieldLabel }
                            )}
                          >
                            <button
                              className={`button ${
                                resolvedUnitSystem === "metric" ? "is-active" : ""
                              }`}
                              type="button"
                              onClick={() => onFieldUnitChange(field.name, "metric")}
                            >
                              {getFieldUnitLabel(field.name, "metric")}
                            </button>
                            <button
                              className={`button ${
                                resolvedUnitSystem === "imperial" ? "is-active" : ""
                              }`}
                              type="button"
                              onClick={() => onFieldUnitChange(field.name, "imperial")}
                            >
                              {getFieldUnitLabel(field.name, "imperial")}
                            </button>
                          </div>
                          <button
                            className={`field-unit-reset ${
                              hasOverride ? "is-visible" : ""
                            }`}
                            type="button"
                            onClick={() => onFieldUnitReset(field.name)}
                            aria-label={copy(
                              t,
                              "measurement.resetUnit.aria",
                              "Reset {field} unit override",
                              { field: localizedFieldLabel }
                            )}
                            title={copy(
                              t,
                              "measurement.resetUnit.title",
                              "Reset to global unit setting"
                            )}
                          >
                            {"\u21BA"}
                          </button>
                        </span>
                      ) : null}
                    </span>

                    {hasError ? (
                      <span id={errorId} className="field-error" role="alert">
                        {errors[field.name]}
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </form>
    </section>
  );
}
