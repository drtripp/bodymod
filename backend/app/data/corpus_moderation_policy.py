import json
from pathlib import Path
from typing import Any

from app.models import CorpusModerationPolicy


CORPUS_MODERATION_POLICY_SEED_PATH = Path(__file__).with_name(
    "corpus_moderation_policy.seed.json"
)


def load_corpus_moderation_policy_seed(
    seed_path: Path = CORPUS_MODERATION_POLICY_SEED_PATH,
) -> dict[str, Any]:
    seed = json.loads(seed_path.read_text(encoding="utf-8"))
    CorpusModerationPolicy.model_validate(seed)
    return seed


CORPUS_MODERATION_POLICY = load_corpus_moderation_policy_seed()
