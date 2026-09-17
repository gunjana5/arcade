# adapters so ttt can use MinimaxEngine
# hard/expert depth 9 = whole tree, ai shouldn't lose
from ai.minimax import MinimaxEngine

EMPTY, X, O = " ", "X", "O"


def _winner(board: list[list[str]]) -> str | None:
    # same win checks as tictactoe.get_winner - kept local here
    for row in board:
        if row[0] != EMPTY and row[0] == row[1] == row[2]:
            return row[0]
    for c in range(3):
        if board[0][c] != EMPTY and board[0][c] == board[1][c] == board[2][c]:
            return board[0][c]
    if board[0][0] != EMPTY and board[0][0] == board[1][1] == board[2][2]:
        return board[0][0]
    if board[0][2] != EMPTY and board[0][2] == board[1][1] == board[2][0]:
        return board[0][2]
    return None


def _full(board: list[list[str]]) -> bool:
    return all(c != EMPTY for row in board for c in row)


def _actions(board: list[list[str]]) -> list[tuple[int, int]]:
    return [(r, c) for r in range(3) for c in range(3) if board[r][c] == EMPTY]


def _apply(board: list[list[str]], action: tuple[int, int], player: str) -> list[list[str]]:
    r, c = action
    new = [list(row) for row in board]
    new[r][c] = player
    return new


def _turn(board: list[list[str]]) -> str:
    # x always starts so equal counts => x to move
    xc = sum(1 for row in board for c in row if c == X)
    oc = sum(1 for row in board for c in row if c == O)
    return X if xc == oc else O


def best_move(board: list[list[str]], maximizer: str, max_depth: int) -> tuple[int, int] | None:
    # early out if no moves
    actions = _actions(board)
    if not actions:
        return None
    # one move left = just take it
    if len(actions) == 1:
        return actions[0]

    def get_actions(s):
        return _actions(s)

    def apply(s, a):
        return _apply(s, a, _turn(s))

    def is_terminal(s):
        return _winner(s) is not None or _full(s)

    def evaluate(s):
        # ttt leaves are just win/lose/draw - no fancy heuristic needed
        w = _winner(s)
        if w is None:
            return 0.0
        return 1.0 if w == maximizer else -1.0

    engine = MinimaxEngine(
        max_depth=max_depth,
        get_actions=get_actions,
        apply=apply,
        is_terminal=is_terminal,
        evaluate=evaluate,
        # root player is the max side for this call
        is_maximizer_turn=lambda s: _turn(s) == maximizer,
    )
    return engine.best_action(board)
