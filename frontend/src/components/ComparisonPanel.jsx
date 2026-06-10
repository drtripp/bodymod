import { useEffect, useMemo, useState } from "react";
import SilhouetteView from "./SilhouetteView";
import {
  buildMeasurementBandDiff,
  interpolateMeasurements,
  summarizeMeasurementDiff
} from "../lib/comparison";
import { downloadMorphShareCard } from "../lib/resultCard";
import { targetBuildProfile } from "../lib/targetFilters";

export default function ComparisonPanel({
  mode,
  onModeChange,
  selectedTarget,
  onTargetChange,
  rankedMatches,
  totalTargetCount = rankedMatches.length,
  targetFilters,
  targetFilterOptions,
  onTargetFilterChange,
  currentMeasurements,
  snapshotComparison,
  comparisonSnapshot
}) {
  const [morphPosition, setMorphPosition] = useState(50);
  const [isMorphPlaying, setIsMorphPlaying] = useState(false);
  const [morphShareStatus, setMorphShareStatus] = useState("");
  const targetComparison = selectedTarget
    ? summarizeMeasurementDiff(currentMeasurements, selectedTarget.measurements)
    : [];
  const targetBandDiff = selectedTarget
    ? buildMeasurementBandDiff(currentMeasurements, selectedTarget.measurements)
    : [];
  const targetSource = selectedTarget?.source_type
    ? selectedTarget.source_type.replace(/-/g, " ")
    : "target";
  const targetBuild = selectedTarget ? targetBuildProfile(selectedTarget) : null;
  const filters = targetFilters || { source: "all", sex: "all", build: "all" };
  const filterOptions = targetFilterOptions || { sources: [], sexes: [], builds: [] };
  const hasAnyTargets = totalTargetCount > 0;
  const morphMeasurements = useMemo(
    () =>
      selectedTarget
        ? interpolateMeasurements(
            currentMeasurements,
            selectedTarget.measurements,
            morphPosition / 100
          )
        : currentMeasurements,
    [currentMeasurements, morphPosition, selectedTarget]
  );

  useEffect(() => {
    if (mode !== "morph") {
      setIsMorphPlaying(false);
      return undefined;
    }

    if (!isMorphPlaying) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setMorphPosition((current) => (current >= 100 ? 0 : current + 5));
    }, 180);

    return () => window.clearInterval(intervalId);
  }, [isMorphPlaying, mode]);

  useEffect(() => {
    setMorphShareStatus("");
  }, [selectedTarget?.id]);

  function handleDownloadMorphCard() {
    if (!selectedTarget) {
      return;
    }

    downloadMorphShareCard(currentMeasurements, selectedTarget);
    setMorphShareStatus("Morph card downloaded.");
  }

  return (
    <section className="panel">
      {hasAnyTargets ? (
        <div className="comparison-toolbar">
          <div className="target-filter-grid" aria-label="Target filters">
            <label className="field compact-field">
              <span className="field-label">Source</span>
              <select
                aria-label="Target source filter"
                value={filters.source}
                onChange={(event) => onTargetFilterChange?.("source", event.target.value)}
              >
                <option value="all">All sources</option>
                {filterOptions.sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field compact-field">
              <span className="field-label">Sex</span>
              <select
                aria-label="Target sex filter"
                value={filters.sex}
                onChange={(event) => onTargetFilterChange?.("sex", event.target.value)}
              >
                <option value="all">All sexes</option>
                {filterOptions.sexes.map((sex) => (
                  <option key={sex.id} value={sex.id}>
                    {sex.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field compact-field">
              <span className="field-label">Build</span>
              <select
                aria-label="Target build filter"
                value={filters.build}
                onChange={(event) => onTargetFilterChange?.("build", event.target.value)}
              >
                <option value="all">All builds</option>
                {filterOptions.builds.map((build) => (
                  <option key={build.id} value={build.id}>
                    {build.label}
                  </option>
                ))}
              </select>
            </label>
            <span className="target-filter-count" aria-label="Filtered target count">
              {rankedMatches.length} of {totalTargetCount} targets
            </span>
          </div>
          {rankedMatches.length ? (
            <label className="field compact-field target-select-field">
              <span className="field-label">Target</span>
              <select value={selectedTarget?.id || ""} onChange={onTargetChange}>
                {rankedMatches.map((match) => (
                  <option key={match.id} value={match.id}>
                    {match.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
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
              <strong>
                {targetSource}
                {targetBuild ? ` / ${targetBuild.label}` : ""}
              </strong>
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
              className={`comparison-visual-stage ${
                mode === "morph"
                  ? "is-morph"
                  : mode === "overlap"
                    ? "is-overlap"
                    : "is-side-by-side"
              }`}
              aria-label={
                mode === "morph"
                  ? "Morph comparison"
                  : mode === "overlap"
                    ? "Overlap comparison"
                    : "Side by side comparison"
              }
            >
              {mode === "morph" ? (
                <div className="comparison-morph-preview">
                  <SilhouetteView
                    label={`${selectedTarget.label} morph preview`}
                    measurements={morphMeasurements}
                  />
                  <div className="morph-readout" aria-label="Morph progress readout">
                    <span>You</span>
                    <strong>{Math.round(morphPosition)}%</strong>
                    <span>{selectedTarget.label}</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="comparison-stage-layer stage-user">
                    <SilhouetteView label="You" measurements={currentMeasurements} />
                  </div>
                  <div className="comparison-stage-layer stage-target target-silhouette-card">
                    <SilhouetteView
                      label={selectedTarget.label}
                      measurements={selectedTarget.measurements}
                    />
                  </div>
                </>
              )}
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
                <button
                  className={`button ${mode === "morph" ? "is-active" : ""}`}
                  type="button"
                  onClick={() => onModeChange("morph")}
                >
                  Morph
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
          {mode === "morph" ? (
            <div className="morph-controls" aria-label="Morph animation controls">
              <button
                className="button"
                type="button"
                onClick={() => setIsMorphPlaying((current) => !current)}
              >
                {isMorphPlaying ? "Pause morph" : "Play morph"}
              </button>
              <label className="field">
                <span className="field-label">Morph position</span>
                <input
                  aria-label="Morph position"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={morphPosition}
                  onChange={(event) => setMorphPosition(Number(event.target.value))}
                />
              </label>
              <button className="button" type="button" onClick={handleDownloadMorphCard}>
                Download morph card
              </button>
              <small className="muted-text">
                Animated interpolation between current and target measurements; not anatomy.
              </small>
              {morphShareStatus ? <small className="muted-text">{morphShareStatus}</small> : null}
            </div>
          ) : null}
          {mode === "overlap" ? (
            <div className="measurement-band-diff" aria-label="Overlap difference regions">
              <div className="panel-header">
                <h3>Overlap difference regions</h3>
                <p>
                  Bands rank the largest current-vs-target measurement gaps.
                  They are not a surgical or anatomical diff.
                </p>
              </div>
              <ul>
                {targetBandDiff.map((item) => (
                  <li key={item.key} className={`band-diff-row diff-${item.direction}`}>
                    <span>{item.label}</span>
                    <div className="band-diff-track" aria-hidden="true">
                      <i style={{ width: `${Math.max(4, item.magnitudePercent)}%` }} />
                    </div>
                    <strong>
                      {item.delta > 0 ? "+" : ""}
                      {item.delta.toFixed(1)} {item.unit}
                    </strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <p className="muted-text">
          {hasAnyTargets
            ? "No targets match the active filters."
            : "Target comparison is available once target profiles are loaded."}
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
