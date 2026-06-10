from math import erf, sqrt

from app.data.reference import REFERENCE_DATA, REFERENCE_DISTRIBUTIONS, REFERENCE_LABEL
from app.models import MeasurementSet, PercentileSummary


def normal_percentile(value: float, mean: float, standard_deviation: float) -> int:
    z_score = (value - mean) / max(standard_deviation, 0.001)
    cumulative = 0.5 * (1 + erf(z_score / sqrt(2)))
    return min(99, max(1, round(cumulative * 100)))


def estimate_percentiles(current: MeasurementSet) -> PercentileSummary:
    reference = REFERENCE_DISTRIBUTIONS.get(
        current.sex, REFERENCE_DISTRIBUTIONS["male"]
    )
    percentiles = {
        field_name: normal_percentile(
            float(getattr(current, field_name)),
            distribution["mean"],
            distribution["sd"],
        )
        for field_name, distribution in reference.items()
    }

    return PercentileSummary(
        height=percentiles["height"],
        waistCircumference=percentiles["waistCircumference"],
        bideltoidCircumference=percentiles["bideltoidCircumference"],
        fields=percentiles,
        reference=REFERENCE_LABEL,
        datasetId=REFERENCE_DATA["datasetId"],
    )
