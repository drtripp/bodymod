import hashlib
import json
import os
import secrets
import sqlite3
from contextlib import closing
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from app.models import (
    ClientErrorEvent,
    EncryptedSyncBlob,
    ProductAnalyticsEvent,
    ShareDashboardPayload,
    TargetProfile,
    WebPushSubscriptionPayload,
)


BACKEND_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = BACKEND_ROOT / ".local" / "bodymod.sqlite3"
TARGET_SEED_PATH = Path(__file__).resolve().parent / "data" / "targets.seed.json"


def configured_database_path() -> Path:
    configured_path = os.getenv("BODYMOD_DB_PATH")
    if configured_path:
        return Path(configured_path)
    return DEFAULT_DB_PATH


def load_target_seed(seed_path: Path = TARGET_SEED_PATH) -> dict[str, Any]:
    seed = json.loads(seed_path.read_text(encoding="utf-8"))
    if not isinstance(seed.get("version"), int):
        raise ValueError("Target seed must include an integer version.")
    if not isinstance(seed.get("targets"), list) or not seed["targets"]:
        raise ValueError("Target seed must include at least one target.")

    for target in seed["targets"]:
        TargetProfile.model_validate(target)

    return seed


class TargetRepository:
    def __init__(
        self,
        db_path: Path | str | None = None,
        seed_path: Path = TARGET_SEED_PATH,
    ) -> None:
        self.db_path = Path(db_path) if db_path is not None else configured_database_path()
        self.seed_path = seed_path

    def list_targets(self) -> list[TargetProfile]:
        return [TargetProfile.model_validate(item) for item in self.list_target_dicts()]

    def list_target_dicts(self) -> list[dict[str, Any]]:
        with closing(self._connect()) as connection:
            self._ensure_seeded(connection)
            rows = connection.execute(
                """
                SELECT id, label, source_type, notes, measurements_json
                FROM target_profiles
                ORDER BY position ASC, id ASC
                """
            ).fetchall()

        return [
            {
                "id": row["id"],
                "label": row["label"],
                "source_type": row["source_type"],
                "notes": row["notes"],
                "measurements": json.loads(row["measurements_json"]),
            }
            for row in rows
        ]

    def _connect(self) -> sqlite3.Connection:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _ensure_seeded(self, connection: sqlite3.Connection) -> None:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS app_metadata (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS target_profiles (
                id TEXT PRIMARY KEY,
                label TEXT NOT NULL,
                source_type TEXT NOT NULL,
                notes TEXT,
                measurements_json TEXT NOT NULL,
                position INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        seed = load_target_seed(self.seed_path)
        seed_version = str(seed["version"])
        stored_version = connection.execute(
            "SELECT value FROM app_metadata WHERE key = ?",
            ("target_seed_version",),
        ).fetchone()
        target_count = connection.execute("SELECT COUNT(*) AS count FROM target_profiles").fetchone()[
            "count"
        ]

        if stored_version and stored_version["value"] == seed_version and target_count:
            return

        with connection:
            connection.execute("DELETE FROM target_profiles")
            connection.executemany(
                """
                INSERT INTO target_profiles (
                    id,
                    label,
                    source_type,
                    notes,
                    measurements_json,
                    position
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        target["id"],
                        target["label"],
                        target["source_type"],
                        target.get("notes"),
                        json.dumps(target["measurements"], separators=(",", ":"), sort_keys=True),
                        index,
                    )
                    for index, target in enumerate(seed["targets"])
                ],
            )
            connection.execute(
                """
                INSERT INTO app_metadata (key, value)
                VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
                """,
                ("target_seed_version", seed_version),
            )


def utc_timestamp() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def parse_iso_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def normalize_iso_timestamp(value: str | datetime | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        parsed = value
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc).replace(microsecond=0).isoformat()
    return normalize_iso_timestamp(parse_iso_timestamp(value))


def hash_revoke_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def hash_web_push_endpoint(endpoint: str) -> str:
    return hashlib.sha256(endpoint.encode("utf-8")).hexdigest()


def hash_native_push_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def hash_sync_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class SyncConflictError(Exception):
    def __init__(self, current_revision: int, updated_at: str) -> None:
        self.current_revision = current_revision
        self.updated_at = updated_at
        super().__init__("Sync vault revision conflict.")


class ShareDashboardRepository:
    def __init__(self, db_path: Path | str | None = None) -> None:
        self.db_path = Path(db_path) if db_path is not None else configured_database_path()

    def create_dashboard(self, dashboard: ShareDashboardPayload) -> dict[str, Any]:
        public_token = secrets.token_urlsafe(18)
        revoke_token = secrets.token_urlsafe(24)
        timestamp = utc_timestamp()

        with closing(self._connect()) as connection:
            self._ensure_schema(connection)
            with connection:
                connection.execute(
                    """
                    INSERT INTO share_dashboards (
                        public_token,
                        revoke_token_hash,
                        payload_json,
                        is_revoked,
                        created_at,
                        updated_at
                    )
                    VALUES (?, ?, ?, 0, ?, ?)
                    """,
                    (
                        public_token,
                        hash_revoke_token(revoke_token),
                        self._payload_json(dashboard),
                        timestamp,
                        timestamp,
                    ),
                )

        return {
            "publicToken": public_token,
            "revokeToken": revoke_token,
            "createdAt": timestamp,
            "updatedAt": timestamp,
            "dashboard": dashboard.model_dump(),
        }

    def get_public_dashboard(self, public_token: str) -> dict[str, Any] | None:
        with closing(self._connect()) as connection:
            self._ensure_schema(connection)
            row = connection.execute(
                """
                SELECT public_token, payload_json, created_at, updated_at
                FROM share_dashboards
                WHERE public_token = ? AND is_revoked = 0
                """,
                (public_token,),
            ).fetchone()

        return self._public_record(row) if row else None

    def update_dashboard(
        self,
        public_token: str,
        revoke_token: str,
        dashboard: ShareDashboardPayload,
    ) -> dict[str, Any] | None:
        timestamp = utc_timestamp()

        with closing(self._connect()) as connection:
            self._ensure_schema(connection)
            row = self._private_row(connection, public_token)
            if not row:
                return None
            if not self._revoke_token_matches(row, revoke_token):
                raise PermissionError("Invalid share dashboard revoke token.")

            with connection:
                connection.execute(
                    """
                    UPDATE share_dashboards
                    SET payload_json = ?, updated_at = ?
                    WHERE public_token = ?
                    """,
                    (self._payload_json(dashboard), timestamp, public_token),
                )

            updated = connection.execute(
                """
                SELECT public_token, payload_json, created_at, updated_at
                FROM share_dashboards
                WHERE public_token = ? AND is_revoked = 0
                """,
                (public_token,),
            ).fetchone()

        return self._public_record(updated) if updated else None

    def revoke_dashboard(self, public_token: str, revoke_token: str) -> bool:
        timestamp = utc_timestamp()

        with closing(self._connect()) as connection:
            self._ensure_schema(connection)
            row = self._private_row(connection, public_token)
            if not row:
                return False
            if not self._revoke_token_matches(row, revoke_token):
                raise PermissionError("Invalid share dashboard revoke token.")

            with connection:
                connection.execute(
                    """
                    UPDATE share_dashboards
                    SET is_revoked = 1, revoked_at = ?, updated_at = ?
                    WHERE public_token = ?
                    """,
                    (timestamp, timestamp, public_token),
                )

        return True

    def _connect(self) -> sqlite3.Connection:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _ensure_schema(self, connection: sqlite3.Connection) -> None:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS share_dashboards (
                public_token TEXT PRIMARY KEY,
                revoke_token_hash TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                is_revoked INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                revoked_at TEXT
            )
            """
        )

    def _private_row(self, connection: sqlite3.Connection, public_token: str) -> sqlite3.Row | None:
        return connection.execute(
            """
            SELECT public_token, revoke_token_hash, is_revoked
            FROM share_dashboards
            WHERE public_token = ?
            """,
            (public_token,),
        ).fetchone()

    def _revoke_token_matches(self, row: sqlite3.Row, revoke_token: str) -> bool:
        if row["is_revoked"]:
            return False
        return secrets.compare_digest(row["revoke_token_hash"], hash_revoke_token(revoke_token))

    def _payload_json(self, dashboard: ShareDashboardPayload) -> str:
        return json.dumps(dashboard.model_dump(), separators=(",", ":"), sort_keys=True)

    def _public_record(self, row: sqlite3.Row) -> dict[str, Any]:
        return {
            "publicToken": row["public_token"],
            "createdAt": row["created_at"],
            "updatedAt": row["updated_at"],
            "dashboard": json.loads(row["payload_json"]),
        }


class SyncVaultRepository:
    def __init__(self, db_path: Path | str | None = None) -> None:
        self.db_path = Path(db_path) if db_path is not None else configured_database_path()

    def create_vault(self, device_id: str, blob: EncryptedSyncBlob) -> dict[str, Any]:
        vault_id = secrets.token_urlsafe(18)
        sync_token = secrets.token_urlsafe(32)
        timestamp = utc_timestamp()

        with closing(self._connect()) as connection:
            self._ensure_schema(connection)
            with connection:
                connection.execute(
                    """
                    INSERT INTO sync_vaults (
                        vault_id,
                        sync_token_hash,
                        revision,
                        device_id,
                        blob_json,
                        created_at,
                        updated_at,
                        revoked_at
                    )
                    VALUES (?, ?, 1, ?, ?, ?, ?, NULL)
                    """,
                    (
                        vault_id,
                        hash_sync_token(sync_token),
                        device_id,
                        self._blob_json(blob),
                        timestamp,
                        timestamp,
                    ),
                )

        return {
            **self.get_vault(vault_id, sync_token),
            "syncToken": sync_token,
        }

    def get_vault(self, vault_id: str, sync_token: str) -> dict[str, Any] | None:
        with closing(self._connect()) as connection:
            self._ensure_schema(connection)
            row = self._private_row(connection, vault_id)
            if not row:
                return None
            if not self._sync_token_matches(row, sync_token):
                raise PermissionError("Invalid sync token.")

        return self._record(row)

    def update_vault(
        self,
        vault_id: str,
        sync_token: str,
        expected_revision: int,
        device_id: str,
        blob: EncryptedSyncBlob,
        force: bool = False,
    ) -> dict[str, Any] | None:
        timestamp = utc_timestamp()

        with closing(self._connect()) as connection:
            self._ensure_schema(connection)
            row = self._private_row(connection, vault_id)
            if not row:
                return None
            if not self._sync_token_matches(row, sync_token):
                raise PermissionError("Invalid sync token.")
            if not force and row["revision"] != expected_revision:
                raise SyncConflictError(row["revision"], row["updated_at"])

            next_revision = int(row["revision"]) + 1
            with connection:
                connection.execute(
                    """
                    UPDATE sync_vaults
                    SET revision = ?,
                        device_id = ?,
                        blob_json = ?,
                        updated_at = ?
                    WHERE vault_id = ? AND revoked_at IS NULL
                    """,
                    (
                        next_revision,
                        device_id,
                        self._blob_json(blob),
                        timestamp,
                        vault_id,
                    ),
                )
            updated = self._private_row(connection, vault_id)

        return self._record(updated) if updated else None

    def revoke_vault(self, vault_id: str, sync_token: str) -> bool:
        timestamp = utc_timestamp()

        with closing(self._connect()) as connection:
            self._ensure_schema(connection)
            row = self._private_row(connection, vault_id)
            if not row:
                return False
            if not self._sync_token_matches(row, sync_token):
                raise PermissionError("Invalid sync token.")

            with connection:
                cursor = connection.execute(
                    """
                    UPDATE sync_vaults
                    SET revoked_at = ?, updated_at = ?
                    WHERE vault_id = ? AND revoked_at IS NULL
                    """,
                    (timestamp, timestamp, vault_id),
                )

        return cursor.rowcount > 0

    def _connect(self) -> sqlite3.Connection:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _ensure_schema(self, connection: sqlite3.Connection) -> None:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS sync_vaults (
                vault_id TEXT PRIMARY KEY,
                sync_token_hash TEXT NOT NULL,
                revision INTEGER NOT NULL,
                device_id TEXT NOT NULL,
                blob_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                revoked_at TEXT
            )
            """
        )

    def _private_row(self, connection: sqlite3.Connection, vault_id: str) -> sqlite3.Row | None:
        return connection.execute(
            """
            SELECT vault_id, sync_token_hash, revision, device_id, blob_json,
                   created_at, updated_at, revoked_at
            FROM sync_vaults
            WHERE vault_id = ? AND revoked_at IS NULL
            """,
            (vault_id,),
        ).fetchone()

    def _sync_token_matches(self, row: sqlite3.Row, sync_token: str) -> bool:
        return secrets.compare_digest(row["sync_token_hash"], hash_sync_token(sync_token))

    def _blob_json(self, blob: EncryptedSyncBlob) -> str:
        return json.dumps(blob.model_dump(mode="json"), separators=(",", ":"), sort_keys=True)

    def _record(self, row: sqlite3.Row) -> dict[str, Any]:
        return {
            "vaultId": row["vault_id"],
            "revision": row["revision"],
            "deviceId": row["device_id"],
            "createdAt": row["created_at"],
            "updatedAt": row["updated_at"],
            "blob": json.loads(row["blob_json"]),
        }


class ClientErrorRepository:
    def __init__(self, db_path: Path | str | None = None) -> None:
        self.db_path = Path(db_path) if db_path is not None else configured_database_path()

    def record_event(self, event: ClientErrorEvent) -> dict[str, Any]:
        payload_json = json.dumps(
            event.model_dump(mode="json"),
            separators=(",", ":"),
            sort_keys=True,
        )

        with closing(self._connect()) as connection:
            self._ensure_schema(connection)
            with connection:
                connection.execute(
                    """
                    INSERT OR IGNORE INTO client_error_events (
                        client_event_id,
                        event_type,
                        error_name,
                        message_fingerprint,
                        source,
                        route,
                        payload_json,
                        received_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        event.id,
                        event.type,
                        event.errorName,
                        event.messageFingerprint,
                        event.source,
                        event.route,
                        payload_json,
                        utc_timestamp(),
                    ),
                )

        return {"status": "accepted", "stored": True}

    def list_event_dicts(self) -> list[dict[str, Any]]:
        with closing(self._connect()) as connection:
            self._ensure_schema(connection)
            rows = connection.execute(
                """
                SELECT payload_json
                FROM client_error_events
                ORDER BY received_at ASC, client_event_id ASC
                """
            ).fetchall()

        return [json.loads(row["payload_json"]) for row in rows]

    def _connect(self) -> sqlite3.Connection:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _ensure_schema(self, connection: sqlite3.Connection) -> None:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS client_error_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_event_id TEXT NOT NULL UNIQUE,
                event_type TEXT NOT NULL,
                error_name TEXT NOT NULL,
                message_fingerprint TEXT NOT NULL,
                source TEXT NOT NULL,
                route TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                received_at TEXT NOT NULL
            )
            """
        )


class ProductAnalyticsRepository:
    def __init__(self, db_path: Path | str | None = None) -> None:
        self.db_path = Path(db_path) if db_path is not None else configured_database_path()

    def record_event(self, event: ProductAnalyticsEvent) -> dict[str, Any]:
        payload_json = json.dumps(
            event.model_dump(mode="json"),
            separators=(",", ":"),
            sort_keys=True,
        )

        with closing(self._connect()) as connection:
            self._ensure_schema(connection)
            with connection:
                connection.execute(
                    """
                    INSERT OR IGNORE INTO product_analytics_events (
                        client_event_id,
                        event_name,
                        surface,
                        context,
                        route,
                        anonymous_session_id,
                        payload_json,
                        received_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        event.id,
                        event.name,
                        event.surface,
                        event.context,
                        event.route,
                        event.anonymousSessionId,
                        payload_json,
                        utc_timestamp(),
                    ),
                )

        return {"status": "accepted", "stored": True}

    def list_event_dicts(self) -> list[dict[str, Any]]:
        with closing(self._connect()) as connection:
            self._ensure_schema(connection)
            rows = connection.execute(
                """
                SELECT payload_json
                FROM product_analytics_events
                ORDER BY received_at ASC, client_event_id ASC
                """
            ).fetchall()

        return [json.loads(row["payload_json"]) for row in rows]

    def _connect(self) -> sqlite3.Connection:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _ensure_schema(self, connection: sqlite3.Connection) -> None:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS product_analytics_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_event_id TEXT NOT NULL UNIQUE,
                event_name TEXT NOT NULL,
                surface TEXT NOT NULL,
                context TEXT NOT NULL,
                route TEXT NOT NULL,
                anonymous_session_id TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                received_at TEXT NOT NULL
            )
            """
        )


class WebPushSubscriptionRepository:
    def __init__(self, db_path: Path | str | None = None) -> None:
        self.db_path = Path(db_path) if db_path is not None else configured_database_path()

    def upsert_subscription(
        self,
        subscription: WebPushSubscriptionPayload,
        context: str,
        user_agent_family: str,
        created_at: str,
        next_reminder_after: str | None = None,
    ) -> dict[str, Any]:
        endpoint_hash = hash_web_push_endpoint(subscription.endpoint)
        timestamp = utc_timestamp()
        normalized_next_reminder_after = normalize_iso_timestamp(next_reminder_after)
        payload_json = json.dumps(
            subscription.model_dump(mode="json"),
            separators=(",", ":"),
            sort_keys=True,
        )

        with closing(self._connect()) as connection:
            self._ensure_schema(connection)
            with connection:
                connection.execute(
                    """
                    INSERT INTO web_push_subscriptions (
                        endpoint_hash,
                        context,
                        user_agent_family,
                        subscription_json,
                        browser_created_at,
                        next_reminder_after,
                        created_at,
                        updated_at,
                        revoked_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
                    ON CONFLICT(endpoint_hash) DO UPDATE SET
                        context = excluded.context,
                        user_agent_family = excluded.user_agent_family,
                        subscription_json = excluded.subscription_json,
                        browser_created_at = excluded.browser_created_at,
                        next_reminder_after = excluded.next_reminder_after,
                        updated_at = excluded.updated_at,
                        revoked_at = NULL
                    """,
                    (
                        endpoint_hash,
                        context,
                        user_agent_family,
                        payload_json,
                        created_at,
                        normalized_next_reminder_after,
                        timestamp,
                        timestamp,
                    ),
                )

        return {
            "status": "accepted",
            "stored": True,
            "endpointHash": endpoint_hash,
            "nextReminderAfter": normalized_next_reminder_after,
        }

    def revoke_subscription(self, endpoint: str) -> dict[str, Any]:
        endpoint_hash = hash_web_push_endpoint(endpoint)
        timestamp = utc_timestamp()

        with closing(self._connect()) as connection:
            self._ensure_schema(connection)
            with connection:
                cursor = connection.execute(
                    """
                    UPDATE web_push_subscriptions
                    SET revoked_at = ?, updated_at = ?
                    WHERE endpoint_hash = ? AND revoked_at IS NULL
                    """,
                    (timestamp, timestamp, endpoint_hash),
                )

        return {"status": "revoked", "revoked": cursor.rowcount > 0}

    def list_subscription_dicts(self, include_revoked: bool = False) -> list[dict[str, Any]]:
        with closing(self._connect()) as connection:
            self._ensure_schema(connection)
            where_clause = "" if include_revoked else "WHERE revoked_at IS NULL"
            rows = connection.execute(
                f"""
                SELECT endpoint_hash, context, user_agent_family, subscription_json,
                       browser_created_at, next_reminder_after, last_delivery_attempt_at,
                       last_delivered_at, last_delivery_status, last_delivery_error,
                       created_at, updated_at, revoked_at
                FROM web_push_subscriptions
                {where_clause}
                ORDER BY updated_at ASC, endpoint_hash ASC
                """
            ).fetchall()

        return [
            {
                "endpointHash": row["endpoint_hash"],
                "context": row["context"],
                "userAgentFamily": row["user_agent_family"],
                "subscription": json.loads(row["subscription_json"]),
                "browserCreatedAt": row["browser_created_at"],
                "nextReminderAfter": row["next_reminder_after"],
                "lastDeliveryAttemptAt": row["last_delivery_attempt_at"],
                "lastDeliveredAt": row["last_delivered_at"],
                "lastDeliveryStatus": row["last_delivery_status"],
                "lastDeliveryError": row["last_delivery_error"],
                "createdAt": row["created_at"],
                "updatedAt": row["updated_at"],
                "revokedAt": row["revoked_at"],
            }
            for row in rows
        ]

    def list_due_trend_reminder_dicts(
        self,
        now: str | datetime | None = None,
        limit: int = 100,
        delivery_cooldown_hours: int = 24,
    ) -> list[dict[str, Any]]:
        reference = parse_iso_timestamp(normalize_iso_timestamp(now) or utc_timestamp())
        cooldown_after = reference - timedelta(hours=delivery_cooldown_hours)
        due_subscriptions: list[dict[str, Any]] = []

        for subscription in self.list_subscription_dicts():
            if subscription["context"] != "trend-stale" or not subscription["nextReminderAfter"]:
                continue

            reminder_after = parse_iso_timestamp(subscription["nextReminderAfter"])
            if not reminder_after or reminder_after > reference:
                continue

            last_attempt = parse_iso_timestamp(subscription["lastDeliveryAttemptAt"])
            if last_attempt and last_attempt > cooldown_after:
                continue

            due_subscriptions.append(subscription)

        return sorted(
            due_subscriptions,
            key=lambda item: (item["nextReminderAfter"], item["endpointHash"]),
        )[:limit]

    def record_delivery_attempt(
        self,
        endpoint_hash: str,
        status: str,
        attempted_at: str | datetime | None = None,
        error: str = "",
        next_reminder_after: str | datetime | None = None,
    ) -> dict[str, Any]:
        if status not in {"sent", "failed"}:
            raise ValueError("Web push delivery status must be sent or failed.")

        normalized_attempted_at = normalize_iso_timestamp(attempted_at or utc_timestamp())
        attempted_datetime = parse_iso_timestamp(normalized_attempted_at)
        normalized_next_reminder_after = normalize_iso_timestamp(
            next_reminder_after or (attempted_datetime + timedelta(hours=24))
        )
        truncated_error = error[:240]

        with closing(self._connect()) as connection:
            self._ensure_schema(connection)
            with connection:
                cursor = connection.execute(
                    """
                    UPDATE web_push_subscriptions
                    SET last_delivery_attempt_at = ?,
                        last_delivered_at = CASE WHEN ? = 'sent' THEN ? ELSE last_delivered_at END,
                        last_delivery_status = ?,
                        last_delivery_error = ?,
                        next_reminder_after = ?,
                        updated_at = ?
                    WHERE endpoint_hash = ? AND revoked_at IS NULL
                    """,
                    (
                        normalized_attempted_at,
                        status,
                        normalized_attempted_at,
                        status,
                        truncated_error,
                        normalized_next_reminder_after,
                        normalized_attempted_at,
                        endpoint_hash,
                    ),
                )

        return {
            "status": status,
            "recorded": cursor.rowcount > 0,
            "nextReminderAfter": normalized_next_reminder_after,
        }

    def _connect(self) -> sqlite3.Connection:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _ensure_schema(self, connection: sqlite3.Connection) -> None:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS web_push_subscriptions (
                endpoint_hash TEXT PRIMARY KEY,
                context TEXT NOT NULL,
                user_agent_family TEXT NOT NULL,
                subscription_json TEXT NOT NULL,
                browser_created_at TEXT NOT NULL,
                next_reminder_after TEXT,
                last_delivery_attempt_at TEXT,
                last_delivered_at TEXT,
                last_delivery_status TEXT,
                last_delivery_error TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                revoked_at TEXT
            )
            """
        )
        columns = {
            row["name"]
            for row in connection.execute("PRAGMA table_info(web_push_subscriptions)").fetchall()
        }
        migrations = {
            "next_reminder_after": "TEXT",
            "last_delivery_attempt_at": "TEXT",
            "last_delivered_at": "TEXT",
            "last_delivery_status": "TEXT",
            "last_delivery_error": "TEXT",
        }
        for column, definition in migrations.items():
            if column not in columns:
                connection.execute(
                    f"ALTER TABLE web_push_subscriptions ADD COLUMN {column} {definition}"
                )


