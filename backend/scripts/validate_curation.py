"""Validate editable curation JSON for target, guide, planning, and strategy data.

Run from the backend directory:

    .\\.venv\\Scripts\\python.exe scripts\\validate_curation.py

Pass explicit files to validate a draft before replacing a seed:

    .\\.venv\\Scripts\\python.exe scripts\\validate_curation.py \\
        --target-file ..\\target-profiles-template.json \\
        --guide-file app\\data\\measurement_guides.seed.json \\
        --planning-file app\\data\\planning.seed.json \\
        --corpus-file ..\\strategy-corpus-template.json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.measurement_schema import load_measurement_schema  # noqa: E402
from app.models import (  # noqa: E402
    MeasurementGuideLibrary,
    PlanningData,
    StrategyCorpusSeed,
    TargetProfile,
)


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TARGET_FILES = [
    BACKEND_ROOT / "app" / "data" / "targets.seed.json",
    REPO_ROOT / "target-profiles-template.json",
]
DEFAULT_PLANNING_FILES = [
    BACKEND_ROOT / "app" / "data" / "planning.seed.json",
]
DEFAULT_GUIDE_FILES = [
    BACKEND_ROOT / "app" / "data" / "measurement_guides.seed.json",
]
DEFAULT_CORPUS_FILES = [
    BACKEND_ROOT / "app" / "data" / "strategy_corpus.seed.json",
    REPO_ROOT / "strategy-corpus-template.json",
]
HIGH_RISK_SENSITIVITIES = {
    "clinical",
    "surgical",
    "pharmaceutical",
    "medical-adjacent",
}


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def duplicate_values(values: list[str]) -> list[str]:
    seen: set[str] = set()
    duplicates: set[str] = set()

    for value in values:
        if value in seen:
            duplicates.add(value)
        seen.add(value)

    return sorted(duplicates)


def validate_target_file(path: Path) -> str:
    payload = read_json(path)
    targets = payload.get("targets")

    if not isinstance(targets, list) or not targets:
        raise ValueError(f"{path}: expected a non-empty targets array.")

    target_ids = [str(target.get("id", "")) for target in targets]
    duplicates = duplicate_values(target_ids)
    if duplicates:
        raise ValueError(f"{path}: duplicate target ids: {', '.join(duplicates)}.")

    for target in targets:
        TargetProfile.model_validate(target)
        notes = str(target.get("notes") or "")
        if not notes.strip():
            raise ValueError(f"{path}: target {target.get('id')} needs uncertainty notes.")

    return f"{path}: {len(targets)} target profile(s)"


def validate_planning_file(path: Path) -> str:
    payload = read_json(path)
    planning = PlanningData.model_validate(
        {
            "personas": payload.get("personas", []),
            "goalPresets": payload.get("goalPresets", []),
            "protocolTemplates": payload.get("protocolTemplates", []),
            "protocolTaxonomy": payload.get("protocolTaxonomy", []),
        }
    )
    persona_ids = [persona.id for persona in planning.personas]
    goal_ids = [goal.id for goal in planning.goalPresets]
    protocol_ids = [protocol.id for protocol in planning.protocolTemplates]

    for label, values in {
        "persona": persona_ids,
        "goal": goal_ids,
        "protocol": protocol_ids,
    }.items():
        duplicates = duplicate_values(values)
        if duplicates:
            raise ValueError(f"{path}: duplicate {label} ids: {', '.join(duplicates)}.")

    goal_id_set = set(goal_ids)
    protocol_id_set = set(protocol_ids)

    for persona in planning.personas:
        missing_goals = sorted(set(persona.likelyGoals) - goal_id_set)
        if missing_goals:
            raise ValueError(
                f"{path}: persona {persona.id!r} references unknown goals: "
                f"{', '.join(missing_goals)}."
            )
        if not persona.walkthrough:
            raise ValueError(f"{path}: persona {persona.id!r} needs walkthrough steps.")

    for goal in planning.goalPresets:
        missing_protocols = sorted(set(goal.suggestedProtocols) - protocol_id_set)
        if missing_protocols:
            raise ValueError(
                f"{path}: goal {goal.id!r} references unknown protocols: "
                f"{', '.join(missing_protocols)}."
            )

    return (
        f"{path}: {len(planning.personas)} persona(s), "
        f"{len(planning.goalPresets)} goal preset(s), "
        f"{len(planning.protocolTemplates)} protocol template(s)"
    )


def validate_measurement_guide_file(path: Path) -> str:
    payload = read_json(path)
    library = MeasurementGuideLibrary.model_validate(payload)
    expected_fields = {
        field["name"]
        for field in load_measurement_schema()["fields"]
        if field.get("type") != "select"
    }
    guide_fields = [guide.field for guide in library.guides]
    duplicates = duplicate_values(guide_fields)

    if duplicates:
        raise ValueError(f"{path}: duplicate measurement guide fields: {', '.join(duplicates)}.")

    unknown_fields = sorted(set(guide_fields) - expected_fields)
    if unknown_fields:
        raise ValueError(f"{path}: unknown measurement guide fields: {', '.join(unknown_fields)}.")

    missing_fields = sorted(expected_fields - set(guide_fields))
    if missing_fields:
        raise ValueError(f"{path}: missing measurement guide fields: {', '.join(missing_fields)}.")

    return f"{path}: {len(library.guides)} measurement guide(s)"


def validate_strategy_corpus_file(path: Path) -> str:
    payload = read_json(path)
    corpus = StrategyCorpusSeed.model_validate(payload)
    outcome_ids = [outcome.id for outcome in corpus.outcomes]
    outcome_duplicates = duplicate_values(outcome_ids)

    if outcome_duplicates:
        raise ValueError(f"{path}: duplicate outcome ids: {', '.join(outcome_duplicates)}.")

    strategy_names: list[str] = []
    linked_case_log_ids: set[str] = set()
    strategy_names_by_case_log_id: dict[str, str] = {}

    for outcome in corpus.outcomes:
        for strategy in outcome.strategies:
            strategy_names.append(strategy.name)
            for case_log_id in strategy.caseLogIds:
                linked_case_log_ids.add(case_log_id)
                strategy_names_by_case_log_id[case_log_id] = strategy.name

            if (
                strategy.sensitivity in HIGH_RISK_SENSITIVITIES
                and not strategy.excludedFromPersonalization
            ):
                raise ValueError(
                    f"{path}: high-risk strategy {strategy.name!r} must be excluded from personalization."
                )

    strategy_duplicates = duplicate_values(strategy_names)
    if strategy_duplicates:
        raise ValueError(f"{path}: duplicate strategy names: {', '.join(strategy_duplicates)}.")

    case_log_ids = [case_log.id for case_log in corpus.caseLogs]
    case_log_duplicates = duplicate_values(case_log_ids)
    if case_log_duplicates:
        raise ValueError(f"{path}: duplicate case-log ids: {', '.join(case_log_duplicates)}.")

    available_case_log_ids = set(case_log_ids)
    missing_case_logs = sorted(linked_case_log_ids - available_case_log_ids)
    if missing_case_logs:
        raise ValueError(f"{path}: missing linked case logs: {', '.join(missing_case_logs)}.")

    available_strategy_names = set(strategy_names)
    for case_log in corpus.caseLogs:
        if case_log.strategyName not in available_strategy_names:
            raise ValueError(
                f"{path}: case log {case_log.id!r} references unknown strategy "
                f"{case_log.strategyName!r}."
            )

        linked_strategy_name = strategy_names_by_case_log_id.get(case_log.id)
        if linked_strategy_name and linked_strategy_name != case_log.strategyName:
            raise ValueError(
                f"{path}: case log {case_log.id!r} is linked from {linked_strategy_name!r} "
                f"but names {case_log.strategyName!r}."
            )

        if not case_log.limitations:
            raise ValueError(f"{path}: case log {case_log.id!r} needs limitations.")

    return (
        f"{path}: {len(corpus.outcomes)} outcome(s), "
        f"{len(strategy_names)} strategy entry/entries, {len(corpus.caseLogs)} case log(s)"
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate target-profile and strategy-corpus curation JSON."
    )
    parser.add_argument(
        "--target-file",
        action="append",
        type=Path,
        dest="target_files",
        help="Target profile JSON file to validate. Repeatable.",
    )
    parser.add_argument(
        "--corpus-file",
        action="append",
        type=Path,
        dest="corpus_files",
        help="Strategy corpus JSON file to validate. Repeatable.",
    )
    parser.add_argument(
        "--planning-file",
        action="append",
        type=Path,
        dest="planning_files",
        help="Planning/persona JSON file to validate. Repeatable.",
    )
    parser.add_argument(
        "--guide-file",
        action="append",
        type=Path,
        dest="guide_files",
        help="Measurement guide JSON file to validate. Repeatable.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    target_files = args.target_files or DEFAULT_TARGET_FILES
    guide_files = args.guide_files or DEFAULT_GUIDE_FILES
    planning_files = args.planning_files or DEFAULT_PLANNING_FILES
    corpus_files = args.corpus_files or DEFAULT_CORPUS_FILES
    summaries = [
        *(validate_target_file(path) for path in target_files),
        *(validate_measurement_guide_file(path) for path in guide_files),
        *(validate_planning_file(path) for path in planning_files),
        *(validate_strategy_corpus_file(path) for path in corpus_files),
    ]

    for summary in summaries:
        print(summary)

    print("Curation JSON validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
