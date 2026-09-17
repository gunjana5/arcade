"use client";

import { ArcadeTip } from "./ArcadeTip";

const OPTIONS = ["easy", "medium", "hard", "expert"] as const;

export function DifficultySelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (d: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="font-vt text-lg tracking-widest text-muted inline-flex items-center leading-none">
        DIFFICULTY
        <ArcadeTip text="easy = random legal move. medium+ = deeper search (stronger, slower). chess expert is only depth 4" />
      </p>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((d) => {
          const active = value === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onChange(d)}
              className={`arcade-cab-btn flex-1 min-w-[4.5rem] uppercase ${
                active ? "is-active-cyan" : ""
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>
      {/* warn that deeper = slower so people don't think it's broken */}
      {value === "hard" && (
        <p className="font-vt text-lg text-muted">HARD = DEEPER SEARCH - MOVES TAKE A BIT LONGER</p>
      )}
      {value === "expert" && (
        <p className="font-vt text-lg text-muted">
          EXPERT = DEEPEST SEARCH HERE - CHESS CAPS AT DEPTH 4 (SLOW ON PURPOSE, NOT STOCKFISH)
        </p>
      )}
    </div>
  );
}
