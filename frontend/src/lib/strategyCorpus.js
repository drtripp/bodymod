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

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

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
      ["clinical", "surgical", "pharmaceutical", "medical-adjacent"].includes(sensitivity),
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
      ["clinical", "surgical", "pharmaceutical", "medical-adjacent"].includes(sensitivity),
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

export function parseStrategyCorpusExport(rawValue) {
  const parsed = JSON.parse(rawValue);
  const outcomes = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.outcomes)
      ? parsed.outcomes
      : null;

  return normalizeStrategyOutcomes(outcomes);
}

export function serializeStrategyCorpus(outcomes) {
  return JSON.stringify(
    {
      version: STRATEGY_CORPUS_VERSION,
      exportedAt: new Date().toISOString(),
      outcomes: normalizeStrategyOutcomes(outcomes)
    },
    null,
    2
  );
}

export function loadStrategyCorpus() {
  if (!canUseStorage()) {
    return strategyOutcomes;
  }

  try {
    const rawValue = window.localStorage.getItem(STRATEGY_CORPUS_STORAGE_KEY);
    return rawValue ? parseStrategyCorpusExport(rawValue) : strategyOutcomes;
  } catch (error) {
    return strategyOutcomes;
  }
}

export function persistStrategyCorpus(outcomes) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    STRATEGY_CORPUS_STORAGE_KEY,
    serializeStrategyCorpus(outcomes)
  );
}

export function clearStrategyCorpusOverride() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(STRATEGY_CORPUS_STORAGE_KEY);
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
