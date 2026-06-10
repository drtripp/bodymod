import hashlib
import json
import os
import secrets
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.models import ShareDashboardPayload, TargetProfile


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


def hash_revoke_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


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
