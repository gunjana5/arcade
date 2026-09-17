# four labels, four methods - not a depth slider
from games.checkers import (
    BLACK,
    EMPTY as C_EMPTY,
    KING_RED,
    RED,
    DEPTHS as CHECKERS_DEPTHS,
    checkers_ai_move,
    checkers_get_moves,
    checkers_get_state,
)
from games.chess import (
    EMPTY as CH_EMPTY,
    DEPTHS as CHESS_DEPTHS,
    chess_ai_move,
    chess_apply_move,
    chess_get_moves,
    chess_get_state,
)
from games.connect4 import (
    AI_PIECE,
    EMPTY as C4_EMPTY,
    HUMAN_PIECE,
    DEPTHS as C4_DEPTHS,
    c4_ai_move,
    c4_drop,
    c4_hint,
    c4_legal_cols,
    c4_new_game,
)
from games.tictactoe import (
    DEPTHS as TTT_DEPTHS,
    EMPTY,
    O,
    X,
    get_ai_move,
    get_state,
)


DIFFS = ("easy", "medium", "hard", "expert")


def test_depths_hard_vs_expert_do_not_collapse():
    assert TTT_DEPTHS == {"hard": 4, "expert": 9}
    assert C4_DEPTHS == {"hard": 4, "expert": 6}
    assert CHECKERS_DEPTHS == {"hard": 3, "expert": 5}
    assert CHESS_DEPTHS == {"hard": 3, "expert": 5}
    for d in (TTT_DEPTHS, C4_DEPTHS, CHECKERS_DEPTHS, CHESS_DEPTHS):
        assert "easy" not in d
        assert "medium" not in d


def test_ttt_all_difficulties_legal():
    state = get_state(
        [
            [X, O, EMPTY],
            [EMPTY, X, EMPTY],
            [EMPTY, EMPTY, O],
        ]
    )
    state["currentPlayer"] = O
    legal = {(r, c) for r in range(3) for c in range(3) if state["board"][r][c] == EMPTY}
    for d in DIFFS:
        result = get_ai_move(state, d)
        assert result is not None
        assert (result["row"], result["col"]) in legal


def test_ttt_medium_takes_win():
    state = get_state(
        [
            [X, X, EMPTY],
            [O, EMPTY, O],
            [EMPTY, EMPTY, EMPTY],
        ]
    )
    state["currentPlayer"] = X
    result = get_ai_move(state, "medium")
    assert result is not None
    assert (result["row"], result["col"]) == (0, 2)


def test_ttt_medium_blocks():
    # O threatens (1, 2); X has no win this turn so must block
    state = get_state(
        [
            [X, EMPTY, EMPTY],
            [O, O, EMPTY],
            [EMPTY, EMPTY, EMPTY],
        ]
    )
    state["currentPlayer"] = X
    result = get_ai_move(state, "medium")
    assert result is not None
    assert (result["row"], result["col"]) == (1, 2)


def test_ttt_expert_still_takes_win():
    state = get_state(
        [
            [X, X, EMPTY],
            [O, EMPTY, O],
            [EMPTY, EMPTY, EMPTY],
        ]
    )
    state["currentPlayer"] = X
    result = get_ai_move(state, "expert")
    assert result is not None
    assert (result["row"], result["col"]) == (0, 2)


def test_connect4_all_difficulties_legal():
    state = c4_new_game()
    state = c4_drop(state, 3)
    before = set(c4_legal_cols(state))
    for d in DIFFS:
        nxt = c4_ai_move(state, d)
        assert nxt is not None
        assert nxt["lastCol"] in before


def test_connect4_medium_takes_win():
    board = [[C4_EMPTY] * 7 for _ in range(6)]
    board[5][0] = AI_PIECE
    board[5][1] = AI_PIECE
    board[5][2] = AI_PIECE
    board[5][6] = HUMAN_PIECE
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


def test_connect4_medium_blocks():
    board = [[C4_EMPTY] * 7 for _ in range(6)]
    board[5][0] = HUMAN_PIECE
    board[5][1] = HUMAN_PIECE
    board[5][2] = HUMAN_PIECE
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


def test_connect4_hint_easy_is_legal():
    state = c4_new_game()
    cols = c4_legal_cols(state)
    hint = c4_hint(state, "easy")
    assert hint in cols


def test_chess_all_difficulties_legal():
    state = chess_get_state()
    legal = set(chess_get_moves(state))
    for d in DIFFS:
        move = chess_ai_move(state, d)
        assert move is not None
        assert move in legal


def test_chess_medium_takes_hanging_queen():
    board = [[CH_EMPTY] * 8 for _ in range(8)]
    board[7][4] = "K"
    board[0][4] = "k"
    board[7][3] = "Q"
    board[0][3] = "q"
    state = chess_get_state(board, white_turn=True)
    move = chess_ai_move(state, "medium")
    assert move == (7, 3, 0, 3)


def test_chess_hard_and_expert_legal_midgame():
    state = chess_apply_move(chess_get_state(), 6, 4, 4, 4)
    legal = set(chess_get_moves(state))
    for d in ("hard", "expert"):
        move = chess_ai_move(state, d)
        assert move is not None
        assert move in legal


def test_checkers_all_difficulties_legal():
    state = checkers_get_state()
    legal = [tuple(m) for m in checkers_get_moves(state)]
    for d in DIFFS:
        move = checkers_ai_move(state, d)
        assert move is not None
        assert tuple(move) in legal


def test_checkers_medium_takes_better_capture():
    board = [[C_EMPTY] * 8 for _ in range(8)]
    # two jumps: king is worth more than a man
    board[2][1] = BLACK
    board[3][2] = KING_RED
    board[2][5] = BLACK
    board[3][6] = RED
    state = checkers_get_state(board, black_turn=True)
    move = checkers_ai_move(state, "medium")
    assert move == [(2, 1), (4, 3)]


def test_checkers_hard_and_expert_legal_midgame():
    board = [[C_EMPTY] * 8 for _ in range(8)]
    board[2][1] = BLACK
    board[5][2] = RED
    state = checkers_get_state(board, black_turn=True)
    legal = [tuple(m) for m in checkers_get_moves(state)]
    for d in ("hard", "expert"):
        move = checkers_ai_move(state, d)
        assert move is not None
        assert tuple(move) in legal
