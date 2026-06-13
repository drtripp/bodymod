import { useId, useMemo, useState } from "react";
import {
  aggregateGenderScore,
  buildPopulationMetrics,
  buildGenderScoreRows,
  buildScatterPoints,
  clampMetricValue,
  genderScoreLabel,
  getPopulationMetric,
  metricSexScore,
  normalPdf,
  populationMetricValue
} from "../lib/populationCharts";
import { createTranslator } from "../lib/i18n";

const sexStyles = {
  female: {
    label: "Female",
    color: "#d777a8",
    band: "rgba(215, 119, 168, 0.18)"
  },
  male: {
    label: "Male",
    color: "#6fb6ff",
    band: "rgba(111, 182, 255, 0.18)"
  }
};

function scale(value, min, max, outMin, outMax) {
  if (max === min) {
    return outMin;
  }

  return outMin + ((value - min) / (max - min)) * (outMax - outMin);
}

function formatMetricValue(value, metric) {
  if (!Number.isFinite(value)) {
    return "n/a";
  }

  if (metric.unit === "ratio" || metric.unit === "index") {
    return `${value.toFixed(2).replace(/0$/, "").replace(/\.$/, "")} ${metric.unit}`;
  }

  return `${Math.round(value)} ${metric.unit}`;
}

function formatScore(score) {
  const sign = score > 0 ? "+" : "";
  return `${sign}${score.toFixed(2)}`;
}

function GenderScoreChart({ score, t }) {
  const titleId = useId();
  const descriptionId = useId();
  const width = 720;
  const height = 330;
  const bounds = { left: 48, right: 684, top: 42, bottom: 282 };
  const xFor = (value) => scale(value, -3, 3, bounds.left, bounds.right);
  const maxDensity = normalPdf(-1, -1, 0.42);
  const yForDensity = (density) => scale(density, 0, maxDensity, bounds.bottom, bounds.top + 10);
  const userX = xFor(Math.max(-3, Math.min(3, score)));
  const formattedScore = formatScore(score);
  const scoreLabel = genderScoreLabel(score);

  const buildPath = (mean) => {
    const steps = 96;
    return Array.from({ length: steps + 1 }, (_, index) => {
      const value = -3 + (6 * index) / steps;
      const density = normalPdf(value, mean, 0.42);
      return `${index === 0 ? "M" : "L"} ${xFor(value).toFixed(1)} ${yForDensity(density).toFixed(1)}`;
    }).join(" ");
  };

  return (
    <svg
      className="population-chart gender-score-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <title id={titleId}>{t("population.genderChart.title")}</title>
      <desc id={descriptionId}>
        {t("population.genderChart.desc", {
          score: formattedScore,
          label: scoreLabel
        })}
      </desc>
      <rect x="0" y="0" width={width} height={height} className="chart-bg" />
      {[-3, -2, -1, 0, 1, 2, 3].map((tick) => (
        <g key={tick}>
          <line x1={xFor(tick)} y1={bounds.top} x2={xFor(tick)} y2={bounds.bottom} className="chart-grid-line" />
          <text x={xFor(tick)} y={bounds.bottom + 24} className="chart-axis-label">
            {tick > 0 ? `+${tick}` : tick}
          </text>
        </g>
      ))}
      <path d={`${buildPath(-1)} L ${bounds.right} ${bounds.bottom} L ${bounds.left} ${bounds.bottom} Z`} fill={sexStyles.male.band} />
      <path d={buildPath(-1)} fill="none" stroke={sexStyles.male.color} strokeWidth="3" />
      <path d={`${buildPath(1)} L ${bounds.right} ${bounds.bottom} L ${bounds.left} ${bounds.bottom} Z`} fill={sexStyles.female.band} />
      <path d={buildPath(1)} fill="none" stroke={sexStyles.female.color} strokeWidth="3" />
      <line x1={userX} y1={bounds.top} x2={userX} y2={bounds.bottom} className="population-user-line gender-user-line" />
      <text x={bounds.left} y={bounds.top - 14} className="chart-sex-label">{t("population.male")}</text>
      <text x={bounds.right - 96} y={bounds.top - 14} className="chart-sex-label">{t("population.female")}</text>
      <text x={userX + 8} y={bounds.top + 20} className="chart-user-label">{t("population.you")}</text>
    </svg>
  );
}

