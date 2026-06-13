"""Build a launch preflight report from current repo artifacts.

Run from the backend directory:

    .\\.venv\\Scripts\\python.exe scripts\\launch_preflight.py

Use --fail-on-blockers for a true launch go/no-go once human gates are meant to
be resolved.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.models import LaunchReadiness  # noqa: E402


REPO_ROOT = Path(__file__).resolve().parents[2]
REQUIRED_DOCS = [
    "manual-work-queue.md",
    "launch-decision-record.md",
    "deployment.md",
    "README.md",
]
REQUIRED_LEGAL_PAGES = [
    "frontend/public/legal/privacy.html",
    "frontend/public/legal/terms.html",
    "frontend/public/legal/medical-disclaimer.html",
]
REQUIRED_SCREENSHOTS = [
    "review-screenshots/desktop.png",
    "review-screenshots/mobile.png",
]
REQUIRED_E2E_TEST_SNIPPETS = [
    "shares measurements from the header icon and restores them from the URL",
    "creates and loads an expiring opaque share snapshot from the header",
    "publishes, updates, views, and revokes a read-only share dashboard",
    "roleplays all persona samples through account logging, goals, and learning",
]


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def file_evidence(repo_root: Path, relative_paths: list[str], min_bytes: int = 1) -> dict:
    evidence: list[str] = []
    missing: list[str] = []

    for relative_path in relative_paths:
        path = repo_root / relative_path
        if path.exists() and path.is_file() and path.stat().st_size >= min_bytes:
            evidence.append(relative_path)
        else:
            missing.append(relative_path)

    return {
        "status": "passed" if not missing else "failed",
        "evidence": evidence,
        "missing": missing,
    }


def text_snippet_evidence(path: Path, snippets: list[str]) -> dict:
    text = path.read_text(encoding="utf-8") if path.exists() else ""
    present = [snippet for snippet in snippets if snippet in text]
    missing = [snippet for snippet in snippets if snippet not in text]
    return {
        "status": "passed" if not missing else "failed",
        "evidence": present,
        "missing": missing,
    }


def check_result(check_id: str, label: str, status: str, evidence=None, missing=None) -> dict:
    return {
        "id": check_id,
        "label": label,
        "status": status,
        "evidence": evidence or [],
        "missing": missing or [],
    }


def build_launch_preflight_report(repo_root: Path = REPO_ROOT) -> dict:
    repo_root = repo_root.resolve()
    readiness_path = repo_root / "backend" / "app" / "data" / "launch_readiness.seed.json"
    readiness = LaunchReadiness.model_validate(read_json(readiness_path))
    blocking_gates = [gate for gate in readiness.gates if gate.blocking]
    checks: list[dict] = []

    checks.append(
        check_result(
            "launch-readiness-seed",
            "Launch-readiness seed parses",
            "passed",
            [str(readiness_path.relative_to(repo_root)), f"{len(readiness.gates)} gate(s)"],
        )
    )

    doc_files = file_evidence(repo_root, REQUIRED_DOCS)
    checks.append(
        check_result(
            "manual-launch-docs",
            "Manual launch docs exist",
            doc_files["status"],
            doc_files["evidence"],
            doc_files["missing"],
        )
    )

    legal_files = file_evidence(repo_root, REQUIRED_LEGAL_PAGES, min_bytes=500)
    checks.append(
        check_result(
            "legal-draft-pages",
            "Legal draft pages exist",
            legal_files["status"],
            legal_files["evidence"],
            legal_files["missing"],
        )
    )

    screenshot_files = file_evidence(repo_root, REQUIRED_SCREENSHOTS, min_bytes=10_000)
    checks.append(
        check_result(
            "review-screenshots",
            "Desktop and mobile review screenshots exist",
            screenshot_files["status"],
            screenshot_files["evidence"],
            screenshot_files["missing"],
        )
    )

    e2e_evidence = text_snippet_evidence(
        repo_root / "frontend" / "tests" / "app.spec.js",
        REQUIRED_E2E_TEST_SNIPPETS,
    )
    checks.append(
        check_result(
            "fresh-profile-browser-flows",
            "Fresh-profile share and persona browser flows are covered",
            e2e_evidence["status"],
            e2e_evidence["evidence"],
            e2e_evidence["missing"],
        )
    )

    checks.append(
        check_result(
            "human-launch-gates",
            "Human launch gates remain explicit",
            "blocked" if blocking_gates else "passed",
            [f"{gate.id}: {gate.status}" for gate in blocking_gates],
        )
    )

    failed_checks = [check for check in checks if check["status"] == "failed"]
    status = "failed" if failed_checks else "blocked" if blocking_gates else "ready"

    return {
        "version": 1,
        "status": status,
        "ready": status == "ready",
        "source": "launch_preflight.py",
        "blockingGateCount": len(blocking_gates),
        "failedCheckCount": len(failed_checks),
        "checks": checks,
    }


def format_report(report: dict) -> str:
    lines = [
        f"Launch preflight status: {report['status']}",
        f"Blocking gates: {report['blockingGateCount']}",
        f"Failed structural checks: {report['failedCheckCount']}",
    ]
    for check in report["checks"]:
        lines.append(f"- {check['id']}: {check['status']}")
        if check["missing"]:
            lines.append(f"  missing: {', '.join(check['missing'])}")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Build the bodymod launch preflight report.")
    parser.add_argument("--json", action="store_true", help="Print the report as JSON.")
    parser.add_argument(
        "--fail-on-blockers",
        action="store_true",
        help="Exit nonzero when human launch gates are still blocking.",
    )
    args = parser.parse_args()
    report = build_launch_preflight_report()

    if args.json:
        print(json.dumps(report, indent=2, sort_keys=True))
    else:
        print(format_report(report))

    if report["failedCheckCount"]:
        return 1
    if args.fail_on_blockers and report["blockingGateCount"]:
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
