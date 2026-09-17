# basic ttt rules - win / draw / illegal moves
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from games.tictactoe import (
    EMPTY,
    O,
    X,
    apply_move,
    get_state,
    get_winner,
    is_draw,
)


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    # same setup as test_auth so /api routes boot cleanly
    monkeypatch.setenv("USERS_DB", str(tmp_path / "users.db"))
    monkeypatch.delenv("MONGODB_URI", raising=False)
    monkeypatch.setenv("LEADERBOARD_DB", str(tmp_path / "leaderboard.db"))
    import main as main_mod

    with TestClient(main_mod.app) as c:
        yield c


def test_get_winner_row():
    # top row filled by X
    board = [[X, X, X], [O, O, EMPTY], [EMPTY, EMPTY, EMPTY]]
    assert get_winner(board) == X


def test_get_winner_column():
    board = [[O, X, EMPTY], [O, X, EMPTY], [EMPTY, X, EMPTY]]
    assert get_winner(board) == X


def test_get_winner_diagonal():
    # main diagonal
    board = [[X, O, EMPTY], [O, X, EMPTY], [O, EMPTY, X]]
    assert get_winner(board) == X


def test_no_winner_yet():
    # one empty left, no three-in-a-row
    board = [[X, O, X], [O, X, O], [O, X, EMPTY]]
    assert get_winner(board) is None


def test_is_draw():
    # full board, nobody has three
    board = [[X, O, X], [O, X, O], [O, X, O]]
    assert is_draw(board) is True
    assert get_winner(board) is None


def test_apply_move_switches_player():
    # X starts - after one move it should be O's turn
    state = get_state()
    next_state = apply_move(state, 0, 0)
    assert next_state is not None
    assert next_state["board"][0][0] == X
    assert next_state["currentPlayer"] == O


def test_apply_move_rejects_occupied_cell():
    state = get_state()
    state = apply_move(state, 1, 1)
    assert apply_move(state, 1, 1) is None


def test_apply_move_rejects_out_of_bounds():
    state = get_state()
    assert apply_move(state, 3, 0) is None
    assert apply_move(state, -1, 0) is None


def test_ai_endpoint_returns_draw_on_full_board(client):
    # full board, nobody won - /ai used to omit draw and the ui never stopped
    board = [
        ["X", "O", "X"],
        ["O", "X", "O"],
        ["O", "X", "O"],
    ]
    state = {"board": board, "currentPlayer": "O"}
    res = client.post("/api/tictactoe/ai", json={"state": state, "difficulty": "medium"})
    assert res.status_code == 200
    data = res.json()
    assert data["done"] is True
    assert data["winner"] is None
    assert data["draw"] is True


def test_ai_endpoint_draw_after_last_move(client):
    # one empty left - O fills it and the board is a draw
    board = [
        ["X", "O", "X"],
        ["X", "O", "O"],
        ["O", "X", " "],
    ]
    state = {"board": board, "currentPlayer": "O"}
    res = client.post("/api/tictactoe/ai", json={"state": state, "difficulty": "medium"})
    assert res.status_code == 200
    data = res.json()
    assert data.get("done") is not True
    assert data["winner"] is None
    assert data["draw"] is True
    assert data["newState"]["board"][2][2] == "O"
