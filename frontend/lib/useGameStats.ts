"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type GameStatsKey = "chess" | "checkers" | "tictactoe" | "connect4";
export type Stats = { wins: number; losses: number; draws: number; gamesPlayed: number };

const defaultStats: Stats = { wins: 0, losses: 0, draws: 0, gamesPlayed: 0 };

function storageKey(gameKey: GameStatsKey) {
  // separate key per game so chess doesn't wipe checkers
  return `arcade-stats-${gameKey}`;
}

function load(gameKey: GameStatsKey): Stats {
  // no window on the server
  if (typeof window === "undefined") return { ...defaultStats };
  try {
    const raw = localStorage.getItem(storageKey(gameKey));
    if (!raw) return { ...defaultStats };
    const p = JSON.parse(raw) as Partial<Stats>;
    // coerce so a corrupted string doesn't NaN the counters
    return {
      wins: Number(p.wins) || 0,
      losses: Number(p.losses) || 0,
      draws: Number(p.draws) || 0,
      gamesPlayed: Number(p.gamesPlayed) || 0,
    };
  } catch {
    return { ...defaultStats };
  }
}

function save(gameKey: GameStatsKey, s: Stats) {
  localStorage.setItem(storageKey(gameKey), JSON.stringify(s));
}

export function useGameStats(gameKey: GameStatsKey) {
  const [stats, setStats] = useState<Stats>(defaultStats);

  useEffect(() => {
    // hydrate from localStorage after mount
    setStats(load(gameKey));
  }, [gameKey]);

  const recordWin = useCallback(() => {
    // functional update so rapid clicks don't lose a count
    setStats((prev) => {
      const next = { ...prev, wins: prev.wins + 1, gamesPlayed: prev.gamesPlayed + 1 };
      save(gameKey, next);
      return next;
    });
  }, [gameKey]);

  const recordLoss = useCallback(() => {
    setStats((prev) => {
      const next = { ...prev, losses: prev.losses + 1, gamesPlayed: prev.gamesPlayed + 1 };
      save(gameKey, next);
      return next;
    });
  }, [gameKey]);

  const recordDraw = useCallback(() => {
    setStats((prev) => {
      const next = { ...prev, draws: prev.draws + 1, gamesPlayed: prev.gamesPlayed + 1 };
      save(gameKey, next);
      return next;
    });
  }, [gameKey]);

  const resetStats = useCallback(() => {
    setStats({ ...defaultStats });
    save(gameKey, { ...defaultStats });
  }, [gameKey]);

  return useMemo(
    () => ({ stats, recordWin, recordLoss, recordDraw, resetStats }),
    [stats, recordWin, recordLoss, recordDraw, resetStats]
  );
}
