import { useEffect, useMemo, useState } from "react";
import SilhouetteView, { SilhouetteViewToggle } from "./SilhouetteView";
import {
  buildMeasurementBandDiff,
  interpolateMeasurements,
  summarizeMeasurementDiff
} from "../lib/comparison";
import { createTranslator } from "../lib/i18n";
import { downloadMorphShareCard } from "../lib/resultCard";
import { targetBuildProfile } from "../lib/targetFilters";

function comparisonMetricLabel(key, fallback, t) {
  return t(`comparison.metric.${key}`, {}, fallback);
}

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
  comparisonSnapshot,
  locale = "en",
  silhouetteView = "front",
  onSilhouetteViewChange
}) {
  const t = createTranslator(locale);
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
  const silhouetteViewLabels = {
    front: t("silhouette.view.front"),
    side: t("silhouette.view.side")
  };
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
    setMorphShareStatus(t("comparison.morph.cardDownloaded"));
  }

  return (
    <section className="panel">
      {hasAnyTargets ? (
        <div className="comparison-toolbar">
          <div className="target-filter-grid" aria-label={t("comparison.filtersAria")}>
            <label className="field compact-field">
              <span className="field-label">{t("comparison.source")}</span>
              <select
                aria-label={t("comparison.sourceFilterAria")}
                value={filters.source}
                onChange={(event) => onTargetFilterChange?.("source", event.target.value)}
              >
                <option value="all">{t("comparison.allSources")}</option>
                {filterOptions.sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field compact-field">
              <span className="field-label">{t("comparison.sex")}</span>
              <select
                aria-label={t("comparison.sexFilterAria")}
                value={filters.sex}
                onChange={(event) => onTargetFilterChange?.("sex", event.target.value)}
              >
                <option value="all">{t("comparison.allSexes")}</option>
                {filterOptions.sexes.map((sex) => (
                  <option key={sex.id} value={sex.id}>
                    {sex.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field compact-field">
              <span className="field-label">{t("comparison.build")}</span>
              <select
                aria-label={t("comparison.buildFilterAria")}
                value={filters.build}
                onChange={(event) => onTargetFilterChange?.("build", event.target.value)}
              >
                <option value="all">{t("comparison.allBuilds")}</option>
                {filterOptions.builds.map((build) => (
                  <option key={build.id} value={build.id}>
                    {build.label}
                  </option>
                ))}
              </select>
            </label>
            <span className="target-filter-count" aria-label={t("comparison.filteredCountAria")}>
              {t("comparison.filteredCount", {
                count: rankedMatches.length,
                total: totalTargetCount
              })}
            </span>
          </div>
          {rankedMatches.length ? (
            <label className="field compact-field target-select-field">
              <span className="field-label">{t("comparison.target")}</span>
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
          <div className="target-metadata" aria-label={t("comparison.metadataAria")}>
            <div>
              <span>{t("comparison.targetProfile")}</span>
              <strong>{selectedTarget.label}</strong>
            </div>
            <div>
              <span>{t("comparison.type")}</span>
              <strong>
                {targetSource}
                {targetBuild ? ` / ${targetBuild.label}` : ""}
              </strong>
            </div>
            <p>{selectedTarget.notes || t("comparison.noSourceNote")}</p>
          </div>

          {selectedTarget.explanation?.length ? (
            <div className="target-explanation" aria-label={t("comparison.explanationAria")}>
              <h3>{t("comparison.largestDrivers")}</h3>
              <ul>
                {selectedTarget.explanation.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="comparison-view-row">
            <SilhouetteViewToggle
              view={silhouetteView}
              onViewChange={onSilhouetteViewChange}
              label={t("comparison.silhouetteViewAria")}
              optionLabels={silhouetteViewLabels}
            />
          </div>

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
                  ? t("comparison.mode.morphAria")
                  : mode === "overlap"
                    ? t("comparison.mode.overlapAria")
                    : t("comparison.mode.sideBySideAria")
              }
            >
              {mode === "morph" ? (
                <div className="comparison-morph-preview">
                  <SilhouetteView
                    label={`${selectedTarget.label} morph preview`}
                    measurements={morphMeasurements}
                    view={silhouetteView}
                  />
                  <div className="morph-readout" aria-label={t("comparison.morph.readoutAria")}>
                    <span>{t("comparison.you")}</span>
                    <strong>{Math.round(morphPosition)}%</strong>
                    <span>{selectedTarget.label}</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="comparison-stage-layer stage-user">
                    <SilhouetteView
                      label={t("comparison.you")}
                      measurements={currentMeasurements}
                      view={silhouetteView}
                    />
                  </div>
                  <div className="comparison-stage-layer stage-target target-silhouette-card">
                    <SilhouetteView
                      label={selectedTarget.label}
                      measurements={selectedTarget.measurements}
                      view={silhouetteView}
                    />
                  </div>
                </>
              )}
              <div className="comparison-mode-controls" role="tablist" aria-label={t("comparison.modeAria")}>
                <button
                  className={`button ${mode === "side-by-side" ? "is-active" : ""}`}
                  type="button"
                  onClick={() => onModeChange("side-by-side")}
                >
                  {t("comparison.mode.sideBySide")}
                </button>
                <button
                  className={`button ${mode === "overlap" ? "is-active" : ""}`}
                  type="button"
                  onClick={() => onModeChange("overlap")}
                >
                  {t("comparison.mode.overlap")}
                </button>
                <button
                  className={`button ${mode === "morph" ? "is-active" : ""}`}
                  type="button"
                  onClick={() => onModeChange("morph")}
                >
                  {t("comparison.mode.morph")}
                </button>
              </div>
              <div className="legend">
                <span className="legend-item">
                  <span className="legend-swatch legend-user" />
                  {t("comparison.you")}
                </span>
                <span className="legend-item">
                  <span className="legend-swatch legend-target" />
                  {t("comparison.targetLegend")}
                </span>
              </div>
            </div>
            <div className="comparison-diff-card" aria-label={t("comparison.diffAria")}>
              <table className="comparison-diff-table">
                <thead>
                  <tr>
                    <th>{t("comparison.table.metric")}</th>
                    <th>{t("comparison.table.you")}</th>
                    <th>{t("comparison.table.target")}</th>
                    <th>{t("comparison.table.diff")}</th>
                  </tr>
                </thead>
                <tbody>
                  {targetComparison.map((item) => (
                    <tr key={item.key} className={`diff-${item.direction}`}>
                      <th scope="row">{comparisonMetricLabel(item.key, item.label, t)}</th>
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
            <div className="morph-controls" aria-label={t("comparison.morph.controlsAria")}>
              <button
                className="button"
                type="button"
                onClick={() => setIsMorphPlaying((current) => !current)}
              >
                {isMorphPlaying ? t("comparison.morph.pause") : t("comparison.morph.play")}
              </button>
              <label className="field">
                <span className="field-label">{t("comparison.morph.position")}</span>
                <input
                  aria-label={t("comparison.morph.position")}
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={morphPosition}
                  onChange={(event) => setMorphPosition(Number(event.target.value))}
                />
              </label>
              <button className="button" type="button" onClick={handleDownloadMorphCard}>
                {t("comparison.morph.download")}
              </button>
              <small className="muted-text">
                {t("comparison.morph.note")}
              </small>
              {morphShareStatus ? <small className="muted-text">{morphShareStatus}</small> : null}
            </div>
          ) : null}
          {mode === "overlap" ? (
            <div className="measurement-band-diff" aria-label={t("comparison.overlap.aria")}>
              <div className="panel-header">
                <h3>{t("comparison.overlap.title")}</h3>
                <p>
                  {t("comparison.overlap.body")}
                </p>
              </div>
              <ul>
                {targetBandDiff.map((item) => (
                  <li key={item.key} className={`band-diff-row diff-${item.direction}`}>
                    <span>{comparisonMetricLabel(item.key, item.label, t)}</span>
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
            ? t("comparison.noFilteredTargets")
            : t("comparison.noTargets")}
        </p>
      )}

      {comparisonSnapshot ? (
        <div className="snapshot-visual-compare" aria-label={t("comparison.snapshotSilhouettesAria")}>
          <h3>{t("comparison.snapshotSilhouettesTitle")}</h3>
          <div className="snapshot-silhouette-grid">
            <SilhouetteView
              label={t("comparison.currentSnapshotComparison")}
              measurements={currentMeasurements}
              view={silhouetteView}
            />
            <div className="prior-snapshot-card">
              <SilhouetteView
                label={comparisonSnapshot.label || "Selected snapshot"}
                measurements={comparisonSnapshot.measurements}
                view={silhouetteView}
              />
            </div>
          </div>
        </div>
      ) : null}

      {snapshotComparison?.length ? (
        <div className="snapshot-diff">
          <h3>{t("comparison.currentVsSnapshot")}</h3>
          <ul>
            {snapshotComparison.map((item) => (
              <li key={item.key} className={`diff-row diff-${item.direction}`}>
                <span>{comparisonMetricLabel(item.key, item.label, t)}</span>
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
