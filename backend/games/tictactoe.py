# 3x3 rules. empty cell is " " not null
import random

from . import minimax_ttt

EMPTY = " "
X = "X"
O = "O"

# depth for minimax - 9 = whole tree from empty board (solved)
# easy = random legal; medium+ use depth caps below
DIFFICULTY_DEPTHS = {"easy": 3, "medium": 6, "hard": 9, "expert": 9}


def get_state(board: list[list[str]] | None = None) -> dict:
    # board + whose turn (X starts / when counts equal)
    if board is None:
        board = [[EMPTY] * 3 for _ in range(3)]
    # count marks to infer whose turn it is without storing it separately
    xc = sum(1 for row in board for c in row if c == X)
    oc = sum(1 for row in board for c in row if c == O)
    next_p = X if xc == oc else O
    return {"board": [list(r) for r in board], "currentPlayer": next_p}


def get_winner(board: list[list[str]]) -> str | None:
    # rows, cols, both diagonals - return "X" / "O" / None
    for row in board:
        if row[0] != EMPTY and row[0] == row[1] == row[2]:
            return row[0]
    for c in range(3):
        if board[0][c] != EMPTY and board[0][c] == board[1][c] == board[2][c]:
            return board[0][c]
    if board[0][0] != EMPTY and board[0][0] == board[1][1] == board[2][2]:
        return board[0][0]
    if board[0][2] != EMPTY and board[0][2] == board[1][1] == board[2][0]:
        return board[0][2]
    return None


def is_draw(board: list[list[str]]) -> bool:
    # full board + nobody won
    return get_winner(board) is None and all(cell != EMPTY for row in board for cell in row)


def apply_move(state: dict, row: int, col: int) -> dict | None:
    # None = illegal (taken / out of bounds)
    board = [list(r) for r in state["board"]]
    if not (0 <= row < 3 and 0 <= col < 3) or board[row][col] != EMPTY:
        return None
    current = state["currentPlayer"]
    board[row][col] = current
    next_player = O if current == X else X
    return {"board": board, "currentPlayer": next_player}


def get_ai_move(state: dict, difficulty: str) -> dict | None:
    # wraps minimax_ttt - returns row/col + new state
    # easy = random empty cell so beginners can actually win
    board = state["board"]
    current = state["currentPlayer"]
    if difficulty == "easy":
        empties = [(r, c) for r in range(3) for c in range(3) if board[r][c] == EMPTY]
        move = random.choice(empties) if empties else None
    else:
        depth = DIFFICULTY_DEPTHS.get(difficulty, 9)
        move = minimax_ttt.best_move(board, current, depth)
    if move is None:
        return None
    r, c = move
    new_state = apply_move(state, r, c)
    if new_state is None:
        return None
    return {"row": r, "col": c, "newState": new_state}
