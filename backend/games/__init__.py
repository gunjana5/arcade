# re-export game helpers for main.py - add new games here when wiring routes
from .tictactoe import get_state, apply_move, get_winner, get_ai_move
from .checkers import (
    checkers_get_state,
    checkers_get_moves,
    checkers_apply_move,
    checkers_ai_move,
    checkers_move_notation,
    checkers_hint_move,
)
from .chess import chess_get_state, chess_get_moves, chess_apply_move, chess_ai_move, chess_move_notation, chess_hint_move
from .connect4 import (
    c4_new_game,
    c4_drop,
    c4_legal_cols,
    c4_ai_move,
    c4_hint,
)

__all__ = [
    "get_state",
    "apply_move",
    "get_winner",
    "get_ai_move",
    "checkers_get_state",
    "checkers_get_moves",
    "checkers_apply_move",
    "checkers_ai_move",
    "checkers_move_notation",
    "checkers_hint_move",
    "chess_get_state",
    "chess_get_moves",
    "chess_apply_move",
    "chess_ai_move",
    "chess_move_notation",
    "chess_hint_move",
    "c4_new_game",
    "c4_drop",
    "c4_legal_cols",
    "c4_ai_move",
    "c4_hint",
]
