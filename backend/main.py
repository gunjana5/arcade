# fastapi entrypoint - routes only, game rules live in games/
# fastapi entrypoint - routes only, game rules live in games/
# no online multiplayer, just vs ai or friend on same machine
import json
import os
from typing import Any, Optional

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from auth import init_auth, login as auth_login, register as auth_register, user_from_token
from games import (
    get_state as ttt_state,
    apply_move as ttt_apply,
    get_winner as ttt_winner,
    get_ai_move as ttt_ai_move,
    checkers_get_state,
    checkers_get_moves,
    checkers_apply_move,
    checkers_ai_move,
    checkers_move_notation,
    checkers_hint_move,
    chess_get_state,
    chess_get_moves,
    chess_apply_move,
    chess_ai_move,
    chess_move_notation,
    chess_hint_move,
    c4_new_game,
    c4_drop,
    c4_legal_cols,
    c4_ai_move,
    c4_hint,
)
from games.tictactoe import is_draw as ttt_is_draw
from leaderboard import init_leaderboard, record_win, storage_mode, top_scores
from win_check import assert_human_ai_win
from win_check import assert_human_ai_win


def _cors_origins() -> list[str]:
    # always allow local next; CORS_ORIGINS for vercel/etc after deploy
    defaults = ["http://localhost:3000", "http://127.0.0.1:3000"]
    extra = os.getenv("CORS_ORIGINS", "")
    from_env = [o.strip() for o in extra.split(",") if o.strip()]
    # preserve order, drop dupes
    return list(dict.fromkeys(defaults + from_env))


app = FastAPI(title="arcade api")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    # auth sqlite always; leaderboard = mongo if URI set else sqlite (ephemeral on free render)
    init_auth()
    init_leaderboard()


def _bearer_token(authorization: Optional[str]) -> Optional[str]:
    # "Authorization: Bearer <token>" -> just the token bit
    if not authorization:
        return None
    parts = authorization.split(None, 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1]


def _require_user(authorization: Optional[str]) -> str:
    # used by /me and /leaderboard/win - 401 if missing/bad token
    token = _bearer_token(authorization)
    if not token:
        raise HTTPException(401, "missing or invalid Authorization bearer token")
    user = user_from_token(token)
    if not user:
        raise HTTPException(401, "invalid or expired session")
    return user


# auth + leaderboard

class AuthBody(BaseModel):
    username: str
    password: str


class LeaderboardWinBody(BaseModel):
    game: str
    # final board/state - server re-checks human beat ai (see win_check.py)
    state: dict
    username: Optional[str] = None


@app.post("/api/auth/register")
def api_register(body: AuthBody):
    try:
        return auth_register(body.username, body.password)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e


@app.post("/api/auth/login")
def api_login(body: AuthBody):
    try:
        return auth_login(body.username, body.password)
    except ValueError as e:
        raise HTTPException(401, str(e)) from e


@app.get("/api/auth/me")
def api_me(authorization: Optional[str] = Header(default=None)):
    return {"username": _require_user(authorization)}


@app.get("/api/leaderboard")
def leaderboard_top(game: str = "tictactoe", limit: int = 10):
    try:
        return {"game": game, "entries": top_scores(game, limit), "storage": storage_mode()}
    except ValueError as e:
        raise HTTPException(400, str(e)) from e


@app.post("/api/leaderboard/win")
def leaderboard_record_win(
    body: LeaderboardWinBody,
    authorization: Optional[str] = Header(default=None),
):
    # username from the token, not the body
    user = _require_user(authorization)
    if body.username is not None and body.username.strip() and body.username.strip() != user:
        raise HTTPException(403, "username does not match authenticated user")
    try:
        # reject "game name only" / ai-won / incomplete boards
        assert_human_ai_win(body.game, body.state)
        return record_win(user, body.game)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e


# tic tac toe
class TTTMoveBody(BaseModel):
    state: dict
    row: int
    col: int


class TTTAiBody(BaseModel):
    state: dict
    difficulty: str = "medium"


@app.post("/api/tictactoe/state")
def tictactoe_new_state():
    return ttt_state()


@app.post("/api/tictactoe/move")
def tictactoe_move(body: TTTMoveBody):
    # client sends whole state back each time - no server-side game session
    new_state = ttt_apply(body.state, body.row, body.col)
    if new_state is None:
        raise HTTPException(400, "Invalid move")
    winner = ttt_winner(new_state["board"])
    draw = ttt_is_draw(new_state["board"])
    return {"state": new_state, "winner": winner, "draw": draw}


@app.post("/api/tictactoe/ai")
def tictactoe_ai(body: TTTAiBody):
    # difficulty string -> picker inside get_ai_move
    # always return draw like /move so the ui can stop on a full board
    result = ttt_ai_move(body.state, body.difficulty)
    if result is None:
        board = body.state.get("board", [])
        winner = ttt_winner(board)
        return {
            "done": True,
            "state": body.state,
            "winner": winner,
            "draw": ttt_is_draw(board),
        }
    board = result["newState"]["board"]
    winner = ttt_winner(board)
    return {
        "row": result["row"],
        "col": result["col"],
        "newState": result["newState"],
        "winner": winner,
        "draw": ttt_is_draw(board),
    }


# checkers
class CheckersMoveBody(BaseModel):
    state: dict
    move: list


class CheckersAiBody(BaseModel):
    state: dict
    difficulty: str = "medium"


class CheckersHintBody(BaseModel):
    state: dict
    difficulty: str = "medium"


