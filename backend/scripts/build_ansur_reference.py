"""Build a review-gated reference overlay from an ANSUR-style CSV.

The repository does not bundle ANSUR II raw data. Run this against a locally
reviewed CSV after confirming source/license and codebook mappings:

    .\\.venv\\Scripts\\python.exe scripts\\build_ansur_reference.py \\
        path\\to\\ansur.csv app\\data\\reference.ansur.generated.json
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
import statistics
from pathlib import Path
from typing import Any

import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.measurement_schema import load_measurement_schema  # noqa: E402
from app.models import PopulationReferenceData  # noqa: E402


BACKEND_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MAPPING_PATH = BACKEND_ROOT / "app" / "data" / "reference.ansur.mapping.json"
PERCENTILES = [5, 10, 15, 25, 50, 75, 85, 90, 95]
SUPPORTED_UNITS = {"mm", "cm", "kg"}


def canonical_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", str(value).lower())


def load_mapping(path: Path = DEFAULT_MAPPING_PATH) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def schema_fields() -> dict[str, dict[str, Any]]:
    return {
        field["name"]: field
        for field in load_measurement_schema()["fields"]
        if field.get("type") != "select"
    }


def parse_number(value: str | int | float | None) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)

    normalized = str(value).strip().replace(",", "")
    if not normalized:
        return None

    try:
        return float(normalized)
    except ValueError:
        return None


def convert_unit(value: float, source_unit: str, target_unit: str) -> float:
    source = source_unit.lower()
    target = target_unit.lower()
    if source not in SUPPORTED_UNITS or target not in SUPPORTED_UNITS:
        raise ValueError(f"Unsupported ANSUR import unit conversion: {source_unit} to {target_unit}.")
    if source == target:
        return value
    if source == "mm" and target == "cm":
        return value / 10
    if source == "cm" and target == "mm":
        return value * 10
    raise ValueError(f"Unsupported ANSUR import unit conversion: {source_unit} to {target_unit}.")


def find_column(headers: list[str], candidates: list[str]) -> str | None:
    normalized_headers = {canonical_key(header): header for header in headers}
    for candidate in candidates:
        match = normalized_headers.get(canonical_key(candidate))
        if match:
            return match
    return None


def normalized_sex(row: dict[str, str], mapping: dict[str, Any], headers: list[str]) -> str | None:
    sex_column = find_column(headers, mapping.get("sexColumnCandidates", []))
    if not sex_column:
        return None

    raw_value = canonical_key(row.get(sex_column, ""))
    sex_values = mapping.get("sexValues", {})
    for sex in ("male", "female"):
        if raw_value in {canonical_key(value) for value in sex_values.get(sex, [])}:
            return sex
    return None


def percentile(sorted_values: list[float], percentile_value: int) -> float:
    if not sorted_values:
        raise ValueError("Cannot calculate percentile without values.")
    if len(sorted_values) == 1:
        return sorted_values[0]

    position = (len(sorted_values) - 1) * (percentile_value / 100)
    lower_index = math.floor(position)
    upper_index = math.ceil(position)
    if lower_index == upper_index:
        return sorted_values[lower_index]

    lower = sorted_values[lower_index]
    upper = sorted_values[upper_index]
    return lower + (upper - lower) * (position - lower_index)


def summarize_values(values: list[float]) -> dict[str, Any]:
    sorted_values = sorted(values)
    return {
        "n": len(sorted_values),
        "mean": round(statistics.fmean(sorted_values), 1),
        "sd": round(statistics.stdev(sorted_values), 1),
        "percentiles": {
            str(value): round(percentile(sorted_values, value), 1)
            for value in PERCENTILES
        },
    }


def build_ansur_reference(
    csv_path: Path,
    *,
    mapping_path: Path = DEFAULT_MAPPING_PATH,
    source_url: str = "",
    retrieved_at: str = "",
    min_n: int = 2,
    mark_vetted: bool = False,
) -> dict[str, Any]:
    mapping = load_mapping(mapping_path)
    fields = schema_fields()
    rows = list(csv.DictReader(csv_path.read_text(encoding="utf-8-sig").splitlines()))
    headers = list(rows[0].keys()) if rows else []
    values_by_field: dict[str, dict[str, list[float]]] = {}
    selected_columns: dict[str, dict[str, str]] = {}

    for field_name, config in mapping.get("fields", {}).items():
        if field_name not in fields:
            raise ValueError(f"ANSUR mapping references unknown measurement field: {field_name}.")
        target_unit = config.get("targetUnit")
        if target_unit != fields[field_name]["unit"]:
            raise ValueError(f"ANSUR mapping target unit mismatch for {field_name}.")

        source_columns = config.get("sourceColumns", [])
        column_names = [column.get("name", "") for column in source_columns]
        selected_name = find_column(headers, column_names)
        if not selected_name:
            continue

        selected_config = next(
            column
            for column in source_columns
            if canonical_key(column.get("name", "")) == canonical_key(selected_name)
        )
        selected_columns[field_name] = {
            "name": selected_name,
            "unit": selected_config.get("unit", "")
        }
        values_by_field[field_name] = {"male": [], "female": []}

    for row in rows:
        sex = normalized_sex(row, mapping, headers)
        if sex not in {"male", "female"}:
            continue

        for field_name, column in selected_columns.items():
            raw_value = parse_number(row.get(column["name"]))
            if raw_value is None:
                continue
            converted = convert_unit(
                raw_value,
                column["unit"],
                fields[field_name]["unit"],
            )
            field_min = float(fields[field_name]["min"])
            field_max = float(fields[field_name]["max"])
            if field_min <= converted <= field_max:
                values_by_field[field_name][sex].append(converted)

    generated_fields: dict[str, Any] = {}
    for field_name, sex_values in values_by_field.items():
        if any(len(sex_values[sex]) < min_n for sex in ("male", "female")):
            continue

        schema_field = fields[field_name]
        mapping_field = mapping["fields"][field_name]
        source_column = selected_columns[field_name]
        generated_fields[field_name] = {
            "label": schema_field["label"],
            "unit": schema_field["unit"],
            "min": schema_field["min"],
            "max": schema_field["max"],
            "sourceTable": f"ANSUR-style CSV column: {source_column['name']}",
            "sourceColumn": source_column["name"],
            "sourceUnit": source_column["unit"],
            "reviewStatus": mapping_field.get("reviewStatus", mapping.get("reviewStatus", "")),
            "isVetted": bool(mark_vetted),
            "notes": [
                mapping_field.get("reviewStatus", mapping.get("reviewStatus", "")),
                "Generated from source rows; source/license/codebook review is still required.",
            ],
            "male": summarize_values(sex_values["male"]),
            "female": summarize_values(sex_values["female"]),
        }

    payload = {
        "version": int(mapping.get("version", 1)),
        "datasetId": mapping.get("datasetId", "ansur-ii-candidate-import-v1"),
        "label": mapping.get("label", "ANSUR II candidate anthropometry import"),
        "reference": mapping.get("reference", "ANSUR II candidate import"),
        "source": mapping.get("source", "ANSUR II source CSV import."),
        "sourceUrl": source_url or mapping.get("sourceUrl", ""),
        "retrievedAt": retrieved_at,
        "includedPopulation": mapping.get("includedPopulation", ""),
        "excludedPopulation": mapping.get("excludedPopulation", ""),
        "sdMethod": "Standard deviation is computed directly from imported rows using sample standard deviation; percentiles use linear interpolation.",
        "notes": [
            *mapping.get("notes", []),
            "Generated overlay is partial and review-gated by default.",
        ],
        "fields": generated_fields,
    }

    PopulationReferenceData.model_validate(payload)
    return payload


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build an ANSUR-style reference overlay JSON.")
    parser.add_argument("csv_file", type=Path)
    parser.add_argument("output_file", type=Path)
    parser.add_argument("--mapping-file", type=Path, default=DEFAULT_MAPPING_PATH)
    parser.add_argument("--source-url", default="")
    parser.add_argument("--retrieved-at", default="")
    parser.add_argument("--min-n", type=int, default=2)
    parser.add_argument("--mark-vetted", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    payload = build_ansur_reference(
        args.csv_file,
        mapping_path=args.mapping_file,
        source_url=args.source_url,
        retrieved_at=args.retrieved_at,
        min_n=args.min_n,
        mark_vetted=args.mark_vetted,
    )
    args.output_file.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(payload['fields'])} ANSUR-style reference field(s) to {args.output_file}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
