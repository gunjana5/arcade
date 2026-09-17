# register / login / sessions in sqlite
# leaderboard win needs a bearer token from here
from __future__ import annotations

import hashlib
import os
import secrets
import sqlite3
from pathlib import Path
from typing import Any

# same username rules as leaderboard so names stay consistent
from leaderboard import _normalize_username

_DEFAULT_DB = Path(__file__).resolve().parent / "users.db"
PBKDF2_ITERATIONS = 120_000  # slows brute force a bit


def _db_path() -> Path:
    # override with USERS_DB env if you want
    return Path(os.getenv("USERS_DB", str(_DEFAULT_DB)))


def _connect() -> sqlite3.Connection:
    # check_same_thread=False cos fastapi can hit this from different workers
    conn = sqlite3.connect(str(_db_path()), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_auth() -> None:
    # create users + sessions tables if missing
    path = _db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with _connect() as conn:
        conn.execute(
            """
            create table if not exists users (
                id integer primary key autoincrement,
                username text not null unique,
                password_hash text not null,
                salt text not null
            )
            """
        )
        conn.execute(
            """
            create table if not exists sessions (
                token_hash text primary key,
                username text not null,
                created_at text not null default (datetime('now'))
            )
            """
        )
        conn.commit()


def _hash_password(password: str, salt: bytes) -> str:
    # never store plain passwords
    return hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PBKDF2_ITERATIONS,
    ).hex()


def _hash_token(token: str) -> str:
    # store hash only - raw bearer token never lands in sqlite
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _issue_token(conn: sqlite3.Connection, username: str) -> str:
    # random token to client, hash in db
    token = secrets.token_urlsafe(32)
    conn.execute(
        "insert into sessions (token_hash, username) values (?, ?)",
        (_hash_token(token), username),
    )
    return token


def register(username: str, password: str) -> dict[str, Any]:
    # create user + issue first session token in one go
    user = _normalize_username(username)
    if not password or len(password) < 4:
        raise ValueError("password must be at least 4 characters")
    salt = secrets.token_bytes(16)
    pw_hash = _hash_password(password, salt)
    with _connect() as conn:
        try:
            conn.execute(
                "insert into users (username, password_hash, salt) values (?, ?, ?)",
                (user, pw_hash, salt.hex()),
            )
        except sqlite3.IntegrityError as e:
            raise ValueError("username already taken") from e
        token = _issue_token(conn, user)
        conn.commit()
    return {"token": token, "username": user}


def login(username: str, password: str) -> dict[str, Any]:
    # re-hash with stored salt and compare
    user = _normalize_username(username)
    with _connect() as conn:
        row = conn.execute(
            "select username, password_hash, salt from users where username = ?",
            (user,),
        ).fetchone()
        if row is None:
            # same message either way so you can't fish for usernames
            raise ValueError("invalid username or password")
        salt = bytes.fromhex(row["salt"])
        expected = row["password_hash"]
        # compare_digest = constant time against timing attacks
        if not secrets.compare_digest(_hash_password(password, salt), expected):
            raise ValueError("invalid username or password")
        # new token every login (old ones still work until wiped - no expiry yet)
        token = _issue_token(conn, row["username"])
        conn.commit()
    return {"token": token, "username": row["username"]}


def user_from_token(token: str | None) -> str | None:
    # look up session by hash of the bearer string
    if not token:
        return None
    token = token.strip()
    if not token:
        return None
    with _connect() as conn:
        row = conn.execute(
            "select username from sessions where token_hash = ?",
            (_hash_token(token),),
        ).fetchone()
    return row["username"] if row else None
