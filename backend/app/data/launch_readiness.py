import json
from pathlib import Path


LAUNCH_READINESS_SEED_PATH = Path(__file__).with_name("launch_readiness.seed.json")


def load_launch_readiness_seed() -> dict:
    payload = json.loads(LAUNCH_READINESS_SEED_PATH.read_text(encoding="utf-8"))
    gate_ids = []

    for gate in payload.get("gates", []):
        gate_id = gate.get("id")
        if not gate_id:
            raise ValueError("Launch-readiness gates need ids.")
        if gate_id in gate_ids:
            raise ValueError(f"Duplicate launch-readiness gate id: {gate_id}")
        gate_ids.append(gate_id)

        if not gate.get("label"):
            raise ValueError(f"{gate_id} needs a label.")
        if not gate.get("evidenceRequired"):
            raise ValueError(f"{gate_id} needs required evidence.")
        if not gate.get("verification"):
            raise ValueError(f"{gate_id} needs verification commands.")
        if not gate.get("docs"):
            raise ValueError(f"{gate_id} needs owner docs.")

    if not gate_ids:
        raise ValueError("Launch-readiness seed needs at least one gate.")

    return payload


LAUNCH_READINESS = load_launch_readiness_seed()
