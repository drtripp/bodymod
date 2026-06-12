import base64
import json
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, padding
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature


NATIVE_PUSH_TOKEN_URL = "https://oauth2.googleapis.com/token"
FCM_LEGACY_URL = "https://fcm.googleapis.com/fcm/send"
FCM_V1_SCOPE = "https://www.googleapis.com/auth/firebase.messaging"
APNS_PRODUCTION_URL = "https://api.push.apple.com"
APNS_SANDBOX_URL = "https://api.sandbox.push.apple.com"

TREND_STALE_NATIVE_NOTIFICATION = {
    "title": "Trend data is stale",
    "body": "Log a weekly measurement check-in before reading new tape-measure changes.",
    "tag": "bodymod-trend-stale",
    "url": "/",
    "context": "trend-stale",
}


@dataclass(frozen=True)
class NativePushDeliveryConfig:
    fcm_server_key: str = ""
    fcm_service_account_json: str = ""
    fcm_project_id: str = ""
    apns_key_id: str = ""
    apns_team_id: str = ""
    apns_bundle_id: str = ""
    apns_auth_key: str = ""
    apns_use_sandbox: bool = False
    timeout_seconds: float = 10.0

    @property
    def android_enabled(self) -> bool:
        return bool(self.fcm_server_key or self.fcm_service_account_json)

    @property
    def ios_enabled(self) -> bool:
        return bool(
            self.apns_key_id
            and self.apns_team_id
            and self.apns_bundle_id
            and self.apns_auth_key
        )

    def enabled_for(self, platform: str | None = None) -> bool:
        if platform == "android":
            return self.android_enabled
        if platform == "ios":
            return self.ios_enabled
        return self.android_enabled or self.ios_enabled


def native_push_delivery_config() -> NativePushDeliveryConfig:
    return NativePushDeliveryConfig(
        fcm_server_key=os.getenv("BODYMOD_FCM_SERVER_KEY", "").strip(),
        fcm_service_account_json=os.getenv("BODYMOD_FCM_SERVICE_ACCOUNT_JSON", "").strip(),
        fcm_project_id=os.getenv("BODYMOD_FCM_PROJECT_ID", "").strip(),
        apns_key_id=os.getenv("BODYMOD_APNS_KEY_ID", "").strip(),
        apns_team_id=os.getenv("BODYMOD_APNS_TEAM_ID", "").strip(),
        apns_bundle_id=os.getenv("BODYMOD_APNS_BUNDLE_ID", "").strip(),
        apns_auth_key=os.getenv("BODYMOD_APNS_AUTH_KEY", "").strip(),
        apns_use_sandbox=os.getenv("BODYMOD_APNS_USE_SANDBOX", "").lower() in {"1", "true", "yes"},
    )


def native_push_delivery_configured(platform: str | None = None) -> bool:
    return native_push_delivery_config().enabled_for(platform)


def trend_stale_native_push_payload() -> str:
    return json.dumps(TREND_STALE_NATIVE_NOTIFICATION, separators=(",", ":"), sort_keys=True)


