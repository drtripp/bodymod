from app.data.targets import TARGETS
from app.models import MeasurementSet
from app.percentiles import estimate_percentiles, normal_percentile
from app.services import build_match_response, get_targets, score_match, score_parts


def measurement(index: int = 0) -> MeasurementSet:
    return MeasurementSet.model_validate(TARGETS[index]["measurements"])


def test_exact_target_match_scores_zero() -> None:
    current = measurement(0)
    target = get_targets()[0]

    assert score_match(current, target) == 0


def test_build_match_response_is_ranked_and_explained() -> None:
    response = build_match_response(measurement(0))

    assert response.top_match is not None
    assert response.top_match.id == TARGETS[0]["id"]
    assert response.matches == sorted(response.matches, key=lambda item: item.score)
    assert response.matches[1].explanation


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


def test_normal_percentile_is_monotonic() -> None:
    low = normal_percentile(160, mean=176, standard_deviation=7.5)
    middle = normal_percentile(176, mean=176, standard_deviation=7.5)
    high = normal_percentile(192, mean=176, standard_deviation=7.5)

    assert low < middle < high


def test_estimated_percentiles_are_bounded() -> None:
    summary = estimate_percentiles(measurement(0))

    assert 1 <= summary.height <= 99
    assert 1 <= summary.waistCircumference <= 99
    assert 1 <= summary.bideltoidCircumference <= 99
    assert "Approximate adult reference model" in summary.reference
