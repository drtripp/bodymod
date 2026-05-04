import { measurementCategories, measurementFields } from "../lib/measurements";
import { getFieldUnitLabel, resolveFieldUnitSystem } from "../lib/units";

function buildCategoryGroups() {
  return measurementCategories
    .map((category) => ({
      category,
      fields: measurementFields.filter((field) => field.category === category)
    }))
    .filter((group) => group.fields.length);
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
  onMeasurementHover
}) {
  const categoryGroups = buildCategoryGroups();

  return (
    <section className="panel">
      <div className="panel-header panel-header-row">
        <div>
          <h2>Measurements</h2>
          <p>Enter the core values for the current comparison. Results update live.</p>
        </div>

        <div className="unit-toggle" aria-label="Measurement unit system">
          <button
            className={`button ${globalUnitSystem === "metric" ? "is-active" : ""}`}
            type="button"
            onClick={() => onGlobalUnitChange("metric")}
          >
            Metric
          </button>
          <button
            className={`button ${globalUnitSystem === "imperial" ? "is-active" : ""}`}
            type="button"
            onClick={() => onGlobalUnitChange("imperial")}
          >
            Imperial
          </button>
        </div>
      </div>

      <form className="measurement-form" onSubmit={onSubmit}>
        {categoryGroups.map((group) => (
          <fieldset key={group.category} className="measurement-group">
            <legend>{group.category}</legend>

            <div className="measurement-group-fields">
              {group.fields.map((field) => {
                const resolvedUnitSystem = resolveFieldUnitSystem(
                  field.name,
                  globalUnitSystem,
                  fieldUnitOverrides
                );
                const hasOverride = Boolean(fieldUnitOverrides[field.name]);
                const isHighlighted = hoveredMeasurement === field.name;

                return (
                  <label
                    key={field.name}
                    className={`field ${isHighlighted ? "is-highlighted" : ""}`}
                    onMouseEnter={() => onMeasurementHover?.(field.name)}
                    onMouseLeave={() => onMeasurementHover?.(null)}
                  >
                    <span className="field-label">
                      <span>
                        {field.label}
                        {field.help ? (
                          <span className="field-info">
                            i
                            <span className="field-tooltip" role="tooltip">
                              {field.help}
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
                        >
                          {field.options.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
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
                            aria-label={`${field.label} unit`}
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
                            aria-label={`Reset ${field.label} unit override`}
                            title="Reset to global unit setting"
                          >
                            {"\u21BA"}
                          </button>
                        </span>
                      ) : null}
                    </span>

                    {errors[field.name] ? (
                      <span className="field-error">{errors[field.name]}</span>
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
