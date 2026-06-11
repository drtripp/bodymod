import json
from pathlib import Path

from app.measurement_schema import measurement_field_names

from .planning import GOAL_PRESETS


ATTRACTIVENESS_EVIDENCE_SEED_PATH = Path(__file__).with_name(
    "attractiveness_evidence.seed.json"
)
ATTRACTION_VERDICTS = {"ship-reference", "do-not-ship", "needs-research"}


def _duplicates(values: list[str]) -> list[str]:
    seen = set()
    duplicates = set()
    for value in values:
        if value in seen:
            duplicates.add(value)
        seen.add(value)
    return sorted(duplicates)


def load_attractiveness_evidence() -> dict:
    payload = json.loads(ATTRACTIVENESS_EVIDENCE_SEED_PATH.read_text(encoding="utf-8"))
    sources = payload.get("sources", [])
    metrics = payload.get("metrics", [])
    source_ids = [source.get("id", "") for source in sources]
    metric_ids = [metric.get("id", "") for metric in metrics]
    goal_ids = {goal["id"] for goal in GOAL_PRESETS}
    measurement_fields = set(measurement_field_names())

    if not sources:
        raise ValueError("Attractiveness evidence seed needs at least one source.")
    if not metrics:
        raise ValueError("Attractiveness evidence seed needs at least one metric.")

    duplicate_sources = _duplicates(source_ids)
    if duplicate_sources:
        raise ValueError(f"Duplicate attractiveness evidence source ids: {duplicate_sources}")

    duplicate_metrics = _duplicates(metric_ids)
    if duplicate_metrics:
        raise ValueError(f"Duplicate attractiveness evidence metric ids: {duplicate_metrics}")

    available_source_ids = set(source_ids)
    for source in sources:
        url = str(source.get("url", ""))
        if not url.startswith("https://"):
            raise ValueError(f"Attractiveness source {source.get('id')} needs an HTTPS URL.")

    for metric in metrics:
        metric_id = metric.get("id", "")
        verdict = metric.get("verdict", "")
        if verdict not in ATTRACTION_VERDICTS:
            raise ValueError(f"{metric_id} has unsupported verdict: {verdict}")
        if not metric.get("requiresHumanReview", True):
            raise ValueError(f"{metric_id} must remain human-review gated before production.")
        if not metric.get("userFacingSummary"):
            raise ValueError(f"{metric_id} needs user-facing summary copy.")

        unknown_goals = sorted(set(metric.get("goalPresetIds", [])) - goal_ids)
        if unknown_goals:
            raise ValueError(f"{metric_id} references unknown goals: {', '.join(unknown_goals)}")

        unknown_fields = sorted(set(metric.get("metricKeys", [])) - measurement_fields)
        if unknown_fields:
            raise ValueError(f"{metric_id} references unknown fields: {', '.join(unknown_fields)}")

        missing_sources = sorted(set(metric.get("sourceIds", [])) - available_source_ids)
        if missing_sources:
            raise ValueError(f"{metric_id} references unknown sources: {', '.join(missing_sources)}")

    return payload


ATTRACTIVENESS_EVIDENCE = load_attractiveness_evidence()
