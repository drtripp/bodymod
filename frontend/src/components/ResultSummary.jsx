import SilhouetteView from "./SilhouetteView";
import { calculateRatios } from "../lib/ratios";

function formatScore(score) {
  if (typeof score !== "number") {
    return "TBD";
  }

  return `${Math.max(0, Math.round((1 - score) * 100))}% TBD`;
}

export default function ResultSummary({
  measurements,
  result,
  apiStatus,
  hoveredMeasurement,
  onMeasurementHover
}) {
  const ratios = calculateRatios(measurements);
  const ratioById = Object.fromEntries(ratios.map((ratio) => [ratio.id, ratio]));
  const runnerUp = result?.matches?.[1] || null;
  const metricBlocks = [
    {
      id: "height",
      label: "Height",
      value: `${Number(measurements.height).toFixed(0)} cm`,
      note: `${result?.percentiles?.height ?? "--"}th pct against population`
    },
    {
      id: "bmi",
      label: "BMI",
      value: ratioById.bmi?.value ?? "--",
      note: `${ratioById.bmi?.note}. Population percentile TBD`
    },
    {
      id: "bodyFat",
      label: "Est BF%",
      value: ratioById.bodyFat?.value ? `${ratioById.bodyFat.value}%` : "--",
      note: `${ratioById.bodyFat?.note}. Population percentile TBD`
    },
    {
      id: "shoulderHip",
      label: "SHR",
      value: ratioById.shoulderHip?.value ?? "--",
      note: `${ratioById.shoulderHip?.note}. Population percentile TBD`
    },
    {
      id: "waistHip",
      label: "WHR",
      value: ratioById.waistHip?.value ?? "--",
      note: `${ratioById.waistHip?.note}. Waist pct ${result?.percentiles?.waistCircumference ?? "--"}`
    },
    {
      id: "shoulderWaist",
      label: "SWR",
      value: ratioById.shoulderWaist?.value ?? "--",
      note: `${ratioById.shoulderWaist?.note}. Shoulder pct ${result?.percentiles?.bideltoidCircumference ?? "--"}`
    }
  ];

  return (
    <section className="panel">
      <div className="result-grid">
        <SilhouetteView
          label="Current profile"
          measurements={measurements}
          hoveredMeasurement={hoveredMeasurement}
          onMeasurementHover={onMeasurementHover}
        />

        <div className="result-copy">
          <div className="top-match-block">
            <h3>Top match</h3>
            <p>{result?.top_match?.label || "No match yet"}</p>
            <span>Similarity score: {formatScore(result?.top_match?.score)}</span>
            {runnerUp ? (
              <div className="runner-up-block">
                <span>Runner up</span>
                <strong>{runnerUp.label}</strong>
                <small>Similarity score: {formatScore(runnerUp.score)}</small>
              </div>
            ) : null}
          </div>

          <div className="metric-block-grid" aria-label="Result metric blocks">
            {metricBlocks.map((metric) => (
              <article key={metric.id} className="metric-block">
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.note}</small>
              </article>
            ))}
          </div>

          <div className="stat-block">
            <h3>Note</h3>
            {apiStatus !== "online" ? (
              <p className="result-status">Backend unavailable. Results are limited.</p>
            ) : null}
            <p>
              Population context is approximate. Similarity scoring is currently
              a placeholder pending richer target and reference data.
            </p>
            {result?.percentiles?.reference ? (
              <p className="muted-text">{result.percentiles.reference}</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
