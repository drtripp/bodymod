from fastapi.testclient import TestClient

from app.data.bloodwork import BLOODWORK_LIBRARY
from app.data.clothing_sizes import CLOTHING_SIZE_TABLES
from app.data.entitlements import ENTITLEMENT_CONFIG
from app.data.exercises import EXERCISE_LIBRARY
from app.data.food_usda import USDA_FOOD_LIBRARY
from app.data.measurement_guides import MEASUREMENT_GUIDES
from app.data.planning import GOAL_PRESETS, PERSONAS, PROTOCOL_TEMPLATES
from app.data.procedures import PROCEDURE_LIBRARY
from app.data.reference import REFERENCE_DATA
from app.data.strategy_corpus import STRATEGY_CORPUS
from app.main import allowed_cors_origins, app
from app.measurement_schema import measurement_field_names
from app.repositories import ClientErrorRepository, load_target_seed


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
    assert "ankleCircumference" in payload["percentiles"]["fields"]
    assert payload["percentiles"]["fields"]["height"] == payload["percentiles"]["height"]
    assert "NHANES August 2021-August 2023" in payload["percentiles"]["fieldReferences"]["height"]
    assert "Approximate adult reference model" in payload["percentiles"]["fieldReferences"]["ankleCircumference"]


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


def test_procedure_library_endpoint_returns_review_seed() -> None:
    response = client.get("/api/procedure-library")

    assert response.status_code == 200
    payload = response.json()
    procedure_ids = {item["id"] for item in payload["procedureTypes"]}
    categories = {item["category"] for item in payload["procedureTypes"]}
    schema_fields = set(measurement_field_names())

    assert payload["version"] == PROCEDURE_LIBRARY["version"]
    assert "Dummy procedure taxonomy seed" in payload["reference"]
    assert {
        "large-tattoo-session",
        "piercing-or-dermal",
        "facial-filler",
        "orthognathic-or-jaw-surgery",
        "body-contouring-procedure",
    }.issubset(procedure_ids)
    assert {"tattoo", "piercing", "filler", "surgery"}.issubset(categories)
    assert all(item["requiresHumanReview"] for item in payload["procedureTypes"])
    assert all(item["defaultHealingDays"] > 0 for item in payload["procedureTypes"])
    assert all(item["timeline"] for item in payload["procedureTypes"])
    assert all(
        set(item["affectedFields"]).issubset(schema_fields)
        for item in payload["procedureTypes"]
    )
    assert any(
        item["photoCategory"] == "face" and "side-profile photo stream" in item["caseLogPrompts"]
        for item in payload["procedureTypes"]
    )


def test_bloodwork_library_endpoint_returns_local_only_review_seed() -> None:
    response = client.get("/api/bloodwork-library")

    assert response.status_code == 200
    payload = response.json()
    group_ids = {group["id"] for group in payload["markerGroups"]}
    marker_ids = {marker["id"] for marker in payload["markers"]}

    assert payload["version"] == BLOODWORK_LIBRARY["version"]
    assert "Dummy bloodwork marker library" in payload["reference"]
    assert any("local-only" in note for note in payload["notes"])
    assert {"hormones", "lipids", "metabolic", "thyroid", "inflammation"}.issubset(
        group_ids
    )
    assert {
        "total-testosterone",
        "estradiol",
        "ldl-c",
        "fasting-glucose",
        "tsh",
        "hs-crp",
    }.issubset(marker_ids)
    assert all(marker["groupId"] in group_ids for marker in payload["markers"])
    assert all(marker["requiresHumanReview"] for marker in payload["markers"])
    assert all(marker["unit"] for marker in payload["markers"])
    assert payload["markers"][0]["referenceRanges"]
    assert payload["markers"][0]["referenceRanges"]["male"]["unit"] == "ng/dL"


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
    case_log_ids = {case_log["id"] for case_log in payload["caseLogs"]}
    linked_case_log_ids = {
        case_log_id
        for strategy in all_strategies
        for case_log_id in strategy.get("caseLogIds", [])
    }

    assert payload["version"] == STRATEGY_CORPUS["version"]
    assert "Backend dummy strategy corpus seed" in payload["source"]
    assert len(payload["outcomes"]) == 8
    assert len(payload["caseLogs"]) == 4
    assert linked_case_log_ids
    assert linked_case_log_ids.issubset(case_log_ids)
    assert all(
        {
            "protocolId",
            "strategyName",
            "adherenceCount",
            "outcomeSummary",
            "projectionSummary",
        }.issubset(case_log.keys())
        for case_log in payload["caseLogs"]
    )
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


