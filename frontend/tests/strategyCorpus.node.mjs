import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  acceptStrategyCorpusAgeGate,
  clearStrategyCorpusOverride,
  hasStrategyCorpusOverride,
  isHighRiskStrategy,
  isStrategyCorpusAgeAccepted,
  loadStrategyCorpus,
  loadStrategyCorpusOverride,
  normalizeStrategyCaseLogs,
  normalizeStrategyCorpus,
  normalizeStrategyOutcomes,
  parseStrategyCorpusExport,
  parseStrategyCorpusBundleExport,
  persistStrategyCorpus,
  serializeStrategyCorpus
} from "../src/lib/strategyCorpus.js";
import { createMemoryStorageAdapter } from "../src/lib/storageAdapter.js";

const validOutcome = {
  id: "test-outcome",
  label: "Test Outcome",
  description: "A test outcome for corpus validation.",
  strategies: [
    {
      name: "Reviewed strategy",
      outcome: "test outcome",
      interventionType: "manual research",
      efficacy: 51,
      risk: 22,
      evidence: "moderate",
      reviewStatus: "needs source review",
      sourceLinks: [
        {
          title: "Example source",
          url: "https://example.com/source",
          sourceType: "review article",
          reviewedAt: "2026-05-03"
        }
      ],
      sensitivity: "clinical",
      reversibility: "medium",
      timeHorizon: "months",
      cost: "low",
      claimedMechanism: "Reviewed mechanism text.",
      expectedMagnitude: "Reviewed magnitude text.",
      contraindicationFlags: ["manual review flag", ""],
      legalNotes: "Reviewed legal note.",
      uncertaintyNotes: "Reviewed uncertainty text.",
      caseLogIds: ["case-reviewed-strategy"],
      notes: "Reviewed note."
    }
  ]
};

const validCaseLog = {
  id: "case-reviewed-strategy",
  protocolId: "protocol-reviewed-strategy",
  label: "Reviewed strategy case log",
  strategyName: "Reviewed strategy",
  category: "manual research",
  status: "completed",
  dose: "Neutral tracked exposure summary.",
  frequency: "8 weeks",
  window: "2026-01-01 - 2026-02-26",
  adherenceCount: 6,
  averageScore: 3.5,
  snapshotCount: 2,
  outcomeSummary: "Weight +1.0 kg",
  projectionSummary: "No defensible projection configured.",
  sourceType: "curator-entered",
  reviewStatus: "needs source review",
  notes: "Single case log used for parser coverage.",
  limitations: ["n=1", ""]
};

test("parses the repo corpus template", () => {
  const rawTemplate = fs.readFileSync(new URL("../../strategy-corpus-template.json", import.meta.url), "utf8");
  const outcomes = parseStrategyCorpusExport(rawTemplate);
  const corpus = parseStrategyCorpusBundleExport(rawTemplate);

  assert.equal(outcomes.length, 1);
  assert.equal(outcomes[0].strategies.length, 1);
  assert.equal(outcomes[0].strategies[0].excludedFromPersonalization, true);
  assert.deepEqual(outcomes[0].strategies[0].caseLogIds, ["case-log-slug"]);
  assert.equal(corpus.caseLogs.length, 1);
});

test("normalizes valid imported corpus data", () => {
  const [outcome] = normalizeStrategyOutcomes([validOutcome]);
  const [strategy] = outcome.strategies;

  assert.equal(outcome.id, "test-outcome");
  assert.equal(strategy.sourceCount, 1);
  assert.deepEqual(strategy.contraindicationFlags, ["manual review flag"]);
  assert.deepEqual(strategy.caseLogIds, ["case-reviewed-strategy"]);
  assert.equal(strategy.excludedFromPersonalization, true);
  assert.equal(isHighRiskStrategy(strategy), true);
});

test("normalizes strategy case logs and corpus bundles", () => {
  const corpus = normalizeStrategyCorpus({
    version: 1,
    outcomes: [validOutcome],
    caseLogs: [validCaseLog]
  });
  const [caseLog] = normalizeStrategyCaseLogs([validCaseLog]);

  assert.equal(corpus.caseLogs.length, 1);
  assert.equal(corpus.caseLogs[0].strategyName, "Reviewed strategy");
  assert.equal(corpus.outcomes[0].strategies[0].caseLogIds[0], caseLog.id);
  assert.equal(caseLog.averageScore, 3.5);
  assert.deepEqual(caseLog.limitations, ["n=1"]);
});

test("clamps efficacy and risk scores into plot bounds", () => {
  const rawOutcome = {
    ...validOutcome,
    strategies: [
      {
        ...validOutcome.strategies[0],
        efficacy: 120,
        risk: -20
      }
    ]
  };

  const [outcome] = normalizeStrategyOutcomes([rawOutcome]);

  assert.equal(outcome.strategies[0].efficacy, 100);
  assert.equal(outcome.strategies[0].risk, 0);
});

test("rejects unsupported evidence levels", () => {
  const rawOutcome = {
    ...validOutcome,
    strategies: [
      {
        ...validOutcome.strategies[0],
        evidence: "popular online"
      }
    ]
  };

  assert.throws(
    () => normalizeStrategyOutcomes([rawOutcome]),
    /Unsupported evidence level/
  );
});

test("round-trips serialized corpus exports", () => {
  const serialized = serializeStrategyCorpus([validOutcome], [validCaseLog]);
  const reparsed = parseStrategyCorpusExport(serialized);
  const reparsedBundle = parseStrategyCorpusBundleExport(serialized);

  assert.equal(reparsed[0].label, "Test Outcome");
  assert.equal(reparsed[0].strategies[0].name, "Reviewed strategy");
  assert.equal(reparsedBundle.caseLogs[0].id, "case-reviewed-strategy");
});

test("stores local corpus overrides separately from the bundled seed", () => {
  const adapter = createMemoryStorageAdapter();

  assert.equal(hasStrategyCorpusOverride(adapter), false);
  assert.equal(loadStrategyCorpusOverride(adapter), null);
  assert.ok(loadStrategyCorpus().length >= 8);

  persistStrategyCorpus([validOutcome], [validCaseLog], adapter);
  assert.equal(hasStrategyCorpusOverride(adapter), true);
  assert.equal(loadStrategyCorpusOverride(adapter)[0].id, "test-outcome");

  clearStrategyCorpusOverride(adapter);
  assert.equal(hasStrategyCorpusOverride(adapter), false);
});

test("stores the strategy corpus age gate locally", () => {
  const adapter = createMemoryStorageAdapter();

  assert.equal(isStrategyCorpusAgeAccepted(adapter), false);
  const record = acceptStrategyCorpusAgeGate(adapter);
  assert.equal(record.minimumAge, 18);
  assert.equal(isStrategyCorpusAgeAccepted(adapter), true);
});
