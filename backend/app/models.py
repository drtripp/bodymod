from typing import Literal

from pydantic import BaseModel, Field


Sex = Literal["male", "female"]


class MeasurementSet(BaseModel):
    height: float = Field(ge=120, le=240)
    weight: float = Field(ge=35, le=250)
    sex: Sex
    shoulders: float = Field(ge=70, le=180)
    underbust: float = Field(ge=50, le=180)
    waist: float = Field(ge=45, le=180)
    hips: float = Field(ge=60, le=200)


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
    measurements: MeasurementSet


class PercentileSummary(BaseModel):
    height: int
    waist: int
    shoulders: int


class MatchResponse(BaseModel):
    top_match: MatchResult | None
    matches: list[MatchResult]
    percentiles: PercentileSummary
