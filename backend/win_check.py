# re-check final boards before leaderboard wins - don't trust client winner alone
# residual: crafted terminal human-win boards can still score (no match log)

from __future__ import annotations

from typing import Any

from games.checkers import checkers_get_state
from games.chess import chess_get_state
from games.connect4 import (
    AI_PIECE,
    COLS,
    EMPTY as C4_EMPTY,
    HUMAN_PIECE,
    ROWS,
    c4_check_winner,
)
from games.tictactoe import EMPTY as TTT_EMPTY, O, X, get_winner
from leaderboard import _normalize_game


def assert_human_ai_win(game: str, state: dict[str, Any] | None) -> None:
    if not isinstance(state, dict) or not state:
        raise ValueError("final game state is required to record a win")
    key = _normalize_game(game)
    if key == "tictactoe":
        _ttt(state)
    elif key == "connect4":
        _connect4(state)
    elif key == "checkers":
        _checkers(state)
    elif key == "chess":
        _chess(state)
    else:
        raise ValueError("unknown game")


def _ttt(state: dict[str, Any]) -> None:
    board = state.get("board")
    if not isinstance(board, list) or len(board) != 3:
        raise ValueError("invalid tictactoe board")
    for row in board:
        if not isinstance(row, list) or len(row) != 3:
            raise ValueError("invalid tictactoe board")
        for cell in row:
            if cell not in (TTT_EMPTY, X, O):
                raise ValueError("invalid tictactoe board")
    # recompute - ignore client winner field
    if get_winner(board) != X:
        raise ValueError("not a verified human (X) win vs ai")
    # X moved first and last on an X win → one more X than O
    xc = sum(1 for row in board for c in row if c == X)
    oc = sum(1 for row in board for c in row if c == O)
    if xc < 3 or xc != oc + 1:
        raise ValueError("invalid tictactoe board (piece counts)")


def _c4_gravity_ok(board: list[list[str]]) -> bool:
    # no floating discs - once empty appears in a column, rest above must be empty
    for c in range(COLS):
        seen_empty = False
        for r in range(ROWS - 1, -1, -1):
            cell = board[r][c]
            if cell == C4_EMPTY:
                seen_empty = True
            elif seen_empty:
                return False
            elif cell not in (HUMAN_PIECE, AI_PIECE):
                return False
    return True


def _c4_has_win(board: list[list[str]], piece: str) -> bool:
    for r in range(ROWS):
        for c in range(COLS):
            if board[r][c] == piece and c4_check_winner(board, r, c, piece):
                return True
    return False


def _connect4(state: dict[str, Any]) -> None:
    board = state.get("board")
    if not isinstance(board, list) or len(board) != ROWS:
        raise ValueError("invalid connect4 board")
    for row in board:
        if not isinstance(row, list) or len(row) != COLS:
            raise ValueError("invalid connect4 board")
    if not _c4_gravity_ok(board):
        raise ValueError("invalid connect4 board (gravity)")
    if not _c4_has_win(board, HUMAN_PIECE):
        raise ValueError("not a verified human (R) win vs ai")
    if _c4_has_win(board, AI_PIECE):
        raise ValueError("not a verified human (R) win vs ai")
    # R moves first and placed the winning disc
    n_r = sum(1 for row in board for c in row if c == HUMAN_PIECE)
    n_y = sum(1 for row in board for c in row if c == AI_PIECE)
    if n_r < 4 or n_r != n_y + 1:
        raise ValueError("invalid connect4 board (piece counts)")


def _checkers(state: dict[str, Any]) -> None:
    board = state.get("board")
    if not isinstance(board, list) or len(board) != 8:
        raise ValueError("invalid checkers board")
    black_turn = state.get("blackTurn")
    if not isinstance(black_turn, bool):
        raise ValueError("invalid checkers state")
    recomputed = checkers_get_state(board, black_turn)
    if not recomputed.get("gameOver") or recomputed.get("winner") != "Black":
        raise ValueError("not a verified human (Black) win vs ai")


def _chess(state: dict[str, Any]) -> None:
    board = state.get("board")
    if not isinstance(board, list) or len(board) != 8:
        raise ValueError("invalid chess board")
    white_turn = state.get("whiteTurn")
    if not isinstance(white_turn, bool):
        raise ValueError("invalid chess state")
    rights = state.get("castling_rights")
    if rights is not None and not isinstance(rights, dict):
        raise ValueError("invalid chess state")
    recomputed = chess_get_state(board, white_turn, rights if isinstance(rights, dict) else None)
    if not recomputed.get("gameOver") or recomputed.get("winner") != "White":
        raise ValueError("not a verified human (White) win vs ai")
