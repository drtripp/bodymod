import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDataExplainerResponse,
  buildLocalDataProfile,
  containsPrescribingRequest,
  selectCorpusCitations
} from "../src/lib/dataExplainer.js";
import { strategyOutcomes } from "../src/lib/strategyCorpus.js";

const privateAccount = {
  id: "acct-private-123",
  email: "private@example.com",
  displayName: "Private User"
};

test("local data explainer summarizes logs and cites relevant corpus without account fields", () => {
  const response = buildDataExplainerResponse({
    question: "What changed for my shoulder waist goal and deltoid training?",
    account: privateAccount,
    currentMeasurements: {
      height: 181,
      weight: 84,
      waistCircumference: 87,
      bideltoidCircumference: 123
    },
    snapshots: [
      {
        id: "snap-private",
        label: "Private baseline label",
        note: "First private note",
        createdAt: "2026-06-01T12:00:00.000Z",
        measurements: { waistCircumference: 90, bideltoidCircumference: 120 }
      }
    ],
    goals: [
      {
        id: "goal-private",
        label: "Improve shoulder-to-waist ratio",
        accountId: privateAccount.id,
        note: "Private goal note",
        startingMeasurements: { waistCircumference: 90, bideltoidCircumference: 120 },
        targetMetrics: { waistCircumference: -4, bideltoidCircumference: 4 }
      }
    ],
    protocols: [
      {
        id: "protocol-private",
        label: "Progressive resistance training",
        accountId: privateAccount.id,
        dose: "Private dose text",
        frequency: "Private frequency text",
        checkIns: [{ adherenceScore: 4, note: "Private adherence note" }]
      }
    ],
    checkIns: [
      {
        id: "checkin-private",
        type: "daily-weight",
        accountId: privateAccount.id,
        weight: 84,
        calories: 2400,
        note: "Low sodium private note",
        createdAt: "2026-06-10T12:00:00.000Z"
      }
    ],
    workoutSessions: [
      {
        id: "workout-private",
        exerciseId: "dumbbell-lateral-raise",
        note: "Strict private reps",
        createdAt: "2026-06-11T12:00:00.000Z"
      }
    ],
    bloodworkResults: [
      {
        id: "blood-private",
        markerId: "ldl-c",
        value: 92,
        note: "Private fasting note",
        collectionDate: "2026-06-10"
      }
    ],
    faceMeasurements: [
      {
        id: "face-private",
        metrics: { midfaceRatio: 0.96 },
        createdAt: "2026-06-12T12:00:00.000Z"
      }
    ],
    strategyCorpus: { outcomes: strategyOutcomes },
    weeklyStreak: { label: "2 week streak" },
    trendWeight: { value: 84.2, delta: -0.3, count: 3 },
    insightDrops: [{ label: "Trend weight is down" }]
  });

  assert.equal(response.status, "answered");
  assert.match(response.answerSummary, /Local data snapshot/);
  assert.ok(response.dataSnapshot.includes("Face scans: 1"));
  assert.ok(response.observations.some((line) => /Improve shoulder-to-waist ratio/.test(line)));
  assert.ok(response.citations.some((citation) => citation.label === "Deltoid hypertrophy block"));
  assert.ok(response.citations.every((citation) => /not a recommendation/i.test(citation.summary)));

  const serialized = JSON.stringify(response);
  assert.doesNotMatch(
    serialized,
    /private@example\.com|acct-private|Private baseline|First private note|Private goal note|Private dose text|Private adherence note|Low sodium private note|Strict private reps|Private fasting note/i
  );
});

test("prescribing and dosing questions apply a hard boundary", () => {
  const response = buildDataExplainerResponse({
    question: "What dose of retinoid or testosterone should I take?",
    currentMeasurements: { weight: 82 },
    strategyCorpus: { outcomes: strategyOutcomes }
  });

  assert.equal(containsPrescribingRequest("What changed for my waist trend?"), false);
  assert.equal(containsPrescribingRequest("What dose of retinoid should I take?"), true);
  assert.equal(response.status, "boundary");
  assert.match(response.answerSummary, /cannot provide dosing, prescribing, diagnosis, or medical instructions/i);
  assert.ok(response.citations.some((citation) => citation.contextOnly));
  assert.ok(response.boundary.includes("does not diagnose"));
});

test("empty local data returns a fallback observation and no forced citations", () => {
  const profile = buildLocalDataProfile();
  const citations = selectCorpusCitations({ question: "What should I review?", strategyCorpus: { outcomes: strategyOutcomes } });
  const response = buildDataExplainerResponse({
    question: "What should I review?",
    strategyCorpus: { outcomes: strategyOutcomes }
  });

  assert.equal(profile.counts.snapshots, 0);
  assert.deepEqual(citations, []);
  assert.equal(response.status, "answered");
  assert.match(response.observations[0], /No account logs are available yet/);
  assert.deepEqual(response.citations, []);
});
