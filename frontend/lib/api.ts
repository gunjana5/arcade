// thin wrappers around the fastapi routes
// set NEXT_PUBLIC_API_URL when front + api are on different hosts
import { getToken } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function authHeaders(): Record<string, string> {
  // only attach bearer when a token is in localStorage
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  // shared fetch - throw if not ok so callers can catch
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    // always json body unless the caller overrides
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// tic tac toe
export async function tttNewState() {
  return fetchJson<{ board: string[][]; currentPlayer: string }>("/api/tictactoe/state", { method: "POST" });
}
export async function tttMove(state: object, row: number, col: number) {
  return fetchJson<{ state: object; winner: string | null; draw: boolean }>("/api/tictactoe/move", {
    method: "POST",
    body: JSON.stringify({ state, row, col }),
  });
}
export async function tttAi(state: object, difficulty: string) {
  return fetchJson<{
    row?: number;
    col?: number;
    newState?: object;
    state?: object;
    winner?: string | null;
    draw?: boolean;
    done?: boolean;
  }>("/api/tictactoe/ai", {
    method: "POST",
    body: JSON.stringify({ state, difficulty }),
  });
}

// checkers - moves are paths of [r,c] for multi-jumps
export async function checkersNewState() {
  return fetchJson<{ board: string[][]; blackTurn: boolean; gameOver: boolean; winner: string | null }>("/api/checkers/state", { method: "POST" });
}
export async function checkersMoves(state: object) {
  return fetchJson<{ moves: number[][][] }>("/api/checkers/moves", { method: "POST", body: JSON.stringify(state) });
}
export async function checkersMove(state: object, move: number[][]) {
  return fetchJson<{ state: object; moveNotation: string }>("/api/checkers/move", { method: "POST", body: JSON.stringify({ state, move }) });
}
export async function checkersAi(state: object, difficulty: string) {
  return fetchJson<{ move?: number[][]; newState?: object; done?: boolean; moveNotation?: string }>("/api/checkers/ai", {
    method: "POST",
    body: JSON.stringify({ state, difficulty }),
  });
}
export async function checkersHint(state: object, difficulty: string) {
  return fetchJson<{ from: [number, number]; to: [number, number] }>("/api/checkers/hint", {
    method: "POST",
    body: JSON.stringify({ state, difficulty }),
  });
}
export async function checkersUndo(history: object[], pops: number) {
  return fetchJson<{ state: object }>("/api/checkers/undo", {
    method: "POST",
    body: JSON.stringify({ history, pops }),
  });
}

// chess - moves are flat [r0,c0,r1,c1]
export async function chessNewState() {
  return fetchJson<{ board: string[][]; whiteTurn: boolean; inCheck: boolean; gameOver: boolean; winner: string | null; castling_rights?: object }>("/api/chess/state", { method: "POST" });
}
export async function chessMoves(state: object) {
  return fetchJson<{ moves: number[][] }>("/api/chess/moves", { method: "POST", body: JSON.stringify(state) });
}
export async function chessMove(state: object, r0: number, c0: number, r1: number, c1: number) {
  return fetchJson<{ state: object; moveNotation: string }>("/api/chess/move", {
    method: "POST",
    body: JSON.stringify({ state, r0, c0, r1, c1 }),
  });
}
export async function chessAi(state: object, difficulty: string) {
  return fetchJson<{ move?: number[]; newState?: object; done?: boolean; moveNotation?: string }>("/api/chess/ai", {
    method: "POST",
    body: JSON.stringify({ state, difficulty }),
  });
}
export async function chessHint(state: object, difficulty: string) {
  return fetchJson<{ from: [number, number]; to: [number, number] }>("/api/chess/hint", {
    method: "POST",
    body: JSON.stringify({ state, difficulty }),
  });
}
export async function chessUndo(history: object[], pops: number) {
  return fetchJson<{ state: object }>("/api/chess/undo", {
    method: "POST",
    body: JSON.stringify({ history, pops }),
  });
}

// connect 4
export type Connect4State = {
  board: string[][];
  currentPlayer: string;
  winner: string | null;
  isDraw: boolean;
  gameOver: boolean;
  lastCol: number | null;
};

export async function c4New() {
  return fetchJson<Connect4State>("/api/connect4/new", { method: "POST", body: JSON.stringify({}) });
}
export async function c4Drop(state: object, col: number) {
  return fetchJson<Connect4State>("/api/connect4/drop", {
    method: "POST",
    body: JSON.stringify({ state, col }),
  });
}
export async function c4Ai(state: object, difficulty: string) {
  return fetchJson<Connect4State & { done?: boolean }>("/api/connect4/ai", {
    method: "POST",
    body: JSON.stringify({ state, difficulty }),
  });
}
export async function c4Hint(state: object, difficulty: string) {
  return fetchJson<{ col: number }>("/api/connect4/hint", {
    method: "POST",
    body: JSON.stringify({ state, difficulty }),
  });
}

// leaderboard
export type LeaderboardEntry = { username: string; game: string; wins: number };

export async function fetchLeaderboard(game: string, limit = 10) {
  return fetchJson<{ game: string; entries: LeaderboardEntry[]; storage: string }>(
    `/api/leaderboard?game=${encodeURIComponent(game)}&limit=${limit}`
  );
}

export async function recordLeaderboardWin(
  game: string,
  state: object,
  username?: string
) {
  // needs bearer + final board - server re-checks human beat ai
  const body: { game: string; state: object; username?: string } = { game, state };
  if (username) body.username = username;
  return fetchJson<{ username: string; game: string; wins: number }>("/api/leaderboard/win", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
}
