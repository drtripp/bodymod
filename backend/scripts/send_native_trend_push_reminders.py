"""Send due native stale-trend push reminders.

Run from the backend directory after installing backend requirements:

    .\\.venv\\Scripts\\python.exe scripts\\send_native_trend_push_reminders.py --dry-run

Production should run this from a scheduler. The worker never reads
measurements or account data; due state comes from timestamp-only native token
metadata posted by the app.
"""

import argparse
import sys
from pathlib import Path
from typing import Callable


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.native_push import (  # noqa: E402
    native_push_delivery_configured,
    send_trend_stale_native_push,
)
from app.repositories import NativePushTokenRepository  # noqa: E402


Output = Callable[[str], None]
Sender = Callable[[dict], None]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db-path", type=Path, default=None, help="Override BODYMOD_DB_PATH.")
    parser.add_argument("--limit", type=int, default=100, help="Maximum reminders to inspect.")
    parser.add_argument("--now", default=None, help="ISO timestamp used for due-state testing.")
    parser.add_argument("--dry-run", action="store_true", help="List due reminders without sending.")
    return parser.parse_args()


def send_due_native_trend_push_reminders(
    repository: NativePushTokenRepository,
    now: str | None = None,
    limit: int = 100,
    dry_run: bool = False,
    sender: Sender = send_trend_stale_native_push,
    output: Output = print,
) -> int:
    due_tokens = repository.list_due_trend_reminder_dicts(
        now=now,
        limit=max(1, limit),
    )

    if not due_tokens:
        output("No due trend-stale native push reminders.")
        return 0

    if dry_run:
        for token in due_tokens:
            output(
                "due "
                f"tokenHash={token['tokenHash']} "
                f"platform={token['platform']} "
                f"nextReminderAfter={token['nextReminderAfter']}"
            )
        return 0

    sent = 0
    failed = 0
    skipped = 0
    for token in due_tokens:
        if not native_push_delivery_configured(token["platform"]):
            output(
                "skipped "
                f"tokenHash={token['tokenHash']} "
                f"platform={token['platform']} "
                "reason=not-configured"
            )
            skipped += 1
            continue

        try:
            sender(token)
            repository.record_delivery_attempt(
                token["tokenHash"],
                "sent",
                attempted_at=now,
            )
            sent += 1
        except Exception as error:  # pragma: no cover - depends on provider/network responses.
            repository.record_delivery_attempt(
                token["tokenHash"],
                "failed",
                attempted_at=now,
                error=str(error),
            )
            failed += 1

    output(f"Native trend reminders sent={sent} failed={failed} skipped={skipped}.")
    if failed:
        return 1
    if skipped and not sent:
        return 2
    return 0


def main() -> int:
    args = parse_args()
    repository = NativePushTokenRepository(db_path=args.db_path)
    return send_due_native_trend_push_reminders(
        repository,
        now=args.now,
        limit=args.limit,
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    raise SystemExit(main())
