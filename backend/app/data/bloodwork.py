import json
from pathlib import Path


BLOODWORK_SEED_PATH = Path(__file__).with_name("bloodwork.seed.json")


def load_bloodwork_library() -> dict:
    payload = json.loads(BLOODWORK_SEED_PATH.read_text(encoding="utf-8"))
    group_ids = {group["id"] for group in payload.get("markerGroups", [])}

    for marker in payload.get("markers", []):
        if marker.get("groupId") not in group_ids:
            raise ValueError(f"{marker.get('id')} references unknown groupId.")

    return payload


BLOODWORK_LIBRARY = load_bloodwork_library()
