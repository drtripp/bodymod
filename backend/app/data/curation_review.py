import json
from pathlib import Path

from app.models import CurationReviewLibrary


CURATION_REVIEW_SEED_PATH = Path(__file__).with_name("curation_review.seed.json")


def load_curation_review_library() -> dict:
    payload = json.loads(CURATION_REVIEW_SEED_PATH.read_text(encoding="utf-8"))
    return CurationReviewLibrary.model_validate(payload).model_dump()


CURATION_REVIEW_LIBRARY = load_curation_review_library()
