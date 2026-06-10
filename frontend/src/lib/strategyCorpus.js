import { readJsonSync, removeStoredItemSync, writeJsonSync } from "./storageAdapter.js";

export const strategyEvidenceLevels = [
  "strong",
  "moderate",
  "clinical",
  "situational",
  "anecdotal",
  "unsupported"
];

export const strategyReviewStatuses = [
  "seeded",
  "needs source review",
  "needs clinical review",
  "exclude from personalization"
];

export const STRATEGY_CORPUS_VERSION = 1;
const STRATEGY_CORPUS_STORAGE_KEY = "bodymod:strategy-corpus:v1";
export const STRATEGY_AGE_GATE_KEY = "bodymod:strategy-age-gate:v1";

export const highRiskSensitivityLevels = [
  "clinical",
  "surgical",
  "pharmaceutical",
  "medical-adjacent"
];

function strategy({
  name,
  outcome,
  interventionType,
  efficacy,
  risk,
  evidence,
  reviewStatus = "needs source review",
  sensitivity = "low",
  reversibility,
  timeHorizon,
  cost,
  claimedMechanism,
  expectedMagnitude,
  contraindicationFlags = [],
  legalNotes = "No specific legal note captured.",
  uncertaintyNotes,
  caseLogIds = [],
  notes
}) {
  return {
    name,
    outcome,
    interventionType,
    efficacy,
    risk,
    evidence,
    reviewStatus,
    sourceLinks: [],
    sourceCount: 0,
    sensitivity,
    reversibility,
    timeHorizon,
    cost,
    claimedMechanism,
    expectedMagnitude,
    contraindicationFlags,
    legalNotes,
    uncertaintyNotes,
    excludedFromPersonalization:
      reviewStatus === "exclude from personalization" ||
      highRiskSensitivityLevels.includes(sensitivity),
    caseLogIds,
    notes
  };
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clampScore(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    throw new Error("Strategy efficacy and risk must be numeric.");
  }

  return Math.min(100, Math.max(0, numericValue));
}

function stringField(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function stringArray(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim())
    : [];
}

