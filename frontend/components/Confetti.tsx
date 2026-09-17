"use client";

// cheap confetti burst - random positions once, then fall. calls onComplete so parent can unmount
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

// pull from theme so it matches the rest of the arcade
const COLOR_VARS = [
  "var(--neon-cyan)",
  "var(--neon-purple)",
  "var(--neon-pink)",
  "var(--neon-orange)",
  "var(--neon-green)",
];
const COUNT = 48;

export function Confetti({ onComplete }: { onComplete?: () => void }) {
  // useState lazy init - otherwise pieces reshuffle every render
  const [pieces] = useState(() =>
    Array.from({ length: COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * 100 - 50,
      delay: Math.random() * 0.3,
      duration: 1.2 + Math.random() * 0.5,
      color: COLOR_VARS[i % COLOR_VARS.length],
      size: 6 + Math.random() * 6,
      rotation: Math.random() * 360,
      // every third piece is a circle, rest are flat rectangles
      circle: i % 3 === 0,
    }))
  );

  useEffect(() => {
    // tell parent to clear showConfetti after the animation
    const t = setTimeout(() => onComplete?.(), 3500);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-[100]">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          className={p.circle ? "absolute rounded-full" : "absolute rounded-sm"}
          style={{
            width: p.circle ? p.size : p.size,
            height: p.circle ? p.size : p.size * 0.6,
            background: p.color,
            // spawn near centre, then fly out + down
            left: "50%",
            top: "40%",
          }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{
            x: p.x * 10,
            y: 420,
            opacity: 0,
            rotate: p.rotation + 360,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}