function ScatterPlot({ measurements, xMetric, yMetric, metrics, t }) {
  const titleId = useId();
  const descriptionId = useId();
  const points = useMemo(
    () => buildScatterPoints(xMetric.key, yMetric.key, metrics),
    [metrics, xMetric.key, yMetric.key]
  );
  const width = 560;
  const height = 340;
  const bounds = { left: 58, right: 522, top: 28, bottom: 288 };
  const xFor = (value) => scale(value, xMetric.min, xMetric.max, bounds.left, bounds.right);
  const yFor = (value) => scale(value, yMetric.min, yMetric.max, bounds.bottom, bounds.top);
  const userXValue = clampMetricValue(populationMetricValue(measurements, xMetric), xMetric);
  const userYValue = clampMetricValue(populationMetricValue(measurements, yMetric), yMetric);
  const userX = xFor(userXValue);
  const userY = yFor(userYValue);

  return (
    <svg
      className="population-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <title id={titleId}>{t("population.scatter.title")}</title>
      <desc id={descriptionId}>
        {t("population.scatter.desc", {
          xLabel: xMetric.label,
          yLabel: yMetric.label,
          xValue: formatMetricValue(userXValue, xMetric),
          yValue: formatMetricValue(userYValue, yMetric)
        })}
      </desc>
      <rect x="0" y="0" width={width} height={height} className="chart-bg" />
      <line x1={bounds.left} y1={bounds.bottom} x2={bounds.right} y2={bounds.bottom} className="chart-axis" />
      <line x1={bounds.left} y1={bounds.top} x2={bounds.left} y2={bounds.bottom} className="chart-axis" />
      {["female", "male"].map((sex) => (
        <ellipse
          key={sex}
          cx={xFor(xMetric[sex].mean)}
          cy={yFor(yMetric[sex].mean)}
          rx={Math.abs(xFor(xMetric[sex].mean + xMetric[sex].sd * 1.25) - xFor(xMetric[sex].mean))}
          ry={Math.abs(yFor(yMetric[sex].mean + yMetric[sex].sd * 1.25) - yFor(yMetric[sex].mean))}
          fill={sexStyles[sex].band}
          stroke={sexStyles[sex].color}
          strokeWidth="1.5"
          strokeDasharray="5 4"
        />
      ))}
      {points.map((point) => (
        <circle
          key={point.id}
          cx={xFor(point.x)}
          cy={yFor(point.y)}
          r="4"
          fill={sexStyles[point.sex].color}
          opacity="0.78"
        />
      ))}
      <circle cx={userX} cy={userY} r="7" className="population-user-point" />
      <text x={userX + 10} y={userY - 10} className="chart-user-label">{t("population.you")}</text>
      <text x={(bounds.left + bounds.right) / 2} y="324" className="chart-axis-label">
        {xMetric.label} ({xMetric.unit})
      </text>
      <text x="-172" y="18" transform="rotate(-90)" className="chart-axis-label">
        {yMetric.label} ({yMetric.unit})
      </text>
    </svg>
  );
}

