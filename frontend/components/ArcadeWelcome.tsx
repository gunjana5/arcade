"use client";

import { useEffect, useState } from "react";
import { ArcadeStickers } from "@/components/ArcadeStickers";
import "./ArcadeWelcome.css";

// bump the key when the copy changes so returning users see it once
const KEY = "cyber-arcade-welcome-seen-v4";

export function ArcadeWelcome() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      // only show once per browser
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* private mode / blocked storage - just close */
    }
  };

  if (!open) return null;

  return (
    <div className="arcade-welcome" role="dialog" aria-label="welcome">
      <div className="arcade-welcome-stack">
        {/* offset twin panel behind the card */}
        <div className="arcade-welcome-ghost" aria-hidden />
        <div className="arcade-welcome-card relative">
          <ArcadeStickers layout="welcome" />
          <div className="arcade-panel-bar !m-0 rounded-none">
            <span>PLAYER 1</span>
            <div className="arcade-panel-btns" aria-hidden>
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="arcade-welcome-body-wrap">
            <p className="arcade-welcome-title">INSERT COIN</p>
            <p className="arcade-welcome-body">
              welcome to cyber arcade - pick a cabinet and play vs ai or local.
              drag the coin into a cabinet slot (or tap coin then slot).
              anywhere you see a glowing <strong>i</strong>, poke it for a short note on that control.
              HOW? is the full rules modal.
            </p>
            <button type="button" className="btn-gem-play arcade-welcome-ok" onClick={dismiss}>
              GOT IT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
