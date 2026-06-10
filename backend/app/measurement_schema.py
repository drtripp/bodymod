import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field, create_model


MEASUREMENT_SCHEMA_PATH = (
    Path(__file__).resolve().parents[2] / "shared" / "measurement_schema.json"
)


@lru_cache
def load_measurement_schema() -> dict[str, Any]:
    return json.loads(MEASUREMENT_SCHEMA_PATH.read_text(encoding="utf-8"))


def measurement_field_names() -> list[str]:
    return [field["name"] for field in load_measurement_schema()["fields"]]


def _literal_type(values: list[str]):
    return Literal.__getitem__(tuple(values))


def _measurement_model_fields() -> dict[str, tuple[Any, Any]]:
    model_fields: dict[str, tuple[Any, Any]] = {}

    for field in load_measurement_schema()["fields"]:
        if field.get("type") == "select":
            values = [option["value"] for option in field.get("options", [])]
            model_fields[field["name"]] = (_literal_type(values), Field())
            continue

        model_fields[field["name"]] = (
            float,
            Field(ge=field["min"], le=field["max"]),
        )

    return model_fields


def build_measurement_model() -> type[BaseModel]:
    model = create_model("MeasurementSet", __base__=BaseModel, **_measurement_model_fields())
    model.__module__ = "app.models"
    return model
