import csv
import json

import pytest

from app.models import FoodSearchResponse
from scripts.build_fdc_food_seed import build_fdc_food_seed
from scripts.validate_curation import validate_food_file


def nutrient(nutrient_id: int, number: str, name: str, amount: float) -> dict:
    return {
        "nutrient": {
            "id": nutrient_id,
            "number": number,
            "name": name,
        },
        "amount": amount,
    }


def fdc_food(overrides: dict | None = None) -> dict:
    base = {
        "fdcId": 234567,
        "description": "Lentils, mature seeds, cooked",
        "brandOwner": "",
        "foodCategory": "Legumes and legume products",
        "dataType": "Foundation",
        "servingSize": 50,
        "servingSizeUnit": "g",
        "foodNutrients": [
            nutrient(1008, "208", "Energy", 116),
            nutrient(1003, "203", "Protein", 9.0),
            nutrient(1005, "205", "Carbohydrate, by difference", 20.1),
            nutrient(1004, "204", "Total lipid (fat)", 0.4),
            nutrient(1079, "291", "Fiber, total dietary", 7.9),
            nutrient(2000, "269", "Sugars, total including NLEA", 1.8),
            nutrient(1093, "307", "Sodium, Na", 2),
            nutrient(1092, "306", "Potassium, K", 369),
            nutrient(1087, "301", "Calcium, Ca", 19),
            nutrient(1089, "303", "Iron, Fe", 3.3),
            nutrient(1090, "304", "Magnesium, Mg", 36),
            nutrient(1095, "309", "Zinc, Zn", 1.3),
            nutrient(1162, "401", "Vitamin C, total ascorbic acid", 1.5),
            nutrient(1114, "324", "Vitamin D (D2 + D3)", 0),
            nutrient(1178, "418", "Vitamin B-12", 0),
        ],
    }
    return {**base, **(overrides or {})}


def test_builds_review_gated_seed_from_fdc_json(tmp_path) -> None:
    input_path = tmp_path / "fdc-foods.json"
    output_path = tmp_path / "food_usda.generated.json"
    input_path.write_text(json.dumps({"foods": [fdc_food()]}), encoding="utf-8")

    payload = build_fdc_food_seed(
        input_path,
        output_path,
        source_url="https://fdc.nal.usda.gov/",
        retrieved_at="2026-06-13",
    )

    FoodSearchResponse.model_validate(payload)
    summary = validate_food_file(output_path)
    food = payload["foods"][0]

    assert "1 USDA-style food row" in summary
    assert payload["source"] == "FoodData Central candidate import; review required before production."
    assert "Source URL: https://fdc.nal.usda.gov/" in payload["notes"]
    assert food["id"].startswith("fdc-234567-lentils")
    assert food["fdcId"] == "234567"
    assert food["serving"] == "100 g"
    assert food["macros"] == {
        "calories": 116,
        "carbs": 20.1,
        "fat": 0.4,
        "protein": 9,
    }
    assert food["micros"]["fiber"] == 7.9
    assert "lentils" in food["keywords"]


def test_can_scale_fdc_json_nutrients_to_serving_size(tmp_path) -> None:
    input_path = tmp_path / "fdc-foods.json"
    output_path = tmp_path / "food_usda.generated.json"
    input_path.write_text(json.dumps([fdc_food()]), encoding="utf-8")

    payload = build_fdc_food_seed(
        input_path,
        output_path,
        use_fdc_serving_size=True,
    )

    food = payload["foods"][0]
    assert food["serving"] == "50 g"
    assert food["macros"]["calories"] == 58
    assert food["macros"]["protein"] == 4.5
    assert food["micros"]["potassium"] == 184.5
    validate_food_file(output_path)


def test_builds_seed_from_reviewed_flat_csv(tmp_path) -> None:
    input_path = tmp_path / "fdc-foods.csv"
    output_path = tmp_path / "food_usda.generated.json"
    with input_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "fdcId",
                "name",
                "brand",
                "serving",
                "keywords",
                "calories",
                "protein",
                "carbs",
                "fat",
                "fiber",
                "sodium",
            ],
        )
        writer.writeheader()
        writer.writerow(
            {
                "fdcId": "345678",
                "name": "Greek yogurt, plain, nonfat",
                "brand": "USDA generic",
                "serving": "170 g",
                "keywords": "yogurt; dairy; protein",
                "calories": "100",
                "protein": "17",
                "carbs": "6",
                "fat": "0.4",
                "fiber": "0",
                "sodium": "60",
            }
        )

    payload = build_fdc_food_seed(input_path, output_path)
    food = payload["foods"][0]

    assert food["id"].startswith("fdc-345678-greek-yogurt")
    assert food["serving"] == "170 g"
    assert food["macros"]["protein"] == 17
    assert food["micros"]["sodium"] == 60
    assert food["micros"]["vitaminB12"] == 0
    assert "yogurt" in food["keywords"]
    validate_food_file(output_path)


def test_import_rejects_rows_missing_required_macros(tmp_path) -> None:
    input_path = tmp_path / "fdc-foods.json"
    output_path = tmp_path / "food_usda.generated.json"
    incomplete = fdc_food(
        {
            "foodNutrients": [
                nutrient(1008, "208", "Energy", 116),
                nutrient(1003, "203", "Protein", 9.0),
            ]
        }
    )
    input_path.write_text(json.dumps([incomplete]), encoding="utf-8")

    with pytest.raises(ValueError, match="missing required FDC nutrients: carbs, fat"):
        build_fdc_food_seed(input_path, output_path)
