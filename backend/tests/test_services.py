from app.models import MeasurementSet
from app.measurement_schema import load_measurement_schema
from app.percentiles import estimate_percentiles, normal_percentile
from app.repositories import load_target_seed
from app.services import (
    build_match_response,
    get_targets,
    resolve_match_priority,
    score_match,
    score_parts,
    similarity_from_distance,
)

TARGETS = load_target_seed()["targets"]


def measurement(index: int = 0) -> MeasurementSet:
    return MeasurementSet.model_validate(TARGETS[index]["measurements"])


def test_exact_target_match_scores_zero() -> None:
    current = measurement(0)
    target = get_targets()[0]

    assert score_match(current, target) == 0


def test_similarity_mapping_matches_calibration_anchors() -> None:
    assert similarity_from_distance(0.0) == 100.0
    assert 94.5 <= similarity_from_distance(0.139) <= 95.5
    assert 39.5 <= similarity_from_distance(0.941) <= 40.5
    assert 95.5 <= similarity_from_distance(0.12) <= 96.5


def test_build_match_response_is_ranked_and_explained() -> None:
    response = build_match_response(measurement(0))

    assert response.top_match is not None
    assert response.top_match.id == TARGETS[0]["id"]
    assert response.top_match.similarity == 100.0
    assert response.matches == sorted(response.matches, key=lambda item: item.score)
    assert response.matches == sorted(response.matches, key=lambda item: item.similarity, reverse=True)
    assert response.matches[1].explanation
    assert all(0 < match.similarity <= 100 for match in response.matches)


def test_score_includes_ratio_distance() -> None:
    current = measurement(0)
    target = get_targets()[0]

    altered = current.model_copy(
        update={
            "bideltoidCircumference": current.bideltoidCircumference + 8,
            "waistCircumference": current.waistCircumference + 8,
        }
    )

    assert score_match(altered, target) > score_match(current, target)
    labels = [part[0] for part in score_parts(altered, target)]
    assert "shoulder / waist" in labels
    assert "waist / hip" in labels


def test_match_priority_presets_change_score_weights() -> None:
    current = measurement(0)
    target = get_targets()[0]
    altered = current.model_copy(
        update={
            "bideltoidCircumference": current.bideltoidCircumference + 10,
            "waistCircumference": current.waistCircumference + 10,
            "hipCircumference": current.hipCircumference + 10,
        }
    )

    balanced_parts = dict(
        (label, score_part)
        for label, _signed_delta, score_part in score_parts(altered, target, "balanced")
    )
    shoulder_parts = dict(
        (label, score_part)
        for label, _signed_delta, score_part in score_parts(altered, target, "shoulders")
    )
    waist_hip_parts = dict(
        (label, score_part)
        for label, _signed_delta, score_part in score_parts(altered, target, "waist-hip")
    )

    assert shoulder_parts["shoulder mass"] > balanced_parts["shoulder mass"]
    assert shoulder_parts["shoulder / waist"] > balanced_parts["shoulder / waist"]
    assert waist_hip_parts["waist"] > balanced_parts["waist"]
    assert waist_hip_parts["waist / hip"] > balanced_parts["waist / hip"]
    assert score_match(altered, target, "unknown") == score_match(altered, target, "balanced")
    assert resolve_match_priority("unknown").id == "balanced"


def test_match_response_records_selected_priority() -> None:
    response = build_match_response(measurement(0), "waist-hip")

    assert response.priority == "waist-hip"
    assert response.matches == sorted(response.matches, key=lambda item: item.score)


def test_normal_percentile_is_monotonic() -> None:
    low = normal_percentile(160, mean=176, standard_deviation=7.5)
    middle = normal_percentile(176, mean=176, standard_deviation=7.5)
    high = normal_percentile(192, mean=176, standard_deviation=7.5)

    assert low < middle < high


def test_estimated_percentiles_are_bounded() -> None:
    summary = estimate_percentiles(measurement(0))
    numeric_fields = {
        field["name"]
        for field in load_measurement_schema()["fields"]
        if field.get("type") != "select"
    }

    assert 1 <= summary.height <= 99
    assert 1 <= summary.waistCircumference <= 99
    assert 1 <= summary.bideltoidCircumference <= 99
    assert set(summary.fields) == numeric_fields
    assert all(1 <= percentile <= 99 for percentile in summary.fields.values())
    assert summary.fields["height"] == summary.height
    assert "Approximate adult reference model" in summary.reference
