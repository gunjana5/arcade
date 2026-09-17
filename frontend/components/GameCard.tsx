"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { CoinSlot } from "@/components/CoinInsert";

// skin class = colour in globals.css (.game-card-retro.tic etc)
const META: Record<
  string,
  { title: string; blurb: string; skin: string; icon: string }
> = {
  tictactoe: {
    title: "Tic Tac Toe",
    blurb: "insert coin",
    skin: "tic",
    icon: "/icons/ttt.svg",
  },
  connect4: {
    title: "Connect 4",
    blurb: "insert coin",
    skin: "connect4",
    icon: "/icons/connect4.svg",
  },
  checkers: {
    title: "Checkers",
    blurb: "insert coin",
    skin: "checkers",
    icon: "/icons/checkers.svg",
  },
  chess: {
    title: "Chess",
    blurb: "insert coin",
    skin: "chess",
    icon: "/icons/chess.svg",
  },
};

export function GameCard({
  game,
}: {
  game: { id: string; name: string; icon: string; accent?: string };
}) {
  // fallback if someone typos an id on the home page
  const meta = META[game.id] ?? {
    title: game.name,
    blurb: "insert coin",
    skin: "tic",
    icon: "/icons/ttt.svg",
  };

  return (
    // parent grid owns staggerChildren - these variants just do the per-card pop
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 28 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ type: "spring", stiffness: 280, damping: 20 }}
      className="h-full"
    >
      <div className={`game-card-retro ${meta.skin} !cursor-default`}>
        {/* title link = shortcut; primary path is the coin slot below */}
        <Link
          href={`/games/${game.id}`}
          className="flex flex-col items-center gap-2 no-underline text-inherit"
        >
          <Image
            src={meta.icon}
            alt=""
            width={72}
            height={72}
            unoptimized
            className="mb-1"
          />
          <h2>{meta.title}</h2>
          <p className="font-bubble text-base tracking-wide opacity-90">{meta.blurb}</p>
        </Link>
        <CoinSlot gameId={game.id} label={meta.title} />
      </div>
    </motion.div>
  );
}
