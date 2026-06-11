"""Send due remote stale-trend web push reminders.

Run from the backend directory after installing backend requirements:

    .\\.venv\\Scripts\\python.exe scripts\\send_trend_push_reminders.py --dry-run

Production should run this from a scheduler. The worker never reads
measurements or account data; due state comes from timestamp-only subscription
metadata posted by the browser.
"""

import argparse
import sys
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.repositories import WebPushSubscriptionRepository  # noqa: E402
from app.web_push import send_trend_stale_push, web_push_delivery_configured  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db-path", type=Path, default=None, help="Override BODYMOD_DB_PATH.")
    parser.add_argument("--limit", type=int, default=100, help="Maximum reminders to inspect.")
    parser.add_argument("--now", default=None, help="ISO timestamp used for due-state testing.")
    parser.add_argument("--dry-run", action="store_true", help="List due reminders without sending.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repository = WebPushSubscriptionRepository(db_path=args.db_path)
    due_subscriptions = repository.list_due_trend_reminder_dicts(
        now=args.now,
        limit=max(1, args.limit),
    )

    if not due_subscriptions:
        print("No due trend-stale web push reminders.")
        return 0

    if args.dry_run:
        for subscription in due_subscriptions:
            print(
                "due "
                f"endpointHash={subscription['endpointHash']} "
                f"userAgent={subscription['userAgentFamily']} "
                f"nextReminderAfter={subscription['nextReminderAfter']}"
            )
        return 0

    if not web_push_delivery_configured():
        print("VAPID delivery settings are not configured; rerun with --dry-run to inspect due reminders.")
        return 2

    sent = 0
    failed = 0
    for subscription in due_subscriptions:
        try:
            send_trend_stale_push(subscription["subscription"])
            repository.record_delivery_attempt(
                subscription["endpointHash"],
                "sent",
                attempted_at=args.now,
            )
            sent += 1
        except Exception as error:  # pragma: no cover - depends on push-service network responses.
            repository.record_delivery_attempt(
                subscription["endpointHash"],
                "failed",
                attempted_at=args.now,
                error=str(error),
            )
            failed += 1

    print(f"Remote trend reminders sent={sent} failed={failed}.")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
