import json

import pytest

from scripts.validate_curation import (
    DEFAULT_CORPUS_FILES,
    DEFAULT_CORPUS_MODERATION_FILES,
    DEFAULT_CURATION_REVIEW_FILES,
    DEFAULT_ANSUR_MAPPING_FILES,
    DEFAULT_EVIDENCE_FILES,
    DEFAULT_FACE_MODEL_FILES,
    DEFAULT_FOOD_FILES,
    DEFAULT_GUIDE_FILES,
    DEFAULT_LIVE_UPDATE_FILES,
    DEFAULT_NATIVE_RELEASE_FILES,
    DEFAULT_PLANNING_FILES,
    DEFAULT_PROVIDER_DECISION_FILES,
    DEFAULT_TARGET_FILES,
    validate_attractiveness_evidence_file,
    validate_ansur_mapping_file,
    validate_corpus_moderation_file,
    validate_curation_review_file,
    validate_face_model_file,
    validate_food_file,
    validate_live_update_file,
    validate_measurement_guide_file,
    validate_native_release_file,
    validate_planning_file,
    validate_provider_decision_file,
    validate_strategy_corpus_file,
    validate_target_file,
)


def test_default_curation_files_validate() -> None:
    target_summaries = [validate_target_file(path) for path in DEFAULT_TARGET_FILES]
    guide_summaries = [validate_measurement_guide_file(path) for path in DEFAULT_GUIDE_FILES]
    ansur_mapping_summaries = [
        validate_ansur_mapping_file(path) for path in DEFAULT_ANSUR_MAPPING_FILES
    ]
    food_summaries = [validate_food_file(path) for path in DEFAULT_FOOD_FILES]
    planning_summaries = [validate_planning_file(path) for path in DEFAULT_PLANNING_FILES]
    live_update_summaries = [
        validate_live_update_file(path) for path in DEFAULT_LIVE_UPDATE_FILES
    ]
    provider_decision_summaries = [
        validate_provider_decision_file(path) for path in DEFAULT_PROVIDER_DECISION_FILES
    ]
    native_release_summaries = [
        validate_native_release_file(path) for path in DEFAULT_NATIVE_RELEASE_FILES
    ]
    curation_review_summaries = [
        validate_curation_review_file(path) for path in DEFAULT_CURATION_REVIEW_FILES
    ]
    face_model_summaries = [
        validate_face_model_file(path) for path in DEFAULT_FACE_MODEL_FILES
    ]
    corpus_moderation_summaries = [
        validate_corpus_moderation_file(path) for path in DEFAULT_CORPUS_MODERATION_FILES
    ]
    evidence_summaries = [
        validate_attractiveness_evidence_file(path) for path in DEFAULT_EVIDENCE_FILES
    ]
    corpus_summaries = [validate_strategy_corpus_file(path) for path in DEFAULT_CORPUS_FILES]

    assert any("target profile" in summary for summary in target_summaries)
    assert any("measurement guide" in summary for summary in guide_summaries)
    assert any("ANSUR mapping" in summary for summary in ansur_mapping_summaries)
    assert any("USDA-style food" in summary for summary in food_summaries)
    assert any("10 persona" in summary for summary in planning_summaries)
    assert any("live-update" in summary for summary in live_update_summaries)
    assert any("provider decision" in summary for summary in provider_decision_summaries)
    assert any("native release item" in summary for summary in native_release_summaries)
    assert any("curation review packet" in summary for summary in curation_review_summaries)
    assert any("face model candidate" in summary for summary in face_model_summaries)
    assert any("corpus moderation rule" in summary for summary in corpus_moderation_summaries)
    assert any("attractiveness evidence" in summary for summary in evidence_summaries)
    assert any("case log" in summary for summary in corpus_summaries)


def test_curation_validator_rejects_missing_case_log(tmp_path) -> None:
    draft_path = tmp_path / "strategy-corpus.json"
    draft_path.write_text(
        json.dumps(
            {
                "version": 1,
                "source": "validator test",
                "outcomes": [
                    {
                        "id": "test-outcome",
                        "label": "Test Outcome",
                        "description": "Validator test outcome.",
                        "strategies": [
                            {
                                "name": "Test strategy",
                                "outcome": "test outcome",
                                "interventionType": "training",
                                "efficacy": 50,
                                "risk": 20,
                                "evidence": "moderate",
                                "reviewStatus": "seeded",
                                "sensitivity": "low",
                                "reversibility": "medium",
                                "timeHorizon": "weeks",
                                "cost": "low",
                                "claimedMechanism": "Test mechanism.",
                                "expectedMagnitude": "Test magnitude.",
                                "legalNotes": "No legal note.",
                                "uncertaintyNotes": "Test uncertainty.",
                                "excludedFromPersonalization": False,
                                "caseLogIds": ["missing-case-log"],
                                "notes": "Test note.",
                            }
                        ],
                    }
                ],
                "caseLogs": [],
            }
        ),
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="missing linked case logs"):
        validate_strategy_corpus_file(draft_path)


def test_curation_validator_rejects_duplicate_target_ids(tmp_path) -> None:
    draft_path = tmp_path / "targets.json"
    target = {
        "id": "duplicate",
        "label": "Duplicate Target",
        "source_type": "archetype",
        "notes": "Estimated placeholder profile.",
        "measurements": {
            "height": 180,
            "weight": 82,
            "sex": "male",
            "headCircumference": 57,
            "neckCircumference": 39,
            "biacromialWidth": 40,
            "bideltoidWidth": 50,
            "bideltoidCircumference": 118,
            "armpitCircumference": 98,
            "nippleCircumference": 96,
            "underbustCircumference": 92,
            "waistCircumference": 80,
            "pantWaistCircumference": 86,
            "hipCircumference": 96,
            "upperThighCircumference": 58,
            "midThighCircumference": 50,
            "calfCircumference": 38,
            "ankleCircumference": 23,
            "bicepCircumference": 34,
            "upperForearmCircumference": 29,
            "wristCircumference": 17,
        },
    }
    draft_path.write_text(json.dumps({"targets": [target, target]}), encoding="utf-8")

    with pytest.raises(ValueError, match="duplicate target ids"):
        validate_target_file(draft_path)
