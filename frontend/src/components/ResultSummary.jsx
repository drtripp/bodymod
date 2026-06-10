import { useState } from "react";
import SilhouetteView from "./SilhouetteView";
import { calculateBodyComposition } from "../lib/bodyComposition";
import { estimateClothingSizes } from "../lib/clothingSizes";
import { calculateRatios } from "../lib/ratios";
import { downloadResultCard } from "../lib/resultCard";

function formatScore(similarity) {
  if (typeof similarity !== "number") {
    return "--";
  }

  return `${Math.round(similarity)}%`;
}

function formatPercent(value) {
  return Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}%` : "--";
}

function formatKg(value) {
  return Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)} kg` : "--";
}

export default function ResultSummary({
  measurements,
  result,
  apiStatus,
  clothingSizeTables,
  hoveredMeasurement,
  onMeasurementHover
}) {
  const [shareStatus, setShareStatus] = useState("");
  const ratios = calculateRatios(measurements);
  const bodyComposition = calculateBodyComposition(measurements);
  const clothingSizes = estimateClothingSizes(measurements, clothingSizeTables);
  const ratioById = Object.fromEntries(ratios.map((ratio) => [ratio.id, ratio]));
  const bodyFatMethodSummary = bodyComposition.methods
    .map((method) => `${method.label} ${formatPercent(method.value)}`)
    .join(" / ");
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
      value: formatPercent(ratioById.bodyFat?.value),
      note: `${bodyFatMethodSummary}. Population percentile TBD`
    },
    {
      id: "ffmi",
      label: "FFMI",
      value: bodyComposition.ffmi?.ffmi ?? "--",
      note: bodyComposition.ffmi
        ? `Normalized ${bodyComposition.ffmi.normalizedFfmi}; ${bodyComposition.ffmi.context}`
        : "Needs body-fat estimate"
    },
    {
      id: "framePotential",
      label: "Frame",
      value: bodyComposition.potential?.eligible
        ? `${bodyComposition.potential.remainingLeanMassKg >= 0 ? "+" : ""}${bodyComposition.potential.remainingLeanMassKg.toFixed(1)} kg`
        : "--",
      note: bodyComposition.potential?.eligible
        ? "Estimated lean-mass room from wrist/ankle frame"
        : bodyComposition.potential?.note || "Needs wrist and ankle"
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
    },
    {
      id: "waistHeight",
      label: "WHTR",
      value: ratioById.waistHeight?.value ?? "--",
      note: `${ratioById.waistHeight?.note}. Reference framing only`
    }
  ];

  function handleDownloadResultCard() {
    downloadResultCard(measurements, result);
    setShareStatus("Result card downloaded.");
  }

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
            <span>Similarity score: {formatScore(result?.top_match?.similarity)}</span>
            {runnerUp ? (
              <div className="runner-up-block">
                <span>Runner up</span>
                <strong>{runnerUp.label}</strong>
                <small>Similarity score: {formatScore(runnerUp.similarity)}</small>
              </div>
            ) : null}
            <button className="button result-card-button" type="button" onClick={handleDownloadResultCard}>
              Download result card
            </button>
            {shareStatus ? <small className="muted-text">{shareStatus}</small> : null}
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

          <div className="body-composition-panel" aria-label="Body composition estimates">
            <div className="fit-panel-header">
              <h3>Body composition</h3>
              <span>Formulas, not diagnostics</span>
            </div>
            <div className="composition-grid">
              {bodyComposition.methods.map((method) => (
                <article key={method.id}>
                  <span>{method.label}</span>
                  <strong>{formatPercent(method.value)}</strong>
                  <small>{method.note}</small>
                </article>
              ))}
              <article>
                <span>FFMI</span>
                <strong>{bodyComposition.ffmi?.ffmi ?? "--"}</strong>
                <small>
                  {bodyComposition.ffmi
                    ? `Lean mass ${formatKg(bodyComposition.ffmi.leanMassKg)}; normalized ${bodyComposition.ffmi.normalizedFfmi}`
                    : "Needs a body-fat estimate"}
                </small>
              </article>
              <article className={bodyComposition.potential?.eligible ? "" : "is-muted"}>
                <span>Frame potential</span>
                <strong>
                  {bodyComposition.potential?.eligible
                    ? formatKg(bodyComposition.potential.leanMassPotentialKg)
                    : "Male-only"}
                </strong>
                <small>
                  {bodyComposition.potential?.eligible
                    ? `Potential FFMI ${bodyComposition.potential.potentialFfmi}; ${bodyComposition.potential.note}`
                    : bodyComposition.potential?.note}
                </small>
              </article>
            </div>
          </div>

          <div className="fit-panel" aria-label="Clothing size estimates">
            <div className="fit-panel-header">
              <h3>Fit estimates</h3>
              <span>Generic US/EU/UK bands</span>
            </div>
            <div className="fit-grid">
              {clothingSizes.map((item) => (
                <article key={item.id} className={`fit-card ${item.confidence === "low" ? "is-low-confidence" : ""}`}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <small>{item.note}</small>
                </article>
              ))}
            </div>
            <p className="muted-text">
              Approximate only. Brand cut, fabric, and fit preference can move the answer by several sizes.
            </p>
          </div>

          <div className="stat-block">
            <h3>Note</h3>
            {apiStatus !== "online" ? (
              <p className="result-status">Backend unavailable. Results are limited.</p>
            ) : null}
            <p>
              Similarity: 100 means identical measurements, 95+ is within typical
              re-measurement error, around 40 is a different build. Target profiles
              are still placeholder estimates.
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
