# light win_check hardening - still not full anti-cheat
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from games.checkers import BLACK, EMPTY as C_EMPTY, RED
from games.chess import EMPTY as CH_EMPTY
from games.tictactoe import EMPTY, O, X
from win_check import assert_human_ai_win


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("USERS_DB", str(tmp_path / "users.db"))
    monkeypatch.delenv("MONGODB_URI", raising=False)
    monkeypatch.setenv("LEADERBOARD_DB", str(tmp_path / "leaderboard.db"))
    import main as main_mod

    with TestClient(main_mod.app) as c:
        yield c


def _token(client: TestClient, name: str = "wc_user") -> str:
    reg = client.post("/api/auth/register", json={"username": name, "password": "secret"})
    return reg.json()["token"]


def test_ttt_impossible_counts_rejected():
    # five X zero O cannot be a legal finished game
    board = [[X, X, X], [X, X, EMPTY], [EMPTY, EMPTY, EMPTY]]
    with pytest.raises(ValueError, match="piece counts"):
        assert_human_ai_win("tictactoe", {"board": board})


def test_ttt_legal_x_win_ok():
    board = [[X, X, X], [O, O, EMPTY], [EMPTY, EMPTY, EMPTY]]
    assert_human_ai_win("tictactoe", {"board": board})


def test_c4_bad_counts_rejected():
    empty = " "
    board = [[empty] * 7 for _ in range(6)]
    for c in range(4):
        board[5][c] = "R"
    # 4 R and 0 Y - gravity ok + R win but impossible turn parity
    with pytest.raises(ValueError, match="piece counts"):
        assert_human_ai_win("connect4", {"board": board})


def test_api_rejects_ttt_bad_counts(client: TestClient):
    token = _token(client, "badcounts")
    res = client.post(
        "/api/leaderboard/win",
        json={
            "game": "tictactoe",
            "state": {"board": [[X, X, X], [X, X, EMPTY], [EMPTY, EMPTY, EMPTY]]},
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 400


def test_checkers_black_win_accepted(client: TestClient):
    # red to move with no pieces / no moves → black wins
    board = [[C_EMPTY] * 8 for _ in range(8)]
    board[2][1] = BLACK
    token = _token(client, "chkwin")
    res = client.post(
        "/api/leaderboard/win",
        json={"game": "checkers", "state": {"board": board, "blackTurn": False}},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200


def test_checkers_incomplete_rejected(client: TestClient):
    board = [[C_EMPTY] * 8 for _ in range(8)]
    board[2][1] = BLACK
    board[5][0] = RED
    token = _token(client, "chkmid")
    res = client.post(
        "/api/leaderboard/win",
        json={"game": "checkers", "state": {"board": board, "blackTurn": True}},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 400


def test_chess_white_mate_accepted(client: TestClient):
    board = [[CH_EMPTY] * 8 for _ in range(8)]
    board[0] = list("rnbqk") + [CH_EMPTY] + list("nr")
    board[1] = list("pppp") + [CH_EMPTY, "Q", "p", "p"]
    board[3][4] = "p"
    board[4][2] = "B"
    board[4][4] = "P"
    board[6] = list("PPPP") + [CH_EMPTY, "P", "P", "P"]
    board[7] = list("RNB") + [CH_EMPTY, "K"] + [CH_EMPTY, "N", "R"]
    token = _token(client, "chesswin")
    res = client.post(
        "/api/leaderboard/win",
        json={
            "game": "chess",
            "state": {"board": board, "whiteTurn": False},
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200


def test_chess_midgame_rejected(client: TestClient):
    state = {
        "board": [
            list("rnbqkbnr"),
            list("pppppppp"),
            [CH_EMPTY] * 8,
            [CH_EMPTY] * 8,
            [CH_EMPTY] * 8,
            [CH_EMPTY] * 8,
            list("PPPPPPPP"),
            list("RNBQKBNR"),
        ],
        "whiteTurn": True,
    }
    token = _token(client, "chessmid")
    res = client.post(
        "/api/leaderboard/win",
        json={"game": "chess", "state": state},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 400
