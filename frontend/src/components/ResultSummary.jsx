import { useState } from "react";
import SilhouetteView, { SilhouetteViewToggle } from "./SilhouetteView";
import { calculateBodyComposition } from "../lib/bodyComposition";
import { estimateClothingSizes } from "../lib/clothingSizes";
import { createTranslator } from "../lib/i18n";
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

function measurementLabel(key, fallback, t) {
  return t(`measurement.field.${key}.label`, {}, fallback);
}

export default function ResultSummary({
  measurements,
  result,
  apiStatus,
  clothingSizeTables,
  locale = "en",
  hoveredMeasurement,
  onMeasurementHover,
  silhouetteView = "front",
  onSilhouetteViewChange,
  matchPriority = "balanced",
  matchPriorityPresets = [],
  onMatchPriorityChange
}) {
  const t = createTranslator(locale);
  const [shareStatus, setShareStatus] = useState("");
  const ratios = calculateRatios(measurements);
  const bodyComposition = calculateBodyComposition(measurements);
  const clothingSizes = estimateClothingSizes(measurements, clothingSizeTables);
  const ratioById = Object.fromEntries(ratios.map((ratio) => [ratio.id, ratio]));
  const bodyFatMethodSummary = bodyComposition.methods
    .map((method) => `${method.label} ${formatPercent(method.value)}`)
    .join(" / ");
  const runnerUp = result?.matches?.[1] || null;
  const selectedPriority =
    matchPriorityPresets.find((preset) => preset.id === matchPriority) ||
    matchPriorityPresets[0] ||
    null;
  const metricBlocks = [
    {
      id: "height",
      label: measurementLabel("height", "Height", t),
      value: `${Number(measurements.height).toFixed(0)} cm`,
      note: t("result.metric.heightNote", {
        percentile: result?.percentiles?.height ?? "--"
      })
    },
    {
      id: "bmi",
      label: "BMI",
      value: ratioById.bmi?.value ?? "--",
      note: t("result.metric.populationTbd", {
        note: ratioById.bmi?.note ?? "BMI"
      })
    },
    {
      id: "bodyFat",
      label: t("result.metric.bodyFat"),
      value: formatPercent(ratioById.bodyFat?.value),
      note: t("result.metric.populationTbd", {
        note: bodyFatMethodSummary || "--"
      })
    },
    {
      id: "ffmi",
      label: "FFMI",
      value: bodyComposition.ffmi?.ffmi ?? "--",
      note: bodyComposition.ffmi
        ? t("result.metric.ffmiNote", {
            normalized: bodyComposition.ffmi.normalizedFfmi,
            context: bodyComposition.ffmi.context
          })
        : t("result.metric.needsBodyFat")
    },
    {
      id: "framePotential",
      label: t("result.metric.frame"),
      value: bodyComposition.potential?.eligible
        ? `${bodyComposition.potential.remainingLeanMassKg >= 0 ? "+" : ""}${bodyComposition.potential.remainingLeanMassKg.toFixed(1)} kg`
        : "--",
      note: bodyComposition.potential?.eligible
        ? t("result.metric.frameRoom")
        : bodyComposition.potential?.note || t("result.metric.needsWristAnkle")
    },
    {
      id: "shoulderHip",
      label: "SHR",
      value: ratioById.shoulderHip?.value ?? "--",
      note: t("result.metric.populationTbd", {
        note: ratioById.shoulderHip?.note ?? "SHR"
      })
    },
    {
      id: "waistHip",
      label: "WHR",
      value: ratioById.waistHip?.value ?? "--",
      note: t("result.metric.waistPct", {
        note: ratioById.waistHip?.note ?? "WHR",
        percentile: result?.percentiles?.waistCircumference ?? "--"
      })
    },
    {
      id: "shoulderWaist",
      label: "SWR",
      value: ratioById.shoulderWaist?.value ?? "--",
      note: t("result.metric.shoulderPct", {
        note: ratioById.shoulderWaist?.note ?? "SWR",
        percentile: result?.percentiles?.bideltoidCircumference ?? "--"
      })
    },
    {
      id: "waistHeight",
      label: "WHTR",
      value: ratioById.waistHeight?.value ?? "--",
      note: t("result.metric.referenceOnly", {
        note: ratioById.waistHeight?.note ?? "WHTR"
      })
    }
  ];
  const silhouetteViewLabels = {
    front: t("silhouette.view.front"),
    side: t("silhouette.view.side")
  };

  function handleDownloadResultCard() {
    downloadResultCard(measurements, result);
    setShareStatus(t("result.cardDownloaded"));
  }

  return (
    <section className="panel">
      <div className="result-grid">
        <div className="silhouette-card-stack">
          <SilhouetteViewToggle
            view={silhouetteView}
            onViewChange={onSilhouetteViewChange}
            label={t("result.silhouetteViewAria")}
            optionLabels={silhouetteViewLabels}
          />
          <SilhouetteView
            label={t("result.currentProfile")}
            measurements={measurements}
            hoveredMeasurement={hoveredMeasurement}
            onMeasurementHover={onMeasurementHover}
            view={silhouetteView}
          />
        </div>

        <div className="result-copy">
          <div className="top-match-block">
            <h3>{t("result.topMatch")}</h3>
            {matchPriorityPresets.length ? (
              <label className="field compact-field match-priority-field">
                <span className="field-label">{t("result.matchPriority")}</span>
                <select
                  aria-label={t("result.matchPriority")}
                  value={matchPriority}
                  onChange={(event) => onMatchPriorityChange?.(event.target.value)}
                >
                  {matchPriorityPresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {selectedPriority ? (
              <small className="muted-text match-priority-summary">
                {selectedPriority.summary}
                </small>
              ) : null}
            <p>{result?.top_match?.label || t("result.noMatchYet")}</p>
            <span>
              {t("result.similarityScore", {
                score: formatScore(result?.top_match?.similarity)
              })}
            </span>
            {runnerUp ? (
              <div className="runner-up-block">
                <span>{t("result.runnerUp")}</span>
                <strong>{runnerUp.label}</strong>
                <small>
                  {t("result.similarityScore", {
                    score: formatScore(runnerUp.similarity)
                  })}
                </small>
              </div>
            ) : null}
            <button className="button result-card-button" type="button" onClick={handleDownloadResultCard}>
              {t("result.downloadCard")}
            </button>
            {shareStatus ? (
              <small className="muted-text" role="status" aria-live="polite">
                {shareStatus}
              </small>
            ) : null}
          </div>

          <div className="metric-block-grid" aria-label={t("result.metricBlocksAria")}>
            {metricBlocks.map((metric) => (
              <article key={metric.id} className="metric-block">
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.note}</small>
              </article>
            ))}
          </div>

          <div className="body-composition-panel" aria-label={t("result.bodyCompositionAria")}>
            <div className="fit-panel-header">
              <h3>{t("result.bodyCompositionTitle")}</h3>
              <span>{t("result.bodyCompositionKicker")}</span>
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
                    ? t("result.leanMassLine", {
                        leanMass: formatKg(bodyComposition.ffmi.leanMassKg),
                        normalized: bodyComposition.ffmi.normalizedFfmi
                      })
                    : t("result.needsABodyFat")}
                </small>
              </article>
              <article className={bodyComposition.potential?.eligible ? "" : "is-muted"}>
                <span>{t("result.framePotential")}</span>
                <strong>
                  {bodyComposition.potential?.eligible
                    ? formatKg(bodyComposition.potential.leanMassPotentialKg)
                    : t("result.maleOnly")}
                </strong>
                <small>
                  {bodyComposition.potential?.eligible
                    ? t("result.potentialFfmi", {
                        ffmi: bodyComposition.potential.potentialFfmi,
                        note: bodyComposition.potential.note
                      })
                    : bodyComposition.potential?.note}
                </small>
              </article>
            </div>
          </div>

          <div className="fit-panel" aria-label={t("result.fitAria")}>
            <div className="fit-panel-header">
              <h3>{t("result.fitTitle")}</h3>
              <span>{t("result.fitKicker")}</span>
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
              {t("result.fitNote")}
            </p>
          </div>

          <div className="stat-block">
            <h3>{t("result.noteTitle")}</h3>
            {apiStatus !== "online" ? (
              <p className="result-status" role="status" aria-live="polite">
                {t("result.backendUnavailable")}
              </p>
            ) : null}
            <p>
              {t("result.similarityExplainer")}
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
