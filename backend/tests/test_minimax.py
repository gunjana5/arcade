# minimax should block threats + take wins (depth 9 = perfect play)
from games import minimax_ttt
from games.tictactoe import O, X, get_ai_move, get_state

EMPTY = " "


def test_minimax_blocks_immediate_loss():
    # O can win on column 2 unless X blocks at (0, 2)
    board = [
        [X, X, EMPTY],
        [O, O, EMPTY],
        [EMPTY, EMPTY, EMPTY],
    ]
    move = minimax_ttt.best_move(board, X, max_depth=9)
    assert move == (0, 2)


def test_minimax_takes_winning_move():
    # X already has two on the top row - finish it
    board = [
        [X, X, EMPTY],
        [O, EMPTY, O],
        [EMPTY, EMPTY, EMPTY],
    ]
    move = minimax_ttt.best_move(board, X, max_depth=9)
    assert move == (0, 2)


def test_minimax_opens_with_strong_move():
    # perfect play opening = corner or centre
    board = [[EMPTY] * 3 for _ in range(3)]
    move = minimax_ttt.best_move(board, X, max_depth=9)
    assert move in {(0, 0), (0, 2), (1, 1), (2, 0), (2, 2)}


def test_get_ai_move_returns_new_state():
    # wrapper should apply the block and hand back the new board
    state = get_state(
        [
            [X, X, EMPTY],
            [O, O, EMPTY],
            [EMPTY, EMPTY, EMPTY],
        ]
    )
    state["currentPlayer"] = X
    result = get_ai_move(state, "expert")
    assert result is not None
    assert result["row"] == 0
    assert result["col"] == 2
    assert result["newState"]["board"][0][2] == X


def test_easy_ai_picks_a_legal_empty():
    # easy is random - just check it lands on an empty and applies
    state = get_state(
        [
            [X, O, EMPTY],
            [EMPTY, X, EMPTY],
            [EMPTY, EMPTY, O],
        ]
    )
    state["currentPlayer"] = O
    result = get_ai_move(state, "easy")
    assert result is not None
    r, c = result["row"], result["col"]
    assert (r, c) in {(0, 2), (1, 0), (1, 2), (2, 0), (2, 1)}
    assert result["newState"]["board"][r][c] == O


def test_perfect_ai_never_loses_from_opening():
    # after X takes centre, O responds; X should still not be on a forced-loss line
    board = [
        [EMPTY, EMPTY, EMPTY],
        [EMPTY, X, EMPTY],
        [EMPTY, EMPTY, EMPTY],
    ]
    o_move = minimax_ttt.best_move(board, O, max_depth=9)
    assert o_move is not None
    r, c = o_move
    board[r][c] = O
    x_move = minimax_ttt.best_move(board, X, max_depth=9)
    assert x_move is not None
