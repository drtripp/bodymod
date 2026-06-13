import json
from pathlib import Path


FACE_MODEL_CANDIDATE_SEED_PATH = Path(__file__).with_name(
    "face_model_candidates.seed.json"
)


def load_face_model_candidate_library() -> dict:
    payload = json.loads(FACE_MODEL_CANDIDATE_SEED_PATH.read_text(encoding="utf-8"))
    candidate_ids = []

    for candidate in payload.get("candidates", []):
        candidate_id = candidate.get("id")
        if not candidate_id:
            raise ValueError("Face model candidates need ids.")
        if candidate_id in candidate_ids:
            raise ValueError(f"Duplicate face model candidate id: {candidate_id}")
        candidate_ids.append(candidate_id)

        if not candidate.get("label"):
            raise ValueError(f"{candidate_id} needs a label.")
        if not candidate.get("orientationSupport"):
            raise ValueError(f"{candidate_id} needs orientationSupport.")
        if not candidate.get("inputModes"):
            raise ValueError(f"{candidate_id} needs inputModes.")
        if not candidate.get("privacyRequirements"):
            raise ValueError(f"{candidate_id} needs privacy requirements.")
        if not candidate.get("nextValidationSteps"):
            raise ValueError(f"{candidate_id} needs validation steps.")

    if not candidate_ids:
        raise ValueError("Face model candidate seed needs at least one candidate.")

    return payload


FACE_MODEL_CANDIDATE_LIBRARY = load_face_model_candidate_library()
