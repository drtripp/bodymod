from fastapi.testclient import TestClient

from app.data.clothing_sizes import CLOTHING_SIZE_TABLES
from app.data.exercises import EXERCISE_LIBRARY
from app.data.measurement_guides import MEASUREMENT_GUIDES
from app.data.planning import GOAL_PRESETS, PERSONAS, PROTOCOL_TEMPLATES
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
    assert payload["matches"][0]["similarity"] >= payload["matches"][-1]["similarity"]
    assert all(0 <= match["similarity"] <= 100 for match in payload["matches"])
    assert payload["matches"][0]["explanation"]
    assert "reference" in payload["percentiles"]


def test_planning_endpoint_returns_personas_goals_and_protocols() -> None:
    response = client.get("/api/planning")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["personas"]) == 10
    assert payload["goalPresets"]
    assert payload["protocolTemplates"]
    assert payload["personas"][0]["startingMeasurements"]["height"] >= 120
    assert {
        "create account",
        "save first body snapshot",
        "set shoulder-to-waist goal",
    }.issubset({step.lower() for step in payload["personas"][0]["walkthrough"]})


def test_planning_data_references_are_consistent() -> None:
    goal_ids = {goal["id"] for goal in GOAL_PRESETS}
    protocol_ids = {protocol["id"] for protocol in PROTOCOL_TEMPLATES}

    assert len(PERSONAS) == 10
    assert all(persona["likelyGoals"] for persona in PERSONAS)

    for persona in PERSONAS:
        assert set(persona["likelyGoals"]).issubset(goal_ids)

    for goal in GOAL_PRESETS:
        assert set(goal["suggestedProtocols"]).issubset(protocol_ids)


def test_clothing_size_endpoint_returns_placeholder_tables() -> None:
    response = client.get("/api/clothing-sizes")

    assert response.status_code == 200
    payload = response.json()
    garment_ids = {garment["id"] for garment in payload["garments"]}

    assert payload["version"] == CLOTHING_SIZE_TABLES["version"]
    assert "placeholder adult size bands" in payload["reference"]
    assert {
        "men-tops",
        "women-tops",
        "men-pants",
        "women-pants",
        "dresses",
        "hats",
        "rings",
    }.issubset(garment_ids)
    assert all(garment["bands"] for garment in payload["garments"])


def test_exercise_library_endpoint_returns_seeded_programs() -> None:
    response = client.get("/api/exercise-library")

    assert response.status_code == 200
    payload = response.json()
    exercise_ids = {exercise["id"] for exercise in payload["exercises"]}
    program_ids = {program["id"] for program in payload["programTemplates"]}

    assert payload["version"] == EXERCISE_LIBRARY["version"]
    assert "Dummy workout seed data" in payload["reference"]
    assert {"dumbbell-lateral-raise", "lat-pulldown", "romanian-deadlift"}.issubset(
        exercise_ids
    )
    assert {"upper-lower-foundation", "shape-recomp-starter"}.issubset(program_ids)

    for target in payload["muscleTargets"]:
        assert set(target["exerciseIds"]).issubset(exercise_ids)

    for program in payload["programTemplates"]:
        for day in program["days"]:
            assert day["exercises"]
            assert {item["exerciseId"] for item in day["exercises"]}.issubset(
                exercise_ids
            )


def test_measurement_guides_endpoint_returns_field_guides() -> None:
    response = client.get("/api/measurement-guides")

    assert response.status_code == 200
    payload = response.json()
    guide_fields = {guide["field"] for guide in payload["guides"]}

    assert payload["version"] == MEASUREMENT_GUIDES["version"]
    assert "Dummy measurement how-to guide copy" in payload["reference"]
    assert {
        "height",
        "weight",
        "waistCircumference",
        "bideltoidCircumference",
        "hipCircumference",
    }.issubset(guide_fields)
    assert all(guide["steps"] for guide in payload["guides"])
    assert all(guide["illustration"] for guide in payload["guides"])
