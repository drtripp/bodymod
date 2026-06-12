import re
from datetime import datetime
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
    fieldReferences: dict[str, str] = Field(default_factory=dict)
    fieldDatasetIds: dict[str, str] = Field(default_factory=dict)
    reference: str = "Approximate adult reference model, not NHANES-calibrated"
    datasetId: str = "bodymod-dummy-reference-v1"


class ReferenceSexDistribution(BaseModel):
    mean: float
    sd: float = Field(gt=0)
    n: int | None = None
    percentiles: dict[str, float] = Field(default_factory=dict)


class ReferenceFieldDistribution(BaseModel):
    label: str
    unit: str
    min: float
    max: float
    male: ReferenceSexDistribution
    female: ReferenceSexDistribution
    datasetId: str | None = None
    reference: str | None = None
    source: str | None = None
    sourceUrl: str | None = None
    sourceTable: str | None = None
    sdMethod: str | None = None
    isVetted: bool = False
    notes: list[str] = Field(default_factory=list)


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


class AttractivenessEvidenceSource(BaseModel):
    id: str
    title: str
    year: int = Field(ge=1900, le=2100)
    url: str
    sourceType: str = "peer-reviewed"
    reviewStatus: str = "needs Dawson review"


class AttractivenessEvidenceMetric(BaseModel):
    id: str
    label: str
    category: str
    goalPresetIds: list[str] = []
    metricKeys: list[str] = []
    verdict: Literal["ship-reference", "do-not-ship", "needs-research"]
    evidenceStrength: str
    populationReference: str
    userFacingSummary: str
    framing: str
    sourceIds: list[str] = []
    requiresHumanReview: bool = True
    notes: list[str] = []


class AttractivenessEvidenceLibrary(BaseModel):
    version: int
    reference: str
    notes: list[str] = []
    sources: list[AttractivenessEvidenceSource]
    metrics: list[AttractivenessEvidenceMetric]


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
    movementPattern: str = ""
    equipment: str
    primaryMuscles: list[str]
    secondaryMuscles: list[str] = []
    measurementTargets: list[str] = []
    difficulty: str
    instructions: list[str] = []
    riskNotes: str
    source: str
    sourceLicense: str = ""
    reviewStatus: str = ""


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


class ProductAnalyticsEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=80, pattern=r"^[A-Za-z0-9:_-]+$")
    name: Literal[
        "app_opened",
        "app_interaction",
        "tab_selected",
        "theme_changed",
        "account_opened",
        "snapshot_saved",
        "goal_saved",
        "protocol_saved",
        "diet_logged",
        "share_dashboard_published",
        "backup_exported",
    ]
    surface: Literal[
        "app",
        "body",
        "diet",
        "account",
        "goals",
        "protocols",
        "sharing",
        "backup",
        "settings",
    ] = "app"
    context: Literal[
        "none",
        "desktop",
        "mobile",
        "result",
        "target",
        "gender",
        "scatter",
        "distribution",
        "first-run",
        "signed-in",
        "signed-out",
    ] = "none"
    route: str = Field(default="/", max_length=160)
    anonymousSessionId: str = Field(
        min_length=1,
        max_length=80,
        pattern=r"^analytics-session:[a-f0-9]{16}$",
    )
    release: str = Field(default="", max_length=80)
    userAgentFamily: str = Field(default="Unknown", max_length=40)
    createdAt: str = Field(min_length=1, max_length=40)

    @field_validator("route")
    @classmethod
    def reject_query_or_hash(cls, value: str) -> str:
        if "?" in value or "#" in value:
            raise ValueError("Analytics routes must not include query strings.")
        if value and (not value.startswith("/") or not re.fullmatch(r"/[A-Za-z0-9._/:-]*", value)):
            raise ValueError("Analytics routes must be sanitized paths.")
        return value


class ProductAnalyticsReportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    event: ProductAnalyticsEvent