def _urlsafe_json(data: dict[str, Any]) -> bytes:
    encoded = json.dumps(data, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return base64.urlsafe_b64encode(encoded).rstrip(b"=")


def _urlsafe_bytes(data: bytes) -> bytes:
    return base64.urlsafe_b64encode(data).rstrip(b"=")


def _load_service_account(raw_value: str) -> dict[str, Any]:
    if raw_value.lstrip().startswith("{"):
        return json.loads(raw_value)
    candidate = Path(raw_value)
    if candidate.exists():
        return json.loads(candidate.read_text(encoding="utf-8"))
    return json.loads(raw_value)


def build_fcm_legacy_request(token: str, ttl_seconds: int = 24 * 60 * 60) -> dict[str, Any]:
    return {
        "to": token,
        "notification": {
            "title": TREND_STALE_NATIVE_NOTIFICATION["title"],
            "body": TREND_STALE_NATIVE_NOTIFICATION["body"],
            "tag": TREND_STALE_NATIVE_NOTIFICATION["tag"],
        },
        "data": {
            "context": TREND_STALE_NATIVE_NOTIFICATION["context"],
            "url": TREND_STALE_NATIVE_NOTIFICATION["url"],
            "tag": TREND_STALE_NATIVE_NOTIFICATION["tag"],
        },
        "priority": "normal",
        "time_to_live": ttl_seconds,
    }


def build_fcm_v1_message(token: str) -> dict[str, Any]:
    return {
        "message": {
            "token": token,
            "notification": {
                "title": TREND_STALE_NATIVE_NOTIFICATION["title"],
                "body": TREND_STALE_NATIVE_NOTIFICATION["body"],
            },
            "data": {
                "context": TREND_STALE_NATIVE_NOTIFICATION["context"],
                "url": TREND_STALE_NATIVE_NOTIFICATION["url"],
                "tag": TREND_STALE_NATIVE_NOTIFICATION["tag"],
            },
            "android": {
                "priority": "normal",
                "notification": {
                    "tag": TREND_STALE_NATIVE_NOTIFICATION["tag"],
                },
            },
        }
    }


def build_apns_payload() -> dict[str, Any]:
    return {
        "aps": {
            "alert": {
                "title": TREND_STALE_NATIVE_NOTIFICATION["title"],
                "body": TREND_STALE_NATIVE_NOTIFICATION["body"],
            },
            "thread-id": TREND_STALE_NATIVE_NOTIFICATION["tag"],
        },
        "context": TREND_STALE_NATIVE_NOTIFICATION["context"],
        "url": TREND_STALE_NATIVE_NOTIFICATION["url"],
        "tag": TREND_STALE_NATIVE_NOTIFICATION["tag"],
    }


def _sign_rs256_jwt(service_account: dict[str, Any], now: int | None = None) -> str:
    issued_at = int(now or time.time())
    header = {
        "alg": "RS256",
        "typ": "JWT",
        "kid": service_account.get("private_key_id", ""),
    }
    claims = {
        "iss": service_account["client_email"],
        "scope": FCM_V1_SCOPE,
        "aud": NATIVE_PUSH_TOKEN_URL,
        "iat": issued_at,
        "exp": issued_at + 3600,
    }
    signing_input = b".".join([_urlsafe_json(header), _urlsafe_json(claims)])
    private_key = serialization.load_pem_private_key(
        service_account["private_key"].encode("utf-8"),
        password=None,
    )
    signature = private_key.sign(signing_input, padding.PKCS1v15(), hashes.SHA256())
    return b".".join([signing_input, _urlsafe_bytes(signature)]).decode("ascii")


def _sign_es256_jwt(
    key_id: str,
    team_id: str,
    auth_key: str,
    now: int | None = None,
) -> str:
    issued_at = int(now or time.time())
    header = {"alg": "ES256", "kid": key_id}
    claims = {"iss": team_id, "iat": issued_at}
    signing_input = b".".join([_urlsafe_json(header), _urlsafe_json(claims)])
    private_key = serialization.load_pem_private_key(auth_key.encode("utf-8"), password=None)
    der_signature = private_key.sign(signing_input, ec.ECDSA(hashes.SHA256()))
    r_value, s_value = decode_dss_signature(der_signature)
    signature = r_value.to_bytes(32, "big") + s_value.to_bytes(32, "big")
    return b".".join([signing_input, _urlsafe_bytes(signature)]).decode("ascii")


def _fcm_v1_access_token(
    service_account_json: str,
    client: httpx.Client,
    timeout_seconds: float,
) -> tuple[str, str]:
    service_account = _load_service_account(service_account_json)
    assertion = _sign_rs256_jwt(service_account)
    response = client.post(
        NATIVE_PUSH_TOKEN_URL,
        data={
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": assertion,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=timeout_seconds,
    )
    _raise_for_delivery_error("fcm-token", response)
    payload = response.json()
    return str(payload["access_token"]), str(service_account.get("project_id", ""))


def _raise_for_delivery_error(provider: str, response: httpx.Response) -> None:
    if response.status_code < 300:
        return
    detail = response.text[:240]
    raise RuntimeError(f"{provider} native push delivery failed: {response.status_code} {detail}")


def _send_fcm(
    token: str,
    config: NativePushDeliveryConfig,
    client: httpx.Client,
    ttl_seconds: int,
) -> None:
    if config.fcm_service_account_json:
        access_token, service_account_project_id = _fcm_v1_access_token(
            config.fcm_service_account_json,
            client,
            config.timeout_seconds,
        )
        project_id = config.fcm_project_id or service_account_project_id
        if not project_id:
            raise RuntimeError("FCM service-account delivery needs a project ID.")
        response = client.post(
            f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send",
            json=build_fcm_v1_message(token),
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=config.timeout_seconds,
        )
        _raise_for_delivery_error("fcm-v1", response)
        return

    if not config.fcm_server_key:
        raise RuntimeError("Android native push delivery needs FCM settings.")

    response = client.post(
        FCM_LEGACY_URL,
        json=build_fcm_legacy_request(token, ttl_seconds),
        headers={"Authorization": f"key={config.fcm_server_key}"},
        timeout=config.timeout_seconds,
    )
    _raise_for_delivery_error("fcm", response)
    payload = response.json()
    if int(payload.get("failure", 0) or 0):
        raise RuntimeError(f"fcm native push delivery failed: {payload}")


def _send_apns(
    token: str,
    config: NativePushDeliveryConfig,
    client: httpx.Client,
) -> None:
    if not config.ios_enabled:
        raise RuntimeError("iOS native push delivery needs APNs token settings.")

    host = APNS_SANDBOX_URL if config.apns_use_sandbox else APNS_PRODUCTION_URL
    response = client.post(
        f"{host}/3/device/{token}",
        json=build_apns_payload(),
        headers={
            "Authorization": f"bearer {_sign_es256_jwt(config.apns_key_id, config.apns_team_id, config.apns_auth_key)}",
            "apns-topic": config.apns_bundle_id,
            "apns-push-type": "alert",
            "apns-priority": "5",
        },
        timeout=config.timeout_seconds,
    )
    _raise_for_delivery_error("apns", response)


def send_trend_stale_native_push(
    token_record: dict[str, Any],
    ttl_seconds: int = 24 * 60 * 60,
    config: NativePushDeliveryConfig | None = None,
    client: httpx.Client | None = None,
) -> None:
    resolved_config = config or native_push_delivery_config()
    owns_client = client is None
    resolved_client = client or httpx.Client()

    try:
        platform = token_record["platform"]
        token = token_record["token"]
        if platform == "android":
            _send_fcm(token, resolved_config, resolved_client, ttl_seconds)
            return
        if platform == "ios":
            _send_apns(token, resolved_config, resolved_client)
            return
        raise RuntimeError(f"Unsupported native push platform: {platform}")
    finally:
        if owns_client:
            resolved_client.close()
