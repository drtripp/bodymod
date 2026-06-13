import { useState } from "react";
import { comparisonMetrics, summarizeSnapshotTrend } from "../lib/comparison";
import { createTranslator } from "../lib/i18n";
import {
  buildSnapshotHistoryChart,
  buildSnapshotTrendChart,
  snapshotHistoryMetricOptions,
  snapshotHistoryRangeOptions
} from "../lib/snapshotTrends";

function formatTimestamp(timestamp, locale) {
  return new Intl.DateTimeFormat(locale || undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(timestamp));
}

function formatDelta(delta, unit) {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)} ${unit}`;
}

function comparisonMetricLabel(key, fallback, t) {
  return t(`comparison.metric.${key}`, {}, fallback);
}

function rangeLabel(range, t) {
  return t(`snapshot.range.${range.id}`, {}, range.label);
}

function formatMeasurements(measurements, t) {
  const waist = measurements.waistCircumference ?? measurements.waist;
  const sexLabel = t(`snapshot.sex.${measurements.sex}`, {}, measurements.sex);

  return [
    `${measurements.height} cm`,
    `${measurements.weight} kg`,
    sexLabel,
    t("snapshot.measurementSummary.waist", { waist })
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
  importStatus,
  locale = "en"
}) {
  const t = createTranslator(locale);
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
        <h2>{t("snapshot.title")}</h2>
        <p>{t("snapshot.body")}</p>
      </div>

      <div className="snapshot-actions">
        <label className="field compact-field">
          <span className="field-label">{t("snapshot.optionalLabel")}</span>
          <input
            aria-label={t("snapshot.labelAria")}
            value={snapshotLabel}
            onChange={(event) => onSnapshotLabelChange(event.target.value)}
          />
        </label>
        <label className="field compact-field snapshot-note-field">
          <span className="field-label">{t("snapshot.optionalNote")}</span>
          <textarea
            aria-label={t("snapshot.noteAria")}
            value={snapshotNote}
            onChange={(event) => onSnapshotNoteChange(event.target.value)}
          />
        </label>
        <button className="button" type="button" onClick={onSaveSnapshot}>
          {t("snapshot.save")}
        </button>
        <button
          className="button"
          type="button"
          onClick={onExportSnapshots}
          disabled={!snapshots.length}
        >
          {t("snapshot.export")}
        </button>
        <label className="button file-button">
          {t("snapshot.import")}
          <input
            aria-label={t("snapshot.importAria")}
            type="file"
            accept="application/json,.json"
            onChange={onImportSnapshots}
          />
        </label>
      </div>
      {importStatus ? <p className="muted-text">{importStatus}</p> : null}

      {trend ? (
        <div className="snapshot-trend" aria-label={t("snapshot.trendAria")}>
          <h3>
            {t("snapshot.trendSince", {
              label: trend.baseline.label || formatTimestamp(trend.baseline.createdAt, locale)
            })}
          </h3>
          <ul>
            {trend.metrics
              .filter((metric) => ["weight", "waistCircumference", "bideltoidCircumference", "hipCircumference"].includes(metric.key))
              .map((metric) => (
                <li key={metric.key} className={`diff-${metric.direction}`}>
                  <span>{comparisonMetricLabel(metric.key, metric.label, t)}</span>
                  <strong>{formatDelta(metric.delta, metric.unit)}</strong>
                </li>
              ))}
          </ul>
          {trendChart ? (
            <div className="snapshot-chart" aria-label={t("snapshot.trendChartAria")}>
              <svg
                viewBox={`0 0 ${trendChart.width} ${trendChart.height}`}
                role="img"
                aria-label={t("snapshot.trendChartLinesAria")}
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
                    {t("snapshot.chartLegendLatest", {
                      label: comparisonMetricLabel(series.key, series.label, t),
                      value: series.latest.toFixed(1),
                      unit: series.unit,
                      noise: series.noiseLabel
                    })}
                  </span>
                ))}
              </div>
              <p className="muted-text">{t("snapshot.noiseCopy")}</p>
            </div>
          ) : null}
          <div className="snapshot-history" aria-label={t("snapshot.historyAria")}>
            <div className="snapshot-history-controls">
              <label className="field">
                <span className="field-label">{t("snapshot.historyMetric")}</span>
                <select
                  aria-label={t("snapshot.historyMetricAria")}
                  value={historyMetric}
                  onChange={(event) => setHistoryMetric(event.target.value)}
                >
                  {snapshotHistoryMetricOptions.map((metric) => (
                    <option key={metric.key} value={metric.key}>
                      {comparisonMetricLabel(metric.key, metric.label, t)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">{t("snapshot.range")}</span>
                <select
                  aria-label={t("snapshot.rangeAria")}
                  value={historyRange}
                  onChange={(event) => setHistoryRange(event.target.value)}
                >
                  {snapshotHistoryRangeOptions.map((range) => (
                    <option key={range.id} value={range.id}>
                      {rangeLabel(range, t)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {historyChart ? (
              <div className="snapshot-history-chart">
                <div className="snapshot-history-summary">
                  <strong>
                    {comparisonMetricLabel(historyChart.metricKey, historyChart.label, t)}:{" "}
                    {formatDelta(historyChart.delta, historyChart.unit)}
                  </strong>
                  <span>
                    {t("snapshot.historySummary", {
                      count: historyChart.count,
                      range: rangeLabel({ id: historyRange, label: historyChart.rangeLabel }, t),
                      noise: historyChart.noiseLabel
                    })}
                  </span>
                </div>
                <svg
                  viewBox={`0 0 ${historyChart.width} ${historyChart.height}`}
                  role="img"
                  aria-label={t("snapshot.historyChartAria", {
                    label: comparisonMetricLabel(historyChart.metricKey, historyChart.label, t)
                  })}
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
                        {t("snapshot.pointTitle", {
                          value: point.value.toFixed(1),
                          unit: historyChart.unit,
                          date: formatTimestamp(point.createdAt, locale)
                        })}
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
                  <ul className="snapshot-annotation-list" aria-label={t("snapshot.noteAnnotationsAria")}>
                    {historyChart.notePoints.map((point) => (
                      <li key={point.id}>
                        <strong>{point.label || formatTimestamp(point.createdAt, locale)}</strong>
                        <span>{point.note}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted-text">{t("snapshot.addNotes")}</p>
                )}
              </div>
            ) : (
              <p className="muted-text">{t("snapshot.needTwo")}</p>
            )}
          </div>
        </div>
      ) : null}

      {snapshots.length ? (
        <ul className="snapshot-list">
          {snapshots.map((snapshot) => (
            <li key={snapshot.id} className="snapshot-row">
              <div className="snapshot-copy">
                <strong>{snapshot.label || formatTimestamp(snapshot.createdAt, locale)}</strong>
                {snapshot.label ? <span>{formatTimestamp(snapshot.createdAt, locale)}</span> : null}
                <span>{formatMeasurements(snapshot.measurements, t)}</span>
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
                  {t("snapshot.compare")}
                </button>
                <button
                  className="button"
                  type="button"
                  onClick={() => onLoadSnapshot(snapshot.id)}
                >
                  {t("snapshot.load")}
                </button>
                <button
                  className="button"
                  type="button"
                  onClick={() => onDeleteSnapshot(snapshot.id)}
                >
                  {t("snapshot.delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted-text">{t("snapshot.empty")}</p>
      )}
    </section>
  );
}
