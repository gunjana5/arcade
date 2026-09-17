# sqlite leaderboard survives re-init when mongo is off
from pathlib import Path

import pytest

import leaderboard as lb


def test_sqlite_wins_persist_across_reinit(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    db = tmp_path / "leaderboard.db"
    monkeypatch.delenv("MONGODB_URI", raising=False)
    monkeypatch.setenv("LEADERBOARD_DB", str(db))
    monkeypatch.setenv("USERS_DB", str(tmp_path / "users.db"))

    lb.init_leaderboard()
    assert lb.storage_mode() == "sqlite"
    r1 = lb.record_win("desk_cat", "tictactoe")
    assert r1["wins"] == 1
    assert r1["storage"] == "sqlite"

    # pretend the process restarted
    lb.init_leaderboard()
    assert lb.storage_mode() == "sqlite"
    top = lb.top_scores("tictactoe", limit=5)
    assert top[0]["username"] == "desk_cat"
    assert top[0]["wins"] == 1
    r2 = lb.record_win("desk_cat", "tictactoe")
    assert r2["wins"] == 2
