"use client";

// chess ui - select piece then square. i'm cyan, ai is pink
import { useState, useCallback, useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { ControlPanel, GameMode } from "../ControlPanel";
import { GameLayout } from "../GameLayout";
import { chessNewState, chessMoves, chessMove, chessAi, chessHint, chessUndo } from "@/lib/api";
import { RecordWinPrompt } from "../Leaderboard";
import { Confetti } from "../Confetti";
import { VictoryBanner } from "../VictoryBanner";
import { ThinkingIndicator } from "../ThinkingIndicator";
import { useGameStats } from "@/lib/useGameStats";

const AI_DELAY_MS = 1000;

type ChessState = {
  board: string[][];
  whiteTurn: boolean;
  inCheck: boolean;
  gameOver: boolean;
  winner: string | null;
  castling_rights?: Record<string, boolean>;
};

// same filled glyphs for both sides - unicode "white" pieces are outlines and look broken
const FILLED = { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" } as const;
const PIECE_SYMBOLS: Record<string, string> = {
  K: FILLED.K,
  Q: FILLED.Q,
  R: FILLED.R,
  B: FILLED.B,
  N: FILLED.N,
  P: FILLED.P,
  k: FILLED.K,
  q: FILLED.Q,
  r: FILLED.R,
  b: FILLED.B,
  n: FILLED.N,
  p: FILLED.P,
};

const HOW_TO_PLAY = (
  <>
    <p>regular chess - mate the king. queen promo + castling work; no en passant</p>
    <p>tap a piece then a lit square</p>
    <p>you are cyan ai is pink local is two humans</p>
  </>
);

function sideLabel(whiteTurn: boolean): string {
  return whiteTurn ? "CYAN" : "PINK";
}

function winnerLabel(winner: string | null): string {
  if (winner === "White") return "CYAN";
  if (winner === "Black") return "PINK";
  return winner ? winner.toUpperCase() : "";
}

function isOpponent(whiteTurn: boolean, cell: string): boolean {
  // used when deciding if a destination square is a capture highlight
  if (cell === ".") return false;
  const isWhitePiece = cell === cell.toUpperCase();
  return whiteTurn ? !isWhitePiece : isWhitePiece;
}

export function ChessPage() {
  const { stats, recordWin, recordLoss, recordDraw, resetStats } = useGameStats("chess");
  const [mode, setMode] = useState<GameMode>("ai");
  const [difficulty, setDifficulty] = useState("medium");
  const [state, setState] = useState<ChessState | null>(null);
  const [stateTimeline, setStateTimeline] = useState<ChessState[]>([]);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [legalMoves, setLegalMoves] = useState<number[][]>([]);
  const [loading, setLoading] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showLeaderboardPrompt, setShowLeaderboardPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ from: [number, number]; to: [number, number] } | null>(null);
  const [hint, setHint] = useState<{ from: [number, number]; to: [number, number] } | null>(null);
  const statsRecorded = useRef(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      const s = (await chessNewState()) as ChessState;
      setState(s);
      setStateTimeline([s]);
      setMoveHistory([]);
      setSelected(null);
      setLegalMoves([]);
      setShowConfetti(false);
      setShowLeaderboardPrompt(false);
      setAiThinking(false);
      setLastMove(null);
      setHint(null);
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
    // ask api for all legal moves whenever board changes (for highlights)
    if (!state || state.gameOver) return;
    chessMoves(state).then((r) => setLegalMoves(r.moves || []));
  }, [state]);

  useEffect(() => {
    return () => clearHintTimer();
  }, [clearHintTimer]);

  useEffect(() => {
    // record local stats once when the game ends (ai mode only)
    if (!state?.gameOver || !mode || statsRecorded.current) return;
    if (mode !== "ai") return;
    statsRecorded.current = true;
    const w = state.winner;
    if (w === "White") {
      recordWin();
      setShowLeaderboardPrompt(true);
    } else if (w === "Black") recordLoss();
    else if (w === "Draw") recordDraw();
  }, [state?.gameOver, state?.winner, mode, recordWin, recordLoss, recordDraw]);

  // legalMoves entries look like [r0,c0,r1,c1] - pull destinations for a square
  const movesFrom = (r: number, c: number) =>
    legalMoves.filter((m) => m[0] === r && m[1] === c).map((m) => [m[2], m[3]] as [number, number]);

  const runAi = useCallback(
    async (st: ChessState) => {
      setAiThinking(true);
      try {
        await new Promise((r) => setTimeout(r, AI_DELAY_MS));
        // expert can take a while here - that's the depth thing
        const aiRes = await chessAi(st, difficulty);
        if (aiRes.newState && aiRes.move && aiRes.moveNotation) {
          const [r0, c0, r1, c1] = aiRes.move;
          setLastMove({ from: [r0, c0], to: [r1, c1] });
          setMoveHistory((h) => [...h, aiRes.moveNotation!]);
          setState(aiRes.newState as ChessState);
          setStateTimeline((t) => [...t, aiRes.newState as ChessState]);
          // no confetti on draws feels right
          if ((aiRes.newState as ChessState).gameOver && (aiRes.newState as ChessState).winner !== "Draw")
            setShowConfetti(true);
        }
      } catch (e) {
        console.error(e);
        setError("ai move failed - is the api up?");
      } finally {
        setAiThinking(false);
      }
    },
    [difficulty]
  );

  const handleCell = useCallback(
    async (r: number, c: number) => {
      if (!state || state.gameOver || loading) return;
      clearHintTimer();
      setHint(null);
      const piece = state.board[r]?.[c];
      // uppercase = white, lowercase = black, "." = empty
      const isWhite = piece && piece === piece.toUpperCase() && piece !== ".";
      const isBlack = piece && piece === piece.toLowerCase();
      const myTurn = state.whiteTurn ? isWhite : isBlack;

      if (selected) {
        // second click - try to move there
        const dests = movesFrom(selected[0], selected[1]);
        const to = dests.find(([dr, dc]) => dr === r && dc === c);
        if (to) {
          setLoading(true);
          setError(null);
          try {
            const res = await chessMove(state, selected[0], selected[1], r, c);
            setLastMove({ from: [selected[0], selected[1]], to: [r, c] });
            setMoveHistory((h) => [...h, res.moveNotation]);
            setState(res.state as ChessState);
            setStateTimeline((t) => [...t, res.state as ChessState]);
            setSelected(null);
            if ((res.state as ChessState).gameOver && (res.state as ChessState).winner && (res.state as ChessState).winner !== "Draw")
              setShowConfetti(true);

            // i just moved as white -> black's turn -> ai
            if (mode === "ai" && !(res.state as ChessState).gameOver) {
              await runAi(res.state as ChessState);
            }
          } catch (e) {
            console.error(e);
            setError("move failed - is the api up?");
          } finally {
            setLoading(false);
            setAiThinking(false);
          }
          return;
        }
        // clicked a non-dest - deselect (or they'll click another piece next)
        setSelected(null);
      }

      // first click: pick a piece i can move
      if (myTurn) {
        if (mode === "ai" && !state.whiteTurn) return; // don't grab black pieces vs ai
        setSelected([r, c]);
      }
    },
    [state, selected, mode, loading, legalMoves, runAi, clearHintTimer]
  );

  const handleUndo = useCallback(async () => {
    if (!state || stateTimeline.length <= 1) return;
    // same trick as checkers - pop 2 vs ai so undo doesn't land on black's turn
    const pops = mode === "ai" ? 2 : 1;
    if (stateTimeline.length <= pops) return;
    setLoading(true);
    try {
      const res = await chessUndo(stateTimeline, pops);
      setState(res.state as ChessState);
      setStateTimeline((t) => t.slice(0, -pops));
      setMoveHistory((h) => h.slice(0, -pops));
      setSelected(null);
      setLastMove(null);
      setHint(null);
      statsRecorded.current = false;
    } catch (e) {
      console.error(e);
      setError("undo failed - is the api up?");
    } finally {
      setLoading(false);
    }
  }, [state, stateTimeline, mode]);

  const handleHint = useCallback(async () => {
    if (!state || state.gameOver || loading || hint != null) return;
    try {
      // same idea as checkers - green squares for a few seconds
      const h = await chessHint(state, difficulty);
      setHint({ from: h.from, to: h.to });
      clearHintTimer();
      hintTimer.current = setTimeout(() => setHint(null), 3000);
    } catch (e) {
      console.error(e);
      setError("hint failed - is the api up?");
    }
  }, [state, loading, hint, difficulty, clearHintTimer]);

  if (!state) return <div className="font-vt text-2xl text-neon-orange">LOADING...</div>;

  const dests = selected ? movesFrom(selected[0], selected[1]) : [];
  const destSet = new Set(dests.map(([r, c]) => `${r},${c}`));

  const canUndo = mode === "local" ? stateTimeline.length > 1 : stateTimeline.length > 2;

  const bannerText =
    state.winner === "White"
      ? "you win"
      : state.winner === "Black"
        ? "they win"
        : state.winner === "Draw"
          ? "draw"
          : "";

  const bannerVariant: "win" | "lose" | "draw" =
    state.winner === "Draw" ? "draw" : state.winner === "White" ? "win" : "lose";

  return (
    <GameLayout
      title="chess"
      howToPlay={HOW_TO_PLAY}
      sidePanel={
        <ControlPanel
          mode={mode}
          difficulty={difficulty}
          onModeChange={setMode}
          onDifficultyChange={setDifficulty}
          onRestart={init}
          stats={stats}
          onResetStats={resetStats}
          moveHistory={moveHistory.length ? moveHistory.map((m, i) => `${i + 1} ${m.toLowerCase()}`) : null}
          onClearHistory={() => setMoveHistory([])}
          onUndo={handleUndo}
          canUndo={canUndo && !loading && !aiThinking}
          onHint={mode === "ai" ? handleHint : null}
          canHint={mode === "ai" && !loading && !aiThinking && hint == null && !state.gameOver && state.whiteTurn}
        />
      }
    >
      <div className="flex flex-col items-center w-full max-w-full overflow-hidden">
        <ThinkingIndicator isThinking={aiThinking} />
        <p className="font-vt text-2xl mb-2 tracking-widest text-subtle">
          <span className={state.whiteTurn ? "text-neon-cyan" : "text-neon-pink"} style={{ textShadow: state.whiteTurn ? "var(--glow-cyan)" : "var(--glow-pink)" }}>
            {sideLabel(state.whiteTurn)}
          </span>{" "}
          GOES
          {state.inCheck && " · CHECK"}
          {state.winner && (
            <span className={state.winner === "White" ? "text-neon-cyan" : state.winner === "Black" ? "text-neon-pink" : "text-neon-orange"}>
              {` · ${winnerLabel(state.winner)}`}
            </span>
          )}
        </p>
        {hint && (
          <p className="font-vt text-lg text-neon-cyan mb-1">HINT USED</p>
        )}
        <div className="relative w-fit mx-auto border-4 border-neon-cyan overflow-hidden rounded-lg" style={{ boxShadow: "var(--glow-cyan)" }}>
          <div className="grid grid-cols-8 gap-0">
            {state.board.map((row, r) =>
              row.map((cell, c) => {
                const isLight = (r + c) % 2 === 1;
                const isSelected = selected?.[0] === r && selected?.[1] === c;
                const isDest = destSet.has(`${r},${c}`);
                const isWhitePiece = cell !== "." && cell === cell.toUpperCase();
                const occupant = state.board[r][c];
                const isCaptureDest = isDest && occupant !== "." && isOpponent(state.whiteTurn, occupant);
                const lmFrom = lastMove && lastMove.from[0] === r && lastMove.from[1] === c;
                const lmTo = lastMove && lastMove.to[0] === r && lastMove.to[1] === c;
                const hf = hint && hint.from[0] === r && hint.from[1] === c;
                const ht = hint && hint.to[0] === r && hint.to[1] === c;
                let sqBg = isLight ? "bg-board-light" : "bg-board-dark";
                if (hf) sqBg = "bg-neon-pink/20";
                else if (ht) sqBg = "bg-neon-pink/35";
                else if (lmTo) sqBg = "bg-neon-cyan/20";
                else if (lmFrom) sqBg = "bg-neon-cyan/10";
                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    className={`relative min-w-[36px] min-h-[36px] w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center text-xl sm:text-2xl transition-all duration-150 hover:brightness-110 cursor-pointer ${sqBg} ${
                      isSelected ? "shadow-[inset_0_0_0_2px_var(--neon-magenta)] bg-neon-pink/15 z-10" : ""
                    } ${isCaptureDest ? "shadow-[inset_0_0_0_3px_var(--neon-cyan)] z-10" : ""}`}
                    onClick={() => handleCell(r, c)}
                    disabled={loading || aiThinking}
                  >
                    {isDest && occupant === "." && (
                      <span className="absolute w-[30%] h-[30%] rounded-full bg-neon-cyan/70 pointer-events-none z-0" />
                    )}
                    {cell !== "." && (
                      <span
                        className={`chess-piece relative z-[1] leading-none ${
                          isWhitePiece ? "text-neon-cyan" : "text-neon-pink"
                        }`}
                        style={{ textShadow: isWhitePiece ? "var(--glow-cyan)" : "var(--glow-pink)" }}
                      >
                        {PIECE_SYMBOLS[cell] || cell}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
          <AnimatePresence>
            {state.gameOver && bannerText && (
              <VictoryBanner
                text={bannerText}
                subtext={state.winner === "Draw" ? "no winner" : undefined}
                variant={bannerVariant}
                onPlayAgain={init}
              />
            )}
          </AnimatePresence>
        </div>
        {error && <p className="mt-2 font-vt text-lg text-neon-pink">{error}</p>}
        {error && <p className="mt-2 font-vt text-lg text-neon-pink">{error}</p>}
        {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}
        <RecordWinPrompt
          game="chess"
          state={state}
          visible={mode === "ai" && showLeaderboardPrompt}
          onDone={() => setShowLeaderboardPrompt(false)}
        />
      </div>
    </GameLayout>
  );
}
