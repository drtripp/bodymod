import {
  buildGoalProgress,
  goalMetricLabels
} from "./goalTargets.js";

export const DATA_EXPLAINER_BOUNDARY =
  "Local preview only. This does not diagnose, prescribe, recommend dosing, or replace qualified medical care.";

export const DATA_EXPLAINER_REVIEW_NOTE =
  "Production AI prompts, provider choice, Pro access, and prompt-boundary copy still require human review before ship.";

const STOP_WORDS = new Set([
  "a",
  "about",
  "and",
  "are",
  "as",
  "at",
  "be",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "review",
  "should",
  "that",
  "the",
  "to",
  "use",
  "what",
  "with"
]);

const PRESCRIBING_PATTERNS = [
  /\b(dose|dosage|prescribe|prescription|rx)\b/i,
  /\bhow\s+(much|many)\s+(mg|milligrams?|units?|iu|cc|ml)\b/i,
  /\b(should|can)\s+i\s+(take|inject|start|stack)\b/i,
  /\b(take|inject|start|stack)\s+.*\b(testosterone|steroid|retinoid|tretinoin|minoxidil|finasteride|semaglutide|tirzepatide|peptide|hormone|medication|drug)\b/i,
  /\b(testosterone|steroid|trt|retinoid|tretinoin|minoxidil|finasteride|semaglutide|tirzepatide|peptide|hormone)\s+.*\b(take|inject|dose|dosage|mg|milligram|unit|iu|cycle)\b/i
];

const METRIC_FALLBACK_LABELS = {
  height: ["Height", "cm"],
  weight: ["Weight", "kg"],
  waistCircumference: ["Waist", "cm"],
  hipCircumference: ["Hip", "cm"],
  bideltoidCircumference: ["Bideltoid Circ", "cm"],
  chestCircumference: ["Chest", "cm"],
  neckCircumference: ["Neck", "cm"],
  bicepCircumference: ["Bicep Circ", "cm"],
  upperThighCircumference: ["Upper Thigh Circ", "cm"]
};

