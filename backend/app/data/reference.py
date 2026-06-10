import json
from pathlib import Path
from typing import Any

from app.measurement_schema import load_measurement_schema


REFERENCE_SEED_PATH = Path(__file__).resolve().parent / "reference.seed.json"


def numeric_measurement_fields() -> list[dict[str, Any]]:
    return [
        field
        for field in load_measurement_schema()["fields"]
        if field.get("type") != "select"
    ]


def load_reference_seed(seed_path: Path = REFERENCE_SEED_PATH) -> dict[str, Any]:
    seed = json.loads(seed_path.read_text(encoding="utf-8"))
    fields = seed.get("fields")
    if not isinstance(seed.get("version"), int):
        raise ValueError("Reference seed must include an integer version.")
    if not isinstance(fields, dict) or not fields:
        raise ValueError("Reference seed must include field distributions.")

    schema_fields = {field["name"]: field for field in numeric_measurement_fields()}
    missing_fields = sorted(set(schema_fields) - set(fields))
    extra_fields = sorted(set(fields) - set(schema_fields))
    if missing_fields:
        raise ValueError(f"Reference seed missing fields: {', '.join(missing_fields)}")
    if extra_fields:
        raise ValueError(f"Reference seed includes unknown fields: {', '.join(extra_fields)}")

    for name, distribution in fields.items():
        schema_field = schema_fields[name]
        for key in ("label", "unit", "min", "max", "male", "female"):
            if key not in distribution:
                raise ValueError(f"Reference field {name} missing {key}.")
        if distribution["unit"] != schema_field["unit"]:
            raise ValueError(f"Reference field {name} unit does not match schema.")
        if float(distribution["min"]) != float(schema_field["min"]):
            raise ValueError(f"Reference field {name} min does not match schema.")
        if float(distribution["max"]) != float(schema_field["max"]):
            raise ValueError(f"Reference field {name} max does not match schema.")

        for sex in ("male", "female"):
            sex_distribution = distribution[sex]
            mean = float(sex_distribution.get("mean", 0))
            standard_deviation = float(sex_distribution.get("sd", 0))
            if not float(distribution["min"]) <= mean <= float(distribution["max"]):
                raise ValueError(f"Reference field {name} {sex} mean is outside schema bounds.")
            if standard_deviation <= 0:
                raise ValueError(f"Reference field {name} {sex} sd must be positive.")

    return seed


REFERENCE_DATA = load_reference_seed()
REFERENCE_FIELDS = REFERENCE_DATA["fields"]
REFERENCE_DISTRIBUTIONS = {
    sex: {
        name: distribution[sex]
        for name, distribution in REFERENCE_FIELDS.items()
    }
    for sex in ("male", "female")
}
REFERENCE_LABEL = REFERENCE_DATA["reference"]
