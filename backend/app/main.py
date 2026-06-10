import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.data.clothing_sizes import CLOTHING_SIZE_TABLES
from app.data.exercises import EXERCISE_LIBRARY
from app.data.measurement_guides import MEASUREMENT_GUIDES
from app.data.planning import GOAL_PRESETS, PERSONAS, PROTOCOL_TAXONOMY, PROTOCOL_TEMPLATES
from app.models import ClothingSizeTables
from app.models import ExerciseLibrary
from app.models import MeasurementGuideLibrary
from app.models import MeasurementSet
from app.models import PlanningData
from app.services import build_match_response, get_match_priorities, get_targets

app = FastAPI(title="bodymod api", version="0.1.0")


def allowed_cors_origins() -> list[str]:
    configured_origins = os.getenv("BODYMOD_CORS_ORIGINS", "")
    if configured_origins.strip():
        return [
            origin.strip()
            for origin in configured_origins.split(",")
            if origin.strip()
        ]

    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_cors_origins(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/targets")
def list_targets() -> dict[str, list[dict]]:
    return {"targets": [target.model_dump() for target in get_targets()]}


@app.post("/api/match")
def match_profile(measurements: MeasurementSet, priority: str = "balanced") -> dict:
    return build_match_response(measurements, priority).model_dump()


@app.get("/api/match-priorities")
def match_priorities() -> dict[str, list[dict]]:
    priorities = [priority.model_dump() for priority in get_match_priorities()]
    return {"priorities": priorities}


@app.get("/api/planning")
def planning_data() -> dict:
    return PlanningData.model_validate(
        {
            "personas": PERSONAS,
            "goalPresets": GOAL_PRESETS,
            "protocolTemplates": PROTOCOL_TEMPLATES,
            "protocolTaxonomy": PROTOCOL_TAXONOMY,
        }
    ).model_dump()


@app.get("/api/clothing-sizes")
def clothing_size_tables() -> dict:
    return ClothingSizeTables.model_validate(CLOTHING_SIZE_TABLES).model_dump()


@app.get("/api/exercise-library")
def exercise_library() -> dict:
    return ExerciseLibrary.model_validate(EXERCISE_LIBRARY).model_dump()


@app.get("/api/measurement-guides")
def measurement_guides() -> dict:
    return MeasurementGuideLibrary.model_validate(MEASUREMENT_GUIDES).model_dump()