function numberField(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nullableNumberField(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeStrategyCaseLogs(rawCaseLogs) {
  if (!Array.isArray(rawCaseLogs)) {
    return [];
  }

  return rawCaseLogs.map((rawCaseLog) => {
    if (!isObject(rawCaseLog)) {
      throw new Error("Each case log must be an object.");
    }

    const id = stringField(rawCaseLog.id);
    const strategyName = stringField(rawCaseLog.strategyName);
    const label = stringField(rawCaseLog.label);

    if (!id || !strategyName || !label) {
      throw new Error("Each case log needs id, strategyName, and label.");
    }

    return {
      id,
      protocolId: stringField(rawCaseLog.protocolId, id),
      label,
      strategyName,
      category: stringField(rawCaseLog.category, "unspecified"),
      status: stringField(rawCaseLog.status, "unknown"),
      dose: stringField(rawCaseLog.dose, "Not captured."),
      frequency: stringField(rawCaseLog.frequency, "Not captured."),
      window: stringField(rawCaseLog.window, "open"),
      adherenceCount: Math.max(0, Math.round(numberField(rawCaseLog.adherenceCount))),
      averageScore: nullableNumberField(rawCaseLog.averageScore),
      snapshotCount: Math.max(0, Math.round(numberField(rawCaseLog.snapshotCount))),
      outcomeSummary: stringField(rawCaseLog.outcomeSummary, "No outcome summary captured."),
      projectionSummary: stringField(rawCaseLog.projectionSummary, "No defensible projection configured."),
      sourceType: stringField(rawCaseLog.sourceType, "seeded"),
      reviewStatus: stringField(rawCaseLog.reviewStatus, "needs source review"),
      notes: stringField(rawCaseLog.notes, "No notes captured."),
      limitations: stringArray(rawCaseLog.limitations)
    };
  });
}

function normalizeStrategy(rawStrategy) {
  if (!isObject(rawStrategy)) {
    throw new Error("Each strategy must be an object.");
  }

  const name = stringField(rawStrategy.name);
  const outcome = stringField(rawStrategy.outcome);
  const interventionType = stringField(rawStrategy.interventionType);
  const evidence = stringField(rawStrategy.evidence, "unsupported");
  const reviewStatus = stringField(rawStrategy.reviewStatus, "needs source review");
  const sensitivity = stringField(rawStrategy.sensitivity, "low");

  if (!name || !outcome || !interventionType) {
    throw new Error("Each strategy needs name, outcome, and interventionType.");
  }

  if (!strategyEvidenceLevels.includes(evidence)) {
    throw new Error(`Unsupported evidence level: ${evidence}`);
  }

  if (!strategyReviewStatuses.includes(reviewStatus)) {
    throw new Error(`Unsupported review status: ${reviewStatus}`);
  }

  const sourceLinks = Array.isArray(rawStrategy.sourceLinks)
    ? rawStrategy.sourceLinks
        .filter((source) => isObject(source) && stringField(source.url))
        .map((source) => ({
          title: stringField(source.title, stringField(source.url)),
          url: stringField(source.url),
          sourceType: stringField(source.sourceType, "unspecified"),
          reviewedAt: stringField(source.reviewedAt)
        }))
    : [];

  return {
    name,
    outcome,
    interventionType,
    efficacy: clampScore(rawStrategy.efficacy),
    risk: clampScore(rawStrategy.risk),
    evidence,
    reviewStatus,
    sourceLinks,
    sourceCount: sourceLinks.length,
    sensitivity,
    reversibility: stringField(rawStrategy.reversibility, "unknown"),
    timeHorizon: stringField(rawStrategy.timeHorizon, "unknown"),
    cost: stringField(rawStrategy.cost, "unknown"),
    claimedMechanism: stringField(rawStrategy.claimedMechanism, "Not yet reviewed."),
    expectedMagnitude: stringField(rawStrategy.expectedMagnitude, "Not yet reviewed."),
    contraindicationFlags: stringArray(rawStrategy.contraindicationFlags),
    legalNotes: stringField(rawStrategy.legalNotes, "No specific legal note captured."),
    uncertaintyNotes: stringField(rawStrategy.uncertaintyNotes, "Not yet reviewed."),
    excludedFromPersonalization:
      Boolean(rawStrategy.excludedFromPersonalization) ||
      reviewStatus === "exclude from personalization" ||
      highRiskSensitivityLevels.includes(sensitivity),
    caseLogIds: stringArray(rawStrategy.caseLogIds),
    notes: stringField(rawStrategy.notes, "No notes captured.")
  };
}

export function normalizeStrategyOutcomes(rawOutcomes) {
  if (!Array.isArray(rawOutcomes)) {
    throw new Error("Strategy corpus must contain an outcomes array.");
  }

  return rawOutcomes.map((rawOutcome) => {
    if (!isObject(rawOutcome)) {
      throw new Error("Each outcome must be an object.");
    }

    const id = stringField(rawOutcome.id);
    const label = stringField(rawOutcome.label);
    const strategies = Array.isArray(rawOutcome.strategies)
      ? rawOutcome.strategies.map(normalizeStrategy)
      : [];

    if (!id || !label || !strategies.length) {
      throw new Error("Each outcome needs id, label, and at least one strategy.");
    }

    return {
      id,
      label,
      description: stringField(rawOutcome.description, "No description captured."),
      strategies
    };
  });
}

export function normalizeStrategyCorpus(rawCorpus) {
  const rawOutcomes = Array.isArray(rawCorpus)
    ? rawCorpus
    : Array.isArray(rawCorpus?.outcomes)
      ? rawCorpus.outcomes
      : null;

  return {
    version: Number(rawCorpus?.version) || STRATEGY_CORPUS_VERSION,
    source: stringField(rawCorpus?.source, "Bundled strategy corpus seed."),
    notes: stringArray(rawCorpus?.notes),
    outcomes: normalizeStrategyOutcomes(rawOutcomes),
    caseLogs: normalizeStrategyCaseLogs(rawCorpus?.caseLogs)
  };
}

export function parseStrategyCorpusExport(rawValue) {
  const parsed = JSON.parse(rawValue);

  return normalizeStrategyCorpus(parsed).outcomes;
}

export function parseStrategyCorpusBundleExport(rawValue) {
  return normalizeStrategyCorpus(JSON.parse(rawValue));
}

export function serializeStrategyCorpus(outcomes, caseLogs = []) {
  return JSON.stringify(
    {
      version: STRATEGY_CORPUS_VERSION,
      exportedAt: new Date().toISOString(),
      outcomes: normalizeStrategyOutcomes(outcomes),
      caseLogs: normalizeStrategyCaseLogs(caseLogs)
    },
    null,
    2
  );
}

export function loadStrategyCorpus() {
  return loadStrategyCorpusOverride() || strategyOutcomes;
}

export function loadStrategyCorpusBundle(adapter) {
  return (
    loadStrategyCorpusBundleOverride(adapter) || {
      version: STRATEGY_CORPUS_VERSION,
      source: "Bundled strategy corpus seed.",
      notes: [],
      outcomes: strategyOutcomes,
      caseLogs: strategyCaseLogs
    }
  );
}

export function loadStrategyCorpusOverride(adapter) {
  return loadStrategyCorpusBundleOverride(adapter)?.outcomes || null;
}

export function loadStrategyCorpusBundleOverride(adapter) {
  try {
    const parsed = readJsonSync(STRATEGY_CORPUS_STORAGE_KEY, null, adapter);
    return parsed ? normalizeStrategyCorpus(parsed) : null;
  } catch (error) {
    return null;
  }
}

export function hasStrategyCorpusOverride(adapter) {
  return Boolean(loadStrategyCorpusBundleOverride(adapter));
}

export function persistStrategyCorpus(outcomes, caseLogsOrAdapter, maybeAdapter) {
  const caseLogs = Array.isArray(caseLogsOrAdapter) ? caseLogsOrAdapter : [];
  const adapter = Array.isArray(caseLogsOrAdapter) ? maybeAdapter : caseLogsOrAdapter;

  writeJsonSync(
    STRATEGY_CORPUS_STORAGE_KEY,
    {
      version: STRATEGY_CORPUS_VERSION,
      exportedAt: new Date().toISOString(),
      outcomes: normalizeStrategyOutcomes(outcomes),
      caseLogs: normalizeStrategyCaseLogs(caseLogs)
    },
    adapter
  );
}

export function clearStrategyCorpusOverride(adapter) {
  removeStoredItemSync(STRATEGY_CORPUS_STORAGE_KEY, adapter);
}

export function isStrategyCorpusAgeAccepted(adapter) {
  const parsed = readJsonSync(STRATEGY_AGE_GATE_KEY, null, adapter);
  return parsed?.accepted === true && parsed?.minimumAge === 18;
}

export function acceptStrategyCorpusAgeGate(adapter) {
  const record = {
    accepted: true,
    minimumAge: 18,
    acceptedAt: new Date().toISOString()
  };
  writeJsonSync(STRATEGY_AGE_GATE_KEY, record, adapter);
  return record;
}

export function isHighRiskStrategy(strategy = {}) {
  return (
    Number(strategy.risk || 0) >= 75 ||
    highRiskSensitivityLevels.includes(strategy.sensitivity) ||
    strategy.reviewStatus === "needs clinical review" ||
    strategy.reviewStatus === "exclude from personalization" ||
    strategy.excludedFromPersonalization === true
  );
}

export const strategyOutcomes = [
  {
    id: "gain-weight",
    label: "Gain Weight",
    description: "Ways people attempt to increase total body mass or visual size.",
    strategies: [
      strategy({
        name: "Calorie surplus with resistance training",
        outcome: "gain weight",
        interventionType: "training and nutrition",
        efficacy: 82,
        risk: 24,
        evidence: "strong",
        reviewStatus: "seeded",
        reversibility: "high",
        timeHorizon: "months",
        cost: "low",
        claimedMechanism: "Positive energy balance plus progressive overload supports muscle and body-mass gain.",
        expectedMagnitude: "Gradual change over months; magnitude depends on training history and adherence.",
        uncertaintyNotes: "Outcome quality varies with program, sleep, appetite, genetics, and surplus size.",
        caseLogIds: ["case-surplus-resistance-12-week"],
        notes: "Best-supported route for adding body mass, with outcome quality dependent on programming, recovery, and consistency."
      }),
      strategy({
        name: "Mass-gainer supplement use",
        outcome: "gain weight",
        interventionType: "supplement",
        efficacy: 48,
        risk: 32,
        evidence: "situational",
        reversibility: "high",
        timeHorizon: "weeks to months",
        cost: "medium",
        claimedMechanism: "Convenient calories may make a surplus easier for users with low appetite.",
        expectedMagnitude: "Indirect; effect depends on whether total calories actually increase.",
        uncertaintyNotes: "Often confounded by total diet, training, and product composition.",
        notes: "Potentially useful as a calorie vehicle, but not meaningfully distinct from food without a real intake change."
      })
    ]
  },
  {
    id: "lose-weight",
    label: "Lose Weight",
    description: "Ways people attempt to reduce total body mass or visible fatness.",
    strategies: [
      strategy({
        name: "Calorie deficit with protein target",
        outcome: "lose weight",
        interventionType: "nutrition",
        efficacy: 84,
        risk: 28,
        evidence: "strong",
        reviewStatus: "seeded",
        reversibility: "high",
        timeHorizon: "weeks to months",
        cost: "low",
        claimedMechanism: "Sustained energy deficit reduces body mass while protein helps preserve lean tissue.",
        expectedMagnitude: "Gradual weight reduction while the deficit is maintained.",
        uncertaintyNotes: "Adherence, hunger, activity compensation, and baseline health change results.",
        caseLogIds: ["case-protein-deficit-10-week"],
        notes: "Strong evidence for weight reduction; risk increases with aggressive deficits or poor nutrient coverage."
      }),
      strategy({
        name: "Diuretic-style water manipulation",
        outcome: "temporary scale or visual change",
        interventionType: "acute manipulation",
        efficacy: 46,
        risk: 72,
        evidence: "situational",
        reviewStatus: "exclude from personalization",
        sensitivity: "medical-adjacent",
        reversibility: "high",
        timeHorizon: "hours to days",
        cost: "low",
        claimedMechanism: "Short-term fluid shifts can change scale weight and perceived definition.",
        expectedMagnitude: "Temporary appearance or scale change, not tissue loss.",
        contraindicationFlags: ["hydration risk", "electrolyte risk", "medical condition risk"],
        legalNotes: "May intersect with sport weight-cut rules or medical supervision requirements.",
        uncertaintyNotes: "Risk can rise quickly based on context, substances, heat, and baseline health.",
        notes: "Can create short-lived appearance changes but carries meaningful dehydration and electrolyte risk."
      })
    ]
  },
  {
    id: "increase-shoulder-ratio",
    label: "Increase Shoulder Ratio",
    description: "Ways people attempt to make shoulders look wider relative to the waist.",
    strategies: [
      strategy({
        name: "Deltoid hypertrophy block",
        outcome: "increase shoulder ratio",
        interventionType: "training",
        efficacy: 68,
        risk: 26,
        evidence: "moderate",
        reviewStatus: "seeded",
        reversibility: "medium",
        timeHorizon: "months",
        cost: "low",
        claimedMechanism: "Targeted hypertrophy can increase visible shoulder muscle mass.",
        expectedMagnitude: "Visible but bounded by frame width and training response.",
        uncertaintyNotes: "Genetics, exercise selection, and injury history matter.",
        caseLogIds: ["case-deltoid-block-16-week"],
        notes: "Can alter shoulder-to-waist appearance, bounded by frame width and training response."
      }),
      strategy({
        name: "Shoulder implant surgery",
        outcome: "increase shoulder ratio",
        interventionType: "surgery",
        efficacy: 70,
        risk: 86,
        evidence: "clinical",
        reviewStatus: "needs clinical review",
        sensitivity: "surgical",
        reversibility: "low",
        timeHorizon: "weeks to months",
        cost: "very high",
        claimedMechanism: "Implants can add localized apparent width or contour.",
        expectedMagnitude: "Potentially large localized change.",
        contraindicationFlags: ["surgical risk", "infection risk", "revision risk"],
        uncertaintyNotes: "Aesthetic outcome, complications, and long-term maintenance are highly individualized.",
        notes: "A high-review surgical category that should never be turned into a recommendation flow."
      })
    ]
  },
  {
    id: "decrease-waist",
    label: "Decrease Waist Measurement",
    description: "Ways people attempt to reduce waist circumference or apparent waist size.",
    strategies: [
      strategy({
        name: "Waist-focused fat loss",
        outcome: "decrease waist measurement",
        interventionType: "nutrition and activity",
        efficacy: 62,
        risk: 34,
        evidence: "moderate",
        reviewStatus: "seeded",
        reversibility: "medium",
        timeHorizon: "months",
        cost: "low",
        claimedMechanism: "Overall fat reduction may reduce waist circumference.",
        expectedMagnitude: "Variable and dependent on total fat loss and fat distribution.",
        uncertaintyNotes: "Spot reduction claims remain weak; body-fat distribution is not fully controllable.",
        notes: "Overall fat loss may reduce waist size; spot reduction claims remain weak."
      }),
      strategy({
        name: "Cosmetic body contouring",
        outcome: "change localized contour",
        interventionType: "surgery",
        efficacy: 74,
        risk: 78,
        evidence: "clinical",
        reviewStatus: "needs clinical review",
        sensitivity: "surgical",
        reversibility: "low",
        timeHorizon: "weeks to months",
        cost: "high",
        claimedMechanism: "Procedural removal or alteration of localized tissue can change contour.",
        expectedMagnitude: "Potentially large localized visual effect.",
        contraindicationFlags: ["surgical risk", "anesthesia risk", "revision risk"],
        uncertaintyNotes: "Results vary by provider, anatomy, healing, and expectations.",
        notes: "Potentially large visible effect, but invasive options require professional evaluation and carry procedural risk."
      })
    ]
  },
  {
    id: "whiten-teeth",
    label: "Whiten Teeth",
    description: "Ways people attempt to change tooth color or visible brightness.",
    strategies: [
      strategy({
        name: "Professional teeth whitening",
        outcome: "whiten teeth",
        interventionType: "clinical cosmetic",
        efficacy: 72,
        risk: 30,
        evidence: "clinical",
        reviewStatus: "needs clinical review",
        sensitivity: "clinical",
        reversibility: "medium",
        timeHorizon: "days to weeks",
        cost: "medium",
        claimedMechanism: "Peroxide-based whitening can reduce some extrinsic and intrinsic staining.",
        expectedMagnitude: "Visible shade change for many users, depending on stain type.",
        contraindicationFlags: ["tooth sensitivity", "existing dental disease"],
        uncertaintyNotes: "Existing restorations, enamel condition, and stain type limit results.",
        notes: "Often effective for extrinsic discoloration; sensitivity and enamel concerns should be reviewed professionally."
      })
    ]
  },
  {
    id: "alter-skin",
    label: "Alter Skin Appearance",
    description: "Ways people attempt to change visible texture, clarity, or aging markers.",
    strategies: [
      strategy({
        name: "Topical retinoid skin protocol",
        outcome: "alter skin texture",
        interventionType: "topical medication",
        efficacy: 64,
        risk: 42,
        evidence: "clinical",
        reviewStatus: "needs clinical review",
        sensitivity: "clinical",
        reversibility: "medium",
        timeHorizon: "months",
        cost: "low to medium",
        claimedMechanism: "Retinoids affect epidermal turnover and collagen-related pathways.",
        expectedMagnitude: "Gradual texture and acne-related change for some users.",
        contraindicationFlags: ["pregnancy concern", "irritation risk", "photosensitivity"],
        uncertaintyNotes: "Formulation, tolerability, skin condition, and supervision affect suitability.",
        notes: "Evidence-supported for several skin texture concerns, but irritation and contraindications matter."
      })
    ]
  },
  {
    id: "alter-hair-density",
    label: "Alter Hair Density",
    description: "Ways people attempt to change scalp hair density or hairline presentation.",
    strategies: [
      strategy({
        name: "Hair transplantation",
        outcome: "alter hair density",
        interventionType: "surgery",
        efficacy: 78,
        risk: 66,
        evidence: "clinical",
        reviewStatus: "needs clinical review",
        sensitivity: "surgical",
        reversibility: "low",
        timeHorizon: "months to year",
        cost: "high",
        claimedMechanism: "Donor follicles are surgically relocated to alter visible density.",
        expectedMagnitude: "Durable visible density or hairline change when graft survival is good.",
        contraindicationFlags: ["surgical risk", "scarring risk", "donor-area limitation"],
        uncertaintyNotes: "Depends on donor supply, hair characteristics, provider skill, and future hair loss.",
        notes: "Can create durable cosmetic change, with surgical, cost, donor-area, and expectation-management constraints."
      })
    ]
  },
  {
    id: "alter-perceived-structure",
    label: "Alter Perceived Structure",
    description: "Ways people attempt to change perceived bone structure, posture, or frame.",
    strategies: [
      strategy({
        name: "Posture and mobility work",
        outcome: "change apparent frame",
        interventionType: "movement practice",
        efficacy: 42,
        risk: 18,
        evidence: "moderate",
        reviewStatus: "seeded",
        reversibility: "high",
        timeHorizon: "weeks to months",
        cost: "low",
        claimedMechanism: "Motor control, mobility, and strength changes can alter resting presentation.",
        expectedMagnitude: "Small to moderate presentation change, not skeletal remodeling.",
        uncertaintyNotes: "Effect depends on baseline posture, symptoms, adherence, and expectations.",
        caseLogIds: ["case-posture-mobility-8-week"],
        notes: "Can change presentation and comfort, but does not remodel bone structure."
      }),
      strategy({
        name: "Orthognathic surgery",
        outcome: "alter facial bone relationship",
        interventionType: "surgery",
        efficacy: 88,
        risk: 90,
        evidence: "clinical",
        reviewStatus: "needs clinical review",
        sensitivity: "surgical",
        reversibility: "low",
        timeHorizon: "months to years",
        cost: "very high",
        claimedMechanism: "Surgical repositioning of jaw structures can change skeletal relationship and appearance.",
        expectedMagnitude: "Potentially major structural change.",
        contraindicationFlags: ["surgical risk", "nerve risk", "occlusion risk", "recovery burden"],
        uncertaintyNotes: "Medical indication, planning, provider skill, and healing strongly affect outcomes.",
        notes: "Potentially major structural change; medical indication, specialist planning, and risk review are central."
      }),
      strategy({
        name: "Facial filler contouring",
        outcome: "alter facial soft tissue",
        interventionType: "injectable cosmetic",
        efficacy: 58,
        risk: 62,
        evidence: "clinical",
        reviewStatus: "needs clinical review",
        sensitivity: "clinical",
        reversibility: "medium",
        timeHorizon: "days to months",
        cost: "medium to high",
        claimedMechanism: "Injected filler changes soft-tissue volume and contour.",
        expectedMagnitude: "Localized soft-tissue contour change that usually requires maintenance.",
        contraindicationFlags: ["vascular risk", "migration risk", "aesthetic complication risk"],
        uncertaintyNotes: "Outcome and risk depend on anatomy, product, injection site, and provider skill.",
        notes: "Can change perceived structure through soft tissue, with vascular, aesthetic, and maintenance risks."
      })
    ]
  }
];

export const strategyCaseLogs = normalizeStrategyCaseLogs([
  {
    id: "case-surplus-resistance-12-week",
    protocolId: "seed-protocol-surplus-resistance",
    label: "12-week surplus plus progressive lifting",
    strategyName: "Calorie surplus with resistance training",
    category: "training and nutrition",
    status: "completed",
    dose: "Moderate calorie surplus with four resistance sessions weekly",
    frequency: "12 weeks",
    window: "2026-01-08 - 2026-04-02",
    adherenceCount: 11,
    averageScore: 4.1,
    snapshotCount: 4,
    outcomeSummary: "Weight +3.8 kg, waist +1.2 cm, bideltoid Circ +2.0 cm",
    projectionSummary: "NIDDK/Hall-inspired dynamic planning band: +3.1 kg over 84 days",
    sourceType: "seeded completed protocol",
    reviewStatus: "dummy data for product validation",
    notes: "Prototype case log showing how a completed local protocol can attach to a strategy without exposing photos or raw account data.",
    limitations: [
      "Single-person report, not generalizable.",
      "Diet adherence and training progression are self-reported.",
      "No clinical or coaching recommendation is implied."
    ]
  },
  {
    id: "case-protein-deficit-10-week",
    protocolId: "seed-protocol-protein-deficit",
    label: "10-week protein-supported deficit",
    strategyName: "Calorie deficit with protein target",
    category: "nutrition",
    status: "completed",
    dose: "Conservative calorie deficit with a daily protein target",
    frequency: "10 weeks",
    window: "2026-02-03 - 2026-04-14",
    adherenceCount: 9,
    averageScore: 3.8,
    snapshotCount: 3,
    outcomeSummary: "Weight -4.4 kg, waist -5.1 cm, hip -1.3 cm",
    projectionSummary: "NIDDK/Hall-inspired dynamic planning band: -3.7 kg over 70 days",
    sourceType: "seeded completed protocol",
    reviewStatus: "dummy data for product validation",
    notes: "Example of a defensible-projection case log where the observed weight change can be compared with a planning band.",
    limitations: [
      "Single-person report, not a prediction for another user.",
      "Calorie intake and body measurements are self-logged.",
      "Does not assess medical appropriateness of dieting."
    ]
  },
  {
    id: "case-deltoid-block-16-week",
    protocolId: "seed-protocol-deltoid-block",
    label: "16-week deltoid specialization block",
    strategyName: "Deltoid hypertrophy block",
    category: "training",
    status: "completed",
    dose: "Two direct deltoid sessions plus normal upper-body training weekly",
    frequency: "16 weeks",
    window: "2025-11-10 - 2026-03-02",
    adherenceCount: 14,
    averageScore: 4.3,
    snapshotCount: 5,
    outcomeSummary: "Bideltoid Circ +2.7 cm, waist +0.3 cm, weight +1.1 kg",
    projectionSummary: "No defensible projection configured.",
    sourceType: "seeded completed protocol",
    reviewStatus: "dummy data for product validation",
    notes: "Training-focused case log for the shoulder-ratio outcome; it records measured changes without claiming a guaranteed hypertrophy response.",
    limitations: [
      "Self-selected training history and genetics heavily affect results.",
      "Circumference changes can include measurement noise and non-muscle tissue.",
      "Exercise selection is informational, not programming advice."
    ]
  },
  {
    id: "case-posture-mobility-8-week",
    protocolId: "seed-protocol-posture-mobility",
    label: "8-week posture and mobility practice",
    strategyName: "Posture and mobility work",
    category: "movement practice",
    status: "completed",
    dose: "Short mobility and motor-control practice most days",
    frequency: "8 weeks",
    window: "2026-03-01 - 2026-04-26",
    adherenceCount: 8,
    averageScore: 3.6,
    snapshotCount: 3,
    outcomeSummary: "No skeletal measurements changed meaningfully; user-reported presentation improved.",
    projectionSummary: "No defensible projection configured.",
    sourceType: "seeded completed protocol",
    reviewStatus: "dummy data for product validation",
    notes: "Example non-curved case log for a strategy where the app should show observations rather than forecasting measurements.",
    limitations: [
      "Presentation changes are hard to measure with tape data.",
      "Pain or mobility issues require qualified assessment.",
      "The entry is not evidence of skeletal remodeling."
    ]
  }
]);
