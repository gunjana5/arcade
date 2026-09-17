"use client";

// side panel: mode, difficulty, stats, undo/hint, restart
// difficulty only shows in ai mode
import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArcadeTip } from "./ArcadeTip";
import { DifficultySelector } from "./DifficultySelector";
import type { Stats } from "@/lib/useGameStats";

export type GameMode = "ai" | "local";

type Props = {
  mode: GameMode;
  difficulty: string;
  onModeChange: (m: GameMode) => void;
  onDifficultyChange: (d: string) => void;
  onRestart: () => void;
  stats?: Stats | null;
  onResetStats?: () => void;
  moveHistory?: string[] | null;
  onClearHistory?: () => void;
  onUndo?: (() => void) | null;
  canUndo?: boolean;
  onHint?: (() => void) | null;
  canHint?: boolean;
  showModeControls?: boolean;
};

export function ControlPanel({
  mode,
  difficulty,
  onModeChange,
  onDifficultyChange,
  onRestart,
  stats = null,
  onResetStats,
  moveHistory = null,
  onClearHistory,
  onUndo = null,
  canUndo = false,
  onHint = null,
  canHint = false,
  showModeControls = true,
}: Props) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // keep move log scrolled to the latest line
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [moveHistory]);

  return (
    <div className="w-full space-y-4">
      <h3
        className="font-press text-[0.7rem] text-neon-cyan tracking-widest inline-flex items-center leading-none"
        style={{ textShadow: "var(--glow-cyan)" }}
      >
        CONTROLS
        <ArcadeTip text="mode + difficulty + hint/undo - field tips are the neon ? not the HOW? modal" />
      </h3>

      {showModeControls && (
        <>
          <div className="space-y-2">
            <p className="font-vt text-lg tracking-widest text-muted inline-flex items-center leading-none">
              MODE
              <ArcadeTip text="VS AI uses the difficulty you pick. easy/medium are not minimax. LOCAL is pass-and-play on the same keyboard" />
            </p>
            <div className="flex gap-2">
              {/* ai = vs computer, local = pass-and-play same keyboard */}
              {(["ai", "local"] as const).map((m) => {
                const active = mode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onModeChange(m)}
                    className={`arcade-cab-btn flex-1 ${active ? "is-active" : ""}`}
                  >
                    {m === "ai" ? "VS AI" : "LOCAL"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* hide difficulty in local - no ai to configure */}
          {mode === "ai" && <DifficultySelector value={difficulty} onChange={onDifficultyChange} />}
        </>
      )}

      {/* w/l/d from useGameStats - chess/checkers/ttt/c4 pass this in */}
      {mode === "ai" && stats != null && (
        <div className="grid grid-cols-3 gap-2">
          <div className="arcade-stat-chip border-neon-cyan/35 col-span-3 flex items-center justify-center gap-2 px-2 py-2">
            <span className="font-vt text-lg text-muted leading-none">LOCAL W/L/D</span>
            <ArcadeTip text="browser-only tally for this machine - not the same as the leaderboard" />
          </div>
          <div className="arcade-stat-chip border-neon-green/50">
            <div className="text-muted text-lg font-vt leading-none mb-1">W</div>
            <div className="font-press text-sm text-neon-green leading-none">{stats.wins}</div>
          </div>
          <div className="arcade-stat-chip border-neon-pink/50">
            <div className="text-muted text-lg font-vt leading-none mb-1">L</div>
            <div className="font-press text-sm text-neon-pink leading-none">{stats.losses}</div>
          </div>
          <div className="arcade-stat-chip border-neon-cyan/50">
            <div className="text-muted text-lg font-vt leading-none mb-1">D</div>
            <div className="font-press text-sm text-neon-cyan leading-none">{stats.draws}</div>
          </div>
          {onResetStats && (
            <button
              type="button"
              onClick={onResetStats}
              className="col-span-3 text-lg font-vt text-muted hover:text-neon-cyan underline transition-all duration-150 active:scale-95"
            >
              RESET STATS
            </button>
          )}
        </div>
      )}

      {/* notation lines from the game pages - zebra rows for readability */}
      {moveHistory != null && moveHistory.length > 0 && (
        <div>
          <p className="font-vt text-lg tracking-widest text-muted mb-1 inline-flex items-center leading-none">
            MOVES
            <ArcadeTip text="notation from this game - clear log only wipes the list, not the board" />
          </p>
          <div
            ref={logRef}
            className="max-h-[160px] overflow-y-auto rounded-xl border-2 border-bg-border bg-bg-void text-lg font-vt text-secondary px-2 py-1 shadow-[inset_0_0_18px_rgba(0,0,0,0.45)]"
          >
            {moveHistory.map((line, i) => (
              <div key={`${i}-${line}`} className={`py-0.5 px-1 ${i % 2 === 0 ? "bg-bg-elevated/50" : ""}`}>
                {line}
              </div>
            ))}
          </div>
          {onClearHistory && (
            <button
              type="button"
              onClick={onClearHistory}
              className="mt-1 text-lg font-vt text-muted hover:text-neon-purple underline transition-all duration-150 active:scale-95"
            >
              CLEAR LOG
            </button>
          )}
        </div>
      )}

      {/* hint/undo only wired when the game page passes handlers */}
      <div className="flex flex-col gap-2 pt-1">
        {onHint != null && mode === "ai" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onHint}
              disabled={!canHint}
              className="btn-neon btn-neon-purple w-full disabled:opacity-40"
            >
              HINT
            </button>
            <ArcadeTip text="asks the ai for one suggested move then highlights it briefly" />
          </div>
        )}
        {onUndo != null && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="btn-neon btn-neon-purple w-full disabled:opacity-40"
            >
              UNDO
            </button>
            <ArcadeTip text="steps back one ply when the game page wired a history stack" />
          </div>
        )}
        <button type="button" onClick={onRestart} className="btn-neon btn-neon-orange w-full">
          RESTART
        </button>
        <Link href="/" className="btn-neon btn-neon-pink w-full text-center">
          HOME
        </Link>
      </div>
    </div>
  );
}
