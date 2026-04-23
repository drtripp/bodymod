import { measurementFields } from "../lib/measurements";

export default function MeasurementForm({
  formState,
  errors,
  onChange,
  onSubmit,
  isLoading
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Measurements</h2>
        <p>Enter the core values for the current comparison.</p>
      </div>

      <form className="measurement-form" onSubmit={onSubmit}>
        {measurementFields.map((field) => (
          <label key={field.name} className="field">
            <span className="field-label">
              {field.label}
              {field.unit ? <span className="field-unit">{field.unit}</span> : null}
            </span>

            {field.type === "select" ? (
              <select
                name={field.name}
                value={formState[field.name]}
                onChange={onChange}
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
              />
            )}

            {errors[field.name] ? (
              <span className="field-error">{errors[field.name]}</span>
            ) : null}
          </label>
        ))}

        <button className="button" type="submit" disabled={isLoading}>
          {isLoading ? "Calculating..." : "Compare"}
        </button>
      </form>
    </section>
  );
}
