from pydantic import BaseModel, Field

from .measurement_schema import build_measurement_model


MeasurementSet = build_measurement_model()


class TargetProfile(BaseModel):
    id: str
    label: str
    source_type: str
    notes: str | None = None
    measurements: MeasurementSet


class MatchResult(BaseModel):
    id: str
    label: str
    score: float
    similarity: float = Field(ge=0, le=100)
    notes: str | None = None
    source_type: str
    measurements: MeasurementSet
    explanation: list[str] = []


class MatchPriorityPreset(BaseModel):
    id: str
    label: str
    summary: str
    fieldMultipliers: dict[str, float] = {}
    ratioMultipliers: dict[str, float] = {}
    sexMismatchMultiplier: float = 1.0


class PercentileSummary(BaseModel):
    height: int
    waistCircumference: int
    bideltoidCircumference: int
    reference: str = "Approximate adult reference model, not NHANES-calibrated"


class MatchResponse(BaseModel):
    top_match: MatchResult | None
    matches: list[MatchResult]
    percentiles: PercentileSummary
    priority: str = "balanced"


class PersonaProfile(BaseModel):
    id: str
    label: str
    segment: str
    motivation: str
    startingMeasurements: MeasurementSet
    likelyGoals: list[str] = []
    walkthrough: list[str] = []


class GoalPreset(BaseModel):
    id: str
    label: str
    category: str
    summary: str
    targetMetrics: dict[str, float] = {}
    suggestedProtocols: list[str] = []
    requiresHumanReview: bool = False


class ProtocolTemplate(BaseModel):
    id: str
    label: str
    category: str
    summary: str
    cadence: str
    evidence: str
    riskLevel: str
    requiresHumanReview: bool = False


class ProtocolTaxonomyItem(BaseModel):
    id: str
    label: str
    doseFields: list[str] = []
    adherencePrompt: str
    outcomeMetrics: list[str] = []
    projectionModel: str | None = None
    notes: str | None = None


class PlanningData(BaseModel):
    personas: list[PersonaProfile]
    goalPresets: list[GoalPreset]
    protocolTemplates: list[ProtocolTemplate]
    protocolTaxonomy: list[ProtocolTaxonomyItem] = []


class ClothingSizeBand(BaseModel):
    id: str
    label: str
    min: float
    max: float
    equivalents: dict[str, str] = {}


class ClothingGarmentTable(BaseModel):
    id: str
    label: str
    measurementStrategy: str
    fit: str
    bands: list[ClothingSizeBand]


class ClothingSizeTables(BaseModel):
    version: int
    reference: str
    notes: list[str] = []
    garments: list[ClothingGarmentTable]


class ExerciseSeed(BaseModel):
    id: str
    label: str
    category: str
    equipment: str
    primaryMuscles: list[str]
    secondaryMuscles: list[str] = []
    measurementTargets: list[str] = []
    difficulty: str
    instructions: list[str] = []
    riskNotes: str
    source: str


class ExerciseMuscleTarget(BaseModel):
    id: str
    label: str
    measurementTargets: list[str]
    muscleGroups: list[str]
    exerciseIds: list[str]
    rationale: str


class ProgramExerciseSeed(BaseModel):
    exerciseId: str
    sets: int
    reps: str


class ProgramDaySeed(BaseModel):
    label: str
    exercises: list[ProgramExerciseSeed]


class ProgramTemplateSeed(BaseModel):
    id: str
    label: str
    goalIds: list[str] = []
    summary: str
    days: list[ProgramDaySeed]


class ExerciseLibrary(BaseModel):
    version: int
    reference: str
    notes: list[str] = []
    exercises: list[ExerciseSeed]
    muscleTargets: list[ExerciseMuscleTarget]
    programTemplates: list[ProgramTemplateSeed]


class StrategySourceLink(BaseModel):
    title: str
    url: str
    sourceType: str = "unspecified"
    reviewedAt: str = ""


class StrategySeed(BaseModel):
    name: str
    outcome: str
    interventionType: str
    efficacy: float = Field(ge=0, le=100)
    risk: float = Field(ge=0, le=100)
    evidence: str
    reviewStatus: str
    sourceLinks: list[StrategySourceLink] = Field(default_factory=list)
    sensitivity: str = "low"
    reversibility: str
    timeHorizon: str
    cost: str
    claimedMechanism: str
    expectedMagnitude: str
    contraindicationFlags: list[str] = Field(default_factory=list)
    legalNotes: str
    uncertaintyNotes: str
    excludedFromPersonalization: bool = False
    notes: str


class StrategyOutcomeSeed(BaseModel):
    id: str
    label: str
    description: str
    strategies: list[StrategySeed]


class StrategyCorpusSeed(BaseModel):
    version: int
    source: str
    notes: list[str] = Field(default_factory=list)
    outcomes: list[StrategyOutcomeSeed]


class MeasurementGuide(BaseModel):
    field: str
    label: str
    cadence: str
    illustration: str
    summary: str
    steps: list[str]
    commonMistakes: list[str] = []


class MeasurementGuideLibrary(BaseModel):
    version: int
    reference: str
    notes: list[str] = []
    guides: list[MeasurementGuide]


class EntitlementTier(BaseModel):
    id: str
    label: str
    summary: str


class EntitlementFeature(BaseModel):
    id: str
    label: str
    tier: str
    status: str
    category: str
    summary: str


class EntitlementWaitlist(BaseModel):
    enabled: bool
    storage: str
    message: str


class EntitlementConfig(BaseModel):
    version: int
    currentTier: str = "free"
    source: str
    tiers: list[EntitlementTier]
    features: list[EntitlementFeature]
    nonPaywalledFeatureIds: list[str] = []
    waitlist: EntitlementWaitlist


class FoodMacros(BaseModel):
    calories: float = 0
    protein: float = 0
    carbs: float = 0
    fat: float = 0


class FoodMicros(BaseModel):
    fiber: float = 0
    sugar: float = 0
    sodium: float = 0
    potassium: float = 0
    calcium: float = 0
    iron: float = 0
    magnesium: float = 0
    zinc: float = 0
    vitaminC: float = 0
    vitaminD: float = 0
    vitaminB12: float = 0


class FoodSearchItem(BaseModel):
    id: str
    fdcId: str | None = None
    name: str
    brand: str
    serving: str
    source: str
    keywords: list[str] = []
    macros: FoodMacros
    micros: FoodMicros


class FoodSearchResponse(BaseModel):
    version: int
    source: str
    notes: list[str] = []
    foods: list[FoodSearchItem]
