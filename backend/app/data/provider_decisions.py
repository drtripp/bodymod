import json
from pathlib import Path


PROVIDER_DECISIONS_SEED_PATH = Path(__file__).with_name("provider_decisions.seed.json")


def load_provider_decision_library() -> dict:
    payload = json.loads(PROVIDER_DECISIONS_SEED_PATH.read_text(encoding="utf-8"))
    decision_ids = []

    for decision in payload.get("decisions", []):
        decision_id = decision.get("id")
        if not decision_id:
            raise ValueError("Provider decisions need ids.")
        if decision_id in decision_ids:
            raise ValueError(f"Duplicate provider decision id: {decision_id}")
        decision_ids.append(decision_id)

        if not decision.get("label"):
            raise ValueError(f"{decision_id} needs a label.")
        if not decision.get("decisionNeeded"):
            raise ValueError(f"{decision_id} needs decision requirements.")
        if not decision.get("privacyRequirements"):
            raise ValueError(f"{decision_id} needs privacy requirements.")
        if not decision.get("verification"):
            raise ValueError(f"{decision_id} needs verification commands.")
        if not decision.get("docs"):
            raise ValueError(f"{decision_id} needs owner docs.")
        if not decision.get("candidates"):
            raise ValueError(f"{decision_id} needs provider candidates.")

    if not decision_ids:
        raise ValueError("Provider decision seed needs at least one decision.")

    return payload


PROVIDER_DECISION_LIBRARY = load_provider_decision_library()
