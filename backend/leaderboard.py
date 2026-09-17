# win counts per (username, game)
# prefer mongo when MONGODB_URI pings; else sqlite next to USERS_DB
# on free render that sqlite is ephemeral across redeploy - fine for a demo host
# ram only if sqlite can't open. username from the auth token, not free text
from __future__ import annotations

import os
import re
import sqlite3
from pathlib import Path
from typing import Any, Literal

_USERNAME_RE = re.compile(r"^[A-Za-z0-9_\-]{2,20}$")
_ALLOWED_GAMES = {"tictactoe", "connect4", "checkers", "chess"}

StorageKind = Literal["mongodb", "sqlite", "memory"]

# fallbacks when mongo isn't up
_memory: dict[tuple[str, str], int] = {}
_client = None
_collection = None
_storage: StorageKind = "memory"


def _normalize_username(username: str) -> str:
    # shared with auth so leaderboard names match login names
    name = username.strip()
    if not _USERNAME_RE.match(name):
        raise ValueError("username must be 2-20 characters (letters, numbers, _ or -)")
    return name


def _normalize_game(game: str) -> str:
    key = game.strip().lower()
    if key not in _ALLOWED_GAMES:
        raise ValueError(f"game must be one of: {', '.join(sorted(_ALLOWED_GAMES))}")
    return key


def _sqlite_path() -> Path:
    # LEADERBOARD_DB wins; else sit next to the users db
    explicit = os.getenv("LEADERBOARD_DB")
    if explicit:
        return Path(explicit)
    users = Path(os.getenv("USERS_DB", str(Path(__file__).resolve().parent / "users.db")))
    return users.parent / "leaderboard.db"


def _init_sqlite() -> bool:
    # file-backed when mongo is unset / unreachable (still ephemeral on free render)
    global _storage
    try:
        path = _sqlite_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(str(path)) as conn:
            conn.execute(
                """
                create table if not exists leaderboard (
                    username text not null,
                    game text not null,
                    wins integer not null default 0,
                    primary key (username, game)
                )
                """
            )
            conn.execute(
                "create index if not exists idx_leaderboard_game_wins on leaderboard(game, wins desc)"
            )
            conn.commit()
        _storage = "sqlite"
        return True
    except Exception:
        _storage = "memory"
        return False


def _try_mongo(uri: str) -> bool:
    global _client, _collection, _storage
    try:
        from pymongo import MongoClient

        _client = MongoClient(uri, serverSelectionTimeoutMS=2000)
        _client.admin.command("ping")
        db = _client[os.getenv("MONGODB_DB", "cyber_arcade")]
        _collection = db["leaderboard"]
        _collection.create_index([("game", 1), ("wins", -1)])
        _collection.create_index([("username", 1), ("game", 1)], unique=True)
        _storage = "mongodb"
        return True
    except Exception:
        _client = None
        _collection = None
        return False


def init_leaderboard() -> None:
    # mongo only if URI set - don't hang on localhost:27017 in deploy
    global _client, _collection, _storage, _memory
    _memory = {}
    _client = None
    _collection = None
    _storage = "memory"

    uri = (os.getenv("MONGODB_URI") or "").strip()
    if uri and _try_mongo(uri):
        return
    if _init_sqlite():
        return
    _storage = "memory"


def _sqlite_record(user: str, game: str) -> int:
    path = _sqlite_path()
    with sqlite3.connect(str(path)) as conn:
        conn.execute(
            """
            insert into leaderboard (username, game, wins) values (?, ?, 1)
            on conflict(username, game) do update set wins = wins + 1
            """,
            (user, game),
        )
        row = conn.execute(
            "select wins from leaderboard where username = ? and game = ?",
            (user, game),
        ).fetchone()
        conn.commit()
    return int(row[0]) if row else 1


def _sqlite_top(game: str, limit: int) -> list[dict[str, Any]]:
    path = _sqlite_path()
    with sqlite3.connect(str(path)) as conn:
        rows = conn.execute(
            """
            select username, game, wins from leaderboard
            where game = ?
            order by wins desc
            limit ?
            """,
            (game, limit),
        ).fetchall()
    return [{"username": r[0], "game": r[1], "wins": int(r[2])} for r in rows]


def record_win(username: str, game: str) -> dict[str, Any]:
    # +1 win for this user/game
    user = _normalize_username(username)
    g = _normalize_game(game)

    if _storage == "mongodb" and _collection is not None:
        from pymongo import ReturnDocument

        doc = _collection.find_one_and_update(
            {"username": user, "game": g},
            {"$inc": {"wins": 1}},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        return {"username": user, "game": g, "wins": int(doc["wins"]), "storage": "mongodb"}

    if _storage == "sqlite":
        wins = _sqlite_record(user, g)
        return {"username": user, "game": g, "wins": wins, "storage": "sqlite"}

    key = (user, g)
    _memory[key] = _memory.get(key, 0) + 1
    return {"username": user, "game": g, "wins": _memory[key], "storage": "memory"}


def top_scores(game: str, limit: int = 10) -> list[dict[str, Any]]:
    # highest wins first
    g = _normalize_game(game)
    limit = max(1, min(limit, 50))

    if _storage == "mongodb" and _collection is not None:
        cursor = _collection.find({"game": g}).sort("wins", -1).limit(limit)
        return [{"username": d["username"], "game": d["game"], "wins": int(d["wins"])} for d in cursor]

    if _storage == "sqlite":
        return _sqlite_top(g, limit)

    rows = [
        {"username": user, "game": game_key, "wins": wins}
        for (user, game_key), wins in _memory.items()
        if game_key == g
    ]
    rows.sort(key=lambda r: r["wins"], reverse=True)
    return rows[:limit]


def storage_mode() -> str:
    # ui shows MEMORY / SQLITE / MONGODB
    return _storage