function DistributionPlot({ measurements, metric, t }) {
  const titleId = useId();
  const descriptionId = useId();
  const width = 560;
  const height = 340;
  const bounds = { left: 58, right: 522, top: 32, bottom: 288 };
  const xFor = (value) => scale(value, metric.min, metric.max, bounds.left, bounds.right);
  const maxDensity = Math.max(
    normalPdf(metric.male.mean, metric.male.mean, metric.male.sd),
    normalPdf(metric.female.mean, metric.female.mean, metric.female.sd)
  );
  const yForDensity = (density) => scale(density, 0, maxDensity, bounds.bottom, bounds.top);
  const userValue = clampMetricValue(populationMetricValue(measurements, metric), metric);
  const userX = xFor(userValue);

  const buildPath = (sex) => {
    const steps = 72;
    return Array.from({ length: steps + 1 }, (_, index) => {
      const value = metric.min + ((metric.max - metric.min) * index) / steps;
      const density = normalPdf(value, metric[sex].mean, metric[sex].sd);
      return `${index === 0 ? "M" : "L"} ${xFor(value).toFixed(1)} ${yForDensity(density).toFixed(1)}`;
    }).join(" ");
  };

  return (
    <svg
      className="population-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <title id={titleId}>{t("population.distribution.title")}</title>
      <desc id={descriptionId}>
        {t("population.distribution.desc", {
          label: metric.label,
          value: formatMetricValue(userValue, metric)
        })}
      </desc>
      <rect x="0" y="0" width={width} height={height} className="chart-bg" />
      <line x1={bounds.left} y1={bounds.bottom} x2={bounds.right} y2={bounds.bottom} className="chart-axis" />
      {["female", "male"].map((sex) => (
        <g key={sex}>
          <path d={`${buildPath(sex)} L ${bounds.right} ${bounds.bottom} L ${bounds.left} ${bounds.bottom} Z`} fill={sexStyles[sex].band} />
          <path d={buildPath(sex)} fill="none" stroke={sexStyles[sex].color} strokeWidth="3" />
          <text x={xFor(metric[sex].mean) - 20} y={yForDensity(normalPdf(metric[sex].mean, metric[sex].mean, metric[sex].sd)) - 10} className="chart-sex-label">
            {sexStyles[sex].label}
          </text>
        </g>
      ))}
      <line x1={userX} y1={bounds.top} x2={userX} y2={bounds.bottom} className="population-user-line" />
      <text x={userX + 8} y={bounds.top + 18} className="chart-user-label">
        {t("population.userValue", { value: formatMetricValue(userValue, metric) })}
      </text>
      <text x={(bounds.left + bounds.right) / 2} y="324" className="chart-axis-label">
        {metric.label} ({metric.unit})
      </text>
    </svg>
  );
}

