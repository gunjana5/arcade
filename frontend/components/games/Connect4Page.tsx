"use client";

// connect 4 ui - click a column to drop. i'm pink, ai is orange
import { useState, useCallback, useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { ControlPanel, GameMode } from "../ControlPanel";
import { GameLayout } from "../GameLayout";
import { c4New, c4Drop, c4Ai, c4Hint, Connect4State } from "@/lib/api";
import { Confetti } from "../Confetti";
import { VictoryBanner } from "../VictoryBanner";
import { ThinkingIndicator } from "../ThinkingIndicator";
import { RecordWinPrompt } from "../Leaderboard";
import { useGameStats } from "@/lib/useGameStats";

const AI_DELAY_MS = 1000;
const ROWS = 6;
const COLS = 7;

const HOW_TO_PLAY = (
  <>
    <p>four in a row any direction</p>
    <p>tap the column control or a cell in that column</p>
    <p>you are pink, ai is orange; in local mode turns alternate</p>
  </>
);

function findLandingRow(board: string[][], col: number): number {
  // where the piece visually lands (for the drop animation)
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] !== " ") return r;
  }
  return 0;
}

function findWinningFour(board: string[][], piece: string): [number, number][] | null {
  // highlight the winning 4 on the board
  // walk every cell + direction until a run of exactly four shows up
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== piece) continue;
      for (const [dr, dc] of dirs) {
        const cells: [number, number][] = [[r, c]];
        for (let k = 1; k < 4; k++) {
          const nr = r + dr * k;
          const nc = c + dc * k;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || board[nr][nc] !== piece) break;
          cells.push([nr, nc]);
        }
        if (cells.length === 4) return cells;
      }
    }
  }
  return null;
}

