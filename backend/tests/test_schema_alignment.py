import re
from pathlib import Path

from app.models import MeasurementSet


FRONTEND_SCHEMA = (
    Path(__file__).resolve().parents[2]
    / "frontend"
    / "src"
    / "lib"
    / "measurements.js"
)


def frontend_measurement_fields() -> dict[str, dict[str, float | None]]:
    source = FRONTEND_SCHEMA.read_text(encoding="utf-8")
    entries = re.findall(r"\{\s*name: \"(?P<name>[^\"]+)\"(?P<body>.*?)\n\s*\}", source, re.S)

    fields: dict[str, dict[str, float | None]] = {}
    for name, body in entries:
        minimum_match = re.search(r"\bmin: (?P<value>\d+(?:\.\d+)?)", body)
        maximum_match = re.search(r"\bmax: (?P<value>\d+(?:\.\d+)?)", body)
        fields[name] = {
            "min": float(minimum_match.group("value")) if minimum_match else None,
            "max": float(maximum_match.group("value")) if maximum_match else None,
        }

    return fields


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


def test_frontend_and_backend_measurement_fields_stay_aligned() -> None:
    frontend_fields = frontend_measurement_fields()
    backend_fields = backend_measurement_bounds()

    assert set(frontend_fields) == set(backend_fields)

    for name, backend_bounds in backend_fields.items():
        assert frontend_fields[name] == backend_bounds
