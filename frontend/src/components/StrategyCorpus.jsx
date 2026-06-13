import { useEffect, useMemo, useState } from "react";
import { fetchStrategyCorpus } from "../lib/api";
import {
  clearStrategyCorpusOverride,
  acceptStrategyCorpusAgeGate,
  hasStrategyCorpusOverride,
  isHighRiskStrategy,
  isStrategyCorpusAgeAccepted,
  loadStrategyCorpusBundle,
  normalizeStrategyCorpus,
  parseStrategyCorpusBundleExport,
  persistStrategyCorpus,
  serializeStrategyCorpus,
  strategyCaseLogs,
  strategyEvidenceLevels,
  strategyOutcomes
} from "../lib/strategyCorpus";
import { createTranslator } from "../lib/i18n";

function riskKey(value) {
  if (value >= 75) {
    return "high";
  }
  if (value >= 45) {
    return "moderate";
  }
  return "lower";
}

function riskLabel(value, t) {
  return t(`strategy.risk.${riskKey(value)}`);
}

function confidenceKey(evidence) {
  if (["strong", "clinical"].includes(evidence)) {
    return "higher";
  }
  if (["moderate", "situational"].includes(evidence)) {
    return "mixed";
  }
  return "low";
}

function confidenceClass(evidence) {
  return `${confidenceKey(evidence)}-confidence`;
}

function confidenceLabel(evidence, t) {
  return t(`strategy.confidence.${confidenceKey(evidence)}`);
}

