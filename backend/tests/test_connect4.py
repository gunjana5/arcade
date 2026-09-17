# connect4 drop / win / block / easy ai
import pytest

from games.connect4 import (
    AI_PIECE,
    EMPTY,
    HUMAN_PIECE,
    c4_ai_move,
    c4_drop,
    c4_legal_cols,
    c4_new_game,
)


def test_drop_gravity_and_win():
    state = c4_new_game()
    # R R R in bottom, then R wins on col 3
    for col in (0, 1, 2):
        state = c4_drop(state, col)
        state = c4_drop(state, 6)  # Y dumps on the side
    state = c4_drop(state, 3)
    assert state["gameOver"] is True
    assert state["winner"] == HUMAN_PIECE
    assert state["board"][5][3] == HUMAN_PIECE


def test_full_column_illegal():
    state = c4_new_game()
    for _ in range(6):
        # alternate filling column 0
        state = c4_drop(state, 0)
    with pytest.raises(ValueError, match="[Ff]ull|[Ii]nvalid"):
        c4_drop(state, 0)


def test_easy_ai_picks_legal_column():
    state = c4_new_game()
    state = c4_drop(state, 3)  # R moves, now Y
    before = c4_legal_cols(state)
    nxt = c4_ai_move(state, "easy")
    assert nxt is not None
    col = nxt["lastCol"]
    assert col in before
    # topmost filled cell in that column should be the ai piece
    for r in range(6):
        if nxt["board"][r][col] != EMPTY:
            assert nxt["board"][r][col] == AI_PIECE
            break


def test_medium_ai_blocks_threat():
    # R has three horizontal on bottom with col 3 open - Y must block
    state = c4_new_game()
    board = [[EMPTY] * 7 for _ in range(6)]
    board[5][0] = HUMAN_PIECE
    board[5][1] = HUMAN_PIECE
    board[5][2] = HUMAN_PIECE
    # stack a Y elsewhere so it's yellow's turn with a legal board
    board[5][6] = AI_PIECE
    state = {
        "board": board,
        "currentPlayer": AI_PIECE,
        "winner": None,
        "isDraw": False,
        "gameOver": False,
        "lastCol": 6,
    }
    nxt = c4_ai_move(state, "medium")
    assert nxt is not None
    assert nxt["lastCol"] == 3
