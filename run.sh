#!/usr/bin/env bash
# one-shot: spin up api + next then open the browser
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# start backend in background
cd backend
# || true so re-runs don't die if venv/pip already exist
python3 -m venv .venv 2>/dev/null || true
.venv/bin/pip install -q -r requirements.txt 2>/dev/null || true
.venv/bin/python main.py &
BACKEND_PID=$!
cd ..

# start frontend
cd frontend
if [ ! -d node_modules ]; then
  npm install
fi
npm run dev &
FRONT_PID=$!
cd ..

# wait for next to boot then open browser (mac = open, linux = xdg-open)
sleep 5
if command -v open >/dev/null 2>&1; then
  open "http://localhost:3000"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "http://localhost:3000"
fi

echo "Backend PID: $BACKEND_PID  Frontend PID: $FRONT_PID"
echo "arcade: http://localhost:3000"
echo "Press Ctrl+C to stop both."
wait $FRONT_PID $BACKEND_PID 2>/dev/null || true
