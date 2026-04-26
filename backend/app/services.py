from app.data.targets import TARGETS
from app.models import MatchResponse, MatchResult, MeasurementSet, PercentileSummary, TargetProfile


def get_targets() -> list[TargetProfile]:
    return [TargetProfile.model_validate(item) for item in TARGETS]


def score_match(current: MeasurementSet, target: TargetProfile) -> float:
    current_values = current.model_dump()
    target_values = target.measurements.model_dump()

    # Normalize by height so the first version is not purely absolute size.
    height = max(current.height, 1.0)
    keys = [
        "weight",
        "headCircumference",
        "neckCircumference",
        "biacromialWidth",
        "bideltoidWidth",
        "bideltoidCircumference",
        "armpitCircumference",
        "nippleCircumference",
        "underbustCircumference",
        "waistCircumference",
        "pantWaistCircumference",
        "hipCircumference",
        "upperThighCircumference",
        "midThighCircumference",
        "calfCircumference",
        "bicepCircumference",
        "upperForearmCircumference",
        "wristCircumference",
    ]

    total = 0.0
    for key in keys:
        total += abs(current_values[key] - target_values[key]) / height

    if current.sex != target.measurements.sex:
        total += 0.12

    return round(total, 4)


def estimate_percentiles(current: MeasurementSet) -> PercentileSummary:
    # Placeholder percentile estimates for scaffold use only.
    height = min(99, max(1, int((current.height - 140) / 0.9)))
    waist = min(99, max(1, int((current.waistCircumference - 45) / 1.3)))
    shoulders = min(99, max(1, int((current.bideltoidCircumference - 70) / 1.1)))

    return PercentileSummary(
        height=height,
        waistCircumference=waist,
        bideltoidCircumference=shoulders,
    )


def build_match_response(current: MeasurementSet) -> MatchResponse:
    targets = get_targets()
    ranked = sorted(
        [
            MatchResult(
                id=target.id,
                label=target.label,
                score=score_match(current, target),
                measurements=target.measurements,
            )
            for target in targets
        ],
        key=lambda item: item.score,
    )

    return MatchResponse(
        top_match=ranked[0] if ranked else None,
        matches=ranked,
        percentiles=estimate_percentiles(current),
    )
