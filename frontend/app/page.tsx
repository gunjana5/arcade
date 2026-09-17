"use client";

import { motion } from "framer-motion";
import { ArcadeStickers } from "@/components/ArcadeStickers";
import { ArcadeTip } from "@/components/ArcadeTip";
import { ArcadeCoin, CoinProvider } from "@/components/CoinInsert";
import { CrtOverlay } from "@/components/CrtOverlay";
import { GameCard } from "@/components/GameCard";
import { Leaderboard } from "@/components/Leaderboard";

// id must match keys in app/games/[game]/page.tsx
const games = [
  { id: "tictactoe", name: "tic tac toe", icon: "X", accent: "pink" as const },
  { id: "connect4", name: "connect 4", icon: "O", accent: "cyan" as const },
  { id: "checkers", name: "checkers", icon: "C", accent: "pink" as const },
  { id: "chess", name: "chess", icon: "K", accent: "purple" as const },
];

export default function HomePage() {
  return (
    // provider so the coin + every cabinet slot share armed state
    <CoinProvider>
      <main className="relative min-h-screen overflow-x-hidden arcade-page-bg">
        <CrtOverlay />
        <div className="relative z-10 flex flex-col items-center w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-12 md:py-16">
          {/* crt welcome screen - title only, no play button */}
          <div className="arcade-hero-stage mb-10 md:mb-12">
            <ArcadeStickers layout="home" />

            <motion.h1
              className="arcade-title"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              WELCOME
            </motion.h1>

            <motion.p
              className="arcade-title-sub mt-4 md:mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              cyber arcade
            </motion.p>

            <motion.p
              className="mt-8 md:mt-10 font-vt text-xl md:text-2xl text-neon-cyan tracking-[0.28em] inline-flex items-center justify-center gap-2 w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              INSERT COIN
              <ArcadeTip text="drag the coin into a cabinet slot - or tap the coin then tap a slot" />
            </motion.p>
          </div>

          {/* shared coin sits above the cabinets so you can drag into any slot */}
          <motion.div
            className="flex flex-col items-center gap-2 mb-8"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <ArcadeCoin />
            <p className="font-vt text-lg text-muted tracking-widest">
              DRAG INTO A CABINET
            </p>
          </motion.div>

          {/* each card is a machine - drop the coin on INSERT to start */}
          <motion.div
            id="cabinets"
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8 md:gap-10 w-full mb-14 scroll-mt-8"
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.08 } },
              hidden: {},
            }}
          >
            {games.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </motion.div>

          <div className="w-full arcade-panel">
            <div className="arcade-panel-bar">
              <span>HIGH SCORES</span>
              <div className="arcade-panel-btns" aria-hidden>
                <i />
                <i />
                <i />
              </div>
            </div>
            <div className="arcade-panel-body !bg-[#08081a] !text-[#e8e8ff] p-5 md:p-8">
              <Leaderboard />
            </div>
          </div>
        </div>
      </main>
    </CoinProvider>
  );
}
