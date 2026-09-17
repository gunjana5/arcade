# arcade

## what it is

Four board games in the browser - tic tac toe, connect four, checkers, chess - vs AI or local two-player on one keyboard. Easy is a random legal move. Medium looks one move ahead (win/block or greedy). Hard and expert share one minimax engine; expert is deeper. Register if you want AI wins on the leaderboard. No online matchmaking.

Jul 2025 - Aug 2026. Not a games platform.

Live: [https://play-in-my-arcade.vercel.app](https://play-in-my-arcade.vercel.app)

## layout

```
arcade/
  README.md
  run.sh                    # api + next together
  render.yaml               # free Render api (ephemeral disk)
  backend/                  # FastAPI, rules, ai
    ai/minimax.py           # shared MinimaxEngine (hard/expert only)
    games/                  # ttt / connect4 / checkers / chess
    auth.py                 # sqlite users + bearer sessions
    leaderboard.py          # mongo if it pings, else sqlite, else ram
    win_check.py            # re-check board before recording a win
    tests/
  frontend/                 # Next.js
    app/                    # pages
    components/games/
```

## quick start

```bash
./run.sh
```

FastAPI on :8000, Next on :3000, tries to open the browser.

### manual

backend:

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python main.py
```

frontend (new terminal):

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. If the API is not on `http://localhost:8000`, set `NEXT_PUBLIC_API_URL`.

Optional Mongo for the leaderboard (otherwise sqlite next to `users.db`):

```bash
export MONGODB_URI="mongodb://localhost:27017"
export MONGODB_DB="arcade"
```

Local CORS always allows `localhost:3000` / `127.0.0.1:3000`. Live site is `https://play-in-my-arcade.vercel.app` - that URL must be in `CORS_ORIGINS` on the API.

## stack

Next.js 14 · Tailwind · Framer Motion · FastAPI · sqlite auth · leaderboard mongo/sqlite/memory · pytest

AI: four methods. easy = random. medium = one look. hard/expert = shared minimax + alpha-beta (`backend/ai/minimax.py`)

## how its wired

```
browser
  -> Next.js pages (board state in useState)
  -> fetch JSON (frontend/lib/api.ts)
  -> FastAPI (backend/main.py)
  -> game modules (easy/medium pickers, or MinimaxEngine on hard/expert)
  -> leaderboard.py (mongo / sqlite / memory)
```

Client posts the whole board back each move - no server-side match sessions. Auth is bearer tokens over sqlite. A leaderboard win needs a login and a final board the server agrees is a human win vs the AI (`win_check.py`).

## whats interesting

- four methods, not a depth slider: easy random; medium one look; hard/expert the same engine at different depths
- one `MinimaxEngine` - each game plugs in legal moves, apply, terminal check, evaluate, whose turn. easy and medium never call it
- ttt expert = depth 9 (full tree from opening, should not lose). chess expert = depth 5 - branching in pure python, slow on purpose, not Stockfish
- leaderboard does not trust a bare game name - server recomputes the terminal human win from the board, with light piece-count / turn parity on ttt and connect4
- hard/expert UI notes that search takes longer. that line is not on easy or medium

## limitations

- not online multiplayer - two-player is the same keyboard
- easy is random so it can blunder a win. medium does not look ahead
- chess has castling, no en passant; expert depth 5 is playable, not strong
- no server match log - a crafted terminal human-win board can still be posted
- free Render api disk is ephemeral - sqlite can wipe on redeploy. demo host, not a durable store
- no quiescence / transposition tables

## tests

```bash
cd backend && .venv/bin/pytest -q
```

Install first if needed: `.venv/bin/pip install -r requirements.txt`

## demo

Live: [https://play-in-my-arcade.vercel.app](https://play-in-my-arcade.vercel.app)

Local: `./run.sh` then http://localhost:3000

Home grid: tictactoe, connect4, checkers, chess.