export function Connect4Page() {
  const { stats, recordWin, recordLoss, recordDraw, resetStats } = useGameStats("connect4");
  const [mode, setMode] = useState<GameMode>("ai");
  const [difficulty, setDifficulty] = useState("medium");
  const [state, setState] = useState<Connect4State | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showLeaderboardPrompt, setShowLeaderboardPrompt] = useState(false);
  // dropping = which cell is mid fall-animation
  const [dropping, setDropping] = useState<{ r: number; c: number } | null>(null);
  const [hint, setHint] = useState<{ col?: number } | null>(null);
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statsRecorded = useRef(false);

  const clearHintTimer = useCallback(() => {
    if (hintTimer.current) {
      clearTimeout(hintTimer.current);
      hintTimer.current = null;
    }
  }, []);

  const init = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await c4New();
      setState(s);
      setShowConfetti(false);
      setShowLeaderboardPrompt(false);
      setAiThinking(false);
      setDropping(null);
      setHint(null);
      setHoverCol(null);
      clearHintTimer();
      statsRecorded.current = false;
    } catch (e) {
      console.error(e);
      setError("api down - can't start a new game");
    } finally {
      setLoading(false);
    }
  }, [clearHintTimer]);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    // record local stats once when the game ends (ai mode only)
    if (!state?.gameOver || statsRecorded.current) return;
    if (mode !== "ai") return;
    statsRecorded.current = true;
    if (state.isDraw || state.winner === "Draw") recordDraw();
    else if (state.winner === "R") {
      recordWin();
      setShowLeaderboardPrompt(true);
    } else if (state.winner === "Y") recordLoss();
  }, [state?.gameOver, state?.winner, state?.isDraw, mode, recordWin, recordLoss, recordDraw]);

  const runAi = useCallback(
    async (st: Connect4State) => {
      setAiThinking(true);
      try {
        await new Promise((r) => setTimeout(r, AI_DELAY_MS)); // same fake think as ttt
        const aiRes = await c4Ai(st, difficulty);
        if (aiRes.done) return; // no move / already over
        setState(aiRes);
        // kick the drop animation on the col the ai picked
        if (aiRes.lastCol != null) {
          const row = findLandingRow(aiRes.board, aiRes.lastCol);
          setDropping({ r: row, c: aiRes.lastCol });
        }
        if (aiRes.gameOver) setShowConfetti(true);
      } catch (e) {
        console.error(e);
        setError("ai move failed - is the api up?");
      } finally {
        setAiThinking(false);
      }
    },
    [difficulty]
  );

  const handleColumn = useCallback(
    async (col: number) => {
      if (!state || state.gameOver || loading) return;
      // vs ai i only drop red
      if (mode === "ai" && state.currentPlayer !== "R") return;
      setLoading(true);
      setError(null);
      clearHintTimer();
      setHint(null); // clear old hint highlight
      try {
        const next = await c4Drop(state, col);
        setState(next);
        // animate my piece falling too
        if (next.lastCol != null) {
          const row = findLandingRow(next.board, next.lastCol);
          setDropping({ r: row, c: next.lastCol });
        }
        if (next.gameOver) {
          setShowConfetti(true);
        }

        // yellow's turn -> ai
        if (!next.gameOver && mode === "ai" && next.currentPlayer === "Y") {
          await runAi(next);
        }
      } catch (e) {
        console.error(e); // column full etc
        setError("drop failed - is the api up?");
      } finally {
        setLoading(false);
      }
    },
    [state, loading, mode, runAi, clearHintTimer]
  );

  const handleHint = useCallback(async () => {
    if (!state || state.gameOver || loading || hint != null) return;
    setError(null);
    try {
      // backend just runs a shallow ai and returns the col
      const h = await c4Hint(state, difficulty);
      setHint({ col: h.col });
      clearHintTimer();
      // fade the hint after 3s so it doesn't stick forever
      hintTimer.current = setTimeout(() => setHint(null), 3000);
    } catch (e) {
      console.error(e);
      setError("hint failed - is the api up?");
    }
  }, [state, loading, hint, difficulty, clearHintTimer]);

  useEffect(() => () => clearHintTimer(), [clearHintTimer]);

  if (!state) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="font-vt text-2xl text-neon-cyan">LOADING...</div>
        {error && <p className="font-vt text-lg text-neon-pink">{error}</p>}
      </div>
    );
  }

  const bannerText =
    state.isDraw || state.winner === "Draw"
      ? "draw"
      : state.winner === "R"
        ? "you win"
        : state.winner === "Y"
          ? "they win"
          : "";

  const bannerVariant: "win" | "lose" | "draw" =
    state.isDraw || state.winner === "Draw" ? "draw" : state.winner === "R" ? "win" : "lose";

  // which cells to pulse green after a win
  // which cells to pulse green after a win
  const winCells = new Set<string>();
  if (state.gameOver && state.winner && state.winner !== "Draw" && !state.isDraw) {
    const w = state.winner === "R" || state.winner === "Y" ? state.winner : null;
    if (w) {
      const line = findWinningFour(state.board, w);
      line?.forEach(([r, c]) => winCells.add(`${r},${c}`));
    }
  }

  return (
    <GameLayout
      title="connect 4"
      howToPlay={HOW_TO_PLAY}
      sidePanel={
        <ControlPanel
          mode={mode}
          difficulty={difficulty}
          onModeChange={setMode}
          onDifficultyChange={setDifficulty}
          onRestart={init}
          onHint={mode === "ai" ? handleHint : null}
          canHint={mode === "ai" && !loading && !aiThinking && hint == null && !state.gameOver && state.currentPlayer === "R"}
          stats={stats}
          onResetStats={resetStats}
        />
      }
    >
      <div className="flex flex-col items-center w-full max-w-full overflow-hidden">
        <ThinkingIndicator isThinking={aiThinking} />
        <p className="font-vt text-2xl mb-2 text-center tracking-widest">
          {state.gameOver && state.winner && state.winner !== "Draw" && !state.isDraw ? (
            <span
              className={state.winner === "R" ? "text-neon-pink" : "text-neon-orange"}
              style={{ textShadow: state.winner === "R" ? "var(--glow-pink)" : "var(--glow-orange)" }}
            >
              {state.winner === "R" ? "PINK" : "ORANGE"} WINS
            </span>
          ) : state.isDraw || state.winner === "Draw" ? (
            <span className="text-neon-orange">DRAW</span>
          ) : (
            <>
              <span
                className={state.currentPlayer === "R" ? "text-neon-pink" : "text-neon-orange"}
                style={{ textShadow: state.currentPlayer === "R" ? "var(--glow-pink)" : "var(--glow-orange)" }}
              >
                {state.currentPlayer === "R" ? "PINK" : "ORANGE"}
              </span>{" "}
              <span className="text-subtle">GOES</span>
            </>
          )}
        </p>
        {hint && <p className="font-vt text-lg text-neon-cyan mb-2">HINT USED</p>}
        <div className="relative w-fit mx-auto border-4 border-neon-cyan bg-bg-void p-2" style={{ boxShadow: "var(--glow-cyan)" }}>
          <div className="flex gap-1 justify-center">
            {Array.from({ length: COLS }).map((_, c) => {
              const turnHover =
                state.currentPlayer === "R" ? "bg-neon-pink/10" : "bg-neon-orange/10";
              const arrowColour =
                state.currentPlayer === "R" ? "text-neon-pink" : "text-neon-orange";
              return (
              <div
                key={c}
                className={`flex flex-col items-stretch gap-1 rounded-lg transition-colors duration-150 ${
                  hoverCol === c ? turnHover : ""
                }`}
                onMouseEnter={() => setHoverCol(c)}
                onMouseLeave={() => setHoverCol(null)}
              >
                <button
                  type="button"
                  className={`h-8 w-9 sm:w-10 md:w-12 flex items-center justify-center ${arrowColour} transition-transform duration-150 hover:-translate-y-0.5 cursor-pointer disabled:opacity-40`}
                  onClick={() => handleColumn(c)}
                  disabled={loading || aiThinking || state.gameOver || (mode === "ai" && state.currentPlayer !== "R")}
                  aria-label={`drop column ${c + 1}`}
                >
                  ▼
                </button>
                {Array.from({ length: ROWS }).map((_, ri) => {
                  const r = ri;
                  const cell = state.board[r][c];
                  const isLastCol = state.lastCol === c;
                  const isHintCol = hint?.col === c;
                  const isDropping = dropping?.r === r && dropping?.c === c;
                  const isWin = winCells.has(`${r},${c}`);
                  return (
                    <button
                      key={`${r}-${c}`}
                      type="button"
                      className={`relative w-9 h-9 sm:w-10 sm:h-10 md:h-12 md:h-12 rounded-full flex items-center justify-center overflow-hidden border transition-all duration-150 hover:brightness-110 cursor-pointer ${
                        isLastCol ? "bg-neon-cyan/5" : "bg-bg-void"
                      } border-bg-border ${isHintCol ? "ring-2 ring-neon-cyan" : ""} ${isWin ? "connect4-cell-win" : ""}`}
                      onClick={() => handleColumn(c)}
                      disabled={loading || aiThinking || state.gameOver || (mode === "ai" && state.currentPlayer !== "R")}
                    >
                      {cell !== " " && (
                        <span
                          className={`absolute inset-1 rounded-full ${
                            cell === "R" ? "bg-neon-pink shadow-glow-pink" : "bg-neon-orange shadow-glow-orange"
                          } ${isDropping ? "connect4-piece-drop" : ""}`}
                          onAnimationEnd={() => {
                            if (isDropping) setDropping(null);
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            );
            })}
          </div>
          <AnimatePresence>
            {state.gameOver && bannerText && (
              <VictoryBanner text={bannerText} variant={bannerVariant} onPlayAgain={init} />
            )}
          </AnimatePresence>
        </div>
        {error && <p className="mt-2 font-vt text-lg text-neon-pink">{error}</p>}
        {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}
        <RecordWinPrompt
          game="connect4"
          state={state}
          visible={mode === "ai" && showLeaderboardPrompt}
          onDone={() => setShowLeaderboardPrompt(false)}
        />
      </div>
    </GameLayout>
  );
}
