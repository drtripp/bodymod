import json
from pathlib import Path

from scripts.launch_preflight import build_launch_preflight_report, format_report


def test_launch_preflight_reports_current_blocking_gates_without_failed_checks() -> None:
    report = build_launch_preflight_report()
    check_statuses = {check["id"]: check["status"] for check in report["checks"]}

    assert report["status"] == "blocked"
    assert report["ready"] is False
    assert report["blockingGateCount"] > 0
    assert report["failedCheckCount"] == 0
    assert check_statuses["launch-readiness-seed"] == "passed"
    assert check_statuses["review-screenshots"] == "passed"
    assert check_statuses["fresh-profile-browser-flows"] == "passed"
    assert check_statuses["human-launch-gates"] == "blocked"
    assert "Launch preflight status: blocked" in format_report(report)


def test_launch_preflight_fails_when_required_artifacts_are_missing(tmp_path) -> None:
    write_minimal_preflight_repo(tmp_path, include_mobile_screenshot=False)

    report = build_launch_preflight_report(tmp_path)
    screenshot_check = next(check for check in report["checks"] if check["id"] == "review-screenshots")

    assert report["status"] == "failed"
    assert report["ready"] is False
    assert report["failedCheckCount"] == 1
    assert screenshot_check["status"] == "failed"
    assert screenshot_check["missing"] == ["review-screenshots/mobile.png"]


def write_minimal_preflight_repo(repo_root: Path, include_mobile_screenshot: bool = True) -> None:
    (repo_root / "backend" / "app" / "data").mkdir(parents=True)
    (repo_root / "frontend" / "public" / "legal").mkdir(parents=True)
    (repo_root / "frontend" / "tests").mkdir(parents=True)
    (repo_root / "review-screenshots").mkdir(parents=True)

    readiness = {
        "version": 1,
        "source": "test launch seed",
        "notes": ["test"],
        "gates": [
            {
                "id": "test-gate",
                "label": "Test gate",
                "category": "test",
                "status": "human-review-required",
                "blocking": True,
                "owner": "Dawson",
                "evidenceRequired": ["Human approval"],
                "currentScaffold": ["test scaffold"],
                "verification": [".\\verify.ps1"],
                "docs": ["manual-work-queue.md#test"],
            }
        ],
    }
    (repo_root / "backend" / "app" / "data" / "launch_readiness.seed.json").write_text(
        json.dumps(readiness),
        encoding="utf-8",
    )

    for filename in [
        "manual-work-queue.md",
        "launch-decision-record.md",
        "deployment.md",
        "README.md",
    ]:
        (repo_root / filename).write_text("launch preflight test\n", encoding="utf-8")

    for filename in [
        "privacy.html",
        "terms.html",
        "medical-disclaimer.html",
    ]:
        (repo_root / "frontend" / "public" / "legal" / filename).write_text(
            "<html>" + ("legal draft " * 80) + "</html>",
            encoding="utf-8",
        )

    app_spec = "\n".join(
        [
            "shares measurements from the header icon and restores them from the URL",
            "creates and loads an expiring opaque share snapshot from the header",
            "publishes, updates, views, and revokes a read-only share dashboard",
            "roleplays all persona samples through account logging, goals, and learning",
        ]
    )
    (repo_root / "frontend" / "tests" / "app.spec.js").write_text(app_spec, encoding="utf-8")
    (repo_root / "review-screenshots" / "desktop.png").write_bytes(b"0" * 10_001)
    if include_mobile_screenshot:
        (repo_root / "review-screenshots" / "mobile.png").write_bytes(b"0" * 10_001)
