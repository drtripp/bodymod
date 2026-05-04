import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  normalizeStrategyOutcomes,
  parseStrategyCorpusExport,
  serializeStrategyCorpus
} from "../src/lib/strategyCorpus.js";

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
      notes: "Reviewed note."
    }
  ]
};

test("parses the repo corpus template", () => {
  const rawTemplate = fs.readFileSync(new URL("../../strategy-corpus-template.json", import.meta.url), "utf8");
  const outcomes = parseStrategyCorpusExport(rawTemplate);

  assert.equal(outcomes.length, 1);
  assert.equal(outcomes[0].strategies.length, 1);
  assert.equal(outcomes[0].strategies[0].excludedFromPersonalization, true);
});

test("normalizes valid imported corpus data", () => {
  const [outcome] = normalizeStrategyOutcomes([validOutcome]);
  const [strategy] = outcome.strategies;

  assert.equal(outcome.id, "test-outcome");
  assert.equal(strategy.sourceCount, 1);
  assert.deepEqual(strategy.contraindicationFlags, ["manual review flag"]);
  assert.equal(strategy.excludedFromPersonalization, true);
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
  const serialized = serializeStrategyCorpus([validOutcome]);
  const reparsed = parseStrategyCorpusExport(serialized);

  assert.equal(reparsed[0].label, "Test Outcome");
  assert.equal(reparsed[0].strategies[0].name, "Reviewed strategy");
});

