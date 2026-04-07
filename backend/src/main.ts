// Tic-Tac-Toe Game State
interface TicTacToeState extends nkruntime.MatchState {
  board: string[];           // 9-cell array: '' | 'X' | 'O'
  players: {                 // userId → mark
    [userId: string]: 'X' | 'O';
  };
  presences: {               // userId → Presence (tracks who's connected)
    [userId: string]: nkruntime.Presence;
  };
  currentTurn: string;       // userId of the player whose turn it is
  winner: string | null;     // userId of the winner, 'DRAW', or null
  gameOver: boolean;
  ticksSinceLastMove: number;
  turnTimeoutTicks: number;  // auto-forfeit after this many ticks
}

// Op codes for client↔server messages
const OpCode = {
  // Server → Client
  UPDATE_STATE: 1,
  GAME_OVER: 2,
  // Client → Server
  MAKE_MOVE: 3,
};

const WIN_PATTERNS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diagonals
];

const TICK_RATE = 5;          // 5 ticks/sec
const TURN_TIMEOUT_SECONDS = 30;

function checkWinner(board: string[]): string | null {
  for (const [a, b, c] of WIN_PATTERNS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]; // 'X' or 'O'
    }
  }
  if (board.every(cell => cell !== '')) return 'DRAW';
  return null;
}

// ─── Match Handlers ────────────────────────────────────────────────────────────

const matchInit: MatchInitFunction<TicTacToeState> = (ctx, logger, _nk, params) => {
  logger.info('TicTacToe: matchInit called');
  const state: TicTacToeState = {
    board: Array(9).fill(''),
    players: {},
    presences: {},
    currentTurn: '',
    winner: null,
    gameOver: false,
    ticksSinceLastMove: 0,
    turnTimeoutTicks: TURN_TIMEOUT_SECONDS * TICK_RATE,
  };
  return { state, tickRate: TICK_RATE, label: JSON.stringify({ open: true }) };
};

const matchJoinAttempt: MatchJoinAttemptFunction<TicTacToeState> = (
  ctx, logger, _nk, dispatcher, tick, state, presence, metadata
) => {
  const playerCount = Object.keys(state.players).length;
  if (playerCount >= 2) {
    return { state, accept: false, rejectMessage: 'Match is full.' };
  }
  // Assign X to first joiner, O to second
  const mark: 'X' | 'O' = playerCount === 0 ? 'X' : 'O';
  state.players[presence.userId] = mark;
  logger.info(`TicTacToe: ${presence.username} joined as ${mark}`);
  return { state, accept: true };
};

const matchJoin: MatchJoinFunction<TicTacToeState> = (
  ctx, logger, _nk, dispatcher, tick, state, presences
) => {
  for (const p of presences) {
    state.presences[p.userId] = p;
  }

  // Start the game once both players are in
  if (Object.keys(state.players).length === 2) {
    // First player (X) goes first
    const xPlayer = Object.entries(state.players).find(([_, mark]) => mark === 'X');
    if (xPlayer) state.currentTurn = xPlayer[0];

    dispatcher.matchLabelUpdate(JSON.stringify({ open: false }));
    broadcastState(dispatcher, state, null);
    logger.info('TicTacToe: Game started!');
  }

  return { state };
};

const matchLeave: MatchLeaveFunction<TicTacToeState> = (
  ctx, logger, _nk, dispatcher, tick, state, presences
) => {
  for (const p of presences) {
    delete state.presences[p.userId];
    // If game is still active and a player leaves, they forfeit
    if (!state.gameOver) {
      // Find the opponent
      const opponentId = Object.keys(state.players).find(id => id !== p.userId);
      state.gameOver = true;
      state.winner = opponentId || null;
      logger.warn(`TicTacToe: ${p.username} disconnected — opponent wins.`);
      broadcastGameOver(dispatcher, state);
    }
  }
  return { state };
};

