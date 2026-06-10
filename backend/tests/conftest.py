import pytest


@pytest.fixture(autouse=True)
def use_temp_bodymod_database(monkeypatch, tmp_path):
    monkeypatch.setenv("BODYMOD_DB_PATH", str(tmp_path / "bodymod.sqlite3"))
