from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

from app.native_push import (
    APNS_SANDBOX_URL,
    FCM_LEGACY_URL,
    NativePushDeliveryConfig,
    build_apns_payload,
    build_fcm_legacy_request,
    build_fcm_v1_message,
    native_push_delivery_configured,
    send_trend_stale_native_push,
    trend_stale_native_push_payload,
)
from app.repositories import NativePushTokenRepository
from scripts.send_native_trend_push_reminders import send_due_native_trend_push_reminders


class FakeResponse:
    def __init__(self, status_code: int = 200, payload: dict | None = None, text: str = "") -> None:
        self.status_code = status_code
        self._payload = payload or {}
        self.text = text

    def json(self) -> dict:
        return self._payload


class FakeHttpClient:
    def __init__(self, responses: list[FakeResponse] | None = None) -> None:
        self.responses = responses or [FakeResponse()]
        self.calls: list[dict] = []

    def post(self, url: str, **kwargs) -> FakeResponse:
        self.calls.append({"url": url, **kwargs})
        if len(self.responses) == 1:
            return self.responses[0]
        return self.responses.pop(0)

    def close(self) -> None:
        self.calls.append({"closed": True})


def ec_private_key_pem() -> str:
    key = ec.generate_private_key(ec.SECP256R1())
    return key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")


def test_native_push_payloads_stay_generic_and_non_personal() -> None:
    serialized = trend_stale_native_push_payload()
    fcm_payload = build_fcm_legacy_request("android-token")
    fcm_v1_payload = build_fcm_v1_message("android-token")
    apns_payload = build_apns_payload()

    assert "Trend data is stale" in serialized
    for payload in [serialized, str(fcm_payload), str(fcm_v1_payload), str(apns_payload)]:
        assert "measurements" not in payload
        assert "weight" not in payload
        assert "waist" not in payload

    assert fcm_payload["data"]["context"] == "trend-stale"
    assert fcm_v1_payload["message"]["data"]["tag"] == "bodymod-trend-stale"
    assert apns_payload["aps"]["thread-id"] == "bodymod-trend-stale"


def test_sends_android_native_push_with_fcm_server_key() -> None:
    client = FakeHttpClient([FakeResponse(payload={"success": 1, "failure": 0})])
    config = NativePushDeliveryConfig(fcm_server_key="server-key")

    send_trend_stale_native_push(
        {"platform": "android", "token": "android-native-token"},
        config=config,
        client=client,
    )

    assert client.calls[0]["url"] == FCM_LEGACY_URL
    assert client.calls[0]["headers"]["Authorization"] == "key=server-key"
    assert client.calls[0]["json"]["to"] == "android-native-token"
    assert client.calls[0]["json"]["data"]["context"] == "trend-stale"


def test_sends_ios_native_push_with_apns_token(monkeypatch) -> None:
    client = FakeHttpClient([FakeResponse()])
    config = NativePushDeliveryConfig(
        apns_key_id="KEY123",
        apns_team_id="TEAM123",
        apns_bundle_id="app.bodymod.local",
        apns_auth_key=ec_private_key_pem(),
        apns_use_sandbox=True,
    )

    send_trend_stale_native_push(
        {"platform": "ios", "token": "ios-native-token"},
        config=config,
        client=client,
    )

    assert client.calls[0]["url"] == f"{APNS_SANDBOX_URL}/3/device/ios-native-token"
    assert client.calls[0]["headers"]["apns-topic"] == "app.bodymod.local"
    assert client.calls[0]["headers"]["apns-push-type"] == "alert"
    assert client.calls[0]["headers"]["Authorization"].startswith("bearer ")
    assert client.calls[0]["json"]["context"] == "trend-stale"


def test_native_push_delivery_config_reads_platform_provider_settings(monkeypatch) -> None:
    monkeypatch.delenv("BODYMOD_FCM_SERVER_KEY", raising=False)
    monkeypatch.delenv("BODYMOD_FCM_SERVICE_ACCOUNT_JSON", raising=False)
    monkeypatch.delenv("BODYMOD_APNS_KEY_ID", raising=False)
    monkeypatch.delenv("BODYMOD_APNS_TEAM_ID", raising=False)
    monkeypatch.delenv("BODYMOD_APNS_BUNDLE_ID", raising=False)
    monkeypatch.delenv("BODYMOD_APNS_AUTH_KEY", raising=False)

    assert native_push_delivery_configured("android") is False
    assert native_push_delivery_configured("ios") is False

    monkeypatch.setenv("BODYMOD_FCM_SERVER_KEY", "server-key")
    assert native_push_delivery_configured("android") is True

    monkeypatch.setenv("BODYMOD_APNS_KEY_ID", "KEY123")
    monkeypatch.setenv("BODYMOD_APNS_TEAM_ID", "TEAM123")
    monkeypatch.setenv("BODYMOD_APNS_BUNDLE_ID", "app.bodymod.local")
    monkeypatch.setenv("BODYMOD_APNS_AUTH_KEY", ec_private_key_pem())
    assert native_push_delivery_configured("ios") is True


def test_native_push_worker_dry_run_lists_due_tokens(tmp_path) -> None:
    repository = NativePushTokenRepository(db_path=tmp_path / "bodymod.sqlite3")
    stored = repository.upsert_token(
        "android-native-token-worker-abcdefghijklmnopqrstuvwxyz123",
        "android",
        "trend-stale",
        "2026-06-10T12:00:00Z",
        "2026-06-12T12:00:00Z",
    )
    output: list[str] = []

    status = send_due_native_trend_push_reminders(
        repository,
        now="2026-06-12T12:05:00Z",
        dry_run=True,
        output=output.append,
    )

    assert status == 0
    assert output == [
        f"due tokenHash={stored['tokenHash']} platform=android nextReminderAfter=2026-06-12T12:00:00+00:00"
    ]
    assert repository.list_token_dicts()[0]["lastDeliveryStatus"] is None


def test_native_push_worker_records_sent_delivery(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("BODYMOD_FCM_SERVER_KEY", "server-key")
    repository = NativePushTokenRepository(db_path=tmp_path / "bodymod.sqlite3")
    stored = repository.upsert_token(
        "android-native-token-worker-send-abcdefghijklmnopqrstuvwxyz123",
        "android",
        "trend-stale",
        "2026-06-10T12:00:00Z",
        "2026-06-12T12:00:00Z",
    )
    sent_tokens: list[str] = []

    status = send_due_native_trend_push_reminders(
        repository,
        now="2026-06-12T12:05:00Z",
        sender=lambda token: sent_tokens.append(token["tokenHash"]),
        output=lambda message: None,
    )

    token = repository.list_token_dicts()[0]
    assert status == 0
    assert sent_tokens == [stored["tokenHash"]]
    assert token["lastDeliveryStatus"] == "sent"
    assert token["nextReminderAfter"] == "2026-06-13T12:05:00+00:00"