def test_reference_data_endpoint_returns_mixed_nhanes_and_scaffold_seed() -> None:
    response = client.get("/api/reference-data")

    assert response.status_code == 200
    payload = response.json()

    assert payload["version"] == REFERENCE_DATA["version"]
    assert payload["datasetId"] == "bodymod-dummy-reference-v1+nhanes-2021-2023-adult-anthropometry-v1"
    assert "NHANES August 2021-August 2023 adults" in payload["reference"]
    assert "Unsupported fields retain the existing synthetic scaffold" in payload["source"]
    assert {"height", "weight", "ankleCircumference", "wristCircumference"}.issubset(
        payload["fields"]
    )
    assert payload["fields"]["height"]["isVetted"] is True
    assert payload["fields"]["height"]["datasetId"] == "nhanes-2021-2023-adult-anthropometry-v1"
    assert payload["fields"]["height"]["sourceTable"].startswith("Table 7")
    assert payload["fields"]["height"]["male"]["mean"] == 175.1
    assert payload["fields"]["height"]["female"]["mean"] == 161.2
    assert payload["fields"]["weight"]["male"]["mean"] == 90.3
    assert payload["fields"]["waistCircumference"]["female"]["mean"] == 97.9
    assert payload["fields"]["hipCircumference"]["male"]["percentiles"]["95"] == 129.1
    assert payload["fields"]["ankleCircumference"]["isVetted"] is False
    assert payload["fields"]["ankleCircumference"]["datasetId"] == "bodymod-dummy-reference-v1"
    assert (
        payload["fields"]["height"]["male"]["mean"]
        > payload["fields"]["height"]["female"]["mean"]
    )
    assert payload["fields"]["waistCircumference"]["male"]["sd"] > 0


def test_entitlements_endpoint_keeps_current_tools_free() -> None:
    response = client.get("/api/entitlements")

    assert response.status_code == 200
    payload = response.json()
    feature_ids = {feature["id"] for feature in payload["features"]}

    assert payload["currentTier"] == "free"
    assert payload["waitlist"]["enabled"] is True
    assert payload["referral"]["enabled"] is True
    assert payload["referral"]["rewardLabel"] == "1 Pro month"
    assert payload["referral"]["referrerCreditMonths"] == 1
    assert payload["referral"]["refereeCreditMonths"] == 1
    assert "never gate" in payload["referral"]["disclaimer"]
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


def client_error_payload() -> dict:
    return {
        "event": {
            "id": "client-error:test-1",
            "type": "error",
            "errorName": "TypeError",
            "messageFingerprint": "a1b2c3d4",
            "stackFingerprint": "d4c3b2a1",
            "source": "/assets/index.js",
            "line": 42,
            "column": 7,
            "route": "/workspace",
            "severity": "error",
            "release": "test",
            "userAgentFamily": "Chrome",
            "createdAt": "2026-06-10T12:00:00.000Z",
        }
    }


def test_client_error_endpoint_stores_sanitized_envelope() -> None:
    response = client.post("/api/client-errors", json=client_error_payload())

    assert response.status_code == 202
    assert response.json() == {"status": "accepted", "stored": True}

    stored_events = ClientErrorRepository().list_event_dicts()
    assert len(stored_events) == 1
    assert stored_events[0]["id"] == "client-error:test-1"
    assert stored_events[0]["messageFingerprint"] == "a1b2c3d4"
    assert "message" not in stored_events[0]
    assert "stack" not in stored_events[0]
    assert "measurements" not in stored_events[0]


