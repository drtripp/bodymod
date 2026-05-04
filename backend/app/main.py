import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models import MeasurementSet
from app.services import build_match_response, get_targets

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
def match_profile(measurements: MeasurementSet) -> dict:
    return build_match_response(measurements).model_dump()
