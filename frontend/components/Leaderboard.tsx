"use client";

// Leaderboard.tsx - high-score board + login bar
// free-text username spoofing removed when signed in
import { useCallback, useEffect, useState } from "react";
import { ArcadeTip } from "@/components/ArcadeTip";
import { fetchLeaderboard, recordLeaderboardWin, type LeaderboardEntry } from "@/lib/api";
import { clearToken, getToken, login, me, register } from "@/lib/auth";

const GAMES = [
  { id: "tictactoe", label: "tic tac toe" },
  { id: "connect4", label: "connect 4" },
  { id: "checkers", label: "checkers" },
  { id: "chess", label: "chess" },
] as const;

function AuthBar({
  username,
  onAuth,
  onLogout,
}: {
  username: string | null;
  onAuth: (name: string) => void;
  onLogout: () => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (username) {
    return (
      <div className="flex flex-wrap items-center gap-3 border-2 border-neon-cyan/50 bg-bg-void px-4 py-3 mb-6">
        <span className="font-vt text-xl text-fg">
          signed in: <span className="text-neon-cyan font-press text-xs">{username}</span>
        </span>
        <button type="button" onClick={onLogout} className="btn-neon btn-neon-pink ml-auto text-lg">
          LOG OUT
        </button>
      </div>
    );
  }

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const fn = mode === "login" ? login : register;
      const session = await fn(user.trim(), pass);
      onAuth(session.username);
      setPass("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "auth failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-2 border-neon-purple/50 bg-bg-void px-4 py-4 mb-6 space-y-3">
      <div className="flex items-center gap-3">
        <p className="font-press text-[0.65rem] text-neon-purple tracking-widest inline-flex items-center" style={{ textShadow: "var(--glow-purple)" }}>
          LOGIN
          <ArcadeTip text="register or login so leaderboard wins use your name - guest can still play without it" />
        </p>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`font-vt text-lg px-2 py-1 border-2 ${
              mode === "login" ? "border-neon-cyan text-neon-cyan" : "border-bg-border text-secondary"
            }`}
          >
            LOGIN
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`font-vt text-lg px-2 py-1 border-2 ${
              mode === "register" ? "border-neon-pink text-neon-pink" : "border-bg-border text-secondary"
            }`}
          >
            REGISTER
          </button>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          placeholder="USERNAME"
          maxLength={20}
          className="flex-1 border-2 border-bg-border bg-bg-void px-3 py-2 text-xl font-vt text-fg uppercase tracking-wide focus:outline-none focus:border-neon-cyan"
        />
        <input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          placeholder="PASSWORD"
          className="flex-1 border-2 border-bg-border bg-bg-void px-3 py-2 text-xl font-vt text-fg focus:outline-none focus:border-neon-pink"
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="btn-neon btn-neon-cyan disabled:opacity-50"
        >
          {busy ? "..." : mode === "login" ? "ENTER" : "CREATE"}
        </button>
      </div>
      {error && <p className="text-neon-pink text-lg font-vt">{error}</p>}
    </div>
  );
}

