import SilhouetteView from "./SilhouetteView";
import { summarizeMeasurementDiff } from "../lib/comparison";

export default function ComparisonPanel({
  mode,
  onModeChange,
  selectedTarget,
  onTargetChange,
  rankedMatches,
  currentMeasurements,
  snapshotComparison,
  comparisonSnapshot
}) {
  const targetComparison = selectedTarget
    ? summarizeMeasurementDiff(currentMeasurements, selectedTarget.measurements)
    : [];
  const targetSource = selectedTarget?.source_type
    ? selectedTarget.source_type.replace(/-/g, " ")
    : "target";

  return (
    <section className="panel">
      {rankedMatches.length ? (
        <div className="comparison-toolbar">
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
      ) : null}

      {selectedTarget ? (
        <>
          <div className="target-metadata" aria-label="Selected target metadata">
            <div>
              <span>Target profile</span>
              <strong>{selectedTarget.label}</strong>
            </div>
            <div>
              <span>Type</span>
              <strong>{targetSource}</strong>
            </div>
            <p>{selectedTarget.notes || "No source note captured for this profile."}</p>
          </div>

          {selectedTarget.explanation?.length ? (
            <div className="target-explanation" aria-label="Target match explanation">
              <h3>Largest score drivers</h3>
              <ul>
                {selectedTarget.explanation.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="comparison-grid">
            <div
              className={`comparison-visual-stage ${mode === "overlap" ? "is-overlap" : "is-side-by-side"}`}
              aria-label={mode === "overlap" ? "Overlap comparison" : "Side by side comparison"}
            >
              <div className="comparison-stage-layer stage-user">
                <SilhouetteView label="You" measurements={currentMeasurements} />
              </div>
              <div className="comparison-stage-layer stage-target target-silhouette-card">
                <SilhouetteView
                  label={selectedTarget.label}
                  measurements={selectedTarget.measurements}
                />
              </div>
              <div className="comparison-mode-controls" role="tablist" aria-label="Comparison mode">
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
            <div className="comparison-diff-card" aria-label="Target measurement difference">
              <table className="comparison-diff-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>You</th>
                    <th>Target</th>
                    <th>Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {targetComparison.map((item) => (
                    <tr key={item.key} className={`diff-${item.direction}`}>
                      <th scope="row">{item.label}</th>
                      <td>{item.currentValue.toFixed(1)} {item.unit}</td>
                      <td>{item.baselineValue.toFixed(1)} {item.unit}</td>
                      <td>
                        <strong>
                          {item.delta > 0 ? "+" : ""}
                          {item.delta.toFixed(1)} {item.unit}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {mode === "overlap" ? (
            <p className="muted-text comparison-mode-note">
              Overlap mode shows relative outline position only. It is not a
              surgical or anatomical diff.
            </p>
          ) : null}
        </>
      ) : (
        <p className="muted-text">
          Target comparison is available once target profiles are loaded.
        </p>
      )}

      {comparisonSnapshot ? (
        <div className="snapshot-visual-compare" aria-label="Current vs selected snapshot silhouettes">
          <h3>Snapshot silhouettes</h3>
          <div className="snapshot-silhouette-grid">
            <SilhouetteView label="Current snapshot comparison" measurements={currentMeasurements} />
            <div className="prior-snapshot-card">
              <SilhouetteView
                label={comparisonSnapshot.label || "Selected snapshot"}
                measurements={comparisonSnapshot.measurements}
              />
            </div>
          </div>
        </div>
      ) : null}

      {snapshotComparison?.length ? (
        <div className="snapshot-diff">
          <h3>Current vs selected snapshot</h3>
          <ul>
            {snapshotComparison.map((item) => (
              <li key={item.key} className={`diff-row diff-${item.direction}`}>
                <span>{item.label}</span>
                <strong>
                  {item.delta > 0 ? "+" : ""}
                  {item.delta.toFixed(1)} {item.unit}
                </strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
