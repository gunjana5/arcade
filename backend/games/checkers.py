# checkers rules + ai
# B/R = men, K/Q = kings. forced captures. human = black in the ui
# jump moves first so alpha-beta prunes better
import random
from typing import List, Tuple

from ai.minimax import MinimaxEngine

EMPTY, BLACK, RED, KING_BLACK, KING_RED = ".", "B", "R", "K", "Q"


def _in_bounds(r: int, c: int) -> bool:
    return 0 <= r < 8 and 0 <= c < 8


def _initial_board() -> List[List[str]]:
    # three rows each side on dark squares only
    b = [[EMPTY] * 8 for _ in range(8)]
    for r in range(3):
        for c in range(8):
            if (r + c) % 2 == 1:
                b[r][c] = BLACK
    for r in range(5, 8):
        for c in range(8):
            if (r + c) % 2 == 1:
                b[r][c] = RED
    return b


def _is_black(p: str) -> bool:
    return p in (BLACK, KING_BLACK)


def _jump_dirs(p: str) -> list[int]:
    # men forward only; kings both ways. black forward = +row, red = -row
    if p in (KING_BLACK, KING_RED):
        return [1, -1]
    if p == BLACK:
        return [1]
    if p == RED:
        return [-1]
    return []


def _get_moves(board: List[List[str]], black_turn: bool) -> List[List[Tuple[int, int]]]:
    # forced captures: if any jump exists return only jumps (incl multi-jumps)
    moves, jumps = [], []
    for r in range(8):
        for c in range(8):
            p = board[r][c]
            if p == EMPTY or _is_black(p) != black_turn:
                continue
            # try jump in each allowed diagonal for this piece
            for dr in _jump_dirs(p):
                for dc in (-1, 1):
                    r2, c2 = r + 2 * dr, c + 2 * dc
                    if not _in_bounds(r2, c2):
                        continue
                    mr, mc = r + dr, c + dc  # square jumped over
                    if not _in_bounds(mr, mc) or board[r2][c2] != EMPTY:
                        continue
                    mid = board[mr][mc]
                    # must jump an enemy
                    if mid == EMPTY or _is_black(mid) == black_turn:
                        continue
                    path = [(r, c), (r2, c2)]
                    _extend_jumps(board, path, black_turn, jumps)
    if jumps:
        return jumps  # can't do quiet moves if a capture exists
    # no captures - one-step diagonals
    step = 1 if black_turn else -1
    for r in range(8):
        for c in range(8):
            p = board[r][c]
            if p == EMPTY or _is_black(p) != black_turn:
                continue
            for dc in (-1, 1):
                r1, c1 = r + step, c + dc
                if _in_bounds(r1, c1) and board[r1][c1] == EMPTY:
                    moves.append([(r, c), (r1, c1)])
            if p in (KING_BLACK, KING_RED):
                for dc in (-1, 1):
                    r1, c1 = r - step, c + dc
                    if _in_bounds(r1, c1) and board[r1][c1] == EMPTY:
                        moves.append([(r, c), (r1, c1)])
    return moves


def _apply_move(board: List[List[str]], move: List[Tuple[int, int]], black_turn: bool) -> List[List[str]]:
    # move is a path of squares e.g. [(r0,c0), (r1,c1), ...] for multi-jumps
    b = [list(row) for row in board]
    r0, c0 = move[0]
    piece = b[r0][c0]
    b[r0][c0] = EMPTY
    r1, c1 = r0, c0
    for i in range(1, len(move)):
        r1, c1 = move[i]
        # jumped piece sits midway between squares
        mr, mc = (r0 + r1) // 2, (c0 + c1) // 2
        b[mr][mc] = EMPTY
        r0, c0 = r1, c1
    # promote if the path ends on the back row
    if (black_turn and r1 == 7) or (not black_turn and r1 == 0):
        piece = KING_BLACK if black_turn else KING_RED
    b[r1][c1] = piece
    return b


