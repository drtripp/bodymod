import json
from pathlib import Path


USDA_FOOD_SEED_PATH = Path(__file__).with_name("food_usda.seed.json")
REQUIRED_MACRO_KEYS = {"calories", "protein", "carbs", "fat"}
REQUIRED_MICRO_KEYS = {
    "fiber",
    "sugar",
    "sodium",
    "potassium",
    "calcium",
    "iron",
    "magnesium",
    "zinc",
    "vitaminC",
    "vitaminD",
    "vitaminB12",
}


def _missing_keys(record: dict, required_keys: set[str]) -> set[str]:
    return required_keys - set(record.keys())


def load_usda_food_library() -> dict:
    payload = json.loads(USDA_FOOD_SEED_PATH.read_text(encoding="utf-8"))
    foods = payload.get("foods", [])
    food_ids = set()
    fdc_ids = set()

    if not foods:
        raise ValueError("USDA-style food seed needs at least one food.")

    for food in foods:
        food_id = food.get("id")
        if food_id in food_ids:
            raise ValueError(f"Duplicate USDA-style food id: {food_id}")
        food_ids.add(food_id)

        fdc_id = food.get("fdcId")
        if fdc_id in fdc_ids:
            raise ValueError(f"Duplicate USDA-style fdcId: {fdc_id}")
        fdc_ids.add(fdc_id)

        if not food.get("keywords"):
            raise ValueError(f"{food_id} needs search keywords.")

        missing_macros = _missing_keys(food.get("macros", {}), REQUIRED_MACRO_KEYS)
        if missing_macros:
            raise ValueError(f"{food_id} missing macros: {', '.join(sorted(missing_macros))}")

        missing_micros = _missing_keys(food.get("micros", {}), REQUIRED_MICRO_KEYS)
        if missing_micros:
            raise ValueError(f"{food_id} missing micros: {', '.join(sorted(missing_micros))}")

        for group in ("macros", "micros"):
            for key, value in food.get(group, {}).items():
                if not isinstance(value, (int, float)) or value < 0:
                    raise ValueError(f"{food_id} has invalid {group}.{key}: {value}")

    return payload


USDA_FOOD_LIBRARY = load_usda_food_library()


def search_usda_foods(query: str, limit: int = 12) -> list[dict]:
    term = query.strip().lower()
    foods = USDA_FOOD_LIBRARY["foods"]

    if not term:
        return foods[:limit]

    def matches(food: dict) -> bool:
        haystack = [
            food.get("name", ""),
            food.get("brand", ""),
            food.get("serving", ""),
            food.get("source", ""),
            *food.get("keywords", []),
        ]
        return any(term in str(value).lower() for value in haystack)

    return [food for food in foods if matches(food)][:limit]
