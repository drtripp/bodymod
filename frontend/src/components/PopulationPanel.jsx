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

function GenderScoreChart({ score }) {
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
      <title id={titleId}>Gender score distribution</title>
      <desc id={descriptionId}>
        Measurement-pattern score {formattedScore}, labeled {scoreLabel}. The chart compares the current
        measurement pattern with draft male and female reference distributions.
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
      <text x={bounds.left} y={bounds.top - 14} className="chart-sex-label">Male</text>
      <text x={bounds.right - 96} y={bounds.top - 14} className="chart-sex-label">Female</text>
      <text x={userX + 8} y={bounds.top + 20} className="chart-user-label">You</text>
    </svg>
  );
}

function ScatterPlot({ measurements, xMetric, yMetric, metrics }) {
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
      <title id={titleId}>US population scatter plot</title>
      <desc id={descriptionId}>
        Scatter plot comparing {xMetric.label} and {yMetric.label}. Your current point is
        {formatMetricValue(userXValue, xMetric)} by {formatMetricValue(userYValue, yMetric)}.
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
      <text x={userX + 10} y={userY - 10} className="chart-user-label">You</text>
      <text x={(bounds.left + bounds.right) / 2} y="324" className="chart-axis-label">
        {xMetric.label} ({xMetric.unit})
      </text>
      <text x="-172" y="18" transform="rotate(-90)" className="chart-axis-label">
        {yMetric.label} ({yMetric.unit})
      </text>
    </svg>
  );
}

function DistributionPlot({ measurements, metric }) {
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
      <title id={titleId}>US population distribution plot</title>
      <desc id={descriptionId}>
        Distribution plot for {metric.label}. Your current value is {formatMetricValue(userValue, metric)}.
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
        You: {formatMetricValue(userValue, metric)}
      </text>
      <text x={(bounds.left + bounds.right) / 2} y="324" className="chart-axis-label">
        {metric.label} ({metric.unit})
      </text>
    </svg>
  );
}

export default function PopulationPanel({ measurements, referenceData = null }) {
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
        <div className="button-row" role="tablist" aria-label="US population chart mode">
          <button
            className={`button ${mode === "gender" ? "is-active" : ""}`}
            type="button"
            onClick={() => setMode("gender")}
          >
            Gender score
          </button>
          <button
            className={`button ${mode === "scatter" ? "is-active" : ""}`}
            type="button"
            onClick={() => setMode("scatter")}
          >
            Scatter
          </button>
          <button
            className={`button ${mode === "distribution" ? "is-active" : ""}`}
            type="button"
            onClick={() => setMode("distribution")}
          >
            Distributions
          </button>
        </div>
        <label className="field compact-field dataset-field">
          <span className="field-label">Dataset</span>
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
            <GenderScoreChart score={genderScore} />
            <div className="gender-score-readout" aria-label="Gender score readout">
              <span>Score</span>
              <strong>{formatScore(genderScore)}</strong>
              <em>{genderScoreLabel(genderScore)}</em>
            </div>
          </div>
          <div className="gender-measurement-table" aria-label="Gender measurement scores">
            <div className="gender-method-note" aria-label="Gender score methodology">
              <strong>Measurement pattern only</strong>
              <p>
                This score compares entered measurements with draft sex-coded
                distribution scaffolds. It is not identity inference, medical
                advice, or a transition target.
              </p>
              <p>{referenceCopy}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Value</th>
                  <th>Basis</th>
                  <th>Score</th>
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
              {genderRows.length} of {populationMetrics.length} metrics, including derived FFMI and frame index.
              {sourceBackedMetricCount ? ` ${sourceBackedMetricCount} metrics use source-backed NHANES adult tables.` : ""}
            </p>
          </div>
        </div>
      ) : mode === "scatter" ? (
        <>
          <div className="population-controls">
            <label className="field compact-field">
              <span className="field-label">X axis</span>
              <select value={xMetricKey} onChange={(event) => setXMetricKey(event.target.value)}>
                {populationMetrics.map((metric) => (
                  <option key={metric.key} value={metric.key}>{metric.label}</option>
                ))}
              </select>
            </label>
            <label className="field compact-field">
              <span className="field-label">Y axis</span>
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
          />
        </>
      ) : (
        <>
          <div className="population-controls">
            <label className="field compact-field">
              <span className="field-label">Measurement</span>
              <select value={distributionMetricKey} onChange={(event) => setDistributionMetricKey(event.target.value)}>
                {populationMetrics.map((metric) => (
                  <option key={metric.key} value={metric.key}>{metric.label}</option>
                ))}
              </select>
            </label>
          </div>
          <DistributionPlot measurements={measurements} metric={distributionMetric} />
        </>
      )}

      <div className="population-legend" aria-label="Population chart legend">
        <span><span className="legend-swatch legend-female" /> Female reference</span>
        <span><span className="legend-swatch legend-target" /> Male reference</span>
        <span><span className="legend-swatch legend-current" /> Your score</span>
      </div>
    </section>
  );
}
