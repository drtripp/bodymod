import json
from pathlib import Path

from app.measurement_schema import measurement_field_names


PROCEDURE_SEED_PATH = Path(__file__).with_name("procedures.seed.json")


def load_procedure_library() -> dict:
    payload = json.loads(PROCEDURE_SEED_PATH.read_text(encoding="utf-8"))
    schema_fields = set(measurement_field_names())

    for procedure in payload.get("procedureTypes", []):
        unknown_fields = set(procedure.get("affectedFields", [])) - schema_fields
        if unknown_fields:
            unknown = ", ".join(sorted(unknown_fields))
            raise ValueError(f"{procedure.get('id')} references unknown fields: {unknown}")

    return payload


PROCEDURE_LIBRARY = load_procedure_library()