export function Leaderboard() {
  const [game, setGame] = useState<string>("tictactoe");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [storage, setStorage] = useState<string>(""); // memory | sqlite | mongodb
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    // restore session if token still in localStorage
    if (!getToken()) return;
    me().then((u) => setUsername(u?.username ?? null));
  }, []);

  const load = useCallback(async () => {
    // top scores for the selected game
    try {
      setError(null);
      const res = await fetchLeaderboard(game, 10);
      setEntries(res.entries);
      setStorage(res.storage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to load leaderboard");
      setEntries([]);
    }
  }, [game]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2
            className="font-press text-sm sm:text-base text-neon-pink tracking-widest inline-flex items-center"
            style={{ textShadow: "var(--glow-pink)" }}
          >
            HIGH SCORES
            <ArcadeTip text="wins vs ai only - log in so the username sticks to the score row" />
          </h2>
          <p className="text-xl text-muted font-vt mt-2">
            TOP AI WINS{storage ? ` · ${storage.toUpperCase()}` : ""}
          </p>
        </div>
        <select
          value={game}
          onChange={(e) => setGame(e.target.value)}
          className="border-2 border-neon-cyan/60 bg-bg-void px-3 py-2 text-xl font-vt text-neon-cyan uppercase focus:outline-none rounded-lg"
        >
          {GAMES.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </div>

      <AuthBar
        username={username}
        onAuth={(name) => {
          setUsername(name);
          load();
        }}
        onLogout={() => {
          clearToken();
          setUsername(null);
        }}
      />

      {error && <p className="text-neon-pink text-xl font-vt mb-4">{error}</p>}

      {entries.length === 0 ? (
        <p className="text-secondary font-vt text-xl">NO SCORES YET - CREATE AN ACCOUNT AND WIN VS AI</p>
      ) : (
        <ol className="space-y-2">
          {entries.map((row, i) => (
            <li
              key={`${row.username}-${row.game}`}
              className="flex items-center justify-between border-2 border-bg-border bg-bg-void px-4 py-2 hover:border-neon-cyan/50 transition-colors"
            >
              <span className="font-vt text-2xl text-fg uppercase">
                <span className="text-neon-cyan mr-3 font-press text-xs">#{i + 1}</span>
                {row.username}
              </span>
              <span className="font-press text-xs text-neon-green">{row.wins} W</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

type RecordWinPromptProps = {
  game: string;
  state: object;
  visible: boolean;
  onDone: () => void;
};

export function RecordWinPrompt({ game, state, visible, onDone }: RecordWinPromptProps) {
  // pops up after an ai win - save to leaderboard or skip
  const [username, setUsername] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const [regUser, setRegUser] = useState("");
  const [regPass, setRegPass] = useState("");

  useEffect(() => {
    if (!visible) return;
    setStatus("idle");
    setMessage("");
    setRegUser("");
    setRegPass("");
    if (!getToken()) {
      setUsername(null);
      return;
    }
    me().then((u) => setUsername(u?.username ?? null));
  }, [visible]);

  if (!visible) return null;

  const saveWin = async () => {
    setStatus("saving");
    try {
      await recordLeaderboardWin(game, state);
      setStatus("saved");
      setMessage("SAVED TO LEADERBOARD");
      setTimeout(onDone, 1200);
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "could not save");
    }
  };

  const createAndSave = async () => {
    setStatus("saving");
    setMessage("");
    try {
      const session = await register(regUser.trim(), regPass);
      setUsername(session.username);
      await recordLeaderboardWin(game, state, session.username);
      setStatus("saved");
      setMessage("ACCOUNT CREATED · WIN SAVED");
      setTimeout(onDone, 1200);
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "could not create account");
    }
  };

  return (
    <div className="mt-4 w-full max-w-sm border-4 border-neon-green bg-bg-void p-4 space-y-3" style={{ boxShadow: "var(--glow-green)" }}>
      {username ? (
        <>
          <p className="font-vt text-xl text-neon-green">
            PLAYER <span className="font-press text-[0.6rem] text-neon-cyan">{username}</span>
            {" - "}SAVE THIS WIN?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => saveWin()}
              disabled={status === "saving"}
              className="btn-neon btn-neon-cyan flex-1 disabled:opacity-50"
            >
              {status === "saving" ? "..." : "SAVE WIN"}
            </button>
            <button type="button" onClick={onDone} className="btn-neon btn-neon-pink">
              SKIP
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="font-vt text-xl text-neon-green">CREATE ACCOUNT TO SAVE THIS WIN</p>
          <input
            type="text"
            value={regUser}
            onChange={(e) => setRegUser(e.target.value)}
            placeholder="USERNAME"
            maxLength={20}
            className="w-full border-2 border-bg-border bg-bg-void px-3 py-2 text-xl font-vt text-fg uppercase focus:outline-none focus:border-neon-cyan"
          />
          <input
            type="password"
            value={regPass}
            onChange={(e) => setRegPass(e.target.value)}
            placeholder="PASSWORD"
            className="w-full border-2 border-bg-border bg-bg-void px-3 py-2 text-xl font-vt text-fg focus:outline-none focus:border-neon-pink"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={createAndSave}
              disabled={status === "saving"}
              className="btn-neon btn-neon-cyan flex-1 disabled:opacity-50"
            >
              {status === "saving" ? "..." : "CREATE & SAVE"}
            </button>
            <button type="button" onClick={onDone} className="btn-neon btn-neon-pink">
              SKIP
            </button>
          </div>
        </>
      )}
      {message && (
        <p className={`text-lg font-vt ${status === "error" ? "text-neon-pink" : "text-neon-cyan"}`}>{message}</p>
      )}
    </div>
  );
}
