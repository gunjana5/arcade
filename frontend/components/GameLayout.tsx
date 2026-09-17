"use client";

import { ReactNode, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArcadeStickers } from "@/components/ArcadeStickers";
import { ArcadeTip } from "@/components/ArcadeTip";
import { CrtOverlay } from "@/components/CrtOverlay";

export function GameLayout({
  title,
  children,
  sidePanel,
  howToPlay,
}: {
  title: string;
  children: ReactNode; // the board / main play area
  sidePanel: ReactNode; // usually <ControlPanel ... />
  howToPlay?: ReactNode;
}) {
  const [showHelp, setShowHelp] = useState(false);
  return (
    <div className="min-h-screen arcade-page-bg overflow-x-hidden">
      <CrtOverlay />
      <div className="relative z-10 w-full max-w-[min(1440px,96vw)] mx-auto px-4 sm:px-8 lg:px-12 py-6 md:py-10">
        {/* home | title | how? - title stays roughly centred */}
        <motion.header
          className="mb-8 md:mb-10"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <Link href="/" className="btn-neon btn-neon-purple shrink-0">
              {"<< HOME"}
            </Link>
            <div className="flex-1 min-w-[12ch] mx-auto max-w-xl text-center">
              <h1 className="arcade-game-title inline-flex items-center justify-center gap-2">
                {title}
                <ArcadeTip text="poke the neon ? on controls for field help - HOW? is the full rules modal" />
              </h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {howToPlay != null && (
                <button
                  type="button"
                  onClick={() => setShowHelp(true)}
                  className="btn-neon btn-neon-pink"
                >
                  HOW?
                </button>
              )}
              {/* spacer so the title stays centred when HOW? is missing */}
              <span className="w-10 md:w-12" aria-hidden />
            </div>
          </div>
        </motion.header>

        {/* backdrop click closes - stopPropagation on the panel itself */}
        <AnimatePresence>
          {showHelp && howToPlay != null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ backgroundColor: "var(--overlay-backdrop)" }}
              onClick={() => setShowHelp(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="arcade-panel max-w-lg w-full max-h-[85vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="arcade-panel-bar">
                  <span>HOW IT WORKS</span>
                  <div className="arcade-panel-btns" aria-hidden>
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
                <div className="arcade-panel-body !bg-[#0e0818] !text-[#e8e8ff]">
                  <div className="flex justify-end mb-2">
                    <button
                      type="button"
                      onClick={() => setShowHelp(false)}
                      className="text-neon-pink text-3xl leading-none font-vt"
                      aria-label="close"
                    >
                      ×
                    </button>
                  </div>
                  <div className="font-vt text-xl space-y-3 leading-relaxed [&_strong]:text-neon-pink">
                    {howToPlay}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* board left, control panel right on wide screens */}
        <div className="flex flex-col xl:flex-row gap-8 xl:gap-12 xl:items-start justify-center w-full">
          <div className="flex-1 w-full min-w-0 flex justify-center overflow-visible">
            <div className="arcade-cabinet w-full max-w-[min(980px,100%)]">
              <ArcadeStickers layout="cabinet" />
              {/* inner crt - stickers stay on the bezel, not the board */}
              <div className="game-play-surface w-full flex justify-center p-6 md:p-10 lg:p-14">
                <div className="w-full flex flex-col items-center justify-center">{children}</div>
              </div>
            </div>
          </div>
          <div className="xl:w-[22rem] xl:shrink-0 w-full max-w-md mx-auto xl:mx-0">
            <div className="panel-retro panel-retro--controls p-4 md:p-5 relative">
              <Image
                src="/stickers/joystick.svg"
                alt=""
                width={28}
                height={32}
                unoptimized
                className="absolute -top-3 -right-2 pointer-events-none"
                style={{ imageRendering: "pixelated" }}
              />
              {sidePanel}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
