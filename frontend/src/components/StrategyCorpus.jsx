import { useMemo, useState } from "react";
import {
  clearStrategyCorpusOverride,
  loadStrategyCorpus,
  parseStrategyCorpusExport,
  persistStrategyCorpus,
  serializeStrategyCorpus,
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

export default function StrategyCorpus() {
  const [corpusOutcomes, setCorpusOutcomes] = useState(() => loadStrategyCorpus());
  const [corpusStatus, setCorpusStatus] = useState("");
  const [selectedOutcomeId, setSelectedOutcomeId] = useState(() => corpusOutcomes[0]?.id || "");
  const [query, setQuery] = useState("");
  const [evidenceFilter, setEvidenceFilter] = useState("all");
  const [selectedStrategySlug, setSelectedStrategySlug] = useState("");
  const [detailStrategySlug, setDetailStrategySlug] = useState("");

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
    const blob = new Blob([serializeStrategyCorpus(corpusOutcomes)], {
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
        const importedOutcomes = parseStrategyCorpusExport(String(reader.result || ""));
        setCorpusOutcomes(importedOutcomes);
        persistStrategyCorpus(importedOutcomes);
        setSelectedOutcomeId(importedOutcomes[0]?.id || "");
        setSelectedStrategySlug("");
        setDetailStrategySlug("");
        setQuery("");
        setEvidenceFilter("all");
        setCorpusStatus(`Imported ${importedOutcomes.length} outcome(s).`);
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
    setCorpusOutcomes(strategyOutcomes);
    setSelectedOutcomeId(strategyOutcomes[0]?.id || "");
    setSelectedStrategySlug("");
    setDetailStrategySlug("");
    setQuery("");
    setEvidenceFilter("all");
    setCorpusStatus("Seed corpus restored for this browser.");
  }

  function openStrategy(strategy) {
    setSelectedStrategySlug(strategySlug(strategy));
  }

  if (detailStrategyResult) {
    const { outcome, strategy } = detailStrategyResult;

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

      {corpusStatus ? <p className="muted-text">{corpusStatus}</p> : null}

      <p className="muted-text">
        Loaded {corpusOutcomes.length} outcome(s) with {sourceCount} reviewed
        source link(s).
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
    </section>
  );
}
