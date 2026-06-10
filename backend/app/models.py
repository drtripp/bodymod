from typing import Literal

from pydantic import BaseModel, Field


Sex = Literal["male", "female"]


class MeasurementSet(BaseModel):
    height: float = Field(ge=120, le=240)
    weight: float = Field(ge=35, le=250)
    sex: Sex
    headCircumference: float = Field(ge=45, le=70)
    neckCircumference: float = Field(ge=25, le=65)
    biacromialWidth: float = Field(ge=28, le=65)
    bideltoidWidth: float = Field(ge=34, le=85)
    bideltoidCircumference: float = Field(ge=70, le=180)
    armpitCircumference: float = Field(ge=50, le=190)
    nippleCircumference: float = Field(ge=50, le=190)
    underbustCircumference: float = Field(ge=50, le=180)
    waistCircumference: float = Field(ge=45, le=180)
    pantWaistCircumference: float = Field(ge=45, le=190)
    hipCircumference: float = Field(ge=60, le=200)
    upperThighCircumference: float = Field(ge=30, le=110)
    midThighCircumference: float = Field(ge=25, le=95)
    calfCircumference: float = Field(ge=20, le=70)
    bicepCircumference: float = Field(ge=18, le=75)
    upperForearmCircumference: float = Field(ge=15, le=55)
    wristCircumference: float = Field(ge=11, le=30)


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


class PercentileSummary(BaseModel):
    height: int
    waistCircumference: int
    bideltoidCircumference: int
    reference: str = "Approximate adult reference model, not NHANES-calibrated"


class MatchResponse(BaseModel):
    top_match: MatchResult | None
    matches: list[MatchResult]
    percentiles: PercentileSummary


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


class PlanningData(BaseModel):
    personas: list[PersonaProfile]
    goalPresets: list[GoalPreset]
    protocolTemplates: list[ProtocolTemplate]


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
