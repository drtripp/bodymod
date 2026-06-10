import os

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from app.data.clothing_sizes import CLOTHING_SIZE_TABLES
from app.data.entitlements import ENTITLEMENT_CONFIG
from app.data.exercises import EXERCISE_LIBRARY
from app.data.food_usda import USDA_FOOD_LIBRARY, search_usda_foods
from app.data.measurement_guides import MEASUREMENT_GUIDES
from app.data.planning import GOAL_PRESETS, PERSONAS, PROTOCOL_TAXONOMY, PROTOCOL_TEMPLATES
from app.data.procedures import PROCEDURE_LIBRARY
from app.data.reference import REFERENCE_DATA
from app.data.strategy_corpus import STRATEGY_CORPUS
from app.models import ClothingSizeTables
from app.models import ClientErrorReportRequest
from app.models import ClientErrorReportResponse
from app.models import EntitlementConfig
from app.models import ExerciseLibrary
from app.models import FoodSearchResponse
from app.models import MeasurementGuideLibrary
from app.models import MeasurementSet
from app.models import PlanningData
from app.models import PopulationReferenceData
from app.models import ProcedureLibrary
from app.models import ShareDashboardCreateRequest
from app.models import ShareDashboardCreateResponse
from app.models import ShareDashboardPublicRecord
from app.models import ShareDashboardRevokeRequest
from app.models import ShareDashboardUpdateRequest
from app.models import StrategyCorpusSeed
from app.rate_limit import enforce_match_rate_limit
from app.repositories import ClientErrorRepository, ShareDashboardRepository
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
def match_profile(
    measurements: MeasurementSet,
    priority: str = "balanced",
    _rate_limit: None = Depends(enforce_match_rate_limit),
) -> dict:
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


@app.get("/api/procedure-library")
def procedure_library() -> dict:
    return ProcedureLibrary.model_validate(PROCEDURE_LIBRARY).model_dump()


@app.get("/api/strategy-corpus")
def strategy_corpus() -> dict:
    return StrategyCorpusSeed.model_validate(STRATEGY_CORPUS).model_dump()


@app.get("/api/measurement-guides")
def measurement_guides() -> dict:
    return MeasurementGuideLibrary.model_validate(MEASUREMENT_GUIDES).model_dump()


@app.get("/api/reference-data")
def reference_data() -> dict:
    return PopulationReferenceData.model_validate(REFERENCE_DATA).model_dump()


@app.get("/api/entitlements")
def entitlement_config() -> dict:
    return EntitlementConfig.model_validate(ENTITLEMENT_CONFIG).model_dump()


@app.get("/api/food/search")
def food_search(query: str = "") -> dict:
    return FoodSearchResponse.model_validate(
        {
            "version": USDA_FOOD_LIBRARY["version"],
            "source": USDA_FOOD_LIBRARY["source"],
            "notes": USDA_FOOD_LIBRARY["notes"],
            "foods": search_usda_foods(query),
        }
    ).model_dump()


@app.post(
    "/api/client-errors",
    response_model=ClientErrorReportResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def report_client_error(request: ClientErrorReportRequest) -> dict:
    return ClientErrorRepository().record_event(request.event)


@app.post(
    "/api/share-dashboards",
    response_model=ShareDashboardCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_share_dashboard(request: ShareDashboardCreateRequest) -> dict:
    return ShareDashboardRepository().create_dashboard(request.dashboard)


@app.get(
    "/api/share-dashboards/{public_token}",
    response_model=ShareDashboardPublicRecord,
)
def get_share_dashboard(public_token: str) -> dict:
    dashboard = ShareDashboardRepository().get_public_dashboard(public_token)
    if not dashboard:
        raise HTTPException(status_code=404, detail="Share dashboard not found.")
    return dashboard


@app.put(
    "/api/share-dashboards/{public_token}",
    response_model=ShareDashboardPublicRecord,
)
def update_share_dashboard(public_token: str, request: ShareDashboardUpdateRequest) -> dict:
    try:
        dashboard = ShareDashboardRepository().update_dashboard(
            public_token,
            request.revokeToken,
            request.dashboard,
        )
    except PermissionError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error

    if not dashboard:
        raise HTTPException(status_code=404, detail="Share dashboard not found.")
    return dashboard


@app.post("/api/share-dashboards/{public_token}/revoke")
def revoke_share_dashboard(public_token: str, request: ShareDashboardRevokeRequest) -> dict[str, str]:
    try:
        revoked = ShareDashboardRepository().revoke_dashboard(
            public_token,
            request.revokeToken,
        )
    except PermissionError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error

    if not revoked:
        raise HTTPException(status_code=404, detail="Share dashboard not found.")
    return {"status": "revoked"}
