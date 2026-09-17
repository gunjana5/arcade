"use client";

// sparse arcade accents - favourites only (butterfly cat ghost joystick shooting-star sparkle)
import type { CSSProperties } from "react";
import Image from "next/image";

type Layout = "home" | "cabinet";

type Sticker = {
  src: string;
  w: number;
  h: number;
  style: CSSProperties;
};

// home: four corners on the title cabinet
const HOME: Sticker[] = [
  { src: "/stickers/butterfly.svg", w: 56, h: 44, style: { top: "14px", left: "12px" } },
  { src: "/stickers/sparkle.svg", w: 48, h: 48, style: { top: "16px", right: "16px" } },
  { src: "/stickers/cat.svg", w: 52, h: 52, style: { bottom: "14px", left: "14px" } },
  { src: "/stickers/joystick.svg", w: 52, h: 60, style: { bottom: "10px", right: "12px" } },
];

// cabinet bezel: a couple of marks so the board stays readable
const CABINET: Sticker[] = [
  { src: "/stickers/ghost.svg", w: 36, h: 36, style: { top: "8px", left: "10px" } },
  { src: "/stickers/sparkle.svg", w: 28, h: 28, style: { top: "10px", right: "12px" } },
  { src: "/stickers/shooting-star.svg", w: 52, h: 26, style: { bottom: "10px", right: "10px" } },
];

const MAP: Record<Layout, Sticker[]> = {
  home: HOME,
  cabinet: CABINET,
};

export function ArcadeStickers({ layout }: { layout: Layout }) {
  const items = MAP[layout];
  return (
    // pointer-events none so stickers never eat clicks
    <div className="sticker-layer" aria-hidden>
      {items.map((s, i) => (
        <Image
          key={`${s.src}-${i}`}
          src={s.src}
          alt=""
          width={s.w}
          height={s.h}
          unoptimized
          style={s.style}
        />
      ))}
    </div>
  );
}