function strategySlug(strategy) {
  return strategy.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function findStrategy(outcomes, slug) {
  for (const outcome of outcomes) {
    const strategy = outcome.strategies.find((item) => strategySlug(item) === slug);
    if (strategy) {
      return { outcome, strategy };
    }
  }

  return null;
}

function caseLogsForStrategy(strategy, caseLogs) {
  const linkedIds = new Set(strategy.caseLogIds || []);

  return caseLogs.filter((caseLog) =>
    linkedIds.size ? linkedIds.has(caseLog.id) : caseLog.strategyName === strategy.name
  );
}

export default function StrategyCorpus({ locale = "en" }) {
  const t = createTranslator(locale);
  const [corpusOutcomes, setCorpusOutcomes] = useState(() => loadStrategyCorpusBundle().outcomes);
  const [corpusCaseLogs, setCorpusCaseLogs] = useState(() => loadStrategyCorpusBundle().caseLogs);
  const [seedOutcomes, setSeedOutcomes] = useState(strategyOutcomes);
  const [seedCaseLogs, setSeedCaseLogs] = useState(strategyCaseLogs);
  const [corpusStatus, setCorpusStatus] = useState("");
  const [selectedOutcomeId, setSelectedOutcomeId] = useState(() => corpusOutcomes[0]?.id || "");
  const [query, setQuery] = useState("");
  const [evidenceFilter, setEvidenceFilter] = useState("all");
  const [selectedStrategySlug, setSelectedStrategySlug] = useState("");
  const [detailStrategySlug, setDetailStrategySlug] = useState("");
  const [ageGateAccepted, setAgeGateAccepted] = useState(() => isStrategyCorpusAgeAccepted());
  const [pendingHighRiskSlug, setPendingHighRiskSlug] = useState("");

  useEffect(() => {
    let isMounted = true;

    fetchStrategyCorpus()
      .then((response) => {
        const backendCorpus = normalizeStrategyCorpus(response);

        if (!isMounted) {
          return;
        }

        setSeedOutcomes(backendCorpus.outcomes);
        setSeedCaseLogs(backendCorpus.caseLogs);

        if (!hasStrategyCorpusOverride()) {
          setCorpusOutcomes(backendCorpus.outcomes);
          setCorpusCaseLogs(backendCorpus.caseLogs);
          setSelectedOutcomeId((current) =>
            backendCorpus.outcomes.some((outcome) => outcome.id === current)
              ? current
              : backendCorpus.outcomes[0]?.id || ""
          );
          setCorpusStatus(t("strategy.status.backendLoaded"));
        }
      })
      .catch(() => {
        if (isMounted && !hasStrategyCorpusOverride()) {
          setCorpusStatus(t("strategy.status.backendUnavailable"));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [locale]);

  useEffect(() => {
    if (!detailStrategySlug) {
      return;
    }

    window.requestAnimationFrame(() => {
      document.querySelector(".strategy-explorer-overlay")?.scrollTo({ top: 0, left: 0 });
    });
  }, [detailStrategySlug]);

  const selectedOutcome =
    corpusOutcomes.find((outcome) => outcome.id === selectedOutcomeId) ||
    corpusOutcomes[0] ||
    null;

  const selectedStrategyResult = selectedStrategySlug
    ? findStrategy(corpusOutcomes, selectedStrategySlug)
    : null;
  const detailStrategyResult = detailStrategySlug
    ? findStrategy(corpusOutcomes, detailStrategySlug)
    : null;

  const visibleStrategies = useMemo(() => {
    if (!selectedOutcome) {
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();
    return selectedOutcome.strategies.filter((strategy) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          strategy.name,
          strategy.outcome,
          strategy.interventionType,
          strategy.evidence,
          strategy.claimedMechanism,
          strategy.expectedMagnitude,
          strategy.uncertaintyNotes,
          strategy.notes
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesEvidence =
        evidenceFilter === "all" || strategy.evidence === evidenceFilter;

      return matchesQuery && matchesEvidence;
    });
  }, [evidenceFilter, query, selectedOutcome]);

  const sourceCount = corpusOutcomes.reduce(
    (total, outcome) =>
      total +
      outcome.strategies.reduce(
        (strategyTotal, strategy) => strategyTotal + strategy.sourceLinks.length,
        0
      ),
    0
  );

  function handleExportCorpus() {
    const blob = new Blob([serializeStrategyCorpus(corpusOutcomes, corpusCaseLogs)], {
      type: "application/json"
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bodymod-strategy-corpus.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  function handleImportCorpus(event) {
    const [file] = event.target.files || [];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const importedCorpus = parseStrategyCorpusBundleExport(String(reader.result || ""));
        setCorpusOutcomes(importedCorpus.outcomes);
        setCorpusCaseLogs(importedCorpus.caseLogs);
        persistStrategyCorpus(importedCorpus.outcomes, importedCorpus.caseLogs);
        setSelectedOutcomeId(importedCorpus.outcomes[0]?.id || "");
        setSelectedStrategySlug("");
        setDetailStrategySlug("");
        setQuery("");
        setEvidenceFilter("all");
        setCorpusStatus(
          t("strategy.status.imported", {
            outcomes: importedCorpus.outcomes.length,
            caseLogs: importedCorpus.caseLogs.length
          })
        );
      } catch (error) {
        setCorpusStatus(t("strategy.status.importFailed"));
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  function handleResetCorpus() {
    clearStrategyCorpusOverride();
    setCorpusOutcomes(seedOutcomes);
    setCorpusCaseLogs(seedCaseLogs);
    setSelectedOutcomeId(seedOutcomes[0]?.id || "");
    setSelectedStrategySlug("");
    setDetailStrategySlug("");
    setQuery("");
    setEvidenceFilter("all");
    setCorpusStatus(t("strategy.status.seedRestored"));
  }

  function openStrategy(strategy) {
    const slug = strategySlug(strategy);
    if (isHighRiskStrategy(strategy)) {
      setSelectedStrategySlug("");
      setPendingHighRiskSlug(slug);
      return;
    }

    setSelectedStrategySlug(slug);
  }

  function handleAcceptAgeGate() {
    acceptStrategyCorpusAgeGate();
    setAgeGateAccepted(true);
    setCorpusStatus(t("strategy.status.ageAccepted"));
  }

  function handleAcknowledgeHighRisk() {
    setSelectedStrategySlug(pendingHighRiskSlug);
    setPendingHighRiskSlug("");
  }

  if (!ageGateAccepted) {
    return (
      <section className="panel anchor-panel corpus-age-gate" id="strategy-corpus" aria-label={t("strategy.ageGate.aria")}>
        <div className="panel-header">
          <h2>{t("strategy.title")}</h2>
          <p>
            {t("strategy.ageGate.intro")}
          </p>
        </div>
        <div className="age-gate-card">
          <strong>{t("strategy.ageGate.title")}</strong>
          <p>
            {t("strategy.ageGate.body")}
          </p>
          <button className="button" type="button" onClick={handleAcceptAgeGate}>
            {t("strategy.ageGate.accept")}
          </button>
        </div>
      </section>
    );
  }

  if (detailStrategyResult) {
    const { outcome, strategy } = detailStrategyResult;
    const linkedCaseLogs = caseLogsForStrategy(strategy, corpusCaseLogs);

    return (
      <section className="panel anchor-panel" id="strategy-corpus">
        <div className="panel-header">
          <button
            className="button"
            type="button"
            onClick={() => setDetailStrategySlug("")}
          >
            {t("strategy.detail.back")}
          </button>
          <h2>{strategy.name}</h2>
          <p>
            {t("strategy.detail.context", {
              outcome: outcome.label,
              type: strategy.interventionType
            })}
          </p>
        </div>

        <div className="strategy-detail-grid">
          <dl className="strategy-detail-facts">
            <div>
              <dt>{t("strategy.metric.efficacy")}</dt>
              <dd>{strategy.efficacy}/100</dd>
            </div>
            <div>
              <dt>{t("strategy.metric.risk")}</dt>
              <dd>{strategy.risk}/100 ({riskLabel(strategy.risk, t)})</dd>
            </div>
            <div>
              <dt>{t("strategy.metric.confidence")}</dt>
              <dd>{confidenceLabel(strategy.evidence, t)}</dd>
            </div>
            <div>
              <dt>{t("strategy.metric.evidence")}</dt>
              <dd>{strategy.evidence}</dd>
            </div>
            <div>
              <dt>{t("strategy.metric.review")}</dt>
              <dd>{strategy.reviewStatus}</dd>
            </div>
            <div>
              <dt>{t("strategy.metric.personalized")}</dt>
              <dd>
                {strategy.excludedFromPersonalization
                  ? t("strategy.personalized.excluded")
                  : t("strategy.personalized.eligible")}
              </dd>
            </div>
          </dl>

          <div className="strategy-detail-copy">
            <p>
              <strong>{t("strategy.detail.claimedMechanism")}:</strong> {strategy.claimedMechanism}
            </p>
            <p>
              <strong>{t("strategy.detail.expectedMagnitude")}:</strong> {strategy.expectedMagnitude}
            </p>
            <p>
              <strong>{t("strategy.detail.timeHorizon")}:</strong> {strategy.timeHorizon}
            </p>
            <p>
              <strong>{t("strategy.detail.reversibility")}:</strong> {strategy.reversibility}
            </p>
            <p>
              <strong>{t("strategy.detail.cost")}:</strong> {strategy.cost}
            </p>
            <p>
              <strong>{t("strategy.detail.uncertainty")}:</strong> {strategy.uncertaintyNotes}
            </p>
            {strategy.contraindicationFlags.length ? (
              <p>
                <strong>{t("strategy.detail.flags")}:</strong> {strategy.contraindicationFlags.join(", ")}
              </p>
            ) : null}
            <p>
              <strong>{t("strategy.detail.legal")}:</strong> {strategy.legalNotes}
            </p>
            <p>{strategy.notes}</p>
          </div>
        </div>

        {strategy.sourceLinks.length ? (
          <ul className="source-list" aria-label={t("strategy.sources.aria", { name: strategy.name })}>
            {strategy.sourceLinks.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.title}
                </a>
                <span>
                  {source.sourceType}
                  {source.reviewedAt
                    ? t("strategy.sources.reviewed", { date: source.reviewedAt })
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted-text">{t("strategy.sources.empty")}</p>
        )}

        {linkedCaseLogs.length ? (
          <div className="case-log-section" aria-label={t("strategy.caseLogs.aria", { name: strategy.name })}>
            <div className="fit-panel-header">
              <h3>{t("strategy.caseLogs.title")}</h3>
              <span>{t("strategy.caseLogs.note")}</span>
            </div>
            <div className="case-log-grid">
              {linkedCaseLogs.map((caseLog) => (
                <article className="case-log-card" key={caseLog.id}>
                  <div>
                    <span>{caseLog.sourceType}</span>
                    <strong>{caseLog.label}</strong>
                  </div>
                  <dl>
                    <div>
                      <dt>{t("strategy.caseLogs.window")}</dt>
                      <dd>{caseLog.window}</dd>
                    </div>
                    <div>
                      <dt>{t("strategy.caseLogs.adherence")}</dt>
                      <dd>
                        {caseLog.averageScore === null
                          ? t("strategy.caseLogs.checkIns", { count: caseLog.adherenceCount })
                          : t("strategy.caseLogs.average", {
                              score: caseLog.averageScore.toFixed(1),
                              count: caseLog.adherenceCount
                            })}
                      </dd>
                    </div>
                    <div>
                      <dt>{t("strategy.caseLogs.snapshots")}</dt>
                      <dd>{caseLog.snapshotCount}</dd>
                    </div>
                    <div>
                      <dt>{t("strategy.metric.review")}</dt>
                      <dd>{caseLog.reviewStatus}</dd>
                    </div>
                  </dl>
                  <p>
                    <strong>{t("strategy.caseLogs.outcome")}:</strong> {caseLog.outcomeSummary}
                  </p>
                  <p>
                    <strong>{t("strategy.caseLogs.projection")}:</strong> {caseLog.projectionSummary}
                  </p>
                  <p>{caseLog.notes}</p>
                  {caseLog.limitations.length ? (
                    <ul>
                      {caseLog.limitations.map((limitation) => (
                        <li key={limitation}>{limitation}</li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        ) : (
          <p className="muted-text">{t("strategy.caseLogs.empty")}</p>
        )}
      </section>
    );
  }

  return (
    <section className="panel anchor-panel" id="strategy-corpus">
      <div className="panel-header">
        <h2>{t("strategy.title")}</h2>
        <p>
          {t("strategy.intro")}
        </p>
      </div>

      <div className="intent-layout">
        <aside className="intent-list" aria-label={t("strategy.intent.aria")}>
          <h3>{t("strategy.intent.title")}</h3>
          {corpusOutcomes.map((outcome) => (
            <button
              key={outcome.id}
              className={`intent-button ${selectedOutcome?.id === outcome.id ? "is-active" : ""}`}
              type="button"
              onClick={() => {
                setSelectedOutcomeId(outcome.id);
                setSelectedStrategySlug("");
                setQuery("");
              }}
            >
              {outcome.label}
            </button>
          ))}
        </aside>

        <div className="intent-main">
          <div className="corpus-controls outcome-controls">
            <label className="field compact-field">
              <span className="field-label">{t("strategy.search.label")}</span>
              <input
                aria-label={t("strategy.search.aria")}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label className="field compact-field">
              <span className="field-label">{t("strategy.confidence.label")}</span>
              <select
                aria-label={t("strategy.confidence.filterAria")}
                value={evidenceFilter}
                onChange={(event) => setEvidenceFilter(event.target.value)}
              >
                <option value="all">{t("strategy.confidence.all")}</option>
                {strategyEvidenceLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedOutcome ? (
            <>
              <div className="corpus-section-header">
                <h3>{selectedOutcome.label}</h3>
                <p>{selectedOutcome.description}</p>
              </div>

              <div
                className="risk-map outcome-risk-map"
                aria-label={t("strategy.plot.aria", { outcome: selectedOutcome.label })}
              >
                <span className="axis-label axis-label-y">{t("strategy.metric.risk")}</span>
                <span className="axis-label axis-label-x">{t("strategy.metric.efficacy")}</span>
                {visibleStrategies.map((strategy) => (
                  <button
                    key={strategy.name}
                    className={`strategy-point labeled-point confidence-${confidenceClass(strategy.evidence)}`}
                    style={{
                      left: `${strategy.efficacy}%`,
                      bottom: `${strategy.risk}%`
                    }}
                    type="button"
                    aria-label={t("strategy.point.aria", {
                      name: strategy.name,
                      efficacy: strategy.efficacy,
                      risk: strategy.risk,
                      confidence: confidenceLabel(strategy.evidence, t)
                    })}
                    onClick={() => openStrategy(strategy)}
                  >
                    <span>{strategy.name}</span>
                  </button>
                ))}
              </div>

              <div className="confidence-legend" aria-label={t("strategy.confidence.legendAria")}>
                <span><i className="confidence-higher-confidence" /> {t("strategy.confidence.higher")}</span>
                <span><i className="confidence-mixed-confidence" /> {t("strategy.confidence.mixed")}</span>
                <span><i className="confidence-low-confidence" /> {t("strategy.confidence.low")}</span>
              </div>

              {!visibleStrategies.length ? (
                <p className="muted-text">{t("strategy.filter.empty")}</p>
              ) : null}
            </>
          ) : (
            <p className="muted-text">{t("strategy.outcomes.empty")}</p>
          )}
        </div>
      </div>

      <div className="corpus-actions">
        <button type="button" onClick={handleExportCorpus}>
          {t("strategy.actions.export")}
        </button>
        <label className="file-button">
          {t("strategy.actions.import")}
          <input
            aria-label={t("strategy.actions.importAria")}
            type="file"
            accept="application/json"
            onChange={handleImportCorpus}
          />
        </label>
        <button type="button" onClick={handleResetCorpus}>
          {t("strategy.actions.reset")}
        </button>
      </div>

      {corpusStatus ? (
        <p className="muted-text" role="status" aria-live="polite">
          {corpusStatus}
        </p>
      ) : null}

      <p className="muted-text">
        {t("strategy.loadedSummary", {
          outcomes: corpusOutcomes.length,
          sources: sourceCount,
          caseLogs: corpusCaseLogs.length
        })}
      </p>

      {selectedStrategyResult ? (
        <div className="strategy-modal-backdrop" role="presentation">
          <dialog className="strategy-modal" open aria-label={t("strategy.synopsis.aria")}>
            <button
              className="modal-close"
              type="button"
              aria-label={t("strategy.synopsis.close")}
              onClick={() => setSelectedStrategySlug("")}
            >
              x
            </button>
            <h3>{selectedStrategyResult.strategy.name}</h3>
            <p>
              {selectedStrategyResult.outcome.label} /{" "}
              {selectedStrategyResult.strategy.interventionType}
            </p>
            <dl>
              <div>
                <dt>{t("strategy.metric.efficacy")}</dt>
                <dd>{selectedStrategyResult.strategy.efficacy}/100</dd>
              </div>
              <div>
                <dt>{t("strategy.metric.risk")}</dt>
                <dd>{selectedStrategyResult.strategy.risk}/100</dd>
              </div>
              <div>
                <dt>{t("strategy.metric.confidence")}</dt>
                <dd>{confidenceLabel(selectedStrategyResult.strategy.evidence, t)}</dd>
              </div>
            </dl>
            <p>{selectedStrategyResult.strategy.notes}</p>
            {caseLogsForStrategy(selectedStrategyResult.strategy, corpusCaseLogs).length ? (
              <p className="muted-text">
                {t("strategy.synopsis.caseLogs", {
                  count: caseLogsForStrategy(selectedStrategyResult.strategy, corpusCaseLogs).length
                })}
              </p>
            ) : null}
            <button
              className="button"
              type="button"
              onClick={() => {
                setDetailStrategySlug(strategySlug(selectedStrategyResult.strategy));
                setSelectedStrategySlug("");
              }}
            >
              {t("strategy.synopsis.open")}
            </button>
          </dialog>
        </div>
      ) : null}

      {pendingHighRiskSlug ? (
        <div className="strategy-modal-backdrop" role="presentation">
          <dialog className="strategy-modal high-risk-ack" open aria-label={t("strategy.highRisk.aria")}>
            <button
              className="modal-close"
              type="button"
              aria-label={t("strategy.highRisk.cancelAria")}
              onClick={() => setPendingHighRiskSlug("")}
            >
              x
            </button>
            <h3>{t("strategy.highRisk.title")}</h3>
            <p>
              {t("strategy.highRisk.body")}
            </p>
            <div className="button-row">
              <button className="button" type="button" onClick={handleAcknowledgeHighRisk}>
                {t("strategy.highRisk.show")}
              </button>
              <button className="button" type="button" onClick={() => setPendingHighRiskSlug("")}>
                {t("strategy.highRisk.keepClosed")}
              </button>
            </div>
          </dialog>
        </div>
      ) : null}
    </section>
  );
}
