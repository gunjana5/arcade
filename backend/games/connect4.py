# 6x7 drop game. R = human (red), Y = ai (yellow)
from __future__ import annotations

import random
from copy import deepcopy
from typing import Any

from ai.minimax import MinimaxEngine

ROWS = 6
COLS = 7
EMPTY = " "
AI_PIECE = "Y"
HUMAN_PIECE = "R"


def _empty_board() -> list[list[str]]:
    return [[EMPTY for _ in range(COLS)] for _ in range(ROWS)]


def c4_new_game() -> dict[str, Any]:
    # fresh state the frontend keeps and posts back
    return {
        "board": _empty_board(),
        "currentPlayer": "R",
        "winner": None,
        "isDraw": False,
        "gameOver": False,
        "lastCol": None,
    }


def c4_check_winner(board: list[list[str]], row: int, col: int, piece: str) -> bool:
    # count both ways from the disc that just landed
    dirs = ((0, 1), (1, 0), (1, 1), (1, -1))
    for dr, dc in dirs:
        count = 1
        for sign in (-1, 1):
            r, c = row, col
            while True:
                r += dr * sign
                c += dc * sign
                if r < 0 or r >= ROWS or c < 0 or c >= COLS or board[r][c] != piece:
                    break
                count += 1
        if count >= 4:
            return True
    return False


def c4_legal_cols(state: dict[str, Any]) -> list[int]:
    board = state["board"]
    return [c for c in range(COLS) if board[0][c] == EMPTY]


def c4_drop(state: dict[str, Any], col: int) -> dict[str, Any]:
    # gravity: find lowest empty row in that column
    if col < 0 or col >= COLS:
        raise ValueError("Invalid column")
    board = deepcopy(state["board"])
    if board[0][col] != EMPTY:
        raise ValueError("Column full")
    piece = state["currentPlayer"]
    row = -1
    for r in range(ROWS - 1, -1, -1):
        if board[r][col] == EMPTY:
            row = r
            break
    if row < 0:
        raise ValueError("Column full")
    board[row][col] = piece
    won = c4_check_winner(board, row, col, piece)
    next_p = "Y" if piece == "R" else "R"
    legal = c4_legal_cols({"board": board, **{k: v for k, v in state.items() if k != "board"}})
    is_draw = not won and len(legal) == 0
    game_over = won or is_draw
    winner = piece if won else ("Draw" if is_draw else None)
    return {
        "board": board,
        "currentPlayer": next_p if not game_over else piece,
        "winner": winner if game_over else None,
        "isDraw": is_draw,
        "gameOver": game_over,
        "lastCol": col,
    }


def _score_window(window: list[str], ai: str, opp: str) -> float:
    # score one 4-cell slice - big numbers for wins, medium for threats
    s = 0.0
    ai_c = sum(1 for x in window if x == ai)
    opp_c = sum(1 for x in window if x == opp)
    empty_c = sum(1 for x in window if x == EMPTY)
    if ai_c == 4:
        return 1e6
    if opp_c == 4:
        return -1e6
    if ai_c == 3 and empty_c == 1:
        s += 100
    elif ai_c == 2 and empty_c == 2:
        s += 10
    # block opponent's 3-in-a-row harder than growing own 2s
    if opp_c == 3 and empty_c == 1:
        s -= 80
    return s


def _center_bonus(board: list[list[str]], piece: str) -> float:
    # pieces nearer the middle column score higher
    mid = COLS // 2
    b = 0.0
    for r in range(ROWS):
        for c in range(COLS):
            if board[r][c] == piece:
                b += 3 * (1 - abs(c - mid) / max(mid, 1))
    return b


def c4_evaluate(state: dict[str, Any]) -> float:
    # heuristic for minimax leaves - scan every 4-cell window
    board = state["board"]
    ai, opp = AI_PIECE, HUMAN_PIECE
    score = 0.0
    # rows
    for r in range(ROWS):
        row = board[r]
        for c in range(COLS - 3):
            score += _score_window(row[c : c + 4], ai, opp)
    # columns
    for c in range(COLS):
        for r in range(ROWS - 3):
            colw = [board[r + i][c] for i in range(4)]
            score += _score_window(colw, ai, opp)
    # both diagonal directions
    for r in range(ROWS - 3):
        for c in range(COLS - 3):
            d1 = [board[r + i][c + i] for i in range(4)]
            score += _score_window(d1, ai, opp)
            d2 = [board[r + i][c + 3 - i] for i in range(4)]
            score += _score_window(d2, ai, opp)
    # centre columns are usually stronger
    score += _center_bonus(board, ai)
    score -= _center_bonus(board, opp)
    return score


def c4_is_terminal(state: dict[str, Any]) -> bool:
    return bool(state.get("gameOver"))


def c4_apply_col(state: dict[str, Any], col: int) -> dict[str, Any]:
    return c4_drop(state, col)


def c4_get_children(state: dict[str, Any]) -> list[int]:
    return c4_legal_cols(state)


# how deep minimax looks - higher = stronger + slower
DEPTHS = {"easy": 2, "medium": 4, "hard": 6, "expert": 8}


def _engine(state: dict[str, Any], difficulty: str) -> MinimaxEngine:
    # wire connect4 into the shared MinimaxEngine
    depth = DEPTHS.get(difficulty, 4)

    def apply(s: dict[str, Any], col: int) -> dict[str, Any]:
        return c4_drop(s, col)

    def is_max(s: dict[str, Any]) -> bool:
        return s["currentPlayer"] == AI_PIECE

    return MinimaxEngine(
        max_depth=depth,
        get_actions=c4_get_children,
        apply=apply,
        is_terminal=c4_is_terminal,
        evaluate=c4_evaluate,
        is_maximizer_turn=is_max,
    )


def c4_ai_move(state: dict[str, Any], difficulty: str) -> dict[str, Any] | None:
    # only answer when it's yellow's turn and the game isn't over
    if state.get("gameOver"):
        return None
    if state["currentPlayer"] != AI_PIECE:
        return None
    cols = c4_legal_cols(state)
    if not cols:
        return None
    # easy = random legal col (same idea as ttt)
    if difficulty == "easy":
        return c4_drop(state, random.choice(cols))
    eng = _engine(state, difficulty)
    best = eng.best_action(state)
    # fallback: first legal col if search somehow returns nothing
    if best is None:
        return c4_drop(state, cols[0])
    return c4_drop(state, best)


def c4_hint(state: dict[str, Any], difficulty: str) -> int | None:
    # same search as ai but for whoever's turn (red or yellow)
    if state.get("gameOver"):
        return None
    cols = c4_legal_cols(state)
    if not cols:
        return None
    eng = _engine(state, difficulty)
    return eng.best_action(state)

