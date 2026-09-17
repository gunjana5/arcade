# chess rules + ai. uppercase = white, lowercase = black
# castling works (rights tracked); no en passant
from __future__ import annotations

import random
from copy import deepcopy
from typing import List, Tuple

from ai.minimax import MinimaxEngine

EMPTY = "."


def _default_castling_rights() -> dict[str, bool]:
    # updated when king/rook moves or rook is captured on its start square
    return {
        "white_king_moved": False,
        "black_king_moved": False,
        "white_rook_a_moved": False,
        "white_rook_h_moved": False,
        "black_rook_a_moved": False,
        "black_rook_h_moved": False,
    }


def _in_bounds(r: int, c: int) -> bool:
    return 0 <= r < 8 and 0 <= c < 8


def _initial_board() -> List[List[str]]:
    # standard setup - row 0 is black's back rank (top of the board in the ui)
    return [
        list("rnbqkbnr"),
        list("pppppppp"),
        [EMPTY] * 8,
        [EMPTY] * 8,
        [EMPTY] * 8,
        [EMPTY] * 8,
        list("PPPPPPPP"),
        list("RNBQKBNR"),
    ]


def _side(p: str) -> str | None:
    # W / B / None
    if p == EMPTY:
        return None
    return "W" if p.isupper() else "B"


def _piece_value(p: str) -> float:
    # white positive, black negative (white is maximiser)
    v = {"p": 1, "n": 3, "b": 3.2, "r": 5, "q": 9, "k": 0}[p.lower()]
    return v if p.isupper() else -v


# pawn position bonuses (white's view) - push centre / advance
_PST_PAWN = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5, 5, 10, 25, 25, 10, 5, 5],
    [0, 0, 0, 20, 20, 0, 0, 0],
    [5, -5, -10, 0, 0, -10, -5, 5],
    [5, 10, 10, -20, -20, 10, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0],
]


def _pst_val(p: str, r: int, c: int) -> float:
    if p.upper() != "P":
        return 0.0
    if p.isupper():
        return _PST_PAWN[r][c] / 100.0
    return -_PST_PAWN[7 - r][c] / 100.0


def _find_king(board: List[List[str]], white: bool) -> Tuple[int, int] | None:
    k = "K" if white else "k"
    for r in range(8):
        for c in range(8):
            if board[r][c] == k:
                return (r, c)
    return None


def _square_attacked(board: List[List[str]], r: int, c: int, by_white: bool) -> bool:
    # used for check detection - would this square be hit by that side?
    # pawn attacks
    dr = -1 if by_white else 1
    for dc in (-1, 1):
        nr, nc = r + dr, c + dc
        if _in_bounds(nr, nc) and board[nr][nc] == ("P" if by_white else "p"):
            return True
    # knights
    for dr, dc in ((-2, -1), (-2, 1), (-1, -2), (-1, 2), (1, -2), (1, 2), (2, -1), (2, 1)):
        nr, nc = r + dr, c + dc
        if _in_bounds(nr, nc) and board[nr][nc].upper() == "N" and _side(board[nr][nc]) == ("W" if by_white else "B"):
            return True
    # king adjacent
    for dr in (-1, 0, 1):
        for dc in (-1, 0, 1):
            if dr == dc == 0:
                continue
            nr, nc = r + dr, c + dc
            if _in_bounds(nr, nc) and board[nr][nc].upper() == "K" and _side(board[nr][nc]) == ("W" if by_white else "B"):
                return True
    # rook / queen slides
    for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        nr, nc = r + dr, c + dc
        while _in_bounds(nr, nc):
            if board[nr][nc] != EMPTY:
                if board[nr][nc].upper() in "RQ" and _side(board[nr][nc]) == ("W" if by_white else "B"):
                    return True
                break
            nr, nc = nr + dr, nc + dc
    for dr, dc in ((-1, -1), (-1, 1), (1, -1), (1, 1)):
        nr, nc = r + dr, c + dc
        while _in_bounds(nr, nc):
            if board[nr][nc] != EMPTY:
                if board[nr][nc].upper() in "BQ" and _side(board[nr][nc]) == ("W" if by_white else "B"):
                    return True
                break
            nr, nc = nr + dr, nc + dc
    return False


