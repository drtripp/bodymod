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
