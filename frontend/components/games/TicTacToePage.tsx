"use client";

// tic tac toe ui - i'm X vs ai. board state comes from the api each move
import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ControlPanel, GameMode } from "../ControlPanel";
import { GameLayout } from "../GameLayout";
import { tttNewState, tttMove, tttAi } from "@/lib/api";
import { Confetti } from "../Confetti";
import { VictoryBanner } from "../VictoryBanner";
import { ThinkingIndicator } from "../ThinkingIndicator";
import { RecordWinPrompt } from "../Leaderboard";
import { useGameStats } from "@/lib/useGameStats";

// fake "thinking" pause so the ai move doesn't feel instant
const AI_DELAY_MS = 1000;

const HOW_TO_PLAY = (
  <>
    <p>three in a row any direction</p>
    <p>x is cyan, o is pink - x starts</p>
    <p>tap empty squares</p>
  </>
);

// for the green win line on the board (client-side only)
// backend already knows the winner - this just finds which three cells to glow
function getWinningLine(board: string[][], mark: string): [number, number][] | null {
  for (let r = 0; r < 3; r++) {
    if (board[r][0] === mark && board[r][1] === mark && board[r][2] === mark)
      return [
        [r, 0],
        [r, 1],
        [r, 2],
      ];
  }
  for (let c = 0; c < 3; c++) {
    if (board[0][c] === mark && board[1][c] === mark && board[2][c] === mark)
      return [
        [0, c],
        [1, c],
        [2, c],
      ];
  }
  // diagonals
  if (board[0][0] === mark && board[1][1] === mark && board[2][2] === mark)
    return [
      [0, 0],
      [1, 1],
      [2, 2],
    ];
  if (board[0][2] === mark && board[1][1] === mark && board[2][0] === mark)
    return [
      [0, 2],
      [1, 1],
      [2, 0],
    ];
  return null;
}

function MarkX() {
  // svg so the glow colours match the css vars
  return (
    <svg viewBox="0 0 1 1" className="w-10 h-10 sm:w-12 sm:h-12" aria-hidden>
      <line x1="0.15" y1="0.15" x2="0.85" y2="0.85" stroke="var(--neon-cyan)" strokeWidth="0.12" strokeLinecap="round" />
      <line x1="0.85" y1="0.15" x2="0.15" y2="0.85" stroke="var(--neon-cyan)" strokeWidth="0.12" strokeLinecap="round" />
    </svg>
  );
}

function MarkO() {
  return (
    <svg viewBox="0 0 1 1" className="w-10 h-10 sm:w-12 sm:h-12" aria-hidden>
      <circle
        cx="0.5"
        cy="0.5"
        r="0.35"
        fill="none"
        stroke="var(--neon-pink)"
        strokeWidth="0.1"
      />
    </svg>
  );
}

function boardIsDraw(board: string[][]): boolean {
  // client fallback when ai returns done with no move on a full board
  return board.every((row) => row.every((c) => c !== " "));
}

