from fastapi.testclient import TestClient

from app.data.targets import TARGETS
from app.main import allowed_cors_origins, app


client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_cors_origins_can_be_configured(monkeypatch) -> None:
    monkeypatch.setenv(
        "BODYMOD_CORS_ORIGINS",
        "https://bodymod.example, https://app.bodymod.example ",
    )

    assert allowed_cors_origins() == [
        "https://bodymod.example",
        "https://app.bodymod.example",
    ]


def test_targets_endpoint_returns_curated_profiles() -> None:
    response = client.get("/api/targets")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["targets"]) == len(TARGETS)
    assert {"id", "label", "source_type", "measurements"}.issubset(
        payload["targets"][0].keys()
    )


def test_match_endpoint_returns_ranked_explanations_and_reference() -> None:
    response = client.post("/api/match", json=TARGETS[0]["measurements"])

    assert response.status_code == 200
    payload = response.json()
    assert payload["top_match"]["id"] == TARGETS[0]["id"]
    assert payload["matches"][0]["score"] <= payload["matches"][-1]["score"]
    assert payload["matches"][0]["explanation"]
    assert "reference" in payload["percentiles"]