export default function PopulationPanel({ measurements, referenceData = null, locale = "en" }) {
  const t = createTranslator(locale);
  const [mode, setMode] = useState("gender");
  const [xMetricKey, setXMetricKey] = useState("height");
  const [yMetricKey, setYMetricKey] = useState("weight");
  const [distributionMetricKey, setDistributionMetricKey] = useState("height");
  const populationMetrics = useMemo(
    () => buildPopulationMetrics(referenceData),
    [referenceData]
  );
  const referenceLabel = referenceData?.label || "Dummy reference scaffold";
  const referenceCopy =
    referenceData?.reference || "Approximate adult reference model, not NHANES-calibrated";
  const xMetric = getPopulationMetric(xMetricKey, populationMetrics);
  const yMetric = getPopulationMetric(yMetricKey, populationMetrics);
  const distributionMetric = getPopulationMetric(distributionMetricKey, populationMetrics);
  const genderRows = useMemo(
    () => buildGenderScoreRows(measurements, populationMetrics),
    [measurements, populationMetrics]
  );
  const sourceBackedMetricCount = populationMetrics.filter((metric) => metric.isVetted).length;
  const genderScore = useMemo(
    () => aggregateGenderScore(measurements, populationMetrics),
    [measurements, populationMetrics]
  );

  return (
    <section className="panel population-panel">
      <div className="comparison-toolbar population-toolbar gender-toolbar">
        <div className="button-row" role="tablist" aria-label={t("population.modeAria")}>
          <button
            className={`button ${mode === "gender" ? "is-active" : ""}`}
            type="button"
            onClick={() => setMode("gender")}
          >
            {t("population.mode.gender")}
          </button>
          <button
            className={`button ${mode === "scatter" ? "is-active" : ""}`}
            type="button"
            onClick={() => setMode("scatter")}
          >
            {t("population.mode.scatter")}
          </button>
          <button
            className={`button ${mode === "distribution" ? "is-active" : ""}`}
            type="button"
            onClick={() => setMode("distribution")}
          >
            {t("population.mode.distributions")}
          </button>
        </div>
        <label className="field compact-field dataset-field">
          <span className="field-label">{t("population.dataset")}</span>
          <select value={referenceData?.datasetId || "bodymod-dummy-reference-v1"} onChange={() => {}}>
            <option value={referenceData?.datasetId || "bodymod-dummy-reference-v1"}>
              {referenceLabel}
            </option>
          </select>
        </label>
      </div>

      {mode === "gender" ? (
        <div className="gender-score-panel">
          <div className="gender-score-card">
            <GenderScoreChart score={genderScore} t={t} />
            <div className="gender-score-readout" aria-label={t("population.scoreReadoutAria")}>
              <span>{t("population.score")}</span>
              <strong>{formatScore(genderScore)}</strong>
              <em>{genderScoreLabel(genderScore)}</em>
            </div>
          </div>
          <div className="gender-measurement-table" aria-label={t("population.measurementScoresAria")}>
            <div className="gender-method-note" aria-label={t("population.methodologyAria")}>
              <strong>{t("population.methodologyTitle")}</strong>
              <p>
                {t("population.methodologyBody")}
              </p>
              <p>{referenceCopy}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>{t("population.table.name")}</th>
                  <th>{t("population.table.value")}</th>
                  <th>{t("population.table.basis")}</th>
                  <th>{t("population.table.score")}</th>
                </tr>
              </thead>
              <tbody>
                {genderRows.map((row) => (
                  <tr key={row.key}>
                    <th scope="row">{row.label}</th>
                    <td>{formatMetricValue(row.value, getPopulationMetric(row.key, populationMetrics))}</td>
                    <td>{row.note}</td>
                    <td>{formatScore(metricSexScore(row.value, getPopulationMetric(row.key, populationMetrics)))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted-text">
              {t("population.metricsSummary", {
                count: genderRows.length,
                total: populationMetrics.length
              })}
              {sourceBackedMetricCount
                ? ` ${t("population.sourceBacked", { count: sourceBackedMetricCount })}`
                : ""}
            </p>
          </div>
        </div>
      ) : mode === "scatter" ? (
        <>
          <div className="population-controls">
            <label className="field compact-field">
              <span className="field-label">{t("population.xAxis")}</span>
              <select value={xMetricKey} onChange={(event) => setXMetricKey(event.target.value)}>
                {populationMetrics.map((metric) => (
                  <option key={metric.key} value={metric.key}>{metric.label}</option>
                ))}
              </select>
            </label>
            <label className="field compact-field">
              <span className="field-label">{t("population.yAxis")}</span>
              <select value={yMetricKey} onChange={(event) => setYMetricKey(event.target.value)}>
                {populationMetrics.map((metric) => (
                  <option key={metric.key} value={metric.key}>{metric.label}</option>
                ))}
              </select>
            </label>
          </div>
          <ScatterPlot
            measurements={measurements}
            xMetric={xMetric}
            yMetric={yMetric}
            metrics={populationMetrics}
            t={t}
          />
        </>
      ) : (
        <>
          <div className="population-controls">
            <label className="field compact-field">
              <span className="field-label">{t("population.measurement")}</span>
              <select value={distributionMetricKey} onChange={(event) => setDistributionMetricKey(event.target.value)}>
                {populationMetrics.map((metric) => (
                  <option key={metric.key} value={metric.key}>{metric.label}</option>
                ))}
              </select>
            </label>
          </div>
          <DistributionPlot measurements={measurements} metric={distributionMetric} t={t} />
        </>
      )}

      <div className="population-legend" aria-label={t("population.legendAria")}>
        <span><span className="legend-swatch legend-female" /> {t("population.femaleReference")}</span>
        <span><span className="legend-swatch legend-target" /> {t("population.maleReference")}</span>
        <span><span className="legend-swatch legend-current" /> {t("population.yourScore")}</span>
      </div>
    </section>
  );
}