const matchLoop: MatchLoopFunction<TicTacToeState> = (
  ctx, logger, _nk, dispatcher, tick, state, messages
) => {
  if (state.gameOver) {
    // Keep match alive briefly for clients to see result, then terminate
    return null;
  }

  // Process incoming move messages
  for (const msg of messages) {
    if (msg.opCode !== OpCode.MAKE_MOVE) continue;
    const senderId = msg.sender.userId;

    // Validate it's this player's turn
    if (senderId !== state.currentTurn) {
      logger.warn(`TicTacToe: ${msg.sender.username} tried to move out of turn.`);
      continue;
    }

    let move: { position: number };
    try {
      move = JSON.parse(msg.data);
    } catch (e) {
      logger.error('TicTacToe: Invalid move JSON: ' + msg.data);
      continue;
    }

    const pos = move.position;
    if (pos < 0 || pos > 8 || state.board[pos] !== '') {
      logger.warn(`TicTacToe: Invalid cell ${pos} by ${msg.sender.username}`);
      continue;
    }

    // Apply the move
    const mark = state.players[senderId];
    state.board[pos] = mark;
    state.ticksSinceLastMove = 0;

    // Check win/draw
    const result = checkWinner(state.board);
    if (result) {
      if (result === 'DRAW') {
        state.winner = 'DRAW';
      } else {
        // result is 'X' or 'O' — find the userId
        state.winner = Object.entries(state.players).find(([_, m]) => m === result)?.[0] || null;
      }
      state.gameOver = true;
      broadcastState(dispatcher, state, null);
      broadcastGameOver(dispatcher, state);
      return null; // End match
    }

    // Switch turn
    state.currentTurn = Object.keys(state.players).find(id => id !== senderId) || '';
    broadcastState(dispatcher, state, null);
  }

  // Turn timeout enforcement
  if (Object.keys(state.players).length === 2) {
    state.ticksSinceLastMove++;
    if (state.ticksSinceLastMove >= state.turnTimeoutTicks) {
      // The player whose turn it is forfeits
      const opponentId = Object.keys(state.players).find(id => id !== state.currentTurn);
      state.winner = opponentId || 'DRAW';
      state.gameOver = true;
      logger.warn(`TicTacToe: Turn timeout — ${state.currentTurn} forfeited.`);
      broadcastState(dispatcher, state, null);
      broadcastGameOver(dispatcher, state);
      return null;
    }
  }

  return { state };
};

const matchSignal: MatchSignalFunction<TicTacToeState> = (
  ctx, logger, _nk, dispatcher, tick, state, data
) => {
  return { state, data };
};

const matchTerminate: MatchTerminateFunction<TicTacToeState> = (
  ctx, logger, _nk, dispatcher, tick, state, graceSeconds
) => {
  logger.info('TicTacToe: matchTerminate called');
  return { state };
};

// ─── Broadcast Helpers ─────────────────────────────────────────────────────────

function broadcastState(
  dispatcher: nkruntime.MatchDispatcher,
  state: TicTacToeState,
  presences: nkruntime.Presence[] | null
) {
  const payload = JSON.stringify({
    board: state.board,
    currentTurn: state.currentTurn,
    players: state.players,
    ticksRemaining: state.turnTimeoutTicks - state.ticksSinceLastMove,
  });
  dispatcher.broadcastMessage(OpCode.UPDATE_STATE, payload, presences, null, true);
}

function broadcastGameOver(
  dispatcher: nkruntime.MatchDispatcher,
  state: TicTacToeState
) {
  const payload = JSON.stringify({
    winner: state.winner,
    board: state.board,
    players: state.players,
  });
  dispatcher.broadcastMessage(OpCode.GAME_OVER, payload, null, null, true);
}

// ─── RPC: FindOrCreateMatch ────────────────────────────────────────────────────
// Clients call this to get a match they can join (or start one)
/**
 * Find or create a match for the player
 * If an open match exists, return its ID
 * Otherwise, create a new match and return its ID
 */
const rpcFindOrCreateMatch: RpcFunction = (ctx, logger, nk, payload) => {
  try {
    // Try to find an open match with limit: 1
    const matches = nk.matchList(1, true, null, { open: true }, null);
    
    if (matches && matches.length > 0) {
      // Found an open match, return its ID
      const matchId = matches[0].match_id;
      logger.info(`TicTacToe RPC: Found open match: ${matchId}`);
      return JSON.stringify({ match_id: matchId });
    }

    // No open match found, create a new one
    const newMatchId = nk.matchCreate('tictactoe', {});
    logger.info(`TicTacToe RPC: Created new match: ${newMatchId}`);
    return JSON.stringify({ match_id: newMatchId });
  } catch (err) {
    logger.error(`TicTacToe RPC Error: ${err}`);
    return JSON.stringify({ error: 'Failed to find or create match' });
  }
};

// ─── InitModule ───────────────────────────────────────────────────────────────

export function InitModule(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  initializer: Initializer
): void {
  logger.info('TicTacToe: Initializing module…');

  // Create the leaderboard (wins)
  nk.leaderboardCreate('tictactoe_wins', false, nkruntime.SortOrder.Descending, nkruntime.Operator.Incr, null, null);

  initializer.registerMatch<TicTacToeState>('tictactoe', {
    matchInit,
    matchJoinAttempt,
    matchJoin,
    matchLeave,
    matchLoop,
    matchSignal,
    matchTerminate,
  });

  initializer.registerRpc('find_or_create_match', rpcFindOrCreateMatch);

  logger.info('TicTacToe: Module initialized successfully.');
}
