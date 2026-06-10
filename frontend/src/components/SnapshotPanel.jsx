import { useState } from "react";
import { comparisonMetrics, summarizeSnapshotTrend } from "../lib/comparison";
import {
  buildSnapshotHistoryChart,
  buildSnapshotTrendChart,
  snapshotHistoryMetricOptions,
  snapshotHistoryRangeOptions
} from "../lib/snapshotTrends";

function formatTimestamp(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(timestamp));
}

function formatDelta(delta, unit) {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)} ${unit}`;
}

function formatMeasurements(measurements) {
  const waist = measurements.waistCircumference ?? measurements.waist;

  return [
    `${measurements.height} cm`,
    `${measurements.weight} kg`,
    measurements.sex,
    `waist ${waist}`
  ].join(" / ");
}

export default function SnapshotPanel({
  snapshotLabel,
  onSnapshotLabelChange,
  snapshotNote,
  onSnapshotNoteChange,
  snapshots,
  onSaveSnapshot,
  onLoadSnapshot,
  onDeleteSnapshot,
  comparisonSnapshotId,
  onCompareSnapshot,
  onExportSnapshots,
  onImportSnapshots,
  importStatus
}) {
  const [historyMetric, setHistoryMetric] = useState("weight");
  const [historyRange, setHistoryRange] = useState("all");
  const trend = summarizeSnapshotTrend(snapshots);
  const trendChart = buildSnapshotTrendChart(snapshots);
  const historyChart = buildSnapshotHistoryChart(snapshots, {
    metricKey: historyMetric,
    rangeId: historyRange
  });

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Snapshots</h2>
        <p>Save the current measurements locally and restore earlier entries later.</p>
      </div>

      <div className="snapshot-actions">
        <label className="field compact-field">
          <span className="field-label">Optional label</span>
          <input
            aria-label="Snapshot label"
            value={snapshotLabel}
            onChange={(event) => onSnapshotLabelChange(event.target.value)}
          />
        </label>
        <label className="field compact-field snapshot-note-field">
          <span className="field-label">Optional note</span>
          <textarea
            aria-label="Snapshot note"
            value={snapshotNote}
            onChange={(event) => onSnapshotNoteChange(event.target.value)}
          />
        </label>
        <button className="button" type="button" onClick={onSaveSnapshot}>
          Save current snapshot
        </button>
        <button
          className="button"
          type="button"
          onClick={onExportSnapshots}
          disabled={!snapshots.length}
        >
          Export
        </button>
        <label className="button file-button">
          Import
          <input
            aria-label="Import snapshots"
            type="file"
            accept="application/json,.json"
            onChange={onImportSnapshots}
          />
        </label>
      </div>
      {importStatus ? <p className="muted-text">{importStatus}</p> : null}

      {trend ? (
        <div className="snapshot-trend" aria-label="Snapshot trend summary">
          <h3>Trend since {trend.baseline.label || formatTimestamp(trend.baseline.createdAt)}</h3>
          <ul>
            {trend.metrics
              .filter((metric) => ["weight", "waistCircumference", "bideltoidCircumference", "hipCircumference"].includes(metric.key))
              .map((metric) => (
                <li key={metric.key} className={`diff-${metric.direction}`}>
                  <span>{metric.label}</span>
                  <strong>{formatDelta(metric.delta, metric.unit)}</strong>
                </li>
              ))}
          </ul>
          {trendChart ? (
            <div className="snapshot-chart" aria-label="Snapshot trend chart">
              <svg
                viewBox={`0 0 ${trendChart.width} ${trendChart.height}`}
                role="img"
                aria-label="Snapshot trend chart lines"
              >
                <line x1="18" y1="18" x2="18" y2="132" />
                <line x1="18" y1="132" x2="342" y2="132" />
                {trendChart.series.map((series) => (
                  <path
                    key={`${series.key}-noise`}
                    className={`snapshot-chart-noise noise-${series.seriesIndex}`}
                    d={series.noiseBandPath}
                  />
                ))}
                {trendChart.series.map((series) => (
                  <polyline
                    key={series.key}
                    className={`snapshot-chart-line line-${series.seriesIndex}`}
                    points={series.points}
                  />
                ))}
              </svg>
              <div className="snapshot-chart-legend">
                {trendChart.series.map((series) => (
                  <span key={series.key}>
                    <i className={`line-${series.seriesIndex}`} />
                    {series.label}: {series.latest.toFixed(1)} {series.unit} ({series.noiseLabel})
                  </span>
                ))}
              </div>
              <p className="muted-text">Bands show typical re-measurement noise, not a target range.</p>
            </div>
          ) : null}
          <div className="snapshot-history" aria-label="Snapshot metric history">
            <div className="snapshot-history-controls">
              <label className="field">
                <span className="field-label">History metric</span>
                <select
                  aria-label="Snapshot history metric"
                  value={historyMetric}
                  onChange={(event) => setHistoryMetric(event.target.value)}
                >
                  {snapshotHistoryMetricOptions.map((metric) => (
                    <option key={metric.key} value={metric.key}>
                      {metric.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Range</span>
                <select
                  aria-label="Snapshot history range"
                  value={historyRange}
                  onChange={(event) => setHistoryRange(event.target.value)}
                >
                  {snapshotHistoryRangeOptions.map((range) => (
                    <option key={range.id} value={range.id}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {historyChart ? (
              <div className="snapshot-history-chart">
                <div className="snapshot-history-summary">
                  <strong>
                    {historyChart.label}: {formatDelta(historyChart.delta, historyChart.unit)}
                  </strong>
                  <span>
                    {historyChart.count} snapshot(s), {historyChart.rangeLabel}; {historyChart.noiseLabel} typical noise
                  </span>
                </div>
                <svg
                  viewBox={`0 0 ${historyChart.width} ${historyChart.height}`}
                  role="img"
                  aria-label={`${historyChart.label} snapshot history chart`}
                >
                  <line x1="18" y1="18" x2="18" y2="132" />
                  <line x1="18" y1="132" x2="342" y2="132" />
                  <path className="snapshot-chart-noise noise-0" d={historyChart.noiseBandPath} />
                  <polyline className="snapshot-chart-line line-0" points={historyChart.pointString} />
                  {historyChart.points.map((point) => (
                    <circle
                      key={point.id}
                      className="snapshot-history-point"
                      cx={point.x}
                      cy={point.y}
                      r="2.4"
                    >
                      <title>
                        {`${point.value.toFixed(1)} ${historyChart.unit} on ${formatTimestamp(point.createdAt)}`}
                      </title>
                    </circle>
                  ))}
                  {historyChart.notePoints.map((point) => (
                    <circle
                      key={`${point.id}-note`}
                      className="snapshot-history-note"
                      cx={point.x}
                      cy={point.y}
                      r="4.2"
                    >
                      <title>{point.note}</title>
                    </circle>
                  ))}
                </svg>
                {historyChart.notePoints.length ? (
                  <ul className="snapshot-annotation-list" aria-label="Snapshot note annotations">
                    {historyChart.notePoints.map((point) => (
                      <li key={point.id}>
                        <strong>{point.label || formatTimestamp(point.createdAt)}</strong>
                        <span>{point.note}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted-text">Add snapshot notes to annotate this history chart.</p>
                )}
              </div>
            ) : (
              <p className="muted-text">Save at least two snapshots with this metric to build a history chart.</p>
            )}
          </div>
        </div>
      ) : null}

      {snapshots.length ? (
        <ul className="snapshot-list">
          {snapshots.map((snapshot) => (
            <li key={snapshot.id} className="snapshot-row">
              <div className="snapshot-copy">
                <strong>{snapshot.label || formatTimestamp(snapshot.createdAt)}</strong>
                {snapshot.label ? <span>{formatTimestamp(snapshot.createdAt)}</span> : null}
                <span>{formatMeasurements(snapshot.measurements)}</span>
                {snapshot.note ? <p>{snapshot.note}</p> : null}
              </div>
              <div className="button-row">
                <button
                  className={`button ${
                    comparisonSnapshotId === snapshot.id ? "is-active" : ""
                  }`}
                  type="button"
                  onClick={() => onCompareSnapshot(snapshot.id)}
                >
                  Compare
                </button>
                <button
                  className="button"
                  type="button"
                  onClick={() => onLoadSnapshot(snapshot.id)}
                >
                  Load
                </button>
                <button
                  className="button"
                  type="button"
                  onClick={() => onDeleteSnapshot(snapshot.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted-text">No saved snapshots yet.</p>
      )}
    </section>
  );
}