def _in_check(board: List[List[str]], white_turn: bool) -> bool:
    kpos = _find_king(board, white_turn)
    if not kpos:
        return False
    return _square_attacked(board, kpos[0], kpos[1], not white_turn)


def chess_move_notation(r0: int, c0: int, r1: int, c1: int) -> str:
    def sq(r: int, c: int) -> str:
        return f"{chr(ord('a') + c)}{8 - r}"

    return f"{sq(r0, c0)}{sq(r1, c1)}"


def _generate_raw_moves(
    board: List[List[str]], white_turn: bool, rights: dict[str, bool]
) -> List[Tuple[int, int, int, int]]:
    # pseudo-legal - might leave king in check, filtered in _legal_moves
    moves = []
    piece = "PNBRQK" if white_turn else "pnbrqk"
    for r in range(8):
        for c in range(8):
            p = board[r][c]
            if p not in piece:
                continue
            pl = p.lower()
            if pl == "p":
                # white goes "up" (row decreases). no en passant yet
                dr = -1 if white_turn else 1
                for dc in (-1, 0, 1):
                    r1, c1 = r + dr, c + dc
                    if not _in_bounds(r1, c1):
                        continue
                    if dc == 0:
                        # straight - need empty
                        if board[r1][c1] != EMPTY:
                            continue
                        moves.append((r, c, r1, c1))
                        # double push from start rank
                        if (r == 6 and white_turn) or (r == 1 and not white_turn):
                            r2 = r + 2 * dr
                            if _in_bounds(r2, c) and board[r2][c] == EMPTY:
                                moves.append((r, c, r2, c))
                    else:
                        # diagonal only if capturing
                        if board[r1][c1] != EMPTY and _side(board[r1][c1]) != ("W" if white_turn else "B"):
                            moves.append((r, c, r1, c1))
            elif pl == "n":
                # L jumps
                for dr, dc in ((-2, -1), (-2, 1), (-1, -2), (-1, 2), (1, -2), (1, 2), (2, -1), (2, 1)):
                    r1, c1 = r + dr, c + dc
                    if _in_bounds(r1, c1) and _side(board[r1][c1]) != ("W" if white_turn else "B"):
                        moves.append((r, c, r1, c1))
            elif pl == "k":
                # one step any dir
                for dr in (-1, 0, 1):
                    for dc in (-1, 0, 1):
                        if dr == dc == 0:
                            continue
                        r1, c1 = r + dr, c + dc
                        if _in_bounds(r1, c1) and _side(board[r1][c1]) != ("W" if white_turn else "B"):
                            moves.append((r, c, r1, c1))
                # castling - rights + empty path + not through/into check. exact rook colour
                if white_turn and r == 7 and c == 4 and not rights["white_king_moved"]:
                    if (
                        not rights["white_rook_h_moved"]
                        and board[7][7] == "R"

                        and board[7][5] == board[7][6] == EMPTY
                        and not _in_check(board, True)
                        and not _square_attacked(board, 7, 5, False)
                        and not _square_attacked(board, 7, 6, False)
                    ):
                        moves.append((7, 4, 7, 6))
                    if (
                        not rights["white_rook_a_moved"]
                        and board[7][0] == "R"
                        and board[7][1] == board[7][2] == board[7][3] == EMPTY
                        and not _in_check(board, True)
                        and not _square_attacked(board, 7, 3, False)
                        and not _square_attacked(board, 7, 2, False)
                    ):
                        moves.append((7, 4, 7, 2))
                if not white_turn and r == 0 and c == 4 and not rights["black_king_moved"]:
                    if (
                        not rights["black_rook_h_moved"]
                        and board[0][7] == "r"
                        and board[0][5] == board[0][6] == EMPTY
                        and not _in_check(board, False)
                        and not _square_attacked(board, 0, 5, True)
                        and not _square_attacked(board, 0, 6, True)
                    ):
                        moves.append((0, 4, 0, 6))
                    if (
                        not rights["black_rook_a_moved"]
                        and board[0][0] == "r"
                        and board[0][1] == board[0][2] == board[0][3] == EMPTY
                        and not _in_check(board, False)
                        and not _square_attacked(board, 0, 3, True)
                        and not _square_attacked(board, 0, 2, True)
                    ):
                        moves.append((0, 4, 0, 2))
            else:
                # rook / bishop / queen - slide until blocked
                dirs = []
                if pl in "rq":
                    dirs += [(-1, 0), (1, 0), (0, -1), (0, 1)]
                if pl in "bq":
                    dirs += [(-1, -1), (-1, 1), (1, -1), (1, 1)]
                for dr, dc in dirs:
                    nr, nc = r + dr, c + dc
                    while _in_bounds(nr, nc):
                        if board[nr][nc] == EMPTY:
                            moves.append((r, c, nr, nc))
                        else:
                            # can capture enemy, then stop
                            if _side(board[nr][nc]) != ("W" if white_turn else "B"):
                                moves.append((r, c, nr, nc))
                            break
                        nr, nc = nr + dr, nc + dc
    return moves


