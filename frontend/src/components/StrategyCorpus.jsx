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

function riskLabel(value) {
  if (value >= 75) {
    return "high risk";
  }
  if (value >= 45) {
    return "moderate risk";
  }
  return "lower risk";
}

function confidenceLabel(evidence) {
  if (["strong", "clinical"].includes(evidence)) {
    return "higher confidence";
  }
  if (["moderate", "situational"].includes(evidence)) {
    return "mixed confidence";
  }
  return "low confidence";
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

export default function StrategyCorpus() {
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
          setCorpusStatus("Backend seed corpus loaded for this browser.");
        }
      })
      .catch(() => {
        if (isMounted && !hasStrategyCorpusOverride()) {
          setCorpusStatus("Using bundled seed corpus while backend is unavailable.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
          `Imported ${importedCorpus.outcomes.length} outcome(s) and ${importedCorpus.caseLogs.length} case log(s).`
        );
      } catch (error) {
        setCorpusStatus("Import failed. Choose a valid bodymod strategy corpus JSON file.");
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
    setCorpusStatus("Seed corpus restored for this browser.");
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
    setCorpusStatus("Strategy corpus age gate accepted on this browser.");
  }

  function handleAcknowledgeHighRisk() {
    setSelectedStrategySlug(pendingHighRiskSlug);
    setPendingHighRiskSlug("");
  }

  if (!ageGateAccepted) {
    return (
      <section className="panel anchor-panel corpus-age-gate" id="strategy-corpus" aria-label="Strategy corpus age gate">
        <div className="panel-header">
          <h2>Strategy explorer</h2>
          <p>
            This corpus can include medical-adjacent, surgical, and pharmaceutical
            topics. It is informational only and not advice, coaching, dosing, or
            a protocol generator.
          </p>
        </div>
        <div className="age-gate-card">
          <strong>18+ content gate</strong>
          <p>
            Continue only if you are at least 18 and understand that high-risk
            entries require professional review. The app does not personalize
            surgical, pharmaceutical, or clinical entries.
          </p>
          <button className="button" type="button" onClick={handleAcceptAgeGate}>
            I am 18 or older
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
            Back to outcome map
          </button>
          <h2>{strategy.name}</h2>
          <p>
            {outcome.label} / {strategy.interventionType}. Informational only,
            not advice or a protocol.
          </p>
        </div>

        <div className="strategy-detail-grid">
          <dl className="strategy-detail-facts">
            <div>
              <dt>Efficacy</dt>
              <dd>{strategy.efficacy}/100</dd>
            </div>
            <div>
              <dt>Risk</dt>
              <dd>{strategy.risk}/100 ({riskLabel(strategy.risk)})</dd>
            </div>
            <div>
              <dt>Confidence</dt>
              <dd>{confidenceLabel(strategy.evidence)}</dd>
            </div>
            <div>
              <dt>Evidence</dt>
              <dd>{strategy.evidence}</dd>
            </div>
            <div>
              <dt>Review</dt>
              <dd>{strategy.reviewStatus}</dd>
            </div>
            <div>
              <dt>Personalized</dt>
              <dd>{strategy.excludedFromPersonalization ? "excluded" : "eligible after review"}</dd>
            </div>
          </dl>

          <div className="strategy-detail-copy">
            <p>
              <strong>Claimed mechanism:</strong> {strategy.claimedMechanism}
            </p>
            <p>
              <strong>Expected magnitude:</strong> {strategy.expectedMagnitude}
            </p>
            <p>
              <strong>Time horizon:</strong> {strategy.timeHorizon}
            </p>
            <p>
              <strong>Reversibility:</strong> {strategy.reversibility}
            </p>
            <p>
              <strong>Cost:</strong> {strategy.cost}
            </p>
            <p>
              <strong>Uncertainty:</strong> {strategy.uncertaintyNotes}
            </p>
            {strategy.contraindicationFlags.length ? (
              <p>
                <strong>Flags:</strong> {strategy.contraindicationFlags.join(", ")}
              </p>
            ) : null}
            <p>
              <strong>Legal/regulatory:</strong> {strategy.legalNotes}
            </p>
            <p>{strategy.notes}</p>
          </div>
        </div>

        {strategy.sourceLinks.length ? (
          <ul className="source-list" aria-label={`${strategy.name} sources`}>
            {strategy.sourceLinks.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.title}
                </a>
                <span>
                  {source.sourceType}
                  {source.reviewedAt ? ` / reviewed ${source.reviewedAt}` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted-text">No reviewed source links yet.</p>
        )}

        {linkedCaseLogs.length ? (
          <div className="case-log-section" aria-label={`${strategy.name} linked case logs`}>
            <div className="fit-panel-header">
              <h3>Linked case logs</h3>
              <span>n=1 reports, not recommendations</span>
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
                      <dt>Window</dt>
                      <dd>{caseLog.window}</dd>
                    </div>
                    <div>
                      <dt>Adherence</dt>
                      <dd>
                        {caseLog.averageScore === null
                          ? `${caseLog.adherenceCount} check-ins`
                          : `${caseLog.averageScore.toFixed(1)}/5 over ${caseLog.adherenceCount} check-ins`}
                      </dd>
                    </div>
                    <div>
                      <dt>Snapshots</dt>
                      <dd>{caseLog.snapshotCount}</dd>
                    </div>
                    <div>
                      <dt>Review</dt>
                      <dd>{caseLog.reviewStatus}</dd>
                    </div>
                  </dl>
                  <p>
                    <strong>Outcome:</strong> {caseLog.outcomeSummary}
                  </p>
                  <p>
                    <strong>Projection:</strong> {caseLog.projectionSummary}
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
          <p className="muted-text">No linked case logs yet.</p>
        )}
      </section>
    );
  }

  return (
    <section className="panel anchor-panel" id="strategy-corpus">
      <div className="panel-header">
        <h2>Strategy explorer</h2>
        <p>
          Start with an outcome, then inspect one efficacy/risk map. This is not
          advice, coaching, dosing, or a protocol generator.
        </p>
      </div>

      <div className="intent-layout">
        <aside className="intent-list" aria-label="Desired body changes">
          <h3>I want to...</h3>
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
              <span className="field-label">Search this outcome</span>
              <input
                aria-label="Search selected outcome strategies"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label className="field compact-field">
              <span className="field-label">Confidence</span>
              <select
                aria-label="Filter selected outcome confidence"
                value={evidenceFilter}
                onChange={(event) => setEvidenceFilter(event.target.value)}
              >
                <option value="all">All confidence</option>
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
                aria-label={`${selectedOutcome.label} efficacy and risk plot`}
              >
                <span className="axis-label axis-label-y">Risk</span>
                <span className="axis-label axis-label-x">Efficacy</span>
                {visibleStrategies.map((strategy) => (
                  <button
                    key={strategy.name}
                    className={`strategy-point labeled-point confidence-${confidenceLabel(strategy.evidence).replaceAll(" ", "-")}`}
                    style={{
                      left: `${strategy.efficacy}%`,
                      bottom: `${strategy.risk}%`
                    }}
                    type="button"
                    aria-label={`${strategy.name}: efficacy ${strategy.efficacy}, risk ${strategy.risk}, ${confidenceLabel(strategy.evidence)}`}
                    onClick={() => openStrategy(strategy)}
                  >
                    <span>{strategy.name}</span>
                  </button>
                ))}
              </div>

              <div className="confidence-legend" aria-label="Confidence legend">
                <span><i className="confidence-higher-confidence" /> Higher confidence</span>
                <span><i className="confidence-mixed-confidence" /> Mixed confidence</span>
                <span><i className="confidence-low-confidence" /> Low confidence</span>
              </div>

              {!visibleStrategies.length ? (
                <p className="muted-text">No strategies match this outcome filter.</p>
              ) : null}
            </>
          ) : (
            <p className="muted-text">No strategy outcomes loaded.</p>
          )}
        </div>
      </div>

      <div className="corpus-actions">
        <button type="button" onClick={handleExportCorpus}>
          Export corpus JSON
        </button>
        <label className="file-button">
          Import corpus JSON
          <input
            aria-label="Import strategy corpus"
            type="file"
            accept="application/json"
            onChange={handleImportCorpus}
          />
        </label>
        <button type="button" onClick={handleResetCorpus}>
          Reset seed corpus
        </button>
      </div>

      {corpusStatus ? (
        <p className="muted-text" role="status" aria-live="polite">
          {corpusStatus}
        </p>
      ) : null}

      <p className="muted-text">
        Loaded {corpusOutcomes.length} outcome(s) with {sourceCount} reviewed
        source link(s) and {corpusCaseLogs.length} case log(s).
      </p>

      {selectedStrategyResult ? (
        <div className="strategy-modal-backdrop" role="presentation">
          <dialog className="strategy-modal" open aria-label="Strategy synopsis">
            <button
              className="modal-close"
              type="button"
              aria-label="Close strategy synopsis"
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
                <dt>Efficacy</dt>
                <dd>{selectedStrategyResult.strategy.efficacy}/100</dd>
              </div>
              <div>
                <dt>Risk</dt>
                <dd>{selectedStrategyResult.strategy.risk}/100</dd>
              </div>
              <div>
                <dt>Confidence</dt>
                <dd>{confidenceLabel(selectedStrategyResult.strategy.evidence)}</dd>
              </div>
            </dl>
            <p>{selectedStrategyResult.strategy.notes}</p>
            {caseLogsForStrategy(selectedStrategyResult.strategy, corpusCaseLogs).length ? (
              <p className="muted-text">
                {caseLogsForStrategy(selectedStrategyResult.strategy, corpusCaseLogs).length} linked case log(s).
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
              Open strategy page
            </button>
          </dialog>
        </div>
      ) : null}

      {pendingHighRiskSlug ? (
        <div className="strategy-modal-backdrop" role="presentation">
          <dialog className="strategy-modal high-risk-ack" open aria-label="High-risk strategy acknowledgment">
            <button
              className="modal-close"
              type="button"
              aria-label="Cancel high-risk strategy"
              onClick={() => setPendingHighRiskSlug("")}
            >
              x
            </button>
            <h3>High-risk information</h3>
            <p>
              This entry is surgical, pharmaceutical, clinical, or otherwise
              high risk. It is excluded from personalization and is not a
              recommendation, protocol, or dosing guide.
            </p>
            <div className="button-row">
              <button className="button" type="button" onClick={handleAcknowledgeHighRisk}>
                Show informational entry
              </button>
              <button className="button" type="button" onClick={() => setPendingHighRiskSlug("")}>
                Keep closed
              </button>
            </div>
          </dialog>
        </div>
      ) : null}
    </section>
  );
}