class UndoBody(BaseModel):
    history: list
    pops: int = 1


@app.post("/api/checkers/state")
def checkers_new_state():
    return checkers_get_state()


@app.post("/api/checkers/moves")
def checkers_moves(body: dict):
    # frontend sometimes posts the state alone, sometimes { state: ... }
    state = body if isinstance(body, dict) and "board" in body else body.get("state", body)
    return {"moves": [list(m) for m in checkers_get_moves(state)]}


@app.post("/api/checkers/move")
def checkers_do_move(body: CheckersMoveBody):
    # reject anything that isn't in the legal list (forced jumps etc)
    moves = checkers_get_moves(body.state)
    move_tuples = [tuple(m) for m in body.move]
    if move_tuples not in moves:
        raise HTTPException(400, "Invalid move")
    st = checkers_apply_move(body.state, move_tuples)
    notation = checkers_move_notation(move_tuples)
    return {"state": st, "moveNotation": notation}


@app.post("/api/checkers/ai")
def checkers_ai(body: CheckersAiBody):
    mv = checkers_ai_move(body.state, body.difficulty)
    if mv is None:
        return {"done": True, "state": body.state}
    notation = checkers_move_notation(mv)
    return {"move": [[r, c] for r, c in mv], "newState": checkers_apply_move(body.state, mv), "moveNotation": notation}


@app.post("/api/checkers/hint")
def checkers_hint(body: CheckersHintBody):
    mv = checkers_hint_move(body.state, body.difficulty)
    if mv is None:
        raise HTTPException(400, "No hint available")
    a, b = mv[0], mv[-1]
    return {"from": [a[0], a[1]], "to": [b[0], b[1]]}


@app.post("/api/checkers/undo")
def checkers_undo(body: UndoBody):
    # client keeps the timeline - pick an older snapshot by pops
    # pops=2 vs ai (undo me + them), pops=1 local
    if body.pops not in (1, 2):
        raise HTTPException(400, "Invalid pops")
    if len(body.history) <= body.pops:
        raise HTTPException(400, "History too short")
    return {"state": body.history[len(body.history) - body.pops - 1]}


# chess
class ChessMoveBody(BaseModel):
    state: dict
    r0: int
    c0: int
    r1: int
    c1: int


class ChessAiBody(BaseModel):
    state: dict
    difficulty: str = "medium"


class ChessHintBody(BaseModel):
    state: dict
    difficulty: str = "medium"


@app.post("/api/chess/state")
def chess_new_state():
    return chess_get_state()


@app.post("/api/chess/moves")
def chess_moves(body: dict):
    state = body if isinstance(body, dict) and "board" in body else body.get("state", body)
    return {"moves": [list(m) for m in chess_get_moves(state)]}


@app.post("/api/chess/move")
def chess_do_move(body: ChessMoveBody):
    legal = chess_get_moves(body.state)
    move = (body.r0, body.c0, body.r1, body.c1)
    if move not in legal:
        raise HTTPException(400, "Invalid move")
    notation = chess_move_notation(body.r0, body.c0, body.r1, body.c1)
    return {"state": chess_apply_move(body.state, body.r0, body.c0, body.r1, body.c1), "moveNotation": notation}


@app.post("/api/chess/ai")
def chess_ai(body: ChessAiBody):
    mv = chess_ai_move(body.state, body.difficulty)
    if mv is None:
        return {"done": True, "state": body.state}
    r0, c0, r1, c1 = mv
    notation = chess_move_notation(r0, c0, r1, c1)
    return {"move": [r0, c0, r1, c1], "newState": chess_apply_move(body.state, r0, c0, r1, c1), "moveNotation": notation}


@app.post("/api/chess/hint")
def chess_hint(body: ChessHintBody):
    mv = chess_hint_move(body.state, body.difficulty)
    if mv is None:
        raise HTTPException(400, "No hint available")
    r0, c0, r1, c1 = mv
    return {"from": [r0, c0], "to": [r1, c1]}


@app.post("/api/chess/undo")
def chess_undo(body: UndoBody):
    if body.pops not in (1, 2):
        raise HTTPException(400, "Invalid pops")
    if len(body.history) <= body.pops:
        raise HTTPException(400, "History too short")
    return {"state": body.history[len(body.history) - body.pops - 1]}


# connect 4
class Connect4DropBody(BaseModel):
    state: dict
    col: int


class Connect4AiBody(BaseModel):
    state: dict
    difficulty: str = "medium"


class Connect4HintBody(BaseModel):
    state: dict
    difficulty: str = "medium"


@app.post("/api/connect4/new")
def connect4_new():
    return c4_new_game()


@app.post("/api/connect4/drop")
def connect4_drop(body: Connect4DropBody):
    try:
        return c4_drop(body.state, body.col)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e


@app.post("/api/connect4/ai")
def connect4_ai(body: Connect4AiBody):
    st = c4_ai_move(body.state, body.difficulty)
    if st is None:
        return {"done": True, "state": body.state}
    return st


@app.get("/api/connect4/legal")
def connect4_legal(state: str):
    # state comes as a query string json blob (get-friendly)
    try:
        s: Any = json.loads(state)
    except json.JSONDecodeError as e:
        raise HTTPException(400, "Invalid state JSON") from e
    return {"cols": c4_legal_cols(s)}


@app.post("/api/connect4/hint")
def connect4_hint_ep(body: Connect4HintBody):
    col = c4_hint(body.state, body.difficulty)
    if col is None:
        raise HTTPException(400, "No hint available")
    return {"col": col}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