def _apply_move(board: List[List[str]], r0: int, c0: int, r1: int, c1: int, white_turn: bool) -> List[List[str]]:
    b = [list(row) for row in board]
    p = b[r0][c0]
    b[r0][c0] = EMPTY
    # king moved 2 files = castling, drag the rook over
    if p.upper() == "K" and abs(c1 - c0) == 2:
        if c1 == 6:
            b[r0][5], b[r0][7] = b[r0][7], EMPTY
        else:
            b[r0][3], b[r0][0] = b[r0][0], EMPTY
    # always promote to queen (no underpromotion menu)
    if p.upper() == "P" and (r1 == 0 or r1 == 7):
        p = "Q" if white_turn else "q"
    b[r1][c1] = p
    return b


def _legal_moves(
    board: List[List[str]], white_turn: bool, rights: dict[str, bool]
) -> List[Tuple[int, int, int, int]]:
    # drop anything that leaves own king in check
    raw = _generate_raw_moves(board, white_turn, rights)
    legal = []
    for (r0, c0, r1, c1) in raw:
        b2 = _apply_move(board, r0, c0, r1, c1, white_turn)
        if not _in_check(b2, white_turn):
            legal.append((r0, c0, r1, c1))
    return legal


def _evaluate(board: List[List[str]]) -> float:
    # material + pawn pst. white positive so white = maximiser
    score = 0.0
    for r in range(8):
        for c in range(8):
            p = board[r][c]
            if p != EMPTY:
                score += _piece_value(p)
                score += _pst_val(p, r, c)
    return score


def _is_terminal(board: List[List[str]], white_turn: bool, rights: dict[str, bool]) -> bool:
    # no legal moves = checkmate or stalemate (caller figures out which)
    return len(_legal_moves(board, white_turn, rights)) == 0


# keep these low - chess branching is nasty in pure python
DEPTHS = {"hard": 3, "expert": 5}


def _rights_from_state(state: dict) -> dict[str, bool]:
    r = state.get("castling_rights")
    if isinstance(r, dict) and len(r) >= 6:
        return {**_default_castling_rights(), **r}
    return _default_castling_rights()


def _update_castling_rights(
    board: List[List[str]], r0: int, c0: int, r1: int, c1: int, rights: dict[str, bool]
) -> dict[str, bool]:
    out = deepcopy(rights)
    moving = board[r0][c0]
    # piece leaves home square
    if moving == "K" and (r0, c0) == (7, 4):
        out["white_king_moved"] = True
    if moving == "k" and (r0, c0) == (0, 4):
        out["black_king_moved"] = True
    if moving == "R" and (r0, c0) == (7, 0):
        out["white_rook_a_moved"] = True
    if moving == "R" and (r0, c0) == (7, 7):
        out["white_rook_h_moved"] = True
    if moving == "r" and (r0, c0) == (0, 0):
        out["black_rook_a_moved"] = True
    if moving == "r" and (r0, c0) == (0, 7):
        out["black_rook_h_moved"] = True
    if moving == "K" and abs(c1 - c0) == 2:
        if c1 == 6:
            out["white_rook_h_moved"] = True
        else:
            out["white_rook_a_moved"] = True
    if moving == "k" and abs(c1 - c0) == 2:
        if c1 == 6:
            out["black_rook_h_moved"] = True
        else:
            out["black_rook_a_moved"] = True
    # capture on rook starting squares
    for (rr, cc), key in (
        ((7, 0), "white_rook_a_moved"),
        ((7, 7), "white_rook_h_moved"),
        ((0, 0), "black_rook_a_moved"),
        ((0, 7), "black_rook_h_moved"),
    ):
        if (r1, c1) == (rr, cc) and board[r1][c1] != EMPTY:
            out[key] = True
    return out


