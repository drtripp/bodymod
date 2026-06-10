from fastapi.testclient import TestClient

from app.data.clothing_sizes import CLOTHING_SIZE_TABLES
from app.data.entitlements import ENTITLEMENT_CONFIG
from app.data.exercises import EXERCISE_LIBRARY
from app.data.food_usda import USDA_FOOD_LIBRARY
from app.data.measurement_guides import MEASUREMENT_GUIDES
from app.data.planning import GOAL_PRESETS, PERSONAS, PROTOCOL_TEMPLATES
from app.data.strategy_corpus import STRATEGY_CORPUS
from app.main import allowed_cors_origins, app
from app.repositories import load_target_seed


client = TestClient(app)
TARGETS = load_target_seed()["targets"]


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
    response = client.post("/api/match?priority=waist-hip", json=TARGETS[0]["measurements"])

    assert response.status_code == 200
    payload = response.json()
    assert payload["top_match"]["id"] == TARGETS[0]["id"]
    assert payload["priority"] == "waist-hip"
    assert payload["matches"][0]["score"] <= payload["matches"][-1]["score"]
    assert payload["matches"][0]["similarity"] >= payload["matches"][-1]["similarity"]
    assert all(0 <= match["similarity"] <= 100 for match in payload["matches"])
    assert payload["matches"][0]["explanation"]
    assert "reference" in payload["percentiles"]


def test_match_endpoint_rate_limits_repeated_requests(monkeypatch) -> None:
    monkeypatch.setenv("BODYMOD_MATCH_RATE_LIMIT_MAX", "2")
    monkeypatch.setenv("BODYMOD_MATCH_RATE_LIMIT_WINDOW_SECONDS", "60")

    first = client.post("/api/match", json=TARGETS[0]["measurements"])
    second = client.post("/api/match", json=TARGETS[0]["measurements"])
    third = client.post("/api/match", json=TARGETS[0]["measurements"])

    assert first.status_code == 200
    assert second.status_code == 200
    assert third.status_code == 429
    assert third.headers["Retry-After"].isdigit()
    assert "Rate limit exceeded" in third.json()["detail"]


def test_match_priorities_endpoint_returns_weighting_presets() -> None:
    response = client.get("/api/match-priorities")

    assert response.status_code == 200
    payload = response.json()
    priority_ids = {priority["id"] for priority in payload["priorities"]}

    assert {"balanced", "shoulders", "waist-hip"}.issubset(priority_ids)
    assert any(priority["fieldMultipliers"] for priority in payload["priorities"])
    assert any(priority["ratioMultipliers"] for priority in payload["priorities"])


def test_planning_endpoint_returns_personas_goals_and_protocols() -> None:
    response = client.get("/api/planning")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["personas"]) == 10
    assert payload["goalPresets"]
    assert payload["protocolTemplates"]
    assert payload["protocolTaxonomy"]
    assert payload["protocolTaxonomy"][0]["doseFields"]
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


def test_strategy_corpus_endpoint_returns_backend_seed() -> None:
    response = client.get("/api/strategy-corpus")

    assert response.status_code == 200
    payload = response.json()
    outcome_ids = {outcome["id"] for outcome in payload["outcomes"]}
    all_strategies = [
        strategy
        for outcome in payload["outcomes"]
        for strategy in outcome["strategies"]
    ]

    assert payload["version"] == STRATEGY_CORPUS["version"]
    assert "Backend dummy strategy corpus seed" in payload["source"]
    assert len(payload["outcomes"]) == 8
    assert {
        "gain-weight",
        "lose-weight",
        "alter-skin",
        "alter-perceived-structure",
    }.issubset(outcome_ids)
    assert any(strategy["name"] == "Orthognathic surgery" for strategy in all_strategies)
    assert any(strategy["sensitivity"] == "surgical" for strategy in all_strategies)
    assert all(strategy["evidence"] for strategy in all_strategies)
    assert all(0 <= strategy["efficacy"] <= 100 for strategy in all_strategies)
    assert all(0 <= strategy["risk"] <= 100 for strategy in all_strategies)
    assert all(
        strategy["excludedFromPersonalization"]
        for strategy in all_strategies
        if strategy["sensitivity"] in {"clinical", "surgical", "pharmaceutical", "medical-adjacent"}
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
        "ankleCircumference",
    }.issubset(guide_fields)
    assert all(guide["steps"] for guide in payload["guides"])
    assert all(guide["illustration"] for guide in payload["guides"])


def test_entitlements_endpoint_keeps_current_tools_free() -> None:
    response = client.get("/api/entitlements")

    assert response.status_code == 200
    payload = response.json()
    feature_ids = {feature["id"] for feature in payload["features"]}

    assert payload["currentTier"] == "free"
    assert payload["waitlist"]["enabled"] is True
    assert set(payload["nonPaywalledFeatureIds"]).issubset(feature_ids)
    assert {
        "measurement-tracking",
        "local-data-export",
        "diet-workout-logs",
    }.issubset(payload["nonPaywalledFeatureIds"])
    assert any(
        feature["tier"] == "pro" and feature["status"] == "preview"
        for feature in payload["features"]
    )
    assert payload["version"] == ENTITLEMENT_CONFIG["version"]


def test_food_search_endpoint_returns_usda_style_dummy_foods() -> None:
    response = client.get("/api/food/search?query=oats")

    assert response.status_code == 200
    payload = response.json()
    food = payload["foods"][0]

    assert payload["version"] == USDA_FOOD_LIBRARY["version"]
    assert "USDA FoodData Central-style" in payload["source"]
    assert food["id"] == "fdc-rolled-oats-dry"
    assert food["source"] == "USDA FoodData Central"
    assert food["macros"]["calories"] == 150
    assert food["micros"]["fiber"] == 4
    assert food["fdcId"].startswith("dummy-")


def test_food_search_endpoint_filters_without_external_api() -> None:
    response = client.get("/api/food/search?query=salmon")

    assert response.status_code == 200
    payload = response.json()

    assert [food["name"] for food in payload["foods"]] == ["Salmon, cooked"]
    assert payload["foods"][0]["micros"]["vitaminD"] > 0
