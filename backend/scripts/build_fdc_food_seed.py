"""Build a review-gated USDA FoodData Central-style food seed.

The repository does not call FoodData Central directly. Run this against a
locally reviewed FDC API export or a flat CSV after confirming source,
licensing, API-key handling, and nutrient mappings:

    .\\.venv\\Scripts\\python.exe scripts\\build_fdc_food_seed.py \\
        path\\to\\fdc-foods.json app\\data\\food_usda.generated.json
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
from pathlib import Path
from typing import Any

import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.data.food_usda import REQUIRED_MACRO_KEYS, REQUIRED_MICRO_KEYS  # noqa: E402
from app.models import FoodSearchResponse  # noqa: E402


NUTRIENT_MAPPINGS: dict[str, dict[str, set[str] | set[int]]] = {
    "calories": {
        "ids": {1008, 2047, 2048},
        "numbers": {"208"},
        "aliases": {"calories", "energy", "energykcal", "energykilocalories", "kcal"},
    },
    "protein": {
        "ids": {1003},
        "numbers": {"203"},
        "aliases": {"protein", "proteinamount"},
    },
    "carbs": {
        "ids": {1005},
        "numbers": {"205"},
        "aliases": {"carbs", "carbohydrate", "carbohydratebydifference", "totalcarbohydrate"},
    },
    "fat": {
        "ids": {1004},
        "numbers": {"204"},
        "aliases": {"fat", "totalfat", "totallipid", "totallipidfat"},
    },
    "fiber": {
        "ids": {1079},
        "numbers": {"291"},
        "aliases": {"fiber", "dietaryfiber", "fibertotaldietary"},
    },
    "sugar": {
        "ids": {2000, 1063},
        "numbers": {"269"},
        "aliases": {"sugar", "sugars", "totalsugars", "sugarstotal"},
    },
    "sodium": {
        "ids": {1093},
        "numbers": {"307"},
        "aliases": {"sodium", "na"},
    },
    "potassium": {
        "ids": {1092},
        "numbers": {"306"},
        "aliases": {"potassium", "k"},
    },
    "calcium": {
        "ids": {1087},
        "numbers": {"301"},
        "aliases": {"calcium", "ca"},
    },
    "iron": {
        "ids": {1089},
        "numbers": {"303"},
        "aliases": {"iron", "fe"},
    },
    "magnesium": {
        "ids": {1090},
        "numbers": {"304"},
        "aliases": {"magnesium", "mg"},
    },
    "zinc": {
        "ids": {1095},
        "numbers": {"309"},
        "aliases": {"zinc", "zn"},
    },
    "vitaminC": {
        "ids": {1162},
        "numbers": {"401"},
        "aliases": {"vitaminc", "ascorbicacid"},
    },
    "vitaminD": {
        "ids": {1114, 1110},
        "numbers": {"324"},
        "aliases": {"vitamind", "vitamindd2d3", "vitamindiu"},
    },
    "vitaminB12": {
        "ids": {1178},
        "numbers": {"418"},
        "aliases": {"vitaminb12", "b12", "cobalamin"},
    },
}

REQUIRED_IMPORT_KEYS = REQUIRED_MACRO_KEYS


def canonical_key(value: str | int | float | None) -> str:
    return re.sub(r"[^a-z0-9]+", "", str(value or "").lower())


def parse_number(value: str | int | float | None) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    normalized = str(value).strip().replace(",", "")
    if not normalized:
        return None
    try:
        parsed = float(normalized)
    except ValueError:
        return None
    return parsed if math.isfinite(parsed) else None


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "food"


def clean_text(value: Any, fallback: str = "") -> str:
    normalized = " ".join(str(value or "").split())
    return normalized or fallback


def format_number(value: float) -> int | float:
    rounded = round(float(value), 4)
    return int(rounded) if rounded.is_integer() else rounded


def normalize_keyword_list(*values: Any) -> list[str]:
    keywords: list[str] = []
    seen: set[str] = set()
    for value in values:
        if value is None:
            continue
        raw_values = value if isinstance(value, list) else re.split(r"[;,|]", str(value))
        for item in raw_values:
            for token in re.findall(r"[A-Za-z0-9][A-Za-z0-9'/-]*", str(item).lower()):
                cleaned = token.strip("-/'")
                if len(cleaned) < 2 or cleaned in seen:
                    continue
                seen.add(cleaned)
                keywords.append(cleaned)
    return keywords[:12]


def row_lookup(row: dict[str, Any], *candidate_names: str) -> Any:
    canonical_row = {canonical_key(key): value for key, value in row.items()}
    for name in candidate_names:
        key = canonical_key(name)
        if key in canonical_row:
            return canonical_row[key]
    return None


def nutrient_amount_from_fdc_food(food: dict[str, Any], app_key: str) -> float | None:
    mapping = NUTRIENT_MAPPINGS[app_key]
    wanted_ids = mapping["ids"]
    wanted_numbers = mapping["numbers"]
    wanted_aliases = mapping["aliases"]

    for item in food.get("foodNutrients", []) or []:
        nutrient = item.get("nutrient") or {}
        nutrient_id = parse_number(
            item.get("nutrientId") or item.get("nutrient_id") or nutrient.get("id")
        )
        nutrient_number = str(
            item.get("nutrientNumber") or item.get("nutrient_number") or nutrient.get("number") or ""
        ).strip()
        nutrient_name = canonical_key(
            item.get("nutrientName") or item.get("nutrient_name") or nutrient.get("name")
        )
        if (
            (nutrient_id is not None and int(nutrient_id) in wanted_ids)
            or nutrient_number in wanted_numbers
            or nutrient_name in wanted_aliases
        ):
            return parse_number(item.get("amount") or item.get("value"))
    return None


def nutrient_amount_from_flat_row(row: dict[str, Any], app_key: str) -> float | None:
    mapping = NUTRIENT_MAPPINGS[app_key]
    for alias in mapping["aliases"]:
        value = row_lookup(row, alias, f"{alias}_g", f"{alias}_mg", f"{alias}_mcg")
        parsed = parse_number(value)
        if parsed is not None:
            return parsed
    return None


def complete_nutrients(
    values: dict[str, float | None],
    *,
    food_label: str,
) -> tuple[dict[str, int | float], dict[str, int | float]]:
    missing_required = [
        key for key in sorted(REQUIRED_IMPORT_KEYS) if values.get(key) is None
    ]
    if missing_required:
        raise ValueError(
            f"{food_label} is missing required FDC nutrients: {', '.join(missing_required)}."
        )

    macros = {
        key: format_number(values.get(key) or 0)
        for key in sorted(REQUIRED_MACRO_KEYS)
    }
    micros = {
        key: format_number(values.get(key) or 0)
        for key in sorted(REQUIRED_MICRO_KEYS)
    }
    return macros, micros


def fdc_serving_scale(food: dict[str, Any], use_fdc_serving_size: bool) -> tuple[str, float]:
    if not use_fdc_serving_size:
        return "100 g", 1.0

    amount = parse_number(food.get("servingSize") or food.get("serving_size"))
    unit = clean_text(food.get("servingSizeUnit") or food.get("serving_size_unit"), "g")
    normalized_unit = canonical_key(unit)
    if amount is None or amount <= 0 or normalized_unit not in {"g", "gram", "grams", "ml", "milliliter", "milliliters"}:
        return "100 g", 1.0
    display_unit = "ml" if normalized_unit.startswith("ml") or normalized_unit.startswith("milliliter") else "g"
    return f"{format_number(amount)} {display_unit}", amount / 100


def normalize_fdc_food(
    food: dict[str, Any],
    *,
    use_fdc_serving_size: bool = False,
) -> dict[str, Any]:
    fdc_id = clean_text(food.get("fdcId") or food.get("fdc_id"))
    if not fdc_id:
        raise ValueError("FDC food row is missing fdcId.")

    name = clean_text(
        food.get("description") or food.get("lowercaseDescription") or food.get("name"),
        f"FDC food {fdc_id}",
    )
    serving, scale = fdc_serving_scale(food, use_fdc_serving_size)
    nutrient_values = {
        key: (
            nutrient_amount_from_fdc_food(food, key) * scale
            if nutrient_amount_from_fdc_food(food, key) is not None
            else None
        )
        for key in NUTRIENT_MAPPINGS
    }
    macros, micros = complete_nutrients(nutrient_values, food_label=name)

    return {
        "id": f"fdc-{slugify(fdc_id)}-{slugify(name)[:48]}",
        "fdcId": fdc_id,
        "name": name,
        "brand": clean_text(food.get("brandOwner") or food.get("brandName"), "USDA generic"),
        "serving": serving,
        "source": "USDA FoodData Central",
        "keywords": normalize_keyword_list(
            name,
            food.get("brandOwner"),
            food.get("brandName"),
            food.get("foodCategory"),
            food.get("dataType"),
        ),
        "macros": macros,
        "micros": micros,
    }


def normalize_flat_food_row(row: dict[str, Any]) -> dict[str, Any]:
    fdc_id = clean_text(row_lookup(row, "fdcId", "fdc_id", "fdc id"))
    if not fdc_id:
        raise ValueError("Flat FDC food row is missing fdcId.")
    name = clean_text(
        row_lookup(row, "name", "description", "food description"),
        f"FDC food {fdc_id}",
    )
    serving = clean_text(row_lookup(row, "serving"), "")
    if not serving:
        serving_amount = parse_number(row_lookup(row, "servingAmount", "serving size"))
        serving_unit = clean_text(row_lookup(row, "servingUnit", "serving size unit"), "g")
        serving = f"{format_number(serving_amount or 100)} {serving_unit}"

    nutrient_values = {
        key: nutrient_amount_from_flat_row(row, key)
        for key in NUTRIENT_MAPPINGS
    }
    macros, micros = complete_nutrients(nutrient_values, food_label=name)

    return {
        "id": f"fdc-{slugify(fdc_id)}-{slugify(name)[:48]}",
        "fdcId": fdc_id,
        "name": name,
        "brand": clean_text(row_lookup(row, "brand", "brandOwner", "brand name"), "USDA generic"),
        "serving": serving,
        "source": "USDA FoodData Central",
        "keywords": normalize_keyword_list(
            row_lookup(row, "keywords", "searchKeywords"),
            name,
            row_lookup(row, "brand", "brandOwner"),
            row_lookup(row, "category", "foodCategory"),
        ),
        "macros": macros,
        "micros": micros,
    }


def foods_from_json(path: Path, *, use_fdc_serving_size: bool = False) -> list[dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        raw_foods = payload
    elif isinstance(payload, dict):
        raw_foods = payload.get("foods") or payload.get("items") or [payload]
    else:
        raise ValueError(f"{path}: expected a JSON object, list, or object with foods.")
    return [
        normalize_fdc_food(food, use_fdc_serving_size=use_fdc_serving_size)
        for food in raw_foods
    ]


def foods_from_csv(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)
    if not rows:
        raise ValueError(f"{path}: expected at least one FDC food row.")
    return [normalize_flat_food_row(row) for row in rows]


def dedupe_food_ids(foods: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen_ids: dict[str, int] = {}
    seen_fdc_ids: set[str] = set()
    deduped: list[dict[str, Any]] = []
    for food in foods:
        fdc_id = food["fdcId"]
        if fdc_id in seen_fdc_ids:
            raise ValueError(f"Duplicate FDC id in import: {fdc_id}.")
        seen_fdc_ids.add(fdc_id)

        base_id = food["id"]
        count = seen_ids.get(base_id, 0)
        seen_ids[base_id] = count + 1
        if count:
            food = {**food, "id": f"{base_id}-{count + 1}"}
        deduped.append(food)
    return deduped


def build_fdc_food_seed(
    input_path: Path,
    output_path: Path,
    *,
    source_url: str = "",
    retrieved_at: str = "",
    version: int = 1,
    use_fdc_serving_size: bool = False,
) -> dict[str, Any]:
    suffix = input_path.suffix.lower()
    if suffix == ".csv":
        foods = foods_from_csv(input_path)
    else:
        foods = foods_from_json(input_path, use_fdc_serving_size=use_fdc_serving_size)

    payload = {
        "version": version,
        "source": "FoodData Central candidate import; review required before production.",
        "notes": [
            "Generated from a locally reviewed FoodData Central export.",
            "Do not replace the bundled dummy seed until API-key handling, source review, and nutrition QA are approved.",
            "Nutrient values are normalized to the listed serving size.",
        ],
        "foods": dedupe_food_ids(foods),
    }
    if source_url:
        payload["notes"].append(f"Source URL: {source_url}")
    if retrieved_at:
        payload["notes"].append(f"Retrieved at: {retrieved_at}")

    FoodSearchResponse.model_validate(payload)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return payload


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a review-gated FoodData Central-style food seed from local JSON/CSV."
    )
    parser.add_argument("input_path", type=Path)
    parser.add_argument("output_path", type=Path)
    parser.add_argument("--source-url", default="")
    parser.add_argument("--retrieved-at", default="")
    parser.add_argument("--version", type=int, default=1)
    parser.add_argument(
        "--use-fdc-serving-size",
        action="store_true",
        help="Scale FDC per-100g nutrient values to servingSize when servingSize is g/ml.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    payload = build_fdc_food_seed(
        args.input_path,
        args.output_path,
        source_url=args.source_url,
        retrieved_at=args.retrieved_at,
        version=args.version,
        use_fdc_serving_size=args.use_fdc_serving_size,
    )
    print(f"Wrote {len(payload['foods'])} FoodData Central candidate food row(s) to {args.output_path}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
