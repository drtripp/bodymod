import sqlite3

from app.models import EncryptedSyncBlob, TargetProfile, WebPushSubscriptionPayload
from app.repositories import (
    NativePushTokenRepository,
    PersonalDataTokenRepository,
    SyncConflictError,
    SyncVaultRepository,
    TargetRepository,
    WebPushSubscriptionRepository,
    load_target_seed,
)


def test_target_seed_validates_against_schema() -> None:
    seed = load_target_seed()

    assert seed["version"] >= 1
    assert seed["targets"]
    for target in seed["targets"]:
        TargetProfile.model_validate(target)


def test_target_repository_seeds_sqlite_database(tmp_path) -> None:
    db_path = tmp_path / "bodymod.sqlite3"
    seed = load_target_seed()
    repository = TargetRepository(db_path=db_path)

    targets = repository.list_target_dicts()

    assert db_path.exists()
    assert targets == seed["targets"]

    with sqlite3.connect(db_path) as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(
            "SELECT value FROM app_metadata WHERE key = ?",
            ("target_seed_version",),
        ).fetchone()
        target_count = connection.execute(
            "SELECT COUNT(*) AS count FROM target_profiles"
        ).fetchone()["count"]

    assert row["value"] == str(seed["version"])
    assert target_count == len(seed["targets"])


def test_web_push_subscription_repository_upserts_and_revokes(tmp_path) -> None:
    db_path = tmp_path / "bodymod.sqlite3"
    repository = WebPushSubscriptionRepository(db_path=db_path)
    subscription = WebPushSubscriptionPayload.model_validate(
        {
            "endpoint": "https://push.example.test/subscriptions/repository-1",
            "expirationTime": None,
            "keys": {
                "p256dh": "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef0123456789_-",
                "auth": "abcdef0123456789_-",
            },
        }
    )

    first = repository.upsert_subscription(
        subscription,
        "trend-stale",
        "Chrome",
        "2026-06-10T12:00:00.000Z",
        "2026-06-20T12:00:00.000Z",
    )
    second = repository.upsert_subscription(
        subscription,
        "trend-stale",
        "Firefox",
        "2026-06-10T12:05:00.000Z",
        "2026-06-21T12:00:00.000Z",
    )

    assert first["endpointHash"] == second["endpointHash"]
    stored = repository.list_subscription_dicts()
    assert len(stored) == 1
    assert stored[0]["userAgentFamily"] == "Firefox"
    assert stored[0]["nextReminderAfter"] == "2026-06-21T12:00:00+00:00"
    assert stored[0]["subscription"]["keys"]["auth"] == "abcdef0123456789_-"

    revoked = repository.revoke_subscription(subscription.endpoint)

    assert revoked == {"status": "revoked", "revoked": True}
    assert repository.list_subscription_dicts() == []
    assert repository.list_subscription_dicts(include_revoked=True)[0]["revokedAt"]


def test_web_push_repository_tracks_due_reminder_delivery(tmp_path) -> None:
    db_path = tmp_path / "bodymod.sqlite3"
    repository = WebPushSubscriptionRepository(db_path=db_path)
    subscription = WebPushSubscriptionPayload.model_validate(
        {
            "endpoint": "https://push.example.test/subscriptions/repository-2",
            "expirationTime": None,
            "keys": {
                "p256dh": "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef0123456789_-",
                "auth": "abcdef0123456789_-",
            },
        }
    )
    stored = repository.upsert_subscription(
        subscription,
        "trend-stale",
        "Chrome",
        "2026-06-10T12:00:00.000Z",
        "2026-06-12T12:00:00.000Z",
    )

    early = repository.list_due_trend_reminder_dicts(now="2026-06-12T11:59:00Z")
    due = repository.list_due_trend_reminder_dicts(now="2026-06-12T12:01:00Z")

    assert early == []
    assert len(due) == 1
    assert due[0]["endpointHash"] == stored["endpointHash"]
    assert "measurements" not in due[0]["subscription"]

    recorded = repository.record_delivery_attempt(
        stored["endpointHash"],
        "sent",
        attempted_at="2026-06-12T12:05:00Z",
    )
    cooled_down = repository.list_due_trend_reminder_dicts(now="2026-06-12T18:05:00Z")
    next_day = repository.list_due_trend_reminder_dicts(now="2026-06-13T12:06:00Z")

    assert recorded["recorded"] is True
    assert recorded["nextReminderAfter"] == "2026-06-13T12:05:00+00:00"
    assert cooled_down == []
    assert len(next_day) == 1
    assert next_day[0]["lastDeliveryStatus"] == "sent"


