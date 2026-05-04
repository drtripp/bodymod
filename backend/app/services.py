from app.data.targets import TARGETS
from app.models import MatchResponse, MatchResult, MeasurementSet, TargetProfile
from app.percentiles import estimate_percentiles


SCORING_KEYS = [
    ("weight", 0.65, "body weight"),
    ("headCircumference", 0.3, "head circumference"),
    ("neckCircumference", 0.55, "neck"),
    ("biacromialWidth", 1.0, "frame width"),
    ("bideltoidWidth", 1.0, "deltoid width"),
    ("bideltoidCircumference", 0.95, "shoulder mass"),
    ("armpitCircumference", 0.8, "upper chest"),
    ("nippleCircumference", 0.8, "chest"),
    ("underbustCircumference", 0.75, "underbust"),
    ("waistCircumference", 1.05, "waist"),
    ("pantWaistCircumference", 0.8, "pant waist"),
    ("hipCircumference", 0.9, "hip"),
    ("upperThighCircumference", 0.7, "upper thigh"),
    ("midThighCircumference", 0.55, "mid thigh"),
    ("calfCircumference", 0.55, "calf"),
    ("bicepCircumference", 0.65, "bicep"),
    ("upperForearmCircumference", 0.45, "forearm"),
    ("wristCircumference", 0.35, "wrist"),
]

SCORING_RATIOS = [
    (
        "shoulder / waist",
        "bideltoidCircumference",
        "waistCircumference",
        0.9,
    ),
    (
        "waist / hip",
        "waistCircumference",
        "hipCircumference",
        0.65,
    ),
]


def get_targets() -> list[TargetProfile]:
    return [TargetProfile.model_validate(item) for item in TARGETS]


def ratio_value(values: dict, numerator_key: str, denominator_key: str) -> float:
    return values[numerator_key] / max(values[denominator_key], 0.001)


def score_parts(current: MeasurementSet, target: TargetProfile) -> list[tuple[str, float, float]]:
    current_values = current.model_dump()
    target_values = target.measurements.model_dump()
    height = max(current.height, 1.0)

    absolute_parts = [
        (
            label,
            current_values[key] - target_values[key],
            abs(current_values[key] - target_values[key]) * weight / height,
        )
        for key, weight, label in SCORING_KEYS
    ]

    ratio_parts = [
        (
            label,
            ratio_value(current_values, numerator_key, denominator_key)
            - ratio_value(target_values, numerator_key, denominator_key),
            abs(
                ratio_value(current_values, numerator_key, denominator_key)
                - ratio_value(target_values, numerator_key, denominator_key)
            )
            * weight,
        )
        for label, numerator_key, denominator_key, weight in SCORING_RATIOS
    ]

    return absolute_parts + ratio_parts


def score_match(current: MeasurementSet, target: TargetProfile) -> float:
    total = sum(part[2] for part in score_parts(current, target))

    if current.sex != target.measurements.sex:
        total += 0.12

    return round(total, 4)


def explain_match(current: MeasurementSet, target: TargetProfile) -> list[str]:
    largest_gaps = sorted(score_parts(current, target), key=lambda item: item[2], reverse=True)[:3]
    explanations = []

    for label, signed_delta, _score_part in largest_gaps:
        if " / " in label:
            if abs(signed_delta) < 0.01:
                direction = "nearly aligned"
            elif signed_delta > 0:
                direction = f"{round(abs(signed_delta), 2)} above target"
            else:
                direction = f"{round(abs(signed_delta), 2)} below target"
        elif abs(signed_delta) < 1:
            direction = "nearly aligned"
        elif signed_delta > 0:
            direction = f"{round(abs(signed_delta), 1)} above target"
        else:
            direction = f"{round(abs(signed_delta), 1)} below target"
        explanations.append(f"{label}: {direction}")

    if current.sex != target.measurements.sex:
        explanations.append("sex profile differs from target")

    return explanations


def build_match_response(current: MeasurementSet) -> MatchResponse:
    targets = get_targets()
    ranked = sorted(
        [
            MatchResult(
                id=target.id,
                label=target.label,
                score=score_match(current, target),
                notes=target.notes,
                source_type=target.source_type,
                measurements=target.measurements,
                explanation=explain_match(current, target),
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