const EVIDENCE_WEIGHT = {
  strong: 6,
  moderate: 5,
  clinical: 4,
  situational: 3,
  anecdotal: 2,
  unsupported: 1
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function timestampMs(value) {
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function latestRecord(records = []) {
  return safeArray(records)
    .slice()
    .sort((left, right) => timestampMs(right.createdAt || right.date) - timestampMs(left.createdAt || left.date))[0] || null;
}

function formatDate(value) {
  const timestamp = timestampMs(value);
  return timestamp ? new Date(timestamp).toISOString().slice(0, 10) : "undated";
}

function metricLabel(key) {
  return (goalMetricLabels[key] || METRIC_FALLBACK_LABELS[key] || [key, ""])[0];
}

function metricUnit(key) {
  return (goalMetricLabels[key] || METRIC_FALLBACK_LABELS[key] || ["", ""])[1];
}

function tokenize(...values) {
  return values
    .flatMap((value) =>
      String(value || "")
        .toLowerCase()
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .split(/[^a-z0-9]+/g)
    )
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function uniqueTokens(...values) {
  return new Set(tokenize(...values));
}

function overlapScore(tokens, values, weight = 1) {
  if (!tokens.size) {
    return 0;
  }

  const candidateTokens = uniqueTokens(...values);
  let score = 0;
  for (const token of candidateTokens) {
    if (tokens.has(token)) {
      score += weight;
    }
  }

  return score;
}

function strategyIsContextOnly(strategy = {}) {
  return (
    strategy.excludedFromPersonalization === true ||
    Number(strategy.risk || 0) >= 70 ||
    ["clinical", "surgical", "pharmaceutical", "medical-adjacent"].includes(strategy.sensitivity) ||
    strategy.reviewStatus === "needs clinical review" ||
    strategy.reviewStatus === "exclude from personalization"
  );
}

function flattenStrategies(strategyCorpus = {}) {
  const outcomes = Array.isArray(strategyCorpus)
    ? strategyCorpus
    : safeArray(strategyCorpus.outcomes);

  return outcomes.flatMap((outcome) =>
    safeArray(outcome.strategies).map((strategy) => ({
      outcomeId: outcome.id || "",
      outcomeLabel: outcome.label || "Corpus outcome",
      outcomeDescription: outcome.description || "",
      strategy
    }))
  );
}

function dataTerms({ goals = [], protocols = [], currentMeasurements = {}, faceMeasurements = [] } = {}) {
  const metricTerms = Object.keys(currentMeasurements || {})
    .filter((key) => numberValue(currentMeasurements[key]) !== null)
    .flatMap((key) => [key, metricLabel(key)]);

  const faceTerms = safeArray(faceMeasurements).length
    ? ["face", "facial", "midface", "canthal", "jaw", "symmetry", "profile"]
    : [];

  return {
    goalTerms: uniqueTokens(
      ...safeArray(goals).flatMap((goal) => [
        goal.label,
        goal.goalId,
        goal.goalPresetId,
        ...Object.keys(goal.targetMetrics || {}).map(metricLabel)
      ])
    ),
    protocolTerms: uniqueTokens(
      ...safeArray(protocols).flatMap((protocol) => [
        protocol.label,
        protocol.category,
        protocol.templateId,
        protocol.interventionType
      ])
    ),
    metricTerms: uniqueTokens(...metricTerms, ...faceTerms)
  };
}

export function containsPrescribingRequest(question = "") {
  return PRESCRIBING_PATTERNS.some((pattern) => pattern.test(String(question || "")));
}

export function buildLocalDataProfile({
  currentMeasurements = {},
  snapshots = [],
  goals = [],
  protocols = [],
  checkIns = [],
  workoutSessions = [],
  procedures = [],
  bloodworkResults = [],
  photos = [],
  faceMeasurements = []
} = {}) {
  const measuredFields = Object.entries(currentMeasurements || {})
    .filter(([, value]) => numberValue(value) !== null)
    .map(([key]) => metricLabel(key));
  const latestSnapshot = latestRecord(snapshots);
  const latestCheckIn = latestRecord(checkIns);
  const latestBloodwork = latestRecord(bloodworkResults);
  const latestFaceScan = latestRecord(faceMeasurements);

  return {
    counts: {
      snapshots: safeArray(snapshots).length,
      goals: safeArray(goals).length,
      protocols: safeArray(protocols).length,
      checkIns: safeArray(checkIns).length,
      workoutSessions: safeArray(workoutSessions).length,
      procedures: safeArray(procedures).length,
      bloodworkResults: safeArray(bloodworkResults).length,
      photos: safeArray(photos).length,
      faceMeasurements: safeArray(faceMeasurements).length
    },
    measuredFields,
    latest: {
      snapshotDate: latestSnapshot ? formatDate(latestSnapshot.createdAt) : null,
      checkInDate: latestCheckIn ? formatDate(latestCheckIn.createdAt) : null,
      bloodworkDate: latestBloodwork ? formatDate(latestBloodwork.collectionDate || latestBloodwork.createdAt) : null,
      faceScanDate: latestFaceScan ? formatDate(latestFaceScan.createdAt) : null
    }
  };
}

export function selectCorpusCitations({
  question = "",
  goals = [],
  protocols = [],
  currentMeasurements = {},
  faceMeasurements = [],
  strategyCorpus = {}
} = {}) {
  const questionTerms = uniqueTokens(question);
  const terms = dataTerms({ goals, protocols, currentMeasurements, faceMeasurements });
  const candidates = flattenStrategies(strategyCorpus).map((candidate) => {
    const strategy = candidate.strategy || {};
    const searchable = [
      candidate.outcomeId,
      candidate.outcomeLabel,
      candidate.outcomeDescription,
      strategy.name,
      strategy.outcome,
      strategy.interventionType,
      strategy.evidence,
      strategy.claimedMechanism,
      strategy.expectedMagnitude,
      strategy.notes
    ];
    const questionScore = overlapScore(questionTerms, searchable, 5);
    const goalScore = overlapScore(terms.goalTerms, searchable, 3);
    const protocolScore = overlapScore(terms.protocolTerms, searchable, 4);
    const metricScore = overlapScore(terms.metricTerms, searchable, 2);
    const evidenceScore = EVIDENCE_WEIGHT[strategy.evidence] || 1;
    const score = questionScore + goalScore + protocolScore + metricScore;

    return {
      candidate,
      score,
      evidenceScore,
      contextOnly: strategyIsContextOnly(strategy)
    };
  });

  return candidates
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      if (left.contextOnly !== right.contextOnly) {
        return left.contextOnly ? 1 : -1;
      }
      if (right.evidenceScore !== left.evidenceScore) {
        return right.evidenceScore - left.evidenceScore;
      }
      return Number(left.candidate.strategy.risk || 0) - Number(right.candidate.strategy.risk || 0);
    })
    .slice(0, 3)
    .map(({ candidate, contextOnly }) => {
      const strategy = candidate.strategy;
      return {
        label: strategy.name,
        outcome: candidate.outcomeLabel,
        evidence: strategy.evidence,
        reviewStatus: strategy.reviewStatus,
        risk: Number(strategy.risk || 0),
        contextOnly,
        summary: `Corpus context, not a recommendation. ${strategy.notes || strategy.expectedMagnitude || "Review this entry before applying it."}`
      };
    });
}

function dataSnapshotLines(profile) {
  return [
    `Snapshots: ${profile.counts.snapshots}`,
    `Goals: ${profile.counts.goals}`,
    `Protocols: ${profile.counts.protocols}`,
    `Check-ins: ${profile.counts.checkIns}`,
    `Workouts: ${profile.counts.workoutSessions}`,
    `Procedures: ${profile.counts.procedures}`,
    `Bloodwork results: ${profile.counts.bloodworkResults}`,
    `Photos: ${profile.counts.photos}`,
    `Face scans: ${profile.counts.faceMeasurements}`
  ];
}

function goalObservation(goal, currentMeasurements) {
  const progress = buildGoalProgress(goal, currentMeasurements);
  if (!progress) {
    return `${goal.label || "Saved goal"} is saved, but it needs target metrics and current measurements before progress can be summarized.`;
  }

  const rows = progress.rows
    .slice(0, 2)
    .map((row) => `${row.label} ${Math.round(row.progress)}% (${row.targetDistance})`)
    .join("; ");

  return `${goal.label || "Saved goal"}: ${Math.round(progress.average)}% average progress. ${rows}.`;
}

function protocolObservation(protocols = []) {
  const activeProtocols = safeArray(protocols).filter((protocol) => protocol.status !== "archived");
  if (!activeProtocols.length) {
    return null;
  }

  const withCheckIns = activeProtocols.filter((protocol) => safeArray(protocol.checkIns).length);
  const averageScores = withCheckIns.flatMap((protocol) =>
    safeArray(protocol.checkIns)
      .map((checkIn) => numberValue(checkIn.adherenceScore))
      .filter((value) => value !== null)
  );
  const average =
    averageScores.length
      ? averageScores.reduce((total, value) => total + value, 0) / averageScores.length
      : null;

  return average === null
    ? `${activeProtocols.length} active protocol(s) are logged; add adherence check-ins to compare execution against outcomes.`
    : `${activeProtocols.length} active protocol(s) are logged with ${average.toFixed(1)}/5 average adherence.`;
}

function bloodworkObservation(bloodworkResults = []) {
  const latestBloodwork = latestRecord(bloodworkResults);
  if (!latestBloodwork) {
    return null;
  }

  return `Latest bloodwork row is ${latestBloodwork.markerId || "a marker"} from ${formatDate(latestBloodwork.collectionDate || latestBloodwork.createdAt)}. Interpret lab context with a qualified clinician.`;
}

function workoutObservation(workoutSessions = []) {
  const sessions = safeArray(workoutSessions);
  if (!sessions.length) {
    return null;
  }

  const exerciseIds = new Set(sessions.map((session) => session.exerciseId).filter(Boolean));
  return `${sessions.length} workout session(s) cover ${exerciseIds.size || 1} tracked movement(s).`;
}

function faceObservation(faceMeasurements = []) {
  const scans = safeArray(faceMeasurements);
  if (!scans.length) {
    return null;
  }

  return `${scans.length} local face scan(s) are saved for measurement logging. Side-profile interpretation still needs a profile-specific model review.`;
}

function buildObservations({
  profile,
  currentMeasurements = {},
  snapshots = [],
  goals = [],
  protocols = [],
  checkIns = [],
  workoutSessions = [],
  bloodworkResults = [],
  faceMeasurements = [],
  weeklyStreak = null,
  trendWeight = null,
  insightDrops = []
} = {}) {
  const observations = [];

  if (profile.latest.snapshotDate) {
    observations.push(`Latest saved snapshot date: ${profile.latest.snapshotDate}.`);
  } else if (profile.measuredFields.length) {
    observations.push(`Current measured fields available: ${profile.measuredFields.slice(0, 5).join(", ")}.`);
  }

  if (trendWeight) {
    const direction = trendWeight.delta < -0.05 ? "down" : trendWeight.delta > 0.05 ? "up" : "flat";
    observations.push(
      `Trend weight is ${direction}: ${trendWeight.value.toFixed(1)} kg across ${trendWeight.count} daily log(s).`
    );
  } else if (safeArray(checkIns).length) {
    observations.push(`${safeArray(checkIns).length} check-in(s) are logged; add daily weight rows to calculate trend weight.`);
  }

  if (weeklyStreak?.label) {
    observations.push(`Weekly check-in cadence: ${weeklyStreak.label}.`);
  }

  for (const goal of safeArray(goals).slice(0, 2)) {
    observations.push(goalObservation(goal, currentMeasurements));
  }

  const protocolSummary = protocolObservation(protocols);
  if (protocolSummary) {
    observations.push(protocolSummary);
  }

  const workoutSummary = workoutObservation(workoutSessions);
  if (workoutSummary) {
    observations.push(workoutSummary);
  }

  const bloodworkSummary = bloodworkObservation(bloodworkResults);
  if (bloodworkSummary) {
    observations.push(bloodworkSummary);
  }

  const faceSummary = faceObservation(faceMeasurements);
  if (faceSummary) {
    observations.push(faceSummary);
  }

  for (const insight of safeArray(insightDrops).slice(0, 2)) {
    const label = stringValue(insight.label || insight.message);
    if (label) {
      observations.push(`Recent local insight: ${label}`);
    }
  }

  if (!observations.length) {
    observations.push("No account logs are available yet. Save a snapshot, goal, check-in, or face scan before asking for trend context.");
  }

  return observations.slice(0, 8);
}

function nextQuestions({ status, profile, citations }) {
  const questions = [];

  if (profile.counts.goals) {
    questions.push("Which saved goal moved most since the last snapshot?");
  } else {
    questions.push("What goal should I define before the next check-in?");
  }

  if (profile.counts.protocols) {
    questions.push("Which protocol has enough adherence data to review?");
  } else {
    questions.push("What corpus-backed protocol categories match my current goal?");
  }

  if (profile.counts.faceMeasurements) {
    questions.push("What changed across my saved face metric logs?");
  }

  if (status === "boundary" || citations.some((citation) => citation.contextOnly)) {
    questions.push("Which items are safe to discuss as context only with a professional?");
  }

  return questions.slice(0, 4);
}

export function buildDataExplainerResponse({
  question = "",
  currentMeasurements = {},
  snapshots = [],
  goals = [],
  protocols = [],
  checkIns = [],
  workoutSessions = [],
  procedures = [],
  bloodworkResults = [],
  photos = [],
  faceMeasurements = [],
  strategyCorpus = {},
  weeklyStreak = null,
  trendWeight = null,
  insightDrops = []
} = {}) {
  const status = containsPrescribingRequest(question) ? "boundary" : "answered";
  const profile = buildLocalDataProfile({
    currentMeasurements,
    snapshots,
    goals,
    protocols,
    checkIns,
    workoutSessions,
    procedures,
    bloodworkResults,
    photos,
    faceMeasurements
  });
  const citations = selectCorpusCitations({
    question,
    goals,
    protocols,
    currentMeasurements,
    faceMeasurements,
    strategyCorpus
  });
  const observations = buildObservations({
    profile,
    currentMeasurements,
    snapshots,
    goals,
    protocols,
    checkIns,
    workoutSessions,
    bloodworkResults,
    faceMeasurements,
    weeklyStreak,
    trendWeight,
    insightDrops
  });
  const answerSummary =
    status === "boundary"
      ? "I cannot provide dosing, prescribing, diagnosis, or medical instructions. I can summarize your local logs and cite corpus context for review."
      : `Local data snapshot: ${profile.counts.snapshots} snapshot(s), ${profile.counts.goals} goal(s), ${profile.counts.protocols} protocol(s), ${profile.counts.checkIns} check-in(s), and ${profile.counts.faceMeasurements} face scan(s).`;

  return {
    status,
    boundary: DATA_EXPLAINER_BOUNDARY,
    reviewNote: DATA_EXPLAINER_REVIEW_NOTE,
    answerSummary,
    dataSnapshot: dataSnapshotLines(profile),
    observations,
    citations,
    nextQuestions: nextQuestions({ status, profile, citations })
  };
}
