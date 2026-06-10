import json
from pathlib import Path
from typing import Any

from app.models import StrategyCorpusSeed


STRATEGY_CORPUS_SEED_PATH = Path(__file__).with_name("strategy_corpus.seed.json")


def load_strategy_corpus_seed(seed_path: Path = STRATEGY_CORPUS_SEED_PATH) -> dict[str, Any]:
    seed = json.loads(seed_path.read_text(encoding="utf-8"))
    StrategyCorpusSeed.model_validate(seed)
    return seed


STRATEGY_CORPUS = load_strategy_corpus_seed()
