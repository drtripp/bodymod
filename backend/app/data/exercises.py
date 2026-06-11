import json
from pathlib import Path

from app.measurement_schema import measurement_field_names


EXERCISE_SEED_PATH = Path(__file__).with_name("exercises.seed.json")


def load_exercise_library() -> dict:
    payload = json.loads(EXERCISE_SEED_PATH.read_text(encoding="utf-8"))
    schema_fields = set(measurement_field_names())
    exercise_ids = set()

    for exercise in payload.get("exercises", []):
        exercise_id = exercise.get("id")
        if exercise_id in exercise_ids:
            raise ValueError(f"Duplicate exercise id: {exercise_id}")
        exercise_ids.add(exercise_id)

        unknown_fields = set(exercise.get("measurementTargets", [])) - schema_fields
        if unknown_fields:
            unknown = ", ".join(sorted(unknown_fields))
            raise ValueError(f"{exercise_id} references unknown fields: {unknown}")

    for target in payload.get("muscleTargets", []):
        unknown_exercises = set(target.get("exerciseIds", [])) - exercise_ids
        if unknown_exercises:
            unknown = ", ".join(sorted(unknown_exercises))
            raise ValueError(f"{target.get('id')} references unknown exercises: {unknown}")

    for program in payload.get("programTemplates", []):
        for day in program.get("days", []):
            unknown_exercises = {
                item.get("exerciseId") for item in day.get("exercises", [])
            } - exercise_ids
            if unknown_exercises:
                unknown = ", ".join(sorted(unknown_exercises))
                raise ValueError(f"{program.get('id')} references unknown exercises: {unknown}")

    return payload


EXERCISE_LIBRARY = load_exercise_library()
