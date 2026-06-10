from typing import get_args

from app.measurement_schema import load_measurement_schema
from app.models import MeasurementSet
from app.data.reference import REFERENCE_DATA


def schema_fields() -> dict[str, dict]:
    return {field["name"]: field for field in load_measurement_schema()["fields"]}


def backend_measurement_bounds() -> dict[str, dict[str, float | None]]:
    bounds: dict[str, dict[str, float | None]] = {}

    for name, field in MeasurementSet.model_fields.items():
        field_bounds = {"min": None, "max": None}
        for constraint in field.metadata:
            if hasattr(constraint, "ge"):
                field_bounds["min"] = float(constraint.ge)
            if hasattr(constraint, "le"):
                field_bounds["max"] = float(constraint.le)
        bounds[name] = field_bounds

    return bounds


def test_measurement_model_is_generated_from_shared_schema() -> None:
    fields = schema_fields()
    backend_bounds = backend_measurement_bounds()

    assert set(fields) == set(MeasurementSet.model_fields)

    for name, field in fields.items():
        if field.get("type") == "select":
            allowed_values = tuple(option["value"] for option in field["options"])
            assert get_args(MeasurementSet.model_fields[name].annotation) == allowed_values
            continue

        assert backend_bounds[name] == {
            "min": float(field["min"]),
            "max": float(field["max"]),
        }


def test_shared_schema_defaults_validate_against_measurement_model() -> None:
    schema = load_measurement_schema()

    for sex, defaults in schema["defaultsBySex"].items():
        payload = {
            **schema["defaults"],
            "sex": sex,
            **defaults,
        }
        model = MeasurementSet.model_validate(payload)
        assert model.sex == sex


def test_reference_seed_covers_numeric_measurement_schema() -> None:
    fields = schema_fields()
    numeric_field_names = {
        name
        for name, field in fields.items()
        if field.get("type") != "select"
    }

    assert set(REFERENCE_DATA["fields"]) == numeric_field_names

    for name, distribution in REFERENCE_DATA["fields"].items():
        schema_field = fields[name]
        assert distribution["unit"] == schema_field["unit"]
        assert float(distribution["min"]) == float(schema_field["min"])
        assert float(distribution["max"]) == float(schema_field["max"])
