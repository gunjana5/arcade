"use client";

import { ArcadeStickers } from "@/components/ArcadeStickers";
import { ArcadeTip } from "@/components/ArcadeTip";
import { ArcadeCoin, CoinProvider } from "@/components/CoinInsert";
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
        <div className="relative z-10 flex flex-col items-center w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-12 md:py-16">
          <div className="home-stage mb-10 md:mb-12">
            <ArcadeStickers layout="home" />

            <h1 className="arcade-title">arcade</h1>
            <p className="font-vt text-xl md:text-2xl text-muted mt-4 md:mt-6">
              four games. vs ai or same keyboard.
            </p>

            <p className="mt-8 md:mt-10 font-vt text-xl md:text-2xl text-neon-cyan inline-flex items-center justify-center gap-2 w-full">
              INSERT COIN
              <ArcadeTip text="drag the coin into a cabinet slot - or tap the coin then tap a slot" />
            </p>
          </div>

          <div className="flex flex-col items-center gap-2 mb-8">
            <ArcadeCoin />
            <p className="font-vt text-lg text-muted">drag into a cabinet</p>
          </div>

          <div
            id="cabinets"
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8 md:gap-10 w-full mb-14 scroll-mt-8"
          >
            {games.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>

          <div className="w-full arcade-panel">
            <div className="arcade-panel-bar">
              <span>HIGH SCORES</span>
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
