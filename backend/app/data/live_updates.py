import json
from pathlib import Path


LIVE_UPDATE_SEED_PATH = Path(__file__).with_name("live_updates.seed.json")


def load_live_update_manifest() -> dict:
    payload = json.loads(LIVE_UPDATE_SEED_PATH.read_text(encoding="utf-8"))
    channel_ids = []

    for channel in payload.get("channels", []):
        channel_id = channel.get("id")
        if not channel_id:
            raise ValueError("Live-update channels need ids.")
        if channel_id in channel_ids:
            raise ValueError(f"Duplicate live-update channel id: {channel_id}")
        channel_ids.append(channel_id)

        latest = str(channel.get("latestVersion") or "")
        minimum = str(channel.get("minimumVersion") or "")
        if not latest or not minimum:
            raise ValueError(f"{channel_id} needs latestVersion and minimumVersion.")
        if channel.get("artifactUrl") and not str(channel.get("artifactUrl")).startswith("https://"):
            raise ValueError(f"{channel_id} artifactUrl must use HTTPS when configured.")

    current_channel = payload.get("currentChannel")
    if current_channel not in set(channel_ids):
        raise ValueError(f"currentChannel references unknown live-update channel: {current_channel}")

    return payload


LIVE_UPDATE_MANIFEST = load_live_update_manifest()
