import type { Metadata } from "next";
import { Pixelify_Sans, Press_Start_2P, VT323 } from "next/font/google";
import { ArcadeWelcome } from "@/components/ArcadeWelcome";
import "./globals.css";

// press = titles / WELCOME, bubble = PLAY chips, vt = body
const pressStart = Press_Start_2P({
  subsets: ["latin"],
  variable: "--font-press",
  weight: "400",
});

const pixelify = Pixelify_Sans({
  subsets: ["latin"],
  variable: "--font-bubble",
  weight: ["400", "500", "600", "700"],
});

const vt323 = VT323({
  subsets: ["latin"],
  variable: "--font-vt",
  weight: "400",
});

export const metadata: Metadata = {
  title: "cyber arcade",
  description: "retro neon browser games - tic tac toe, connect 4, checkers, chess",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // font vars on <html> so every page can use font-press / font-bubble / font-vt
  return (
    <html lang="en" className={`${pressStart.variable} ${pixelify.variable} ${vt323.variable}`}>
      <body className="min-h-screen bg-bg-void font-vt text-fg antialiased">
        <ArcadeWelcome />
        {children}
      </body>
    </html>
  );
}