class ProductAnalyticsReportResponse(BaseModel):
    status: str = "accepted"
    stored: bool = True


class WebPushSubscriptionKeys(BaseModel):
    model_config = ConfigDict(extra="forbid")

    p256dh: str = Field(min_length=16, max_length=512, pattern=r"^[A-Za-z0-9_-]+={0,2}$")
    auth: str = Field(min_length=8, max_length=128, pattern=r"^[A-Za-z0-9_-]+={0,2}$")


class WebPushSubscriptionPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    endpoint: str = Field(min_length=16, max_length=600)
    expirationTime: int | None = Field(default=None, ge=0)
    keys: WebPushSubscriptionKeys

    @field_validator("endpoint")
    @classmethod
    def require_https_endpoint(cls, value: str) -> str:
        if "?" in value or "#" in value:
            raise ValueError("Web push endpoint must not include query strings or fragments.")
        if not value.startswith("https://"):
            raise ValueError("Web push endpoint must use HTTPS.")
        if not re.fullmatch(r"https://[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+", value):
            raise ValueError("Web push endpoint contains unsupported characters.")
        return value


class WebPushSubscriptionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    subscription: WebPushSubscriptionPayload
    context: Literal["trend-stale"] = "trend-stale"
    userAgentFamily: str = Field(default="Unknown", max_length=40)
    createdAt: str = Field(min_length=1, max_length=40)
    nextReminderAfter: str | None = Field(default=None, max_length=40)

    @field_validator("createdAt", "nextReminderAfter")
    @classmethod
    def require_isoish_timestamp(cls, value: str | None) -> str | None:
        if value is None:
            return value
        try:
            datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError as error:
            raise ValueError("Web push timestamps must be ISO-8601 strings.") from error
        return value


class WebPushUnsubscribeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    endpoint: str = Field(min_length=16, max_length=600)
    createdAt: str = Field(min_length=1, max_length=40)

    @field_validator("endpoint")
    @classmethod
    def require_https_endpoint(cls, value: str) -> str:
        return WebPushSubscriptionPayload.require_https_endpoint(value)


class WebPushSubscriptionResponse(BaseModel):
    status: str = "accepted"
    stored: bool = True
    endpointHash: str
    deliveryConfigured: bool = False
    nextReminderAfter: str | None = None


class WebPushUnsubscribeResponse(BaseModel):
    status: str = "revoked"
    revoked: bool = True


class WebPushConfigResponse(BaseModel):
    enabled: bool
    vapidPublicKey: str = ""
    reason: str = ""


class NativePushTokenRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token: str = Field(min_length=16, max_length=4096)
    platform: Literal["ios", "android"]
    context: Literal["trend-stale"] = "trend-stale"
    createdAt: str = Field(min_length=1, max_length=40)
    nextReminderAfter: str | None = Field(default=None, max_length=40)

    @field_validator("token")
    @classmethod
    def require_supported_token(cls, value: str) -> str:
        if not re.fullmatch(r"[A-Za-z0-9._:-]+", value):
            raise ValueError("Native push token contains unsupported characters.")
        return value

    @field_validator("createdAt", "nextReminderAfter")
    @classmethod
    def require_isoish_timestamp(cls, value: str | None) -> str | None:
        if value is None:
            return value
        try:
            datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError as error:
            raise ValueError("Native push timestamps must be ISO-8601 strings.") from error
        return value


class NativePushUnsubscribeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token: str | None = Field(default=None, min_length=16, max_length=4096)
    tokenHash: str | None = Field(default=None, min_length=64, max_length=64, pattern=r"^[a-f0-9]+$")
    createdAt: str = Field(min_length=1, max_length=40)

    @field_validator("token")
    @classmethod
    def require_supported_token(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return NativePushTokenRequest.require_supported_token(value)

    @field_validator("createdAt")
    @classmethod
    def require_isoish_timestamp(cls, value: str) -> str:
        return NativePushTokenRequest.require_isoish_timestamp(value) or value

    @field_validator("tokenHash")
    @classmethod
    def require_token_or_hash(cls, value: str | None) -> str | None:
        return value

    def model_post_init(self, __context: object) -> None:
        if not self.token and not self.tokenHash:
            raise ValueError("Native push unsubscribe needs a token or token hash.")


class NativePushTokenResponse(BaseModel):
    status: str = "accepted"
    stored: bool = True
    tokenHash: str
    deliveryConfigured: bool = False
    nextReminderAfter: str | None = None


class NativePushUnsubscribeResponse(BaseModel):
    status: str = "revoked"
    revoked: bool = True


class EncryptedSyncBlob(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: int = Field(ge=1, le=10)
    algorithm: Literal["AES-GCM"]
    kdf: str = Field(min_length=2, max_length=80)
    salt: str = Field(min_length=8, max_length=256, pattern=r"^[A-Za-z0-9+/=_-]+$")
    iv: str = Field(min_length=8, max_length=128, pattern=r"^[A-Za-z0-9+/=_-]+$")
    ciphertext: str = Field(min_length=16, max_length=2_000_000, pattern=r"^[A-Za-z0-9+/=_-]+$")


class SyncVaultRecord(BaseModel):
    vaultId: str
    revision: int = Field(ge=1)
    deviceId: str
    createdAt: str
    updatedAt: str
    blob: EncryptedSyncBlob


class SyncVaultCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    deviceId: str = Field(min_length=3, max_length=80, pattern=r"^[A-Za-z0-9._:-]+$")
    blob: EncryptedSyncBlob


class SyncVaultCreateResponse(SyncVaultRecord):
    syncToken: str


class SyncVaultTokenRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    syncToken: str = Field(min_length=24, max_length=160, pattern=r"^[A-Za-z0-9._~-]+$")


class SyncVaultUpdateRequest(SyncVaultTokenRequest):
    expectedRevision: int = Field(ge=1)
    deviceId: str = Field(min_length=3, max_length=80, pattern=r"^[A-Za-z0-9._:-]+$")
    blob: EncryptedSyncBlob
    force: bool = False


class PersonalDataTokenRecord(BaseModel):
    tokenId: str
    vaultId: str
    label: str
    scopes: list[Literal["sync-vault:read"]]
    createdAt: str
    expiresAt: str | None = None
    revokedAt: str | None = None


class PersonalDataTokenCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    vaultId: str = Field(min_length=8, max_length=160, pattern=r"^[A-Za-z0-9._~-]+$")
    syncToken: str = Field(min_length=24, max_length=160, pattern=r"^[A-Za-z0-9._~-]+$")
    label: str = Field(
        default="Personal data export",
        min_length=1,
        max_length=80,
        pattern=r"^[A-Za-z0-9 .:_-]+$",
    )
    scopes: list[Literal["sync-vault:read"]] = Field(default_factory=lambda: ["sync-vault:read"])
    expiresAt: str | None = Field(default=None, max_length=40)

    @field_validator("label")
    @classmethod
    def normalize_label(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if not normalized:
            raise ValueError("Personal data token label is required.")
        return normalized

    @field_validator("scopes")
    @classmethod
    def require_read_scope(cls, value: list[str]) -> list[str]:
        if value != ["sync-vault:read"]:
            raise ValueError("Personal data API currently supports only sync-vault:read.")
        return value

    @field_validator("expiresAt")
    @classmethod
    def require_isoish_expiry(cls, value: str | None) -> str | None:
        if value is None:
            return value
        try:
            datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError as error:
            raise ValueError("Personal data token expiry must be an ISO-8601 string.") from error
        return value


class PersonalDataTokenCreateResponse(PersonalDataTokenRecord):
    accessToken: str


class PersonalDataTokenRevokeResponse(BaseModel):
    status: str = "revoked"
    revoked: bool = True


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
