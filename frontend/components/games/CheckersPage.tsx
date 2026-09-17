"use client";

// checkers ui - click piece then destination. human = black, ai = pink
import { useState, useCallback, useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { ControlPanel, GameMode } from "../ControlPanel";
import { GameLayout } from "../GameLayout";
import { checkersNewState, checkersMoves, checkersMove, checkersAi, checkersHint, checkersUndo } from "@/lib/api";
import { RecordWinPrompt } from "../Leaderboard";
import { Confetti } from "../Confetti";
import { VictoryBanner } from "../VictoryBanner";
import { ThinkingIndicator } from "../ThinkingIndicator";
import { useGameStats } from "@/lib/useGameStats";

const AI_DELAY_MS = 1000;
const BOARD_N = 8;

type CheckersState = { board: string[][]; blackTurn: boolean; gameOver: boolean; winner: string | null };

// flip so black (you) sits nearest the bottom like chess.com
function apiRow(displayR: number): number {
  return BOARD_N - 1 - displayR;
}

const HOW_TO_PLAY = (
  <>
    <p>diagonal slides forced jumps king the back row kings go wild</p>
    <p>tap yours then a lit square</p>
    <p>you are black ai is pink local is both humans</p>
  </>
);

function winnerLabel(winner: string | null): string {
  if (winner === "Black") return "BLACK";
  if (winner === "Red") return "PINK";
  return winner ? winner.toUpperCase() : "";
}

export function CheckersPage() {
  const { stats, recordWin, recordLoss, recordDraw, resetStats } = useGameStats("checkers");
  const [mode, setMode] = useState<GameMode>("ai");
  const [difficulty, setDifficulty] = useState("medium");
  const [state, setState] = useState<CheckersState | null>(null);
  const [stateTimeline, setStateTimeline] = useState<CheckersState[]>([]);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [moves, setMoves] = useState<number[][][]>([]);
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
    // reset board + timeline + hint highlight
    setLoading(true);
    setError(null);
    try {
      const s = await checkersNewState();
      setState(s);
      setStateTimeline([s]);
      setMoveHistory([]);
      setSelected(null);
      setMoves([]);
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
    // refetch legal moves whenever the board changes
    if (!state || state.gameOver) return;
    checkersMoves(state).then((r) => setMoves(r.moves || []));
  }, [state]);

  useEffect(() => {
    return () => clearHintTimer();
  }, [clearHintTimer]);

  useEffect(() => {
    // once per finished ai game - update local w/l/d + maybe save to leaderboard
    if (!state?.gameOver || !mode || statsRecorded.current) return;
    if (mode !== "ai") return;
    statsRecorded.current = true;
    const w = state.winner;
    if (w === "Black") {
      recordWin();
      setShowLeaderboardPrompt(true);
    } else if (w === "Red") recordLoss();
    else if (w === "Draw") recordDraw();
  }, [state?.gameOver, state?.winner, mode, recordWin, recordLoss, recordDraw]);

  // moves that start on this square (path[0])
  const getMoveFrom = (r: number, c: number) => moves.filter((m) => m[0][0] === r && m[0][1] === c);

  const runAi = useCallback(
    async (st: CheckersState) => {
      setAiThinking(true);
      try {
        await new Promise((r) => setTimeout(r, AI_DELAY_MS));
        const aiRes = await checkersAi(st, difficulty);
        if (aiRes.newState && aiRes.move && aiRes.moveNotation) {
          // path can be multi-jump - highlight start + final landing
          const path = aiRes.move;
          const from: [number, number] = [path[0][0], path[0][1]];
          const to: [number, number] = [path[path.length - 1][0], path[path.length - 1][1]];
          setLastMove({ from, to });
          setMoveHistory((h) => [...h, aiRes.moveNotation!]);
          setState(aiRes.newState as CheckersState);
          // keep every past state so undo can jump back
          setStateTimeline((t) => [...t, aiRes.newState as CheckersState]);
          if ((aiRes.newState as CheckersState).gameOver) setShowConfetti(true);
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
      const isBlack = piece === "B" || piece === "K"; // K = black king
      const isRed = piece === "R" || piece === "Q"; // Q = red king here, not queen
      // whose pieces am i allowed to touch right now
      const myTurn = state.blackTurn ? isBlack : isRed;

      if (selected) {
        // already picked a piece - is this a valid landing square?
        const fromMoves = getMoveFrom(selected[0], selected[1]);
        // match on last square of the path (multi-jumps land at the end)
        const toMove = fromMoves.find((m) => m[m.length - 1][0] === r && m[m.length - 1][1] === c);
        if (toMove) {
          setLoading(true);
          setError(null);
          try {
            // send the whole path, not just from/to
            const res = await checkersMove(state, toMove);
            const path = toMove;
            const from: [number, number] = [path[0][0], path[0][1]];
            const to: [number, number] = [path[path.length - 1][0], path[path.length - 1][1]];
            setLastMove({ from, to });
            setMoveHistory((h) => [...h, res.moveNotation]);
            setState(res.state as CheckersState);
            setStateTimeline((t) => [...t, res.state as CheckersState]);
            setSelected(null);
            if ((res.state as CheckersState).gameOver) setShowConfetti(true);
            // black just moved -> red's turn -> ai
            if (mode === "ai" && !(res.state as CheckersState).gameOver && (res.state as CheckersState).blackTurn === false) {
              await runAi(res.state as CheckersState);
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
        // clicked somewhere useless - deselect
        setSelected(null);
      }

      // first click: select one of my pieces
      if (myTurn) {
        if (mode === "ai" && !state.blackTurn) return; // don't select red vs ai
        setSelected([r, c]);
      }
    },
    [state, selected, mode, difficulty, loading, moves, runAi, clearHintTimer]
  );

  const handleUndo = useCallback(async () => {
    if (!state || stateTimeline.length <= 1) return;
    // vs ai undo both my move + theirs so it doesn't strand mid-turn
    const pops = mode === "ai" ? 2 : 1;
    if (stateTimeline.length <= pops) return;
    setLoading(true);
    try {
      const res = await checkersUndo(stateTimeline, pops);
      setState(res.state as CheckersState);
      setStateTimeline((t) => t.slice(0, -pops));
      setMoveHistory((h) => h.slice(0, -pops));
      setSelected(null);
      setLastMove(null);
      setHint(null);
      // allow stats to record again if they finish from here
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
      // highlight from/to for 3s then clear
      const h = await checkersHint(state, difficulty);
      setHint({ from: h.from, to: h.to });
      clearHintTimer();
      hintTimer.current = setTimeout(() => setHint(null), 3000);
    } catch (e) {
      console.error(e);
      setError("hint failed - is the api up?");
    }
  }, [state, loading, hint, difficulty, clearHintTimer]);

  if (!state) return <div className="font-vt text-2xl text-neon-cyan">LOADING...</div>;

  // light up every square this piece could land on (incl mid multi-jump squares)
  const fromMoves = selected ? getMoveFrom(selected[0], selected[1]) : [];
  const validDests = new Set(fromMoves.flatMap((m) => m.slice(1).map(([nr, nc]) => `${nr},${nc}`)));

  // need 2 past states vs ai (me + them), 1 in local
  const canUndo = mode === "local" ? stateTimeline.length > 1 : stateTimeline.length > 2;

  const bannerText =
    state.winner === "Black" ? "you win" : state.winner === "Red" ? "they win" : state.winner === "Draw" ? "draw" : "";

  const bannerVariant: "win" | "lose" | "draw" =
    state.winner === "Draw" ? "draw" : state.winner === "Black" ? "win" : "lose";

  return (
    <GameLayout
      title="checkers"
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
          canHint={mode === "ai" && !loading && !aiThinking && hint == null && !state.gameOver && state.blackTurn}
        />
      }
    >
      <div className="flex flex-col items-center w-full max-w-full overflow-hidden">
        <ThinkingIndicator isThinking={aiThinking} />
        <p className="font-vt text-2xl mb-2 tracking-widest text-subtle">
          <span
            className={state.blackTurn ? "text-neon-cyan" : "text-neon-pink"}
            style={{ textShadow: state.blackTurn ? "var(--glow-cyan)" : "var(--glow-pink)" }}
          >
            {state.blackTurn ? "BLACK" : "PINK"}
          </span>{" "}
          GOES
          {state.winner && (
            <span
              className={
                state.winner === "Black"
                  ? "text-neon-cyan"
                  : state.winner === "Red"
                    ? "text-neon-pink"
                    : "text-neon-orange"
              }
            >
              {` · ${winnerLabel(state.winner)} WINS`}
            </span>
          )}
        </p>
        {hint && <p className="font-vt text-lg text-neon-cyan mb-1">HINT USED</p>}
        <div className="relative w-fit mx-auto border-4 border-neon-pink overflow-hidden" style={{ boxShadow: "var(--glow-pink)" }}>
          <div className="grid grid-cols-8 gap-0">
            {Array.from({ length: BOARD_N }, (_, displayR) => {
              const r = apiRow(displayR);
              const row = state.board[r];
              return row.map((cell, c) => {
                const isLight = (r + c) % 2 === 1;
                const isSelected = selected?.[0] === r && selected?.[1] === c;
                const isDest = validDests.has(`${r},${c}`);
                const isBlackPiece = cell === "B" || cell === "K";
                const isKing = cell === "K" || cell === "Q";
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
                    className={`min-w-[36px] min-h-[36px] w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center transition-all duration-150 hover:brightness-110 cursor-pointer relative ${sqBg} ${
                      isSelected ? "shadow-[0_0_0_3px_var(--neon-cyan)] shadow-glow-cyan z-10" : ""
                    }`}
                    onClick={() => handleCell(r, c)}
                    disabled={loading || aiThinking}
                  >
                    {isDest && <span className="absolute w-[30%] h-[30%] rounded-full bg-neon-cyan/70 pointer-events-none z-0" />}
                    {cell !== "." && (
                      <span
                        className={`relative z-[1] block w-[70%] h-[70%] rounded-full border-2 ${
                          isBlackPiece
                            ? "bg-bg-void border-neon-cyan shadow-glow-cyan"
                            : "bg-neon-pink border-neon-pink shadow-glow-pink"
                        } ${
                          isKing
                            ? isBlackPiece
                              ? "ring-2 ring-inset ring-neon-cyan"
                              : "ring-2 ring-inset ring-neon-pink"
                            : ""
                        }`}
                      />
                    )}
                  </button>
                );
              });
            })}
          </div>
          <AnimatePresence>
            {state.gameOver && state.winner && bannerText && (
              <VictoryBanner text={bannerText} variant={bannerVariant} onPlayAgain={init} />
            )}
          </AnimatePresence>
        </div>
        {error && <p className="mt-2 font-vt text-lg text-neon-pink">{error}</p>}
        {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}
        <RecordWinPrompt
          game="checkers"
          state={state}
          visible={mode === "ai" && showLeaderboardPrompt}
          onDone={() => setShowLeaderboardPrompt(false)}
        />
      </div>
    </GameLayout>
  );
}
