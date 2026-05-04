import json
from pathlib import Path

from app.data.targets import TARGETS
from app.models import TargetProfile


ALLOWED_SOURCE_TYPES = {"character", "archetype"}
REPO_ROOT = Path(__file__).resolve().parents[2]


def test_all_target_profiles_validate_against_schema() -> None:
    for target in TARGETS:
        TargetProfile.model_validate(target)


def test_target_profiles_have_unique_ids() -> None:
    target_ids = [target["id"] for target in TARGETS]

    assert len(target_ids) == len(set(target_ids))


def test_target_profiles_keep_uncertainty_visible() -> None:
    for target in TARGETS:
        assert target["source_type"] in ALLOWED_SOURCE_TYPES
        assert target.get("notes")
        assert "placeholder" in target["notes"].lower()


def test_target_profile_template_matches_schema() -> None:
    template_path = REPO_ROOT / "target-profiles-template.json"
    template = json.loads(template_path.read_text(encoding="utf-8"))

    assert isinstance(template.get("targets"), list)
    assert template["targets"]

    for target in template["targets"]:
        TargetProfile.model_validate(target)
