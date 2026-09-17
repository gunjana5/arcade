# cyber arcade

## what it is

Four board games in the browser - tic tac toe, connect four, checkers, chess - vs AI or local two-player on one keyboard. Easy is a random legal move. Medium to expert is minimax search depth (alpha-beta). Register if you want AI wins on the leaderboard. No online matchmaking.

Shared search across four rule sets, sqlite auth, and a leaderboard that re-checks the final board. Not a games platform.

Live: [https://cyber-arcade1.vercel.app](https://cyber-arcade1.vercel.app)

## layout

```
cyber-arcade/
  README.md
  run.sh                    # api + next together
  render.yaml               # free Render api (ephemeral disk)
  backend/                  # FastAPI, rules, ai
    ai/minimax.py           # shared MinimaxEngine
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
export MONGODB_DB="cyber_arcade"
```

Local CORS always allows `localhost:3000` / `127.0.0.1:3000`. Live site is `https://cyber-arcade1.vercel.app` - the API needs that in `CORS_ORIGINS` when it is not running locally.

## stack

Next.js 14 · Tailwind · Framer Motion · FastAPI · shared minimax + alpha-beta · sqlite auth · leaderboard mongo/sqlite/memory · pytest

## how its wired

```
browser
  -> Next.js pages (board state in useState)
  -> fetch JSON (frontend/lib/api.ts)
  -> FastAPI (backend/main.py)
  -> game modules + MinimaxEngine
  -> leaderboard.py (mongo / sqlite / memory)
```

Client posts the whole board back each move - no server-side match sessions. Auth is bearer tokens over sqlite. A leaderboard win needs a login and a final board the server agrees is a human win vs the AI (`win_check.py`).

## whats interesting

- one `MinimaxEngine` - each game plugs in legal moves, apply, terminal check, evaluate, whose turn
- easy = random legal move (still respects forced jumps in checkers); medium+ is depth. ttt hard/expert = depth 9 (full tree from opening, solved). chess expert caps at 4 - branching in pure python, not Stockfish
- per-game heuristics (material / threats / centre bias) sit in the game modules, not the engine
- leaderboard does not trust a bare game name - server recomputes the terminal human win from the board, with light piece-count / turn parity on ttt and connect4
- hard/expert UI notes that deeper search means slower moves - latency is the search, not the framework

## limitations

- not online multiplayer - two-player is the same keyboard
- chess has castling, no en passant; expert depth 4 is playable, not strong
- no server match log - a crafted terminal human-win board can still be posted
- free Render api disk is ephemeral - sqlite can wipe on redeploy. demo host, not a durable store
- no quiescence / transposition tables - deep chess gets slow before it gets smart

## tests

```bash
cd backend && .venv/bin/pytest -q
```

Install first if needed: `.venv/bin/pip install -r requirements.txt`

## demo

Live: [https://cyber-arcade1.vercel.app](https://cyber-arcade1.vercel.app)

Local: `./run.sh` then http://localhost:3000

Home grid: tictactoe, connect4, checkers, chess.
