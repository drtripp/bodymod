import json
from pathlib import Path

from app.measurement_schema import measurement_field_names


PLANNING_SEED_PATH = Path(__file__).with_name("planning.seed.json")


def load_planning_seed() -> dict:
    payload = json.loads(PLANNING_SEED_PATH.read_text(encoding="utf-8"))
    schema_fields = set(measurement_field_names())
    goal_ids = {goal.get("id") for goal in payload.get("goalPresets", [])}
    protocol_ids = {protocol.get("id") for protocol in payload.get("protocolTemplates", [])}

    for persona in payload.get("personas", []):
        unknown_goals = set(persona.get("likelyGoals", [])) - goal_ids
        if unknown_goals:
            unknown = ", ".join(sorted(unknown_goals))
            raise ValueError(f"{persona.get('id')} references unknown goals: {unknown}")

        unknown_measurements = (
            set(persona.get("startingMeasurements", {}).keys()) - schema_fields - {"sex"}
        )
        if unknown_measurements:
            unknown = ", ".join(sorted(unknown_measurements))
            raise ValueError(f"{persona.get('id')} references unknown measurements: {unknown}")

    for goal in payload.get("goalPresets", []):
        unknown_protocols = set(goal.get("suggestedProtocols", [])) - protocol_ids
        if unknown_protocols:
            unknown = ", ".join(sorted(unknown_protocols))
            raise ValueError(f"{goal.get('id')} references unknown protocols: {unknown}")

        unknown_metrics = set(goal.get("targetMetrics", {}).keys()) - schema_fields
        if unknown_metrics:
            unknown = ", ".join(sorted(unknown_metrics))
            raise ValueError(f"{goal.get('id')} references unknown target metrics: {unknown}")

    return payload


PLANNING_SEED = load_planning_seed()
PERSONAS = PLANNING_SEED["personas"]
GOAL_PRESETS = PLANNING_SEED["goalPresets"]
PROTOCOL_TEMPLATES = PLANNING_SEED["protocolTemplates"]
PROTOCOL_TAXONOMY = PLANNING_SEED["protocolTaxonomy"]
