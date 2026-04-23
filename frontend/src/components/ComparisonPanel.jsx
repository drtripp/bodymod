import SilhouetteView from "./SilhouetteView";

export default function ComparisonPanel({
  mode,
  onModeChange,
  selectedTarget,
  onTargetChange,
  rankedMatches,
  currentMeasurements
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Comparison</h2>
        <p>Compare your current measurements against a selected target.</p>
      </div>

      <div className="comparison-toolbar">
        <div className="button-row" role="tablist" aria-label="Comparison mode">
          <button
            className={`button ${mode === "side-by-side" ? "is-active" : ""}`}
            type="button"
            onClick={() => onModeChange("side-by-side")}
          >
            Side by side
          </button>
          <button
            className={`button ${mode === "overlap" ? "is-active" : ""}`}
            type="button"
            onClick={() => onModeChange("overlap")}
          >
            Overlap
          </button>
        </div>

        <label className="field compact-field">
          <span className="field-label">Target</span>
          <select value={selectedTarget?.id || ""} onChange={onTargetChange}>
            {rankedMatches.map((match) => (
              <option key={match.id} value={match.id}>
                {match.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedTarget ? (
        mode === "side-by-side" ? (
          <div className="comparison-grid">
            <SilhouetteView label="You" measurements={currentMeasurements} />
            <SilhouetteView
              label={selectedTarget.label}
              measurements={selectedTarget.measurements}
            />
          </div>
        ) : (
          <div className="overlap-panel">
            <div className="overlap-canvas" aria-label="Overlap comparison">
              <div className="overlap-stack">
                <div className="overlap-layer">
                  <SilhouetteView label="You" measurements={currentMeasurements} />
                </div>
                <div className="overlap-layer overlap-layer-target">
                  <SilhouetteView
                    label={selectedTarget.label}
                    measurements={selectedTarget.measurements}
                  />
                </div>
              </div>
            </div>
            <div className="legend">
              <span className="legend-item">
                <span className="legend-swatch legend-user" />
                You
              </span>
              <span className="legend-item">
                <span className="legend-swatch legend-target" />
                Target
              </span>
            </div>
          </div>
        )
      ) : (
        <p className="muted-text">No target selected yet.</p>
      )}
    </section>
  );
}
