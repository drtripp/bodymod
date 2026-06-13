"""Validate editable curation JSON for target, guide, food, planning, update, launch, provider, face, evidence, and strategy data.

Run from the backend directory:

    .\\.venv\\Scripts\\python.exe scripts\\validate_curation.py

Pass explicit files to validate a draft before replacing a seed:

    .\\.venv\\Scripts\\python.exe scripts\\validate_curation.py \\
        --target-file ..\\target-profiles-template.json \\
        --guide-file app\\data\\measurement_guides.seed.json \\
        --ansur-mapping-file app\\data\\reference.ansur.mapping.json \\
        --food-file app\\data\\food_usda.seed.json \\
        --planning-file app\\data\\planning.seed.json \\
        --live-update-file app\\data\\live_updates.seed.json \\
        --launch-readiness-file app\\data\\launch_readiness.seed.json \\
        --provider-decision-file app\\data\\provider_decisions.seed.json \\
        --face-model-file app\\data\\face_model_candidates.seed.json \\
        --evidence-file app\\data\\attractiveness_evidence.seed.json \\
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
    AttractivenessEvidenceLibrary,
    FaceModelCandidateLibrary,
    FoodSearchResponse,
    LaunchReadiness,
    LiveUpdateManifest,
    MeasurementGuideLibrary,
    PlanningData,
    ProviderDecisionLibrary,
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
DEFAULT_LIVE_UPDATE_FILES = [
    BACKEND_ROOT / "app" / "data" / "live_updates.seed.json",
]
DEFAULT_LAUNCH_READINESS_FILES = [
    BACKEND_ROOT / "app" / "data" / "launch_readiness.seed.json",
]
DEFAULT_PROVIDER_DECISION_FILES = [
    BACKEND_ROOT / "app" / "data" / "provider_decisions.seed.json",
]
DEFAULT_FACE_MODEL_FILES = [
    BACKEND_ROOT / "app" / "data" / "face_model_candidates.seed.json",
]
DEFAULT_GUIDE_FILES = [
    BACKEND_ROOT / "app" / "data" / "measurement_guides.seed.json",
]
DEFAULT_ANSUR_MAPPING_FILES = [
    BACKEND_ROOT / "app" / "data" / "reference.ansur.mapping.json",
]
DEFAULT_FOOD_FILES = [
    BACKEND_ROOT / "app" / "data" / "food_usda.seed.json",
]
DEFAULT_EVIDENCE_FILES = [
    BACKEND_ROOT / "app" / "data" / "attractiveness_evidence.seed.json",
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
REQUIRED_FOOD_MACRO_KEYS = {"calories", "protein", "carbs", "fat"}
REQUIRED_FOOD_MICRO_KEYS = {
    "fiber",
    "sugar",
    "sodium",
    "potassium",
    "calcium",
    "iron",
    "magnesium",
    "zinc",
    "vitaminC",
    "vitaminD",
    "vitaminB12",
}
SUPPORTED_REFERENCE_IMPORT_UNITS = {"mm", "cm", "kg"}


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


def validate_live_update_file(path: Path) -> str:
    payload = read_json(path)
    manifest = LiveUpdateManifest.model_validate(payload)
    channel_ids = [channel.id for channel in manifest.channels]
    duplicates = duplicate_values(channel_ids)

    if duplicates:
        raise ValueError(f"{path}: duplicate live-update channel ids: {', '.join(duplicates)}.")
    if manifest.currentChannel not in set(channel_ids):
        raise ValueError(f"{path}: currentChannel references an unknown channel.")
    if not manifest.providerCandidates:
        raise ValueError(f"{path}: expected at least one provider candidate.")

    for channel in manifest.channels:
        if channel.artifactUrl and not channel.artifactUrl.startswith("https://"):
            raise ValueError(f"{path}: live-update channel {channel.id!r} needs HTTPS artifactUrl.")
        if "review" not in channel.reviewStatus.lower():
            raise ValueError(f"{path}: live-update channel {channel.id!r} must stay review-gated.")

    return f"{path}: {len(manifest.channels)} live-update channel(s)"


def validate_launch_readiness_file(path: Path) -> str:
    payload = read_json(path)
    readiness = LaunchReadiness.model_validate(payload)
    gate_ids = [gate.id for gate in readiness.gates]
    duplicates = duplicate_values(gate_ids)

    if duplicates:
        raise ValueError(f"{path}: duplicate launch-readiness gate ids: {', '.join(duplicates)}.")

    blocking_gates = [gate for gate in readiness.gates if gate.blocking]
    if not blocking_gates:
        raise ValueError(f"{path}: expected at least one blocking launch gate.")

    for gate in readiness.gates:
        if gate.status == "completed" and gate.blocking:
            raise ValueError(f"{path}: completed gate {gate.id!r} cannot remain blocking.")
        if not any(doc.startswith("manual-work-queue.md") for doc in gate.docs):
            raise ValueError(f"{path}: gate {gate.id!r} must reference manual-work-queue.md.")
        if not any("test" in command.lower() or "verify" in command.lower() for command in gate.verification):
            raise ValueError(f"{path}: gate {gate.id!r} needs a test or verify command.")

    return f"{path}: {len(readiness.gates)} launch-readiness gate(s)"


def validate_provider_decision_file(path: Path) -> str:
    payload = read_json(path)
    library = ProviderDecisionLibrary.model_validate(payload)
    decision_ids = [decision.id for decision in library.decisions]
    duplicates = duplicate_values(decision_ids)

    if duplicates:
        raise ValueError(f"{path}: duplicate provider decision ids: {', '.join(duplicates)}.")

    blocking_decisions = [decision for decision in library.decisions if decision.blocking]
    if not blocking_decisions:
        raise ValueError(f"{path}: expected at least one blocking provider decision.")

    launch_gate_ids = {
        gate.id
        for launch_path in DEFAULT_LAUNCH_READINESS_FILES
        for gate in LaunchReadiness.model_validate(read_json(launch_path)).gates
    }

    for decision in library.decisions:
        if decision.status == "completed" and decision.blocking:
            raise ValueError(
                f"{path}: completed provider decision {decision.id!r} cannot remain blocking."
            )
        if not any(doc.startswith("manual-work-queue.md") for doc in decision.docs):
            raise ValueError(
                f"{path}: decision {decision.id!r} must reference manual-work-queue.md."
            )
        if not any(
            "test" in command.lower() or "verify" in command.lower()
            for command in decision.verification
        ):
            raise ValueError(f"{path}: decision {decision.id!r} needs a test or verify command.")

        unknown_launch_gates = sorted(set(decision.launchGateIds) - launch_gate_ids)
        if unknown_launch_gates:
            raise ValueError(
                f"{path}: decision {decision.id!r} references unknown launch gates: "
                f"{', '.join(unknown_launch_gates)}."
            )

        candidate_ids = [candidate.id for candidate in decision.candidates]
        candidate_duplicates = duplicate_values(candidate_ids)
        if candidate_duplicates:
            raise ValueError(
                f"{path}: decision {decision.id!r} has duplicate candidate ids: "
                f"{', '.join(candidate_duplicates)}."
            )
        if not any(candidate.recommendedForPrototype for candidate in decision.candidates):
            raise ValueError(
                f"{path}: decision {decision.id!r} needs a prototype-safe candidate."
            )

        for candidate in decision.candidates:
            if "review" not in candidate.reviewStatus.lower():
                raise ValueError(
                    f"{path}: provider candidate {candidate.id!r} must stay review-gated."
                )
            if not candidate.metadataOnly:
                raise ValueError(
                    f"{path}: provider candidate {candidate.id!r} must remain metadata-only."
                )

    return f"{path}: {len(library.decisions)} provider decision(s)"


def validate_face_model_file(path: Path) -> str:
    payload = read_json(path)
    library = FaceModelCandidateLibrary.model_validate(payload)
    candidate_ids = [candidate.id for candidate in library.candidates]
    duplicates = duplicate_values(candidate_ids)

    if duplicates:
        raise ValueError(f"{path}: duplicate face model candidate ids: {', '.join(duplicates)}.")

    if "troontraits-reference" not in set(candidate_ids):
        raise ValueError(f"{path}: expected the TroonTraits reference candidate.")

    side_profile_candidates = [
        candidate
        for candidate in library.candidates
        if "side-profile" in candidate.orientationSupport
    ]
    if not side_profile_candidates:
        raise ValueError(f"{path}: expected at least one side-profile candidate.")

    local_runtime_candidates = [
        candidate for candidate in library.candidates if candidate.localRuntime
    ]
    if not local_runtime_candidates:
        raise ValueError(f"{path}: expected at least one browser-local candidate.")

    prototype_safe_candidates = [
        candidate for candidate in library.candidates if candidate.prototypeSafe
    ]
    if not prototype_safe_candidates:
        raise ValueError(f"{path}: expected at least one prototype-safe candidate.")

    for candidate in library.candidates:
        if "review" not in candidate.reviewStatus.lower():
            raise ValueError(
                f"{path}: face model candidate {candidate.id!r} must stay review-gated."
            )
        policy = candidate.imageStoragePolicy.lower()
        if "image" not in policy and "photo" not in policy and "frame" not in policy:
            raise ValueError(
                f"{path}: face model candidate {candidate.id!r} needs an image policy."
            )
        if not any(
            "license" in step.lower() or "review" in step.lower()
            for step in candidate.nextValidationSteps
        ):
            raise ValueError(
                f"{path}: face model candidate {candidate.id!r} needs license/review steps."
            )
        if candidate.sourceType == "not-recommended-candidate" and candidate.prototypeSafe:
            raise ValueError(
                f"{path}: not-recommended candidate {candidate.id!r} cannot be prototype safe."
            )

    return f"{path}: {len(library.candidates)} face model candidate(s)"


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


def validate_ansur_mapping_file(path: Path) -> str:
    payload = read_json(path)
    schema_fields = {
        field["name"]: field
        for field in load_measurement_schema()["fields"]
        if field.get("type") != "select"
    }
    fields = payload.get("fields")

    if not isinstance(fields, dict) or not fields:
        raise ValueError(f"{path}: expected ANSUR mapping fields.")
    if not payload.get("sexColumnCandidates"):
        raise ValueError(f"{path}: ANSUR mapping needs sexColumnCandidates.")

    unknown_fields = sorted(set(fields) - set(schema_fields))
    if unknown_fields:
        raise ValueError(f"{path}: unknown ANSUR mapping fields: {', '.join(unknown_fields)}.")

    for field_name, config in fields.items():
        target_unit = config.get("targetUnit")
        if target_unit != schema_fields[field_name]["unit"]:
            raise ValueError(f"{path}: ANSUR mapping {field_name!r} targetUnit must match schema.")

        source_columns = config.get("sourceColumns")
        if not isinstance(source_columns, list) or not source_columns:
            raise ValueError(f"{path}: ANSUR mapping {field_name!r} needs sourceColumns.")

        for column in source_columns:
            if not column.get("name"):
                raise ValueError(f"{path}: ANSUR mapping {field_name!r} has an empty source column.")
            if column.get("unit") not in SUPPORTED_REFERENCE_IMPORT_UNITS:
                raise ValueError(
                    f"{path}: ANSUR mapping {field_name!r} has unsupported unit "
                    f"{column.get('unit')!r}."
                )

        if "review" not in str(config.get("reviewStatus", "")).lower():
            raise ValueError(f"{path}: ANSUR mapping {field_name!r} must stay review-gated.")

    return f"{path}: {len(fields)} ANSUR mapping field(s)"


def validate_food_file(path: Path) -> str:
    payload = read_json(path)
    library = FoodSearchResponse.model_validate(payload)
    allow_real_fdc_ids = "candidate import" in library.source.lower() and any(
        "review" in note.lower() for note in library.notes
    )
    food_ids = [food.id for food in library.foods]
    fdc_ids = [food.fdcId or "" for food in library.foods]
    id_duplicates = duplicate_values(food_ids)
    fdc_duplicates = duplicate_values([fdc_id for fdc_id in fdc_ids if fdc_id])

    if not library.foods:
        raise ValueError(f"{path}: expected at least one food row.")
    if id_duplicates:
        raise ValueError(f"{path}: duplicate food ids: {', '.join(id_duplicates)}.")
    if fdc_duplicates:
        raise ValueError(f"{path}: duplicate FDC ids: {', '.join(fdc_duplicates)}.")

    for food in library.foods:
        if not food.keywords:
            raise ValueError(f"{path}: food {food.id!r} needs search keywords.")
        if not food.fdcId:
            raise ValueError(f"{path}: food {food.id!r} needs FDC provenance.")
        if allow_real_fdc_ids:
            if not str(food.fdcId).isdigit():
                raise ValueError(f"{path}: food {food.id!r} needs a numeric FDC id.")
        elif not str(food.fdcId).startswith("dummy-"):
            raise ValueError(f"{path}: food {food.id!r} needs dummy FDC provenance.")

    for food in payload.get("foods", []):
        food_id = food.get("id")
        for group, required_keys in {
            "macros": REQUIRED_FOOD_MACRO_KEYS,
            "micros": REQUIRED_FOOD_MICRO_KEYS,
        }.items():
            nutrients = food.get(group, {})
            missing = required_keys - set(nutrients.keys())
            if missing:
                raise ValueError(
                    f"{path}: food {food_id!r} missing {group}: {', '.join(sorted(missing))}."
                )
            for key, value in nutrients.items():
                if not isinstance(value, (int, float)) or value < 0:
                    raise ValueError(f"{path}: food {food_id!r} has invalid {group}.{key}.")

    return f"{path}: {len(library.foods)} USDA-style food row(s)"


def validate_attractiveness_evidence_file(path: Path, planning_paths: list[Path] | None = None) -> str:
    payload = read_json(path)
    library = AttractivenessEvidenceLibrary.model_validate(payload)
    metric_ids = [metric.id for metric in library.metrics]
    source_ids = [source.id for source in library.sources]
    metric_duplicates = duplicate_values(metric_ids)
    source_duplicates = duplicate_values(source_ids)
    available_source_ids = set(source_ids)
    available_goal_ids: set[str] = set()
    measurement_fields = {field["name"] for field in load_measurement_schema()["fields"]}

    for planning_path in planning_paths or DEFAULT_PLANNING_FILES:
        planning_payload = read_json(planning_path)
        available_goal_ids.update(
            str(goal.get("id", "")) for goal in planning_payload.get("goalPresets", [])
        )

    if not library.sources:
        raise ValueError(f"{path}: expected at least one evidence source.")
    if not library.metrics:
        raise ValueError(f"{path}: expected at least one evidence metric.")
    if source_duplicates:
        raise ValueError(f"{path}: duplicate evidence source ids: {', '.join(source_duplicates)}.")
    if metric_duplicates:
        raise ValueError(f"{path}: duplicate evidence metric ids: {', '.join(metric_duplicates)}.")

    for source in library.sources:
        if not source.url.startswith("https://"):
            raise ValueError(f"{path}: evidence source {source.id!r} needs an HTTPS URL.")

    for metric in library.metrics:
        if not metric.requiresHumanReview:
            raise ValueError(f"{path}: metric {metric.id!r} must remain human-review gated.")
        missing_sources = sorted(set(metric.sourceIds) - available_source_ids)
        if missing_sources:
            raise ValueError(
                f"{path}: metric {metric.id!r} references unknown sources: "
                f"{', '.join(missing_sources)}."
            )
        unknown_goals = sorted(set(metric.goalPresetIds) - available_goal_ids)
        if unknown_goals:
            raise ValueError(
                f"{path}: metric {metric.id!r} references unknown goals: "
                f"{', '.join(unknown_goals)}."
            )
        unknown_fields = sorted(set(metric.metricKeys) - measurement_fields)
        if unknown_fields:
            raise ValueError(
                f"{path}: metric {metric.id!r} references unknown measurement fields: "
                f"{', '.join(unknown_fields)}."
            )

    return f"{path}: {len(library.metrics)} attractiveness evidence metric(s)"


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
        description="Validate editable seed and curation JSON."
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
        "--live-update-file",
        action="append",
        type=Path,
        dest="live_update_files",
        help="Live-update manifest JSON file to validate. Repeatable.",
    )
    parser.add_argument(
        "--launch-readiness-file",
        action="append",
        type=Path,
        dest="launch_readiness_files",
        help="Launch-readiness gate JSON file to validate. Repeatable.",
    )
    parser.add_argument(
        "--provider-decision-file",
        action="append",
        type=Path,
        dest="provider_decision_files",
        help="Provider decision JSON file to validate. Repeatable.",
    )
    parser.add_argument(
        "--face-model-file",
        action="append",
        type=Path,
        dest="face_model_files",
        help="Face model candidate JSON file to validate. Repeatable.",
    )
    parser.add_argument(
        "--guide-file",
        action="append",
        type=Path,
        dest="guide_files",
        help="Measurement guide JSON file to validate. Repeatable.",
    )
    parser.add_argument(
        "--ansur-mapping-file",
        action="append",
        type=Path,
        dest="ansur_mapping_files",
        help="ANSUR reference mapping JSON file to validate. Repeatable.",
    )
    parser.add_argument(
        "--food-file",
        action="append",
        type=Path,
        dest="food_files",
        help="USDA-style food seed JSON file to validate. Repeatable.",
    )
    parser.add_argument(
        "--evidence-file",
        action="append",
        type=Path,
        dest="evidence_files",
        help="Attractiveness evidence seed JSON file to validate. Repeatable.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    target_files = args.target_files or DEFAULT_TARGET_FILES
    guide_files = args.guide_files or DEFAULT_GUIDE_FILES
    ansur_mapping_files = args.ansur_mapping_files or DEFAULT_ANSUR_MAPPING_FILES
    food_files = args.food_files or DEFAULT_FOOD_FILES
    planning_files = args.planning_files or DEFAULT_PLANNING_FILES
    live_update_files = args.live_update_files or DEFAULT_LIVE_UPDATE_FILES
    launch_readiness_files = (
        args.launch_readiness_files or DEFAULT_LAUNCH_READINESS_FILES
    )
    provider_decision_files = (
        args.provider_decision_files or DEFAULT_PROVIDER_DECISION_FILES
    )
    face_model_files = args.face_model_files or DEFAULT_FACE_MODEL_FILES
    evidence_files = args.evidence_files or DEFAULT_EVIDENCE_FILES
    corpus_files = args.corpus_files or DEFAULT_CORPUS_FILES
    summaries = [
        *(validate_target_file(path) for path in target_files),
        *(validate_measurement_guide_file(path) for path in guide_files),
        *(validate_ansur_mapping_file(path) for path in ansur_mapping_files),
        *(validate_food_file(path) for path in food_files),
        *(validate_planning_file(path) for path in planning_files),
        *(validate_live_update_file(path) for path in live_update_files),
        *(validate_launch_readiness_file(path) for path in launch_readiness_files),
        *(validate_provider_decision_file(path) for path in provider_decision_files),
        *(validate_face_model_file(path) for path in face_model_files),
        *(validate_attractiveness_evidence_file(path, planning_files) for path in evidence_files),
        *(validate_strategy_corpus_file(path) for path in corpus_files),
    ]

    for summary in summaries:
        print(summary)

    print("Curation JSON validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
