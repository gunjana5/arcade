"use client";

// end-of-game overlay. hide "play again" for a bit so you actually read the result
import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

export function VictoryBanner({
  text,
  subtext,
  variant,
  onPlayAgain,
  className = "",
}: {
  text: string;
  subtext?: string;
  variant: "win" | "lose" | "draw";
  onPlayAgain?: () => void;
  className?: string;
}) {
  const [showPlayAgain, setShowPlayAgain] = useState(false);

  useEffect(() => {
    // reset whenever the outcome changes
    setShowPlayAgain(false);
    // 3s pause before the button shows up
    const t = setTimeout(() => setShowPlayAgain(true), 3000);
    return () => clearTimeout(t);
  }, [text, variant]);

  // cyan = win, pink = lose, orange = draw
  const titleClass =
    variant === "win"
      ? "text-neon-cyan"
      : variant === "draw"
        ? "text-neon-orange"
        : "text-neon-pink";

  const borderClass =
    variant === "win"
      ? "border-neon-cyan"
      : variant === "draw"
        ? "border-neon-orange"
        : "border-neon-pink";

  const titleGlow =
    variant === "win"
      ? { textShadow: "var(--glow-cyan)", boxShadow: "var(--glow-cyan)" }
      : variant === "draw"
        ? { textShadow: "var(--glow-orange)", boxShadow: "var(--glow-orange)" }
        : { textShadow: "var(--glow-pink)", boxShadow: "var(--glow-pink)" };

  return (
    <motion.div
      className={`absolute inset-0 z-20 flex items-center justify-center p-4 ${className}`}
      style={{ background: "var(--overlay-board)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className={`bg-bg-void border-4 ${borderClass} rounded-xl px-10 py-8 text-center max-w-md w-full relative`}
        style={titleGlow}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <Image
          src="/stickers/sparkle.svg"
          alt=""
          width={24}
          height={24}
          unoptimized
          className="absolute top-3 left-4"
          style={{ imageRendering: "pixelated" }}
        />
        <Image
          src="/stickers/ghost.svg"
          alt=""
          width={26}
          height={26}
          unoptimized
          className="absolute top-3 right-4"
          style={{ imageRendering: "pixelated" }}
        />
        <p className="font-press text-[0.55rem] text-neon-pink tracking-[0.35em] mb-3">
          GAME OVER
        </p>
        <h3 className={`font-press text-sm sm:text-lg tracking-widest uppercase ${titleClass}`}>
          {text}
        </h3>
        {subtext && <p className="font-vt text-2xl text-secondary mt-3">{subtext}</p>}
        {/* only mount once the delay is done */}
        {showPlayAgain && onPlayAgain && (
          <motion.button
            type="button"
            className="btn-play mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={onPlayAgain}
          >
            PLAY AGAIN
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
}
