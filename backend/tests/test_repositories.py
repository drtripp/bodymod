import sqlite3

from app.models import TargetProfile
from app.repositories import TargetRepository, load_target_seed


def test_target_seed_validates_against_schema() -> None:
    seed = load_target_seed()

    assert seed["version"] >= 1
    assert seed["targets"]
    for target in seed["targets"]:
        TargetProfile.model_validate(target)


def test_target_repository_seeds_sqlite_database(tmp_path) -> None:
    db_path = tmp_path / "bodymod.sqlite3"
    seed = load_target_seed()
    repository = TargetRepository(db_path=db_path)

    targets = repository.list_target_dicts()

    assert db_path.exists()
    assert targets == seed["targets"]

    with sqlite3.connect(db_path) as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(
            "SELECT value FROM app_metadata WHERE key = ?",
            ("target_seed_version",),
        ).fetchone()
        target_count = connection.execute(
            "SELECT COUNT(*) AS count FROM target_profiles"
        ).fetchone()["count"]

    assert row["value"] == str(seed["version"])
    assert target_count == len(seed["targets"])
