import pytest

from app.rate_limit import reset_rate_limit_state


@pytest.fixture(autouse=True)
def use_temp_bodymod_database(monkeypatch, tmp_path):
    monkeypatch.setenv("BODYMOD_DB_PATH", str(tmp_path / "bodymod.sqlite3"))


@pytest.fixture(autouse=True)
def reset_rate_limits():
    reset_rate_limit_state()
    yield
    reset_rate_limit_state()
