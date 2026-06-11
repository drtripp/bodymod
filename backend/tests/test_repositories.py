import sqlite3

from app.models import TargetProfile, WebPushSubscriptionPayload
from app.repositories import (
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
