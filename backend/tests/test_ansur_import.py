import json

from app.data.reference import apply_reference_overlay, load_reference_seed
from app.models import PopulationReferenceData
from scripts.build_ansur_reference import build_ansur_reference


def write_fixture(path):
    path.write_text(
        "\n".join(
            [
                "Sex,Stature,WeightKg,WaistCircumference,BideltoidBreadth,WristCircumference",
                "Male,1800,80,900,500,170",
                "Male,1900,100,1000,540,190",
                "Female,1600,60,700,430,150",
                "Female,1700,70,800,450,160",
            ]
        ),
        encoding="utf-8",
    )


def test_builds_review_gated_ansur_reference_overlay(tmp_path) -> None:
    csv_path = tmp_path / "ansur-fixture.csv"
    write_fixture(csv_path)

    payload = build_ansur_reference(
        csv_path,
        source_url="https://example.test/ansur.csv",
        retrieved_at="2026-06-13",
    )

    PopulationReferenceData.model_validate(payload)
    assert payload["datasetId"] == "ansur-ii-candidate-import-v1"
    assert payload["sourceUrl"] == "https://example.test/ansur.csv"
    assert "height" in payload["fields"]
    assert "waistCircumference" in payload["fields"]
    assert "pantWaistCircumference" not in payload["fields"]

    height = payload["fields"]["height"]
    waist = payload["fields"]["waistCircumference"]
    wrist = payload["fields"]["wristCircumference"]

    assert height["unit"] == "cm"
    assert height["sourceColumn"] == "Stature"
    assert height["isVetted"] is False
    assert height["male"]["n"] == 2
    assert height["male"]["mean"] == 185.0
    assert height["male"]["sd"] == 7.1
    assert height["male"]["percentiles"]["5"] == 180.5
    assert height["female"]["mean"] == 165.0
    assert waist["male"]["mean"] == 95.0
    assert wrist["female"]["mean"] == 15.5


def test_ansur_import_can_mark_reviewed_output_vetted(tmp_path) -> None:
    csv_path = tmp_path / "ansur-fixture.csv"
    write_fixture(csv_path)

    payload = build_ansur_reference(csv_path, mark_vetted=True)

    assert payload["fields"]["height"]["isVetted"] is True
    assert payload["fields"]["weight"]["isVetted"] is True


def test_candidate_overlay_remains_unvetted_when_applied(tmp_path) -> None:
    csv_path = tmp_path / "ansur-fixture.csv"
    write_fixture(csv_path)
    payload = build_ansur_reference(csv_path)
    base_seed = load_reference_seed()

    mixed = apply_reference_overlay(base_seed, payload)

    assert mixed["fields"]["height"]["datasetId"] == payload["datasetId"]
    assert mixed["fields"]["height"]["isVetted"] is False
    assert "source/license/codebook review" in json.dumps(mixed["fields"]["height"])
