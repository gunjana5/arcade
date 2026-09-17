# checkers rules - mainly forced jumps
from games.checkers import (
    BLACK,
    EMPTY,
    KING_BLACK,
    RED,
    checkers_apply_move,
    checkers_get_moves,
    checkers_get_state,
)


def _empty_board():
    return [[EMPTY] * 8 for _ in range(8)]


def test_forced_capture_only_returns_jumps():
    board = _empty_board()
    # black at (2,1) can jump red at (3,2) to (4,3)
    board[2][1] = BLACK
    board[3][2] = RED
    state = checkers_get_state(board, black_turn=True)
    moves = checkers_get_moves(state)
    assert moves, "expected at least one jump"
    # every returned path should be a jump (2+ steps of distance)
    assert all(len(m) >= 2 for m in moves)
    for m in moves:
        assert len(m) >= 2
        dr = abs(m[-1][0] - m[0][0])
        assert dr >= 2, "non-capture move returned when jump available"


def test_regular_move_when_no_capture():
    board = _empty_board()
    board[2][1] = BLACK
    board[3][0] = RED  # not adjacent for a jump from (2,1)
    state = checkers_get_state(board, black_turn=True)
    moves = checkers_get_moves(state)
    # at least one quiet one-step diagonal
    assert any(len(m) == 2 and abs(m[1][0] - m[0][0]) == 1 for m in moves)


def test_apply_move_switches_turn():
    board = _empty_board()
    board[5][0] = BLACK
    state = checkers_get_state(board, black_turn=True)
    moves = checkers_get_moves(state)
    assert moves
    # pick a simple non-multi-jump path
    step = next(m for m in moves if len(m) == 2)
    new_state = checkers_apply_move(state, step)
    assert new_state["blackTurn"] is False


def test_man_cannot_jump_backwards():
    # black man at (4,3); only capture is "up" over red at (3,2) -> (2,1)
    board = _empty_board()
    board[4][3] = BLACK
    board[3][2] = RED
    state = checkers_get_state(board, black_turn=True)
    moves = checkers_get_moves(state)
    assert [(4, 3), (2, 1)] not in moves
    # no other jumps either - quiet forward steps only
    assert all(abs(m[1][0] - m[0][0]) == 1 for m in moves)


def test_king_can_jump_backwards():
    board = _empty_board()
    board[4][3] = KING_BLACK
    board[3][2] = RED
    state = checkers_get_state(board, black_turn=True)
    moves = checkers_get_moves(state)
    assert [(4, 3), (2, 1)] in moves
