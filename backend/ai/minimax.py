# shared minimax + alpha-beta
# each game passes in: legal moves, apply move, game over?, score board, whose turn
# difficulty = max_depth (per-game DEPTHS / DIFFICULTY_DEPTHS)
from typing import Callable, TypeVar

StateT = TypeVar("StateT")
ActionT = TypeVar("ActionT")


class MinimaxEngine:
    def __init__(
        self,
        max_depth: int,
        get_actions: Callable[[StateT], list[ActionT]],
        apply: Callable[[StateT, ActionT], StateT],
        is_terminal: Callable[[StateT], bool],
        evaluate: Callable[[StateT], float],
        is_maximizer_turn: Callable[[StateT], bool],
    ) -> None:
        self.max_depth = max_depth
        self._get_actions = get_actions
        self._apply = apply
        self._is_terminal = is_terminal
        self._evaluate = evaluate
        self._is_maximizer_turn = is_maximizer_turn

    def best_action(self, state: StateT) -> ActionT | None:
        # try each legal move, score the resulting tree, keep the best
        actions = self._get_actions(state)
        if not actions:
            return None
        # whose turn at the root decides max vs min
        maximizing = self._is_maximizer_turn(state)
        best_a: ActionT | None = None
        best_v = float("-inf") if maximizing else float("inf")
        for a in actions:
            new_s = self._apply(state, a)
            # after this ply the other side to move in the recursion
            v = self._minimax_ab(new_s, 1, float("-inf"), float("inf"), not maximizing)
            if maximizing and v > best_v:
                best_v, best_a = v, a
            if not maximizing and v < best_v:
                best_v, best_a = v, a
        return best_a

    def _minimax_ab(
        self, state: StateT, depth: int, alpha: float, beta: float, maximizing: bool
    ) -> float:
        # leaf: hit depth limit or game over -> heuristic score
        if depth >= self.max_depth or self._is_terminal(state):
            return self._evaluate(state)
        actions = self._get_actions(state)
        if not actions:
            return self._evaluate(state)
        if maximizing:
            # maximiser wants high scores
            v = float("-inf")
            for a in actions:
                v = max(v, self._minimax_ab(self._apply(state, a), depth + 1, alpha, beta, False))
                alpha = max(alpha, v)
                # prune - opponent already has something better elsewhere
                if beta <= alpha:
                    break
            return v
        else:
            # minimiser wants low scores
            v = float("inf")
            for a in actions:
                v = min(v, self._minimax_ab(self._apply(state, a), depth + 1, alpha, beta, True))
                beta = min(beta, v)
                if beta <= alpha:
                    break  # prune here too
            return v
