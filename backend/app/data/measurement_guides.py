import json
from pathlib import Path

from app.measurement_schema import load_measurement_schema


MEASUREMENT_GUIDE_SEED_PATH = Path(__file__).with_name("measurement_guides.seed.json")


def measurable_field_names() -> list[str]:
    return [
        field["name"]
        for field in load_measurement_schema()["fields"]
        if field.get("type") != "select"
    ]


def load_measurement_guides() -> dict:
    payload = json.loads(MEASUREMENT_GUIDE_SEED_PATH.read_text(encoding="utf-8"))
    expected_fields = set(measurable_field_names())
    guide_fields = [guide.get("field") for guide in payload.get("guides", [])]
    duplicates = sorted({field for field in guide_fields if guide_fields.count(field) > 1})

    if duplicates:
        raise ValueError(f"Duplicate measurement guide fields: {', '.join(duplicates)}")

    unknown_fields = sorted(set(guide_fields) - expected_fields)
    if unknown_fields:
        raise ValueError(f"Measurement guides reference unknown fields: {', '.join(unknown_fields)}")

    missing_fields = sorted(expected_fields - set(guide_fields))
    if missing_fields:
        raise ValueError(f"Measurement guides missing fields: {', '.join(missing_fields)}")

    for guide in payload.get("guides", []):
        if not guide.get("steps"):
            raise ValueError(f"{guide.get('field')} guide needs at least one step.")
        if not guide.get("illustration"):
            raise ValueError(f"{guide.get('field')} guide needs an illustration key.")

    return payload


MEASUREMENT_GUIDES = load_measurement_guides()