def test_client_error_endpoint_rejects_raw_error_payload_fields() -> None:
    payload = client_error_payload()
    payload["event"]["message"] = "height 182 weight 74 raw note"
    payload["event"]["stack"] = "TypeError: height 182\n at App"
    payload["event"]["measurements"] = {"height": 182, "weight": 74}

    response = client.post("/api/client-errors", json=payload)

    assert response.status_code == 422


def test_client_error_endpoint_rejects_unsanitized_source_paths() -> None:
    payload = client_error_payload()
    payload["event"]["source"] = "/assets/index.js?m=encoded-measurements"
    payload["event"]["route"] = "/profile/dawson@example.com"

    response = client.post("/api/client-errors", json=payload)

    assert response.status_code == 422


def share_dashboard_payload(title: str = "Mason bodymod dashboard") -> dict:
    return {
        "dashboard": {
            "version": 1,
            "title": title,
            "displayName": "Mason",
            "publishedAt": "2026-06-10T12:00:00Z",
            "privacyNote": "No email or private notes included.",
            "measurements": TARGETS[0]["measurements"],
            "stats": {
                "snapshotCount": 1,
                "checkInCount": 2,
                "goalCount": 1,
                "protocolCount": 1,
                "workoutCount": 1,
                "faceScanCount": 0,
            },
            "snapshots": [
                {
                    "id": "snapshot-1",
                    "label": "Baseline",
                    "createdAt": "2026-06-10T12:00:00Z",
                    "measurements": TARGETS[0]["measurements"],
                }
            ],
            "goals": [
                {
                    "id": "goal-1",
                    "label": "Improve shoulder-to-waist ratio",
                    "category": "shape",
                    "targetDate": "2026-09-01",
                    "targetSource": "Custom target deltas",
                    "progressPercent": 42,
                    "targetDistances": ["Waist: 4.0 cm from target"],
                    "pausedReason": "",
                }
            ],
            "protocols": [
                {
                    "id": "protocol-1",
                    "label": "Progressive resistance training",
                    "category": "training",
                    "status": "active",
                    "adherenceCount": 2,
                    "averageScore": 4.5,
                    "projectionSummary": "Weight planning band available.",
                }
            ],
            "weeklyStreak": {
                "status": "current",
                "count": 2,
                "latestAt": "2026-06-10T12:00:00Z",
            },
            "trendWeight": {
                "value": 86.3,
                "delta": -0.1,
                "count": 4,
            },
        }
    }


def test_share_dashboard_lifecycle_uses_private_revoke_token() -> None:
    created = client.post("/api/share-dashboards", json=share_dashboard_payload())

    assert created.status_code == 201
    created_payload = created.json()
    public_token = created_payload["publicToken"]
    revoke_token = created_payload["revokeToken"]
    assert public_token
    assert revoke_token
    assert created_payload["dashboard"]["displayName"] == "Mason"
    assert "revokeToken" not in client.get(f"/api/share-dashboards/{public_token}").json()

    fetched = client.get(f"/api/share-dashboards/{public_token}")
    assert fetched.status_code == 200
    assert fetched.json()["dashboard"]["goals"][0]["targetDistances"] == [
        "Waist: 4.0 cm from target"
    ]

    rejected = client.put(
        f"/api/share-dashboards/{public_token}",
        json={
            "revokeToken": "wrong-token",
            **share_dashboard_payload("Tampered dashboard"),
        },
    )
    assert rejected.status_code == 403

    updated = client.put(
        f"/api/share-dashboards/{public_token}",
        json={
            "revokeToken": revoke_token,
            **share_dashboard_payload("Updated public dashboard"),
        },
    )
    assert updated.status_code == 200
    assert updated.json()["dashboard"]["title"] == "Updated public dashboard"

    revoked = client.post(
        f"/api/share-dashboards/{public_token}/revoke",
        json={"revokeToken": revoke_token},
    )
    assert revoked.status_code == 200
    assert revoked.json() == {"status": "revoked"}
    assert client.get(f"/api/share-dashboards/{public_token}").status_code == 404
