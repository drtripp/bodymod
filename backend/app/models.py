import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

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
    fields: dict[str, int] = Field(default_factory=dict)
    reference: str = "Approximate adult reference model, not NHANES-calibrated"
    datasetId: str = "bodymod-dummy-reference-v1"


class ReferenceSexDistribution(BaseModel):
    mean: float
    sd: float = Field(gt=0)


class ReferenceFieldDistribution(BaseModel):
    label: str
    unit: str
    min: float
    max: float
    male: ReferenceSexDistribution
    female: ReferenceSexDistribution


class PopulationReferenceData(BaseModel):
    version: int
    datasetId: str
    label: str
    reference: str
    source: str
    notes: list[str] = []
    fields: dict[str, ReferenceFieldDistribution]


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


class ProcedureTimelineItem(BaseModel):
    day: int = Field(ge=0)
    label: str
    summary: str


class ProcedureTypeSeed(BaseModel):
    id: str
    label: str
    category: str
    summary: str
    defaultHealingDays: int = Field(ge=1, le=730)
    affectedFields: list[str] = []
    photoCategory: str
    riskLevel: str
    reviewStatus: str
    requiresHumanReview: bool = True
    timeline: list[ProcedureTimelineItem] = []
    caseLogPrompts: list[str] = []


class ProcedureLibrary(BaseModel):
    version: int
    reference: str
    notes: list[str] = []
    procedureTypes: list[ProcedureTypeSeed]


class BloodworkMarkerGroup(BaseModel):
    id: str
    label: str
    summary: str


class BloodworkReferenceRange(BaseModel):
    low: float | None = None
    high: float | None = None
    unit: str


class BloodworkMarker(BaseModel):
    id: str
    label: str
    groupId: str
    unit: str
    summary: str
    referenceRanges: dict[str, BloodworkReferenceRange] = {}
    commonPanels: list[str] = []
    requiresHumanReview: bool = True


class BloodworkLibrary(BaseModel):
    version: int
    reference: str
    notes: list[str] = []
    markerGroups: list[BloodworkMarkerGroup]
    markers: list[BloodworkMarker]


class StrategySourceLink(BaseModel):
    title: str
    url: str
    sourceType: str = "unspecified"
    reviewedAt: str = ""


class StrategyCaseLog(BaseModel):
    id: str
    protocolId: str
    label: str
    strategyName: str
    category: str
    status: str
    dose: str
    frequency: str
    window: str
    adherenceCount: int = Field(ge=0)
    averageScore: float | None = Field(default=None, ge=0, le=5)
    snapshotCount: int = Field(ge=0)
    outcomeSummary: str
    projectionSummary: str
    sourceType: str = "seeded"
    reviewStatus: str = "needs source review"
    notes: str
    limitations: list[str] = Field(default_factory=list)


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
    caseLogIds: list[str] = Field(default_factory=list)
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
    caseLogs: list[StrategyCaseLog] = Field(default_factory=list)


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


class EntitlementReferral(BaseModel):
    enabled: bool
    storage: str
    rewardLabel: str
    referrerCreditMonths: int = Field(ge=0)
    refereeCreditMonths: int = Field(ge=0)
    message: str
    disclaimer: str


class EntitlementConfig(BaseModel):
    version: int
    currentTier: str = "free"
    source: str
    tiers: list[EntitlementTier]
    features: list[EntitlementFeature]
    nonPaywalledFeatureIds: list[str] = []
    waitlist: EntitlementWaitlist
    referral: EntitlementReferral


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


class ClientErrorEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=80, pattern=r"^[A-Za-z0-9:_-]+$")
    type: Literal["error", "unhandledrejection", "resource-error", "manual"]
    errorName: str = Field(default="Error", max_length=80, pattern=r"^[A-Za-z]{0,64}Error$")
    messageFingerprint: str = Field(min_length=8, max_length=24, pattern=r"^[a-f0-9]+$")
    stackFingerprint: str = Field(default="", max_length=24, pattern=r"^[a-f0-9]*$")
    source: str = Field(default="", max_length=160)
    line: int | None = Field(default=None, ge=0, le=10_000_000)
    column: int | None = Field(default=None, ge=0, le=10_000_000)
    route: str = Field(default="/", max_length=160)
    severity: Literal["error", "warning"] = "error"
    release: str = Field(default="", max_length=80)
    userAgentFamily: str = Field(default="Unknown", max_length=40)
    createdAt: str = Field(min_length=1, max_length=40)

    @field_validator("source", "route")
    @classmethod
    def reject_query_or_hash(cls, value: str) -> str:
        if "?" in value or "#" in value:
            raise ValueError("Client error source fields must not include query strings.")
        if value and (not value.startswith("/") or not re.fullmatch(r"/[A-Za-z0-9._/:-]*", value)):
            raise ValueError("Client error source fields must be sanitized paths.")
        return value


class ClientErrorReportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    event: ClientErrorEvent


class ClientErrorReportResponse(BaseModel):
    status: str = "accepted"
    stored: bool = True


class ShareDashboardSnapshot(BaseModel):
    id: str
    label: str = ""
    createdAt: str
    measurements: MeasurementSet


class ShareDashboardGoal(BaseModel):
    id: str
    label: str
    category: str = ""
    targetDate: str = ""
    targetSource: str = ""
    progressPercent: float | None = Field(default=None, ge=0, le=100)
    targetDistances: list[str] = Field(default_factory=list)
    pausedReason: str = ""


class ShareDashboardProtocol(BaseModel):
    id: str
    label: str
    category: str = ""
    status: str = ""
    adherenceCount: int = Field(default=0, ge=0)
    averageScore: float | None = Field(default=None, ge=0, le=5)
    projectionSummary: str = ""


class ShareDashboardProcedure(BaseModel):
    id: str
    label: str
    category: str = ""
    window: str = ""
    healingDays: int = Field(default=0, ge=0)
    snapshotCount: int = Field(default=0, ge=0)
    photoCategory: str = ""
    reviewStatus: str = ""
    summary: str = ""


class ShareDashboardStats(BaseModel):
    snapshotCount: int = Field(default=0, ge=0)
    checkInCount: int = Field(default=0, ge=0)
    goalCount: int = Field(default=0, ge=0)
    protocolCount: int = Field(default=0, ge=0)
    procedureCount: int = Field(default=0, ge=0)
    workoutCount: int = Field(default=0, ge=0)
    faceScanCount: int = Field(default=0, ge=0)


class ShareDashboardPayload(BaseModel):
    version: int = 1
    title: str = "Shared bodymod dashboard"
    displayName: str = ""
    publishedAt: str = ""
    privacyNote: str = ""
    measurements: MeasurementSet
    stats: ShareDashboardStats = Field(default_factory=ShareDashboardStats)
    snapshots: list[ShareDashboardSnapshot] = Field(default_factory=list)
    goals: list[ShareDashboardGoal] = Field(default_factory=list)
    protocols: list[ShareDashboardProtocol] = Field(default_factory=list)
    procedures: list[ShareDashboardProcedure] = Field(default_factory=list)
    weeklyStreak: dict = Field(default_factory=dict)
    trendWeight: dict = Field(default_factory=dict)


class ShareDashboardCreateRequest(BaseModel):
    dashboard: ShareDashboardPayload


class ShareDashboardUpdateRequest(BaseModel):
    revokeToken: str
    dashboard: ShareDashboardPayload


class ShareDashboardRevokeRequest(BaseModel):
    revokeToken: str


class ShareDashboardPublicRecord(BaseModel):
    publicToken: str
    createdAt: str
    updatedAt: str
    dashboard: ShareDashboardPayload


class ShareDashboardCreateResponse(ShareDashboardPublicRecord):
    revokeToken: str
