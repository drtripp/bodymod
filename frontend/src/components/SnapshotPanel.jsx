import { comparisonMetrics, summarizeSnapshotTrend } from "../lib/comparison";

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

const chartMetricKeys = [
  "weight",
  "waistCircumference",
  "bideltoidCircumference",
  "hipCircumference"
];

const chartMetrics = comparisonMetrics.filter(([key]) => chartMetricKeys.includes(key));

function buildTrendChart(snapshots) {
  if (!Array.isArray(snapshots) || snapshots.length < 2) {
    return null;
  }

  const orderedSnapshots = snapshots.slice().reverse();
  const width = 360;
  const height = 150;
  const padding = 18;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const series = chartMetrics.map(([key, label, unit], seriesIndex) => {
    const values = orderedSnapshots.map((snapshot) => Number(snapshot.measurements[key]));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const points = values.map((value, index) => {
      const x =
        padding +
        (orderedSnapshots.length === 1 ? innerWidth / 2 : (index / (orderedSnapshots.length - 1)) * innerWidth);
      const y = padding + innerHeight - ((value - min) / range) * innerHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return {
      key,
      label,
      unit,
      seriesIndex,
      points: points.join(" "),
      latest: values[values.length - 1]
    };
  });

  return { width, height, series };
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
  const trend = summarizeSnapshotTrend(snapshots);
  const trendChart = buildTrendChart(snapshots);

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
                    {series.label}: {series.latest.toFixed(1)} {series.unit}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
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