class NativePushTokenRepository:
    def __init__(self, db_path: Path | str | None = None) -> None:
        self.db_path = Path(db_path) if db_path is not None else configured_database_path()

    def upsert_token(
        self,
        token: str,
        platform: str,
        context: str,
        created_at: str,
        next_reminder_after: str | None = None,
    ) -> dict[str, Any]:
        token_hash = hash_native_push_token(token)
        timestamp = utc_timestamp()
        normalized_next_reminder_after = normalize_iso_timestamp(next_reminder_after)

        with closing(self._connect()) as connection:
            self._ensure_schema(connection)
            with connection:
                connection.execute(
                    """
                    INSERT INTO native_push_tokens (
                        token_hash,
                        platform,
                        context,
                        token,
                        app_created_at,
                        next_reminder_after,
                        created_at,
                        updated_at,
                        revoked_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
                    ON CONFLICT(token_hash) DO UPDATE SET
                        platform = excluded.platform,
                        context = excluded.context,
                        token = excluded.token,
                        app_created_at = excluded.app_created_at,
                        next_reminder_after = excluded.next_reminder_after,
                        updated_at = excluded.updated_at,
                        revoked_at = NULL
                    """,
                    (
                        token_hash,
                        platform,
                        context,
                        token,
                        created_at,
                        normalized_next_reminder_after,
                        timestamp,
                        timestamp,
                    ),
                )

        return {
            "status": "accepted",
            "stored": True,
            "tokenHash": token_hash,
            "nextReminderAfter": normalized_next_reminder_after,
        }

    def revoke_token(self, token: str | None = None, token_hash: str | None = None) -> dict[str, Any]:
        resolved_token_hash = token_hash or (hash_native_push_token(token) if token else "")
        timestamp = utc_timestamp()

        with closing(self._connect()) as connection:
            self._ensure_schema(connection)
            with connection:
                cursor = connection.execute(
                    """
                    UPDATE native_push_tokens
                    SET revoked_at = ?, updated_at = ?
                    WHERE token_hash = ? AND revoked_at IS NULL
                    """,
                    (timestamp, timestamp, resolved_token_hash),
                )

        return {"status": "revoked", "revoked": cursor.rowcount > 0}

    def list_token_dicts(self, include_revoked: bool = False) -> list[dict[str, Any]]:
        with closing(self._connect()) as connection:
            self._ensure_schema(connection)
            where_clause = "" if include_revoked else "WHERE revoked_at IS NULL"
            rows = connection.execute(
                f"""
                SELECT token_hash, platform, context, token, app_created_at,
                       next_reminder_after, last_delivery_attempt_at,
                       last_delivered_at, last_delivery_status, last_delivery_error,
                       created_at, updated_at, revoked_at
                FROM native_push_tokens
                {where_clause}
                ORDER BY updated_at ASC, token_hash ASC
                """
            ).fetchall()

        return [
            {
                "tokenHash": row["token_hash"],
                "platform": row["platform"],
                "context": row["context"],
                "token": row["token"],
                "appCreatedAt": row["app_created_at"],
                "nextReminderAfter": row["next_reminder_after"],
                "lastDeliveryAttemptAt": row["last_delivery_attempt_at"],
                "lastDeliveredAt": row["last_delivered_at"],
                "lastDeliveryStatus": row["last_delivery_status"],
                "lastDeliveryError": row["last_delivery_error"],
                "createdAt": row["created_at"],
                "updatedAt": row["updated_at"],
                "revokedAt": row["revoked_at"],
            }
            for row in rows
        ]

    def list_due_trend_reminder_dicts(
        self,
        now: str | datetime | None = None,
        limit: int = 100,
        delivery_cooldown_hours: int = 24,
    ) -> list[dict[str, Any]]:
        reference = parse_iso_timestamp(normalize_iso_timestamp(now) or utc_timestamp())
        cooldown_after = reference - timedelta(hours=delivery_cooldown_hours)
        due_tokens: list[dict[str, Any]] = []

        for token in self.list_token_dicts():
            if token["context"] != "trend-stale" or not token["nextReminderAfter"]:
                continue

            reminder_after = parse_iso_timestamp(token["nextReminderAfter"])
            if not reminder_after or reminder_after > reference:
                continue

            last_attempt = parse_iso_timestamp(token["lastDeliveryAttemptAt"])
            if last_attempt and last_attempt > cooldown_after:
                continue

            due_tokens.append(token)

        return sorted(
            due_tokens,
            key=lambda item: (item["nextReminderAfter"], item["tokenHash"]),
        )[:limit]

    def record_delivery_attempt(
        self,
        token_hash: str,
        status: str,
        attempted_at: str | datetime | None = None,
        error: str = "",
        next_reminder_after: str | datetime | None = None,
    ) -> dict[str, Any]:
        if status not in {"sent", "failed"}:
            raise ValueError("Native push delivery status must be sent or failed.")

        normalized_attempted_at = normalize_iso_timestamp(attempted_at or utc_timestamp())
        attempted_datetime = parse_iso_timestamp(normalized_attempted_at)
        normalized_next_reminder_after = normalize_iso_timestamp(
            next_reminder_after or (attempted_datetime + timedelta(hours=24))
        )
        truncated_error = error[:240]

        with closing(self._connect()) as connection:
            self._ensure_schema(connection)
            with connection:
                cursor = connection.execute(
                    """
                    UPDATE native_push_tokens
                    SET last_delivery_attempt_at = ?,
                        last_delivered_at = CASE WHEN ? = 'sent' THEN ? ELSE last_delivered_at END,
                        last_delivery_status = ?,
                        last_delivery_error = ?,
                        next_reminder_after = ?,
                        updated_at = ?
                    WHERE token_hash = ? AND revoked_at IS NULL
                    """,
                    (
                        normalized_attempted_at,
                        status,
                        normalized_attempted_at,
                        status,
                        truncated_error,
                        normalized_next_reminder_after,
                        normalized_attempted_at,
                        token_hash,
                    ),
                )

        return {
            "status": status,
            "recorded": cursor.rowcount > 0,
            "nextReminderAfter": normalized_next_reminder_after,
        }

    def _connect(self) -> sqlite3.Connection:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _ensure_schema(self, connection: sqlite3.Connection) -> None:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS native_push_tokens (
                token_hash TEXT PRIMARY KEY,
                platform TEXT NOT NULL,
                context TEXT NOT NULL,
                token TEXT NOT NULL,
                app_created_at TEXT NOT NULL,
                next_reminder_after TEXT,
                last_delivery_attempt_at TEXT,
                last_delivered_at TEXT,
                last_delivery_status TEXT,
                last_delivery_error TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                revoked_at TEXT
            )
            """
        )
        columns = {
            row["name"]
            for row in connection.execute("PRAGMA table_info(native_push_tokens)").fetchall()
        }
        migrations = {
            "next_reminder_after": "TEXT",
            "last_delivery_attempt_at": "TEXT",
            "last_delivered_at": "TEXT",
            "last_delivery_status": "TEXT",
            "last_delivery_error": "TEXT",
        }
        for column, definition in migrations.items():
            if column not in columns:
                connection.execute(
                    f"ALTER TABLE native_push_tokens ADD COLUMN {column} {definition}"
                )
