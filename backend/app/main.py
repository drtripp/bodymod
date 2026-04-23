from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models import MeasurementSet
from app.services import build_match_response, get_targets

app = FastAPI(title="bodymod api", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
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
