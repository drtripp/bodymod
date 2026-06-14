import json
from pathlib import Path
from typing import Any

from app.models import NativeReleaseChecklist


NATIVE_RELEASE_SEED_PATH = Path(__file__).with_name("native_release.seed.json")


def load_native_release_seed(seed_path: Path = NATIVE_RELEASE_SEED_PATH) -> dict[str, Any]:
    seed = json.loads(seed_path.read_text(encoding="utf-8"))
    NativeReleaseChecklist.model_validate(seed)
    return seed


NATIVE_RELEASE_CHECKLIST = load_native_release_seed()
