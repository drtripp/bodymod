r"""Recalculate similarity-score anchors for the current target set.

Run from the backend directory:

    .\.venv\Scripts\python.exe scripts\calibrate_similarity.py

The script reports pairwise target distances, a fixed-seed re-measurement noise
simulation, and the exponent/scale that satisfy the documented anchors.
It does not write files.
"""

from __future__ import annotations

import sys
from itertools import combinations
from math import exp, log
from pathlib import Path
from random import Random
from statistics import median

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.models import MeasurementSet  # noqa: E402
from app.services import get_targets, score_match, similarity_from_distance  # noqa: E402


NOISE_SDS = {
    "height": 0.6,
    "weight": 0.7,
    "headCircumference": 0.4,
    "neckCircumference": 0.8,
    "biacromialWidth": 0.8,
    "bideltoidWidth": 0.8,
    "bideltoidCircumference": 1.5,
    "armpitCircumference": 1.5,
    "nippleCircumference": 1.5,
    "underbustCircumference": 1.2,
    "waistCircumference": 1.5,
    "pantWaistCircumference": 1.5,
    "hipCircumference": 1.2,
    "upperThighCircumference": 1.0,
    "midThighCircumference": 1.0,
    "calfCircumference": 0.7,
    "ankleCircumference": 0.5,
    "bicepCircumference": 0.7,
    "upperForearmCircumference": 0.6,
    "wristCircumference": 0.5,
}


def percentile(values: list[float], pct: float) -> float:
    if not values:
        raise ValueError("percentile requires values")

    ordered = sorted(values)
    index = (len(ordered) - 1) * pct
    low = int(index)
    high = min(low + 1, len(ordered) - 1)
    weight = index - low
    return ordered[low] * (1 - weight) + ordered[high] * weight


def clamp_to_model_field(field_name: str, value: float) -> float:
    field = MeasurementSet.model_fields[field_name]
    minimum = None
    maximum = None

    for item in field.metadata:
        if hasattr(item, "ge"):
            minimum = item.ge
        if hasattr(item, "le"):
            maximum = item.le

    if minimum is not None:
        value = max(value, minimum)
    if maximum is not None:
        value = min(value, maximum)

    return value


def noisy_measurement(base: MeasurementSet, random: Random) -> MeasurementSet:
    values = base.model_dump()

    for field_name, standard_deviation in NOISE_SDS.items():
        values[field_name] = clamp_to_model_field(
            field_name,
            values[field_name] + random.gauss(0, standard_deviation),
        )

    return MeasurementSet.model_validate(values)


def solve_constants(noise_distance: float, noise_similarity: float, build_distance: float, build_similarity: float) -> tuple[float, float]:
    exponent = log(log(build_similarity) / log(noise_similarity)) / log(
        build_distance / noise_distance
    )
    scale = build_distance / ((-log(build_similarity)) ** (1 / exponent))
    return exponent, scale


def similarity(distance: float, exponent: float, scale: float) -> float:
    return 100 * exp(-((max(distance, 0) / scale) ** exponent))


def main() -> None:
    targets = get_targets()
    pairwise = [
        (left.label, right.label, score_match(left.measurements, right))
        for left, right in combinations(targets, 2)
    ]
    distances = [distance for *_labels, distance in pairwise]

    print("Pairwise target distances")
    print(f"min={min(distances):.3f} median={median(distances):.3f} max={max(distances):.3f}")
    for left, right, distance in sorted(pairwise, key=lambda item: item[2], reverse=True):
        print(
            f"{left} vs {right}: distance={distance:.3f} "
            f"similarity={similarity_from_distance(distance):.1f}"
        )

    random = Random(7)
    noise_distances = []
    for target in targets:
        for _ in range(300):
            noisy = noisy_measurement(target.measurements, random)
            noise_distances.append(score_match(noisy, target))

    p50 = percentile(noise_distances, 0.5)
    p90 = percentile(noise_distances, 0.9)
    p99 = percentile(noise_distances, 0.99)
    print("\nRe-measurement noise distances")
    print(f"p50={p50:.3f} p90={p90:.3f} p99={p99:.3f} max={max(noise_distances):.3f}")

    exponent, scale = solve_constants(p90, 0.95, median(distances), 0.40)
    print("\nSolved constants")
    print(f"exponent={exponent:.3f} scale={scale:.3f}")
    print(
        "rounded check: "
        f"noise={similarity(p90, 1.5, 1.0):.1f} "
        f"different-build={similarity(median(distances), 1.5, 1.0):.1f}"
    )


if __name__ == "__main__":
    main()