def test_native_push_token_repository_upserts_and_revokes(tmp_path) -> None:
    db_path = tmp_path / "bodymod.sqlite3"
    repository = NativePushTokenRepository(db_path=db_path)
    token = "ios-native-token-repository-abcdefghijklmnopqrstuvwxyz123"

    first = repository.upsert_token(
        token,
        "ios",
        "trend-stale",
        "2026-06-10T12:00:00.000Z",
        "2026-06-20T12:00:00.000Z",
    )
    second = repository.upsert_token(
        token,
        "ios",
        "trend-stale",
        "2026-06-10T12:05:00.000Z",
        "2026-06-21T12:00:00.000Z",
    )

    assert first["tokenHash"] == second["tokenHash"]
    assert first["tokenHash"] != token
    stored = repository.list_token_dicts()
    assert len(stored) == 1
    assert stored[0]["platform"] == "ios"
    assert stored[0]["nextReminderAfter"] == "2026-06-21T12:00:00+00:00"
    assert stored[0]["token"] == token

    revoked = repository.revoke_token(token_hash=first["tokenHash"])

    assert revoked == {"status": "revoked", "revoked": True}
    assert repository.list_token_dicts() == []
    assert repository.list_token_dicts(include_revoked=True)[0]["revokedAt"]


def test_native_push_repository_tracks_due_reminder_delivery(tmp_path) -> None:
    db_path = tmp_path / "bodymod.sqlite3"
    repository = NativePushTokenRepository(db_path=db_path)
    stored = repository.upsert_token(
        "android-native-token-repository-abcdefghijklmnopqrstuvwxyz123",
        "android",
        "trend-stale",
        "2026-06-10T12:00:00.000Z",
        "2026-06-12T12:00:00.000Z",
    )

    early = repository.list_due_trend_reminder_dicts(now="2026-06-12T11:59:00Z")
    due = repository.list_due_trend_reminder_dicts(now="2026-06-12T12:01:00Z")

    assert early == []
    assert len(due) == 1
    assert due[0]["tokenHash"] == stored["tokenHash"]
    assert "measurements" not in due[0]

    recorded = repository.record_delivery_attempt(
        stored["tokenHash"],
        "sent",
        attempted_at="2026-06-12T12:05:00Z",
    )
    cooled_down = repository.list_due_trend_reminder_dicts(now="2026-06-12T18:05:00Z")
    next_day = repository.list_due_trend_reminder_dicts(now="2026-06-13T12:06:00Z")

    assert recorded["recorded"] is True
    assert recorded["nextReminderAfter"] == "2026-06-13T12:05:00+00:00"
    assert cooled_down == []
    assert len(next_day) == 1
    assert next_day[0]["lastDeliveryStatus"] == "sent"


def encrypted_sync_blob(ciphertext: str = "QUJDREVGR0hJSktMTU5PUA==") -> EncryptedSyncBlob:
    return EncryptedSyncBlob.model_validate(
        {
            "version": 1,
            "algorithm": "AES-GCM",
            "kdf": "PBKDF2-SHA256",
            "salt": "YWJjZGVmZ2hpamtsbW5vcA==",
            "iv": "YWJjZGVmZ2hpams=",
            "ciphertext": ciphertext,
        }
    )


def test_sync_vault_repository_stores_only_encrypted_blobs_and_hashes_tokens(tmp_path) -> None:
    db_path = tmp_path / "bodymod.sqlite3"
    repository = SyncVaultRepository(db_path=db_path)

    created = repository.create_vault("browser-a", encrypted_sync_blob())
    vault_id = created["vaultId"]
    sync_token = created["syncToken"]
    read_back = repository.get_vault(vault_id, sync_token)

    assert created["revision"] == 1
    assert read_back["blob"]["ciphertext"] == "QUJDREVGR0hJSktMTU5PUA=="
    assert "measurements" not in str(read_back["blob"])

    with sqlite3.connect(db_path) as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(
            "SELECT sync_token_hash, blob_json FROM sync_vaults WHERE vault_id = ?",
            (vault_id,),
        ).fetchone()

    assert row["sync_token_hash"] != sync_token
    assert sync_token not in row["blob_json"]


