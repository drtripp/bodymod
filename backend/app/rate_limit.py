import math
import os
import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request


_match_request_times: dict[str, deque[float]] = defaultdict(deque)
_lock = threading.RLock()


def _int_from_env(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


def match_rate_limit_config() -> tuple[int, int]:
    return (
        max(0, _int_from_env("BODYMOD_MATCH_RATE_LIMIT_MAX", 60)),
        max(1, _int_from_env("BODYMOD_MATCH_RATE_LIMIT_WINDOW_SECONDS", 60)),
    )


def reset_rate_limit_state() -> None:
    with _lock:
        _match_request_times.clear()


def client_identifier(request: Request) -> str:
    if os.getenv("BODYMOD_TRUST_PROXY_HEADERS", "").lower() in {"1", "true", "yes"}:
        forwarded_for = request.headers.get("x-forwarded-for", "")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

    if request.client and request.client.host:
        return request.client.host

    return "unknown-client"


def enforce_match_rate_limit(request: Request) -> None:
    max_requests, window_seconds = match_rate_limit_config()

    if max_requests <= 0:
        return

    now = time.monotonic()
    key = client_identifier(request)

    with _lock:
        timestamps = _match_request_times[key]
        cutoff = now - window_seconds

        while timestamps and timestamps[0] <= cutoff:
            timestamps.popleft()

        if len(timestamps) >= max_requests:
            retry_after = max(1, math.ceil(window_seconds - (now - timestamps[0])))
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded for /api/match.",
                headers={"Retry-After": str(retry_after)},
            )

        timestamps.append(now)
