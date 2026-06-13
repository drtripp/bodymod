from copy import deepcopy
import json
from pathlib import Path
from typing import Any

from app.measurement_schema import load_measurement_schema


REFERENCE_SEED_PATH = Path(__file__).resolve().parent / "reference.seed.json"
NHANES_REFERENCE_SEED_PATH = Path(__file__).resolve().parent / "reference.nhanes.seed.json"
NORMAL_5TH_TO_95TH_Z_SPREAD = 3.2897


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


def _validate_overlay_distribution(
    *,
    field_name: str,
    sex: str,
    distribution: dict[str, Any],
    field_min: float,
    field_max: float,
    sd_method: str,
) -> None:
    mean = float(distribution.get("mean", 0))
    standard_deviation = float(distribution.get("sd", 0))
    if not field_min <= mean <= field_max:
        raise ValueError(f"Reference overlay field {field_name} {sex} mean is outside schema bounds.")
    if standard_deviation <= 0:
        raise ValueError(f"Reference overlay field {field_name} {sex} sd must be positive.")

    percentiles = distribution.get("percentiles")
    if not isinstance(percentiles, dict) or not percentiles:
        raise ValueError(f"Reference overlay field {field_name} {sex} must include published percentiles.")
    if "5" not in percentiles or "95" not in percentiles:
        raise ValueError(f"Reference overlay field {field_name} {sex} must include 5th and 95th percentiles.")

    p5 = float(percentiles["5"])
    p95 = float(percentiles["95"])
    if p5 >= p95:
        raise ValueError(f"Reference overlay field {field_name} {sex} percentiles must be ordered.")
    if "p95" in sd_method.lower() or "5th" in sd_method.lower():
        expected_sd = round((p95 - p5) / NORMAL_5TH_TO_95TH_Z_SPREAD, 1)
        if round(standard_deviation, 1) != expected_sd:
            raise ValueError(
                f"Reference overlay field {field_name} {sex} sd must match the documented p5/p95 estimate."
            )


def load_reference_overlay(seed_path: Path = NHANES_REFERENCE_SEED_PATH) -> dict[str, Any]:
    overlay = json.loads(seed_path.read_text(encoding="utf-8"))
    fields = overlay.get("fields")
    if not isinstance(overlay.get("version"), int):
        raise ValueError("Reference overlay must include an integer version.")
    if not isinstance(fields, dict) or not fields:
        raise ValueError("Reference overlay must include field distributions.")

    schema_fields = {field["name"]: field for field in numeric_measurement_fields()}
    unknown_fields = sorted(set(fields) - set(schema_fields))
    if unknown_fields:
        raise ValueError(f"Reference overlay includes unknown fields: {', '.join(unknown_fields)}")

    sd_method = str(overlay.get("sdMethod", ""))
    for name, distribution in fields.items():
        schema_field = schema_fields[name]
        if distribution.get("unit") != schema_field["unit"]:
            raise ValueError(f"Reference overlay field {name} unit does not match schema.")
        for sex in ("male", "female"):
            if sex not in distribution:
                raise ValueError(f"Reference overlay field {name} missing {sex}.")
            _validate_overlay_distribution(
                field_name=name,
                sex=sex,
                distribution=distribution[sex],
                field_min=float(schema_field["min"]),
                field_max=float(schema_field["max"]),
                sd_method=sd_method,
            )

    return overlay


def apply_reference_overlay(base_seed: dict[str, Any], overlay: dict[str, Any]) -> dict[str, Any]:
    reference = deepcopy(base_seed)
    overlay_reference = overlay["reference"]
    overlay_dataset_id = overlay["datasetId"]

    reference["version"] = max(int(reference["version"]), int(overlay["version"])) + 1
    reference["datasetId"] = f"{base_seed['datasetId']}+{overlay_dataset_id}"
    reference["label"] = "Mixed reference model with NHANES adult supplement"
    reference["reference"] = (
        "NHANES August 2021-August 2023 adults for height, weight, waist, and hip; "
        "approximate scaffold for unsupported fields"
    )
    reference["source"] = (
        f"{overlay['source']} Unsupported fields retain the existing synthetic scaffold."
    )
    reference["sources"] = [base_seed["source"], overlay["source"]]
    reference["notes"] = [
        *base_seed.get("notes", []),
        *overlay.get("notes", []),
        "Field-level metadata marks which distributions are source-backed and which remain scaffold estimates.",
    ]

    for field_name, overlay_distribution in overlay["fields"].items():
        field = reference["fields"][field_name]
        field["male"] = overlay_distribution["male"]
        field["female"] = overlay_distribution["female"]
        field["datasetId"] = overlay_dataset_id
        field["reference"] = overlay_reference
        field["source"] = overlay["source"]
        field["sourceUrl"] = overlay.get("sourceUrl")
        field["sourceTable"] = overlay_distribution.get("sourceTable")
        field["sdMethod"] = overlay.get("sdMethod")
        field["isVetted"] = bool(overlay_distribution.get("isVetted", True))
        field["notes"] = overlay_distribution.get("notes", overlay.get("notes", []))

    for field_name, field in reference["fields"].items():
        field.setdefault("datasetId", base_seed["datasetId"])
        field.setdefault("reference", base_seed["reference"])
        field.setdefault("source", base_seed["source"])
        field.setdefault("sourceUrl", "")
        field.setdefault("sourceTable", "synthetic scaffold")
        field.setdefault("sdMethod", "Synthetic prototype normal distribution parameter.")
        field.setdefault("isVetted", False)
        field.setdefault("notes", base_seed.get("notes", []))

    return reference


REFERENCE_SCAFFOLD_DATA = load_reference_seed()
NHANES_REFERENCE_DATA = load_reference_overlay()
REFERENCE_DATA = apply_reference_overlay(REFERENCE_SCAFFOLD_DATA, NHANES_REFERENCE_DATA)
REFERENCE_FIELDS = REFERENCE_DATA["fields"]
REFERENCE_DISTRIBUTIONS = {
    sex: {
        name: distribution[sex]
        for name, distribution in REFERENCE_FIELDS.items()
    }
    for sex in ("male", "female")
}
REFERENCE_LABEL = REFERENCE_DATA["reference"]
REFERENCE_FIELD_REFERENCES = {
    name: distribution["reference"]
    for name, distribution in REFERENCE_FIELDS.items()
}
REFERENCE_FIELD_DATASET_IDS = {
    name: distribution["datasetId"]
    for name, distribution in REFERENCE_FIELDS.items()
}
