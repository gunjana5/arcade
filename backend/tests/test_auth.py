# auth + leaderboard win endpoints (temp sqlite per test)
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from games.tictactoe import EMPTY, O, X


def _x_win_state():
    # top row X - human win vs ai side
    return {
        "board": [[X, X, X], [O, O, EMPTY], [EMPTY, EMPTY, EMPTY]],
        "currentPlayer": O,
    }


def _o_win_state():
    return {
        "board": [[O, O, O], [X, X, EMPTY], [EMPTY, EMPTY, EMPTY]],
        "currentPlayer": X,
    }


def _c4_r_win_state():
    # four R on bottom + three Y stacked so counts are R = Y + 1
    empty = " "
    board = [[empty] * 7 for _ in range(6)]
    for c in range(4):
        board[5][c] = "R"
    for c in range(3):
        board[4][c] = "Y"
    return {
        "board": board,
        "currentPlayer": "Y",
        "winner": "R",
        "gameOver": True,
        "isDraw": False,
    }


def _c4_y_win_state():
    empty = " "
    board = [[empty] * 7 for _ in range(6)]
    for c in range(4):
        board[5][c] = "Y"
    board[5][4] = "R"
    return {
        "board": board,
        "currentPlayer": "R",
        "winner": "Y",
        "gameOver": True,
        "isDraw": False,
    }


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    # fresh sqlite users db per test
    monkeypatch.setenv("USERS_DB", str(tmp_path / "users.db"))
    # no mongo - leaderboard falls back to sqlite under tmp USERS_DB dir
    monkeypatch.delenv("MONGODB_URI", raising=False)
    monkeypatch.setenv("LEADERBOARD_DB", str(tmp_path / "leaderboard.db"))

    import main as main_mod

    with TestClient(main_mod.app) as c:
        yield c


def test_register_and_login(client: TestClient):
    # register returns a bearer token for /me later
    reg = client.post("/api/auth/register", json={"username": "neon_cat", "password": "arcade1"})
    assert reg.status_code == 200
    data = reg.json()
    assert data["username"] == "neon_cat"
    assert isinstance(data["token"], str) and len(data["token"]) > 10

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {data['token']}"})
    assert me.status_code == 200
    assert me.json()["username"] == "neon_cat"

    # login issues a new token - both should work
    login = client.post("/api/auth/login", json={"username": "neon_cat", "password": "arcade1"})
    assert login.status_code == 200
    assert login.json()["username"] == "neon_cat"
    assert login.json()["token"]


def test_register_duplicate_username(client: TestClient):
    assert client.post("/api/auth/register", json={"username": "dup_user", "password": "pass1"}).status_code == 200
    again = client.post("/api/auth/register", json={"username": "dup_user", "password": "pass2"})
    assert again.status_code == 400


def test_win_without_token_fails(client: TestClient):
    # leaderboard win is auth-gated
    res = client.post(
        "/api/leaderboard/win",
        json={"game": "tictactoe", "username": "hacker", "state": _x_win_state()},
    )
    assert res.status_code == 401


def test_win_missing_state_fails(client: TestClient):
    reg = client.post("/api/auth/register", json={"username": "nostate", "password": "secret"})
    token = reg.json()["token"]
    res = client.post(
        "/api/leaderboard/win",
        json={"game": "tictactoe"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 422


def test_win_with_token_uses_auth_username(client: TestClient):
    # username comes from the token; state must be a real human win
    reg = client.post("/api/auth/register", json={"username": "player1", "password": "secret"})
    token = reg.json()["token"]
    res = client.post(
        "/api/leaderboard/win",
        json={"game": "tictactoe", "state": _x_win_state()},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    assert res.json()["username"] == "player1"
    assert res.json()["wins"] == 1


def test_win_ai_board_rejected(client: TestClient):
    reg = client.post("/api/auth/register", json={"username": "fakeloss", "password": "secret"})
    token = reg.json()["token"]
    res = client.post(
        "/api/leaderboard/win",
        json={"game": "tictactoe", "state": _o_win_state()},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 400


def test_win_incomplete_board_rejected(client: TestClient):
    reg = client.post("/api/auth/register", json={"username": "midgame", "password": "secret"})
    token = reg.json()["token"]
    res = client.post(
        "/api/leaderboard/win",
        json={
            "game": "tictactoe",
            "state": {"board": [[X, EMPTY, EMPTY], [EMPTY, O, EMPTY], [EMPTY, EMPTY, EMPTY]]},
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 400


def test_win_connect4_human_ok_ai_rejected(client: TestClient):
    reg = client.post("/api/auth/register", json={"username": "c4fan", "password": "secret"})
    token = reg.json()["token"]
    ok = client.post(
        "/api/leaderboard/win",
        json={"game": "connect4", "state": _c4_r_win_state()},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert ok.status_code == 200
    bad = client.post(
        "/api/leaderboard/win",
        json={"game": "connect4", "state": _c4_y_win_state()},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert bad.status_code == 400


def test_win_mismatched_username_forbidden(client: TestClient):
    # body username must match the token - no spoofing other people's wins
    reg = client.post("/api/auth/register", json={"username": "player2", "password": "secret"})
    token = reg.json()["token"]
    res = client.post(
        "/api/leaderboard/win",
        json={"game": "chess", "username": "someone_else", "state": _x_win_state()},
        headers={"Authorization": f"Bearer {token}"},
    )
    # 403 before win check, or 400 if chess state invalid - mismatch is 403 first
    assert res.status_code == 403
