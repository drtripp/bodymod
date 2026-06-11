import json
import os
from dataclasses import dataclass
from typing import Any


TREND_STALE_NOTIFICATION = {
    "title": "Trend data is stale",
    "body": "Log a weekly measurement check-in before reading new tape-measure changes.",
    "tag": "bodymod-trend-stale",
    "url": "/",
    "context": "trend-stale",
}


@dataclass(frozen=True)
class WebPushDeliveryConfig:
    vapid_private_key: str
    vapid_subject: str

    @property
    def enabled(self) -> bool:
        return bool(self.vapid_private_key and self.vapid_subject)


def web_push_delivery_config() -> WebPushDeliveryConfig:
    return WebPushDeliveryConfig(
        vapid_private_key=os.getenv("BODYMOD_WEB_PUSH_VAPID_PRIVATE_KEY", "").strip(),
        vapid_subject=os.getenv("BODYMOD_WEB_PUSH_VAPID_SUBJECT", "").strip(),
    )


def web_push_delivery_configured() -> bool:
    return web_push_delivery_config().enabled


def trend_stale_push_payload() -> str:
    return json.dumps(TREND_STALE_NOTIFICATION, separators=(",", ":"), sort_keys=True)


def send_trend_stale_push(subscription: dict[str, Any], ttl_seconds: int = 24 * 60 * 60) -> None:
    config = web_push_delivery_config()
    if not config.enabled:
        raise RuntimeError("Remote web push delivery needs VAPID private key and subject settings.")

    try:
        from pywebpush import webpush
    except ImportError as error:
        raise RuntimeError("Remote web push delivery needs pywebpush installed.") from error

    webpush(
        subscription_info=subscription,
        data=trend_stale_push_payload(),
        vapid_private_key=config.vapid_private_key,
        vapid_claims={"sub": config.vapid_subject},
        ttl=ttl_seconds,
    )
