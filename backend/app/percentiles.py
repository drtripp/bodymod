from math import erf, sqrt

from app.data.reference import REFERENCE_DISTRIBUTIONS, REFERENCE_LABEL
from app.models import MeasurementSet, PercentileSummary


def normal_percentile(value: float, mean: float, standard_deviation: float) -> int:
    z_score = (value - mean) / max(standard_deviation, 0.001)
    cumulative = 0.5 * (1 + erf(z_score / sqrt(2)))
    return min(99, max(1, round(cumulative * 100)))


def estimate_percentiles(current: MeasurementSet) -> PercentileSummary:
    reference = REFERENCE_DISTRIBUTIONS.get(
        current.sex, REFERENCE_DISTRIBUTIONS["male"]
    )

    return PercentileSummary(
        height=normal_percentile(
            current.height,
            reference["height"]["mean"],
            reference["height"]["sd"],
        ),
        waistCircumference=normal_percentile(
            current.waistCircumference,
            reference["waistCircumference"]["mean"],
            reference["waistCircumference"]["sd"],
        ),
        bideltoidCircumference=normal_percentile(
            current.bideltoidCircumference,
            reference["bideltoidCircumference"]["mean"],
            reference["bideltoidCircumference"]["sd"],
        ),
        reference=REFERENCE_LABEL,
    )
