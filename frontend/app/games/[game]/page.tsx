"use client";

import { useParams } from "next/navigation";
import { TicTacToePage } from "@/components/games/TicTacToePage";
import { Connect4Page } from "@/components/games/Connect4Page";
import { CheckersPage } from "@/components/games/CheckersPage";
import { ChessPage } from "@/components/games/ChessPage";
import Link from "next/link";

// new game? add the component here + a card id on the home page
const PAGES: Record<string, React.ComponentType> = {
  tictactoe: TicTacToePage,
  connect4: Connect4Page,
  checkers: CheckersPage,
  chess: ChessPage,
};

export default function GamePage() {
  // slug from the url path segment
  const params = useParams();
  const game = params?.game as string;
  const Page = game ? PAGES[game] : null;

  if (!Page) {
    // typo'd url or old link
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-bg-void font-vt px-4">
        <p className="text-neon-pink lowercase">no game at this url</p>
        <Link href="/" className="btn-neon btn-neon-cyan lowercase">
          home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden arcade-page-bg">
      <Page />
    </div>
  );
}