export function TicTacToePage() {
  const { stats, recordWin, recordLoss, recordDraw, resetStats } = useGameStats("tictactoe");
  const [mode, setMode] = useState<GameMode>("ai");
  const [difficulty, setDifficulty] = useState("medium");
  // state = whatever the backend last returned (board + currentPlayer)
  const [state, setState] = useState<{ board: string[][]; currentPlayer: string } | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [draw, setDraw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showLeaderboardPrompt, setShowLeaderboardPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const statsRecorded = useRef(false);

  const init = useCallback(async () => {
    // new game / restart
    setLoading(true);
    setError(null);
    try {
      const s = await tttNewState();
      setState(s);
      setWinner(null);
      setDraw(false);
      setShowConfetti(false);
      setShowLeaderboardPrompt(false);
      setAiThinking(false);
      statsRecorded.current = false;
    } catch (e) {
      console.error(e);
      setError("api down - can't start a new game");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    // record local stats once when the game ends (ai mode only)
    if ((!winner && !draw) || statsRecorded.current) return;
    if (mode !== "ai") return;
    statsRecorded.current = true;
    if (draw) recordDraw();
    else if (winner === "X") {
      recordWin();
      setShowLeaderboardPrompt(true);
    } else if (winner === "O") recordLoss();
  }, [winner, draw, mode, recordWin, recordLoss, recordDraw]);

  const handleCell = useCallback(
    async (row: number, col: number) => {
      // bail if taken / already over / not my turn
      if (!state || state.board[row][col] !== " " || winner || draw) return;
      // in ai mode i only play X - don't let me click during O's turn
      if (mode === "ai" && state.currentPlayer !== "X") return;
      setLoading(true);
      setError(null);
      try {
        // 1) send my click to the api
        const res = await tttMove(state, row, col);
        // keep casting cos the json comes back as object
        setState(res.state as { board: string[][]; currentPlayer: string });
        setWinner(res.winner || null);
        setDraw(res.draw);
        // confetti only on my win - not draw / loss
        if (res.winner === "X") setShowConfetti(true);
        // 2) vs ai: if game still going and it's O now, pause then ask backend
        if (mode === "ai" && !res.winner && !res.draw && (res.state as { currentPlayer: string }).currentPlayer === "O") {
          setAiThinking(true);
          // sleep so it doesn't feel like the ai is cheating / lagging weird
          await new Promise((r) => setTimeout(r, AI_DELAY_MS));
          const aiRes = await tttAi(res.state, difficulty);
          if (aiRes.newState) {
            setState(aiRes.newState as { board: string[][]; currentPlayer: string });
            setWinner(aiRes.winner || null);
            setDraw(!!aiRes.draw);
            if (aiRes.winner === "X") setShowConfetti(true);
          } else if (aiRes.done) {
            // full board / no move - still surface draw from the api (or board check)
            const board = (aiRes.state as { board?: string[][] } | undefined)?.board
              ?? (res.state as { board: string[][] }).board;
            const isDraw = aiRes.draw ?? (!aiRes.winner && boardIsDraw(board));
            setWinner(aiRes.winner || null);
            setDraw(!!isDraw);
            if (aiRes.winner === "X") setShowConfetti(true);
          }
        }
        // local mode: just stop here, other person clicks next
      } catch (e) {
        console.error(e); // usually api down / cors
        setError("move failed - is the api up?");
      } finally {
        setLoading(false);
        setAiThinking(false);
      }
    },
    [state, mode, difficulty, winner, draw]
  );

  // first paint before /state comes back
  if (!state) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="font-vt text-2xl text-neon-cyan">LOADING...</div>
        {error && <p className="font-vt text-lg text-neon-pink">{error}</p>}
      </div>
    );
  }

  // endpoints of the win line for the svg stroke (middle of those cells)
  const winLine = winner && !draw ? getWinningLine(state.board, winner) : null;
  const [r0, c0] = winLine?.[0] ?? [0, 0];
  const [r2, c2] = winLine?.[2] ?? [0, 0];

  // banner colours: i win = cyan, they win = pink, draw = orange
  const bannerVariant: "win" | "lose" | "draw" = draw ? "draw" : winner === "X" ? "win" : "lose";
  const bannerText = winner === "X" ? "you win" : winner === "O" ? "they win" : draw ? "draw" : "";

  return (
    <GameLayout
      title="tic tac toe"
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
        />
      }
    >
      <div className="flex flex-col items-center w-full max-w-full overflow-hidden">
        <ThinkingIndicator isThinking={aiThinking} />
        {/* classic # board - neon lines over void, not purple gutters */}
        <div className="p-4 bg-bg-void border-4 border-neon-purple" style={{ boxShadow: "var(--glow-purple)" }}>
          <div className="relative w-fit mx-auto">
            <div className="relative grid grid-cols-3">
              {/* # grid: 2 vertical + 2 horizontal neon lines */}
              <div
                className="pointer-events-none absolute inset-0 z-[1]"
                aria-hidden
              >
                <div className="absolute top-0 bottom-0 left-1/3 w-px -translate-x-1/2 bg-neon-cyan" style={{ boxShadow: "var(--glow-cyan)" }} />
                <div className="absolute top-0 bottom-0 left-2/3 w-px -translate-x-1/2 bg-neon-cyan" style={{ boxShadow: "var(--glow-cyan)" }} />
                <div className="absolute left-0 right-0 top-1/3 h-px -translate-y-1/2 bg-neon-cyan" style={{ boxShadow: "var(--glow-cyan)" }} />
                <div className="absolute left-0 right-0 top-2/3 h-px -translate-y-1/2 bg-neon-cyan" style={{ boxShadow: "var(--glow-cyan)" }} />
              </div>
              {state.board.map((row, r) =>
                row.map((cell, c) => (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    className="relative z-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 flex items-center justify-center bg-transparent transition-all duration-150 hover:bg-neon-cyan/5 cursor-pointer"
                    onClick={() => handleCell(r, c)}
                    // disable while waiting on network / ai / finished
                    disabled={loading || aiThinking || !!winner || draw}
                  >
                    {/* pop in marks when they appear */}
                    <AnimatePresence mode="wait">
                      {cell === "X" && (
                        <motion.span key="x" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <MarkX />
                        </motion.span>
                      )}
                      {cell === "O" && (
                        <motion.span key="o" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <MarkO />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                ))
              )}
            </div>
            {/* draw line across the 3 winning cells - viewBox is 3x3 so +0.5 = cell centre */}
            {winLine && (
              <svg className="absolute inset-0 pointer-events-none z-10 w-full h-full" viewBox="0 0 3 3" preserveAspectRatio="none">
                <motion.path
                  d={`M ${c0 + 0.5} ${r0 + 0.5} L ${c2 + 0.5} ${r2 + 0.5}`}
                  fill="none"
                  stroke="var(--neon-green)"
                  strokeWidth="0.1"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                />
              </svg>
            )}
            <AnimatePresence>
              {(winner || draw) && bannerText && (
                <VictoryBanner text={bannerText} variant={bannerVariant} onPlayAgain={init} />
              )}
            </AnimatePresence>
          </div>
        </div>
        <p className="mt-4 font-vt text-2xl tracking-widest">
          {draw ? (
            <span className="text-neon-orange">DRAW</span>
          ) : winner ? (
            <span
              className={winner === "X" ? "text-neon-cyan" : "text-neon-pink"}
              style={{ textShadow: winner === "X" ? "var(--glow-cyan)" : "var(--glow-pink)" }}
            >
              {winner} WINS
            </span>
          ) : (
            <span
              className={state.currentPlayer === "X" ? "text-neon-cyan" : "text-neon-pink"}
              style={{ textShadow: state.currentPlayer === "X" ? "var(--glow-cyan)" : "var(--glow-pink)" }}
            >
              {state.currentPlayer} TURN
            </span>
          )}
        </p>
        {error && <p className="mt-2 font-vt text-lg text-neon-pink">{error}</p>}
        {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}
        {/* only after beating ai - skip if local or loss */}
        <RecordWinPrompt
          game="tictactoe"
          state={state}
          visible={mode === "ai" && showLeaderboardPrompt && winner === "X"}
          onDone={() => setShowLeaderboardPrompt(false)}
        />
      </div>
    </GameLayout>
  );
}