def _extend_jumps(board: List[List[str]], path: List[Tuple[int, int]], black_turn: bool, out: list) -> None:
    # recurse until no more jumps from the landing square
    b_after = _apply_move(board, path, black_turn)
    r, c = path[-1]
    p = b_after[r][c]
    if p == EMPTY:
        return
    # same forward-only rule for men after each landing (may have just kinged)
    extended = False
    for dr in _jump_dirs(p):
        for dc in (-1, 1):
            r2, c2 = r + 2 * dr, c + 2 * dc
            if not _in_bounds(r2, c2) or b_after[r2][c2] != EMPTY:
                continue
            mr, mc = r + dr, c + dc
            mid = b_after[mr][mc]
            if mid == EMPTY or _is_black(mid) == black_turn or (r2, c2) in path:
                continue
            _extend_jumps(board, path + [(r2, c2)], black_turn, out)
            extended = True
    if not extended and len(path) > 1:
        out.append(path[:])


def _eval(board: List[List[str]], black_turn: bool) -> float:
    # material + slight position bonus (advancing is good)
    v = 0.0
    for r in range(8):
        for c in range(8):
            p = board[r][c]
            if p in (BLACK, KING_BLACK):
                v += (1.5 if p == KING_BLACK else 1.0) + 0.03 * r
            elif p in (RED, KING_RED):
                v -= (1.5 if p == KING_RED else 1.0) + 0.03 * (7 - r)
    return v


DEPTHS = {"hard": 3, "expert": 5}


def checkers_get_state(board: List[List[str]] | None = None, black_turn: bool = True) -> dict:
    # no legal moves = you lose (opponent wins)
    # no legal moves = you lose (opponent wins)
    if board is None:
        board = _initial_board()
    moves = _get_moves(board, black_turn)
    game_over = len(moves) == 0
    winner = None
    if game_over:
        winner = "Red" if black_turn else "Black"
    return {"board": [list(r) for r in board], "blackTurn": black_turn, "gameOver": game_over, "winner": winner}


def checkers_get_moves(state: dict) -> List[List[Tuple[int, int]]]:
    return _get_moves(state["board"], state["blackTurn"])


def checkers_apply_move(state: dict, move: List[Tuple[int, int]]) -> dict:
    board = _apply_move(state["board"], move, state["blackTurn"])
    return checkers_get_state(board, not state["blackTurn"])


def checkers_move_notation(move: List[Tuple[int, int]]) -> str:
    if not move:
        return ""
    a, b = move[0], move[-1]
    return f"{a[0] * 8 + a[1]}→{b[0] * 8 + b[1]}"


def checkers_hint_move(state: dict, difficulty: str) -> List[Tuple[int, int]] | None:
    # same picker as the ai for this difficulty
    return checkers_ai_move(state, difficulty)


def _random_legal(board: List[List[str]], black_turn: bool) -> List[Tuple[int, int]] | None:
    moves = _get_moves(board, black_turn)
    return random.choice(moves) if moves else None


def _greedy_move(board: List[List[str]], black_turn: bool) -> List[Tuple[int, int]] | None:
    # one ply of the existing eval. black max, red min. random among ties
    moves = _get_moves(board, black_turn)
    if not moves:
        return None
    scored = []
    for m in moves:
        nb = _apply_move(board, m, black_turn)
        scored.append((_eval(nb, not black_turn), m))
    best = max(s[0] for s in scored) if black_turn else min(s[0] for s in scored)
    opts = [m for s, m in scored if s == best]
    return random.choice(opts)


def checkers_ai_move(state: dict, difficulty: str) -> List[Tuple[int, int]] | None:
    board, black_turn = state["board"], state["blackTurn"]
    if difficulty == "easy":
        return _random_legal(board, black_turn)
    if difficulty == "medium":
        return _greedy_move(board, black_turn)
    depth = DEPTHS.get(difficulty, DEPTHS["hard"])
    engine = MinimaxEngine(
        max_depth=depth,
        get_actions=lambda s: _get_moves(s[0], s[1]),
        apply=lambda s, m: (_apply_move(s[0], m, s[1]), not s[1]),
        is_terminal=lambda s: len(_get_moves(s[0], s[1])) == 0,
        evaluate=lambda s: _eval(s[0], s[1]),
        is_maximizer_turn=lambda s: s[1],  # black maximises
    )
    return engine.best_action((board, black_turn))
