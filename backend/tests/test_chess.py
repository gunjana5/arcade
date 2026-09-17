# chess rules - castling as implemented, no en passant claimed here
from games.chess import (
    EMPTY,
    chess_ai_move,
    chess_apply_move,
    chess_get_moves,
    chess_get_state,
)


def test_opening_pawn_and_knight_legal():
    state = chess_get_state()
    moves = chess_get_moves(state)
    # e2-e4 and b1-c3 from the start position
    assert (6, 4, 4, 4) in moves  # e2 -> e4
    assert (7, 1, 5, 2) in moves  # Nb1 -> c3
    assert (6, 4, 3, 4) not in moves  # pawns don't jump three


def test_castling_kingside_when_clear():
    # clear white kingside path; rights default = none moved
    board = [[EMPTY] * 8 for _ in range(8)]
    board[7][4] = "K"
    board[7][7] = "R"
    board[0][4] = "k"
    state = chess_get_state(board, white_turn=True)
    moves = chess_get_moves(state)
    assert (7, 4, 7, 6) in moves
    castled = chess_apply_move(state, 7, 4, 7, 6)
    assert castled["board"][7][6] == "K"
    assert castled["board"][7][5] == "R"
    assert castled["castling_rights"]["white_king_moved"] is True


def test_castling_blocked_when_king_moved_flag():
    board = [[EMPTY] * 8 for _ in range(8)]
    board[7][4] = "K"
    board[7][7] = "R"
    board[0][4] = "k"
    rights = {
        "white_king_moved": True,
        "black_king_moved": False,
        "white_rook_a_moved": False,
        "white_rook_h_moved": False,
        "black_rook_a_moved": False,
        "black_rook_h_moved": False,
    }
    state = chess_get_state(board, white_turn=True, castling_rights=rights)
    moves = chess_get_moves(state)
    assert (7, 4, 7, 6) not in moves


def test_castling_rejects_wrong_colour_rook():
    # black rook on h1 must not unlock white kingside castle
    board = [[EMPTY] * 8 for _ in range(8)]
    board[7][4] = "K"
    board[7][7] = "r"
    board[0][4] = "k"
    state = chess_get_state(board, white_turn=True)
    moves = chess_get_moves(state)
    assert (7, 4, 7, 6) not in moves


def test_checkmate_white_wins():
    # scholar-style mate: Q on f7, B on c4, black to move
    board = [[EMPTY] * 8 for _ in range(8)]
    board[0] = list("rnbqk") + [EMPTY] + list("nr")
    board[1] = list("pppp") + [EMPTY, "Q", "p", "p"]
    board[3][4] = "p"
    board[4][2] = "B"
    board[4][4] = "P"
    board[6] = list("PPPP") + [EMPTY, "P", "P", "P"]
    board[7] = list("RNB") + [EMPTY, "K"] + [EMPTY, "N", "R"]
    state = chess_get_state(board, white_turn=False)
    assert state["gameOver"] is True
    assert state["winner"] == "White"
    assert state["inCheck"] is True


def test_stalemate_is_draw():
    # black king a8, white king c6 + queen c7 - classic stalemate shape
    board = [[EMPTY] * 8 for _ in range(8)]
    board[0][0] = "k"
    board[1][2] = "Q"
    board[2][2] = "K"
    state = chess_get_state(board, white_turn=False)
    assert state["gameOver"] is True
    assert state["winner"] == "Draw"
    assert state["inCheck"] is False


def test_easy_ai_picks_legal_move():
    state = chess_get_state()
    move = chess_ai_move(state, "easy")
    assert move is not None
    assert move in chess_get_moves(state)