def test_sync_vault_repository_detects_conflicts_and_revokes(tmp_path) -> None:
    repository = SyncVaultRepository(db_path=tmp_path / "bodymod.sqlite3")
    created = repository.create_vault("browser-a", encrypted_sync_blob())

    updated = repository.update_vault(
        created["vaultId"],
        created["syncToken"],
        expected_revision=1,
        device_id="browser-b",
        blob=encrypted_sync_blob("VVBEQVRFREVORUNSWVBURUQ="),
    )

    assert updated["revision"] == 2
    assert updated["deviceId"] == "browser-b"

    try:
        repository.update_vault(
            created["vaultId"],
            created["syncToken"],
            expected_revision=1,
            device_id="browser-c",
            blob=encrypted_sync_blob("U1RBTEVSRVZJU0lPTg=="),
        )
    except SyncConflictError as error:
        assert error.current_revision == 2
    else:
        raise AssertionError("Expected stale sync revision to raise conflict.")

    forced = repository.update_vault(
        created["vaultId"],
        created["syncToken"],
        expected_revision=1,
        device_id="browser-c",
        blob=encrypted_sync_blob("Rk9SQ0VEVVBEQVRFRA=="),
        force=True,
    )
    revoked = repository.revoke_vault(created["vaultId"], created["syncToken"])

    assert forced["revision"] == 3
    assert revoked is True
    assert repository.get_vault(created["vaultId"], created["syncToken"]) is None


def test_personal_data_token_repository_hashes_tokens_and_reads_encrypted_vault(tmp_path) -> None:
    db_path = tmp_path / "bodymod.sqlite3"
    vault_repository = SyncVaultRepository(db_path=db_path)
    token_repository = PersonalDataTokenRepository(db_path=db_path)
    vault = vault_repository.create_vault("browser-a", encrypted_sync_blob("UEFUU1BBUkVFTkNSWVBU"))

    created = token_repository.create_token(
        vault["vaultId"],
        vault["syncToken"],
        "QS script",
        ["sync-vault:read"],
    )
    read_back = token_repository.read_sync_vault(created["accessToken"])

    assert created["accessToken"].startswith("bmd_pat_")
    assert read_back["blob"]["ciphertext"] == "UEFUU1BBUkVFTkNSWVBU"
    assert "measurements" not in str(read_back["blob"])

    with sqlite3.connect(db_path) as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(
            """
            SELECT access_token_hash, scopes_json, vault_id
            FROM personal_data_tokens
            WHERE token_id = ?
            """,
            (created["tokenId"],),
        ).fetchone()

    assert row["access_token_hash"] != created["accessToken"]
    assert created["accessToken"] not in row["access_token_hash"]
    assert vault["syncToken"] not in row["scopes_json"]
    assert row["vault_id"] == vault["vaultId"]

    listed = token_repository.list_token_dicts()

    assert listed[0]["accessTokenHash"] == row["access_token_hash"]
    assert "accessToken" not in listed[0]


def test_personal_data_token_repository_expires_and_revokes_tokens(tmp_path) -> None:
    db_path = tmp_path / "bodymod.sqlite3"
    vault_repository = SyncVaultRepository(db_path=db_path)
    token_repository = PersonalDataTokenRepository(db_path=db_path)
    vault = vault_repository.create_vault("browser-a", encrypted_sync_blob())

    expired = token_repository.create_token(
        vault["vaultId"],
        vault["syncToken"],
        "Expired export",
        ["sync-vault:read"],
        expires_at="2020-01-01T00:00:00Z",
    )
    active = token_repository.create_token(
        vault["vaultId"],
        vault["syncToken"],
        "Active export",
        ["sync-vault:read"],
    )

    try:
        token_repository.read_sync_vault(expired["accessToken"])
    except PermissionError as error:
        assert "Invalid or expired" in str(error)
    else:
        raise AssertionError("Expected expired personal data token to be rejected.")

    revoked = token_repository.revoke_token(active["accessToken"])

    assert revoked == {"status": "revoked", "revoked": True}
    remaining = token_repository.list_token_dicts()
    all_tokens = token_repository.list_token_dicts(include_revoked=True)
    assert len(remaining) == 1
    assert remaining[0]["label"] == "Expired export"
    assert len(all_tokens) == 2
    assert any(token["revokedAt"] for token in all_tokens if token["label"] == "Active export")

    try:
        token_repository.read_sync_vault(active["accessToken"])
    except PermissionError as error:
        assert "Invalid or expired" in str(error)
    else:
        raise AssertionError("Expected revoked personal data token to be rejected.")