def chess_get_state(
    board: List[List[str]] | None = None,
    white_turn: bool = True,
    castling_rights: dict[str, bool] | None = None,
) -> dict:
    if board is None:
        board = _initial_board()
    rights = castling_rights if castling_rights is not None else _default_castling_rights()
    in_check = _in_check(board, white_turn)
    terminal = _is_terminal(board, white_turn, rights)
    winner = None
    if terminal:
        winner = "Black" if white_turn else "White" if in_check else "Draw"
    return {
        "board": [list(r) for r in board],
        "whiteTurn": white_turn,
        "inCheck": in_check,
        "gameOver": terminal,
        "winner": winner,
        "castling_rights": {**rights},
    }


def chess_get_moves(state: dict) -> List[Tuple[int, int, int, int]]:
    rights = _rights_from_state(state)
    return _legal_moves(state["board"], state["whiteTurn"], rights)


def chess_apply_move(state: dict, r0: int, c0: int, r1: int, c1: int) -> dict:
    board = state["board"]
    rights = _update_castling_rights(board, r0, c0, r1, c1, _rights_from_state(state))
    new_board = _apply_move(board, r0, c0, r1, c1, state["whiteTurn"])
    return chess_get_state(new_board, not state["whiteTurn"], rights)


def chess_ai_move(state: dict, difficulty: str) -> Tuple[int, int, int, int] | None:
    board, white_turn = state["board"], state["whiteTurn"]
    rights = _rights_from_state(state)
    if difficulty == "easy":
        moves = _legal_moves(board, white_turn, rights)
        return random.choice(moves) if moves else None
    if difficulty == "medium":
        return _greedy_move(board, white_turn, rights)
    depth = DEPTHS.get(difficulty, DEPTHS["hard"])

    def legal_tuple(s: Tuple[List[List[str]], bool, dict[str, bool]]) -> List[Tuple[int, int, int, int]]:
        return _legal_moves(s[0], s[1], s[2])

    def apply_tuple(s: Tuple[List[List[str]], bool, dict[str, bool]], m: Tuple[int, int, int, int]) -> Tuple[List[List[str]], bool, dict[str, bool]]:
        r0, c0, r1, c1 = m
        b, wt, r = s
        new_r = _update_castling_rights(b, r0, c0, r1, c1, r)
        nb = _apply_move(b, r0, c0, r1, c1, wt)
        return (nb, not wt, new_r)

    def is_term(s: Tuple[List[List[str]], bool, dict[str, bool]]) -> bool:
        return _is_terminal(s[0], s[1], s[2])

    def eval_s(s: Tuple[List[List[str]], bool, dict[str, bool]]) -> float:
        return _evaluate(s[0])

    engine = MinimaxEngine(
        max_depth=depth,
        get_actions=legal_tuple,
        apply=apply_tuple,
        is_terminal=is_term,
        evaluate=eval_s,
        is_maximizer_turn=lambda s: s[1],
    )
    tup = (board, white_turn, rights)
    return engine.best_action(tup)


def _greedy_move(
    board: List[List[str]], white_turn: bool, rights: dict[str, bool]
) -> Tuple[int, int, int, int] | None:
    # one ply of the existing eval. white max, black min. random among ties
    moves = _legal_moves(board, white_turn, rights)
    if not moves:
        return None
    scored = []
    for m in moves:
        r0, c0, r1, c1 = m
        nb = _apply_move(board, r0, c0, r1, c1, white_turn)
        scored.append((_evaluate(nb), m))
    best = max(s[0] for s in scored) if white_turn else min(s[0] for s in scored)
    opts = [m for s, m in scored if s == best]
    return random.choice(opts)


def chess_hint_move(state: dict, difficulty: str) -> Tuple[int, int, int, int] | None:
    # same as ai - just exposed for the hint button
    return chess_ai_move(state, difficulty)
