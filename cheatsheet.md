arcade

what it is
four board games in the browser. vs ai or same keyboard. not a games platform.

when
started Jul 2025, finished Aug 2026. this pass is a tidy-up then back on github.

the games
ttt, connect4, checkers, chess. vs ai or local two-player. no online matchmaking.

four difficulties, four methods
easy = random legal. still obeys the rules.
medium = one look. ttt/c4: win this turn, else block, else centre-ish. chess/checkers: greedy on the existing eval. no minimax yet.
hard + expert = shared minimax + alpha-beta. expert is just deeper. ttt expert is the full tree (depth 9). chess expert is depth 5, slow on purpose, not stockfish.

how a move works
frontend posts the whole board each time. no match sessions on the server.

leaderboard
login only if you want ai wins saved. server re-checks the final board is a human win vs the ai. guest can still play.

ui
coin into a cabinet to open a game. stickers. glowing ? tips. no first-visit popup.

live
vercel ui + render api. render disk wipes on redeploy. expected. logins can vanish. that is the free host, not a bug.

honest limits
no en passant. a crafted terminal human-win board can still score (no match log). easy can blunder a win. medium does not look ahead. not stockfish.

if they ask "did ai write this"
i used help. the rules, the search, win_check, and the four levels are mine to explain.

easy: pick a legal move at random so you can actually beat it. first youtube opponent is always random.

medium: i did this before i wired search. look at the next move only. take a win, else block, else a simple preference (centre / greedy score). it does not think further than that.

hard: shared minimax with alpha-beta at a mid depth. can still lose.

expert: same engine, i turned the depth up. ttt is solved from an empty board. chess caps at 5 because pure python branching gets slow. that lag is the search, not the website being broken.

if they ask how i learnt it
wjec a-levels, then york. fastapi / next / minimax from youtube, docs, open source. i did not invent minimax. i wired four games into one search and made the ui. difficulties are four methods i tried (random, one-look, then search, then deeper search), not a depth slider.
