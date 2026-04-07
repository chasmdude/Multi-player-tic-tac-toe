// Tic-Tac-Toe Nakama Match Handler (Simplified for Nakama goja runtime)

// Win patterns (3-in-a-row)
const WIN_PATTERNS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diagonals
];

function checkWinner(board) {
  for (let i = 0; i < WIN_PATTERNS.length; i++) {
    const pattern = WIN_PATTERNS[i];
    const a = pattern[0];
    const b = pattern[1];
    const c = pattern[2];
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]; // 'X' or 'O'
    }
  }
  let isFilled = true;
  for (let i = 0; i < board.length; i++) {
    if (board[i] === '') {
      isFilled = false;
      break;
    }
  }
  if (isFilled) return 'DRAW';
  return null;
}

const matchInit = function(ctx, logger, nk, params) {
  logger.info('TicTacToe: matchInit');
  return {
    state: {
      board: ['', '', '', '', '', '', '', '', ''],
      players: {},
      currentTurn: '',
      winner: null,
      gameOver: false,
    },
    tickRate: 5,
    label: JSON.stringify({ open: true }),
  };
};

const matchJoinAttempt = function(ctx, logger, nk, dispatcher, tick, state, presence, metadata) {
  const playerCount = Object.keys(state.players).length;
  if (playerCount >= 2) {
    return { state: state, accept: false, rejectMessage: 'Match is full.' };
  }
  const mark = playerCount === 0 ? 'X' : 'O';
  state.players[presence.userId] = mark;
  logger.info('TicTacToe: ' + presence.username + ' joined as ' + mark);
  return { state: state, accept: true };
};

const matchJoin = function(ctx, logger, nk, dispatcher, tick, state, presences) {
  if (Object.keys(state.players).length === 2 && state.currentTurn === '') {
    const xPlayerId = Object.keys(state.players).find(function(id) { return state.players[id] === 'X'; });
    if (xPlayerId) {
      state.currentTurn = xPlayerId;
    }
    dispatcher.matchLabelUpdate(JSON.stringify({ open: false }));
    dispatcher.broadcastMessage(1, JSON.stringify(state), null, null, true);
    logger.info('TicTacToe: Game started');
  }
  return { state: state };
};

const matchLeave = function(ctx, logger, nk, dispatcher, tick, state, presences) {
  return { state: state };
};

const matchLoop = function(ctx, logger, nk, dispatcher, tick, state, messages) {
  if (!state.gameOver && messages && messages.length > 0) {
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.opCode === 3) {  // MAKE_MOVE
        if (msg.sender.userId === state.currentTurn) {
          let move;
          try {
            move = JSON.parse(msg.data);
          } catch (e) {
            continue;
          }
          const pos = move.position;
          if (pos >= 0 && pos <= 8 && state.board[pos] === '') {
            const mark = state.players[msg.sender.userId];
            state.board[pos] = mark;
            
            const result = checkWinner(state.board);
            if (result) {
              if (result === 'DRAW') {
                state.winner = 'DRAW';
              } else {
                for (const userId in state.players) {
                  if (state.players[userId] === result) {
                    state.winner = userId;
                    break;
                  }
                }
              }
              state.gameOver = true;
              dispatcher.broadcastMessage(1, JSON.stringify(state), null, null, true);
              return null;
            }
            
            const opponent = Object.keys(state.players).find(function(id) { return id !== msg.sender.userId; });
            if (opponent) {
              state.currentTurn = opponent;
            }
            dispatcher.broadcastMessage(1, JSON.stringify(state), null, null, true);
          }
        }
      }
    }
  }
  return null;
};

const matchSignal = function(ctx, logger, nk, dispatcher, tick, state, data) {
  return { state: state, data: 'pong' };
};

const matchTerminate = function(ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
  return { state: state };
};

const rpcFindOrCreateMatch = function(ctx, logger, nk, payload) {
  try {
    const matches = nk.matchList(1, true, null, { open: true }, null);
    if (matches && matches.length > 0) {
      return JSON.stringify({ match_id: matches[0].match_id });
    }
    const matchId = nk.matchCreate('tictactoe', {});
    return JSON.stringify({ match_id: matchId });
  } catch (err) {
    logger.error('RPC error: ' + err);
    return JSON.stringify({ error: 'Failed to find or create match' });
  }
};

// InitModule - this MUST be a function declaration at module scope per Nakama spec
function InitModule(ctx, logger, nk, initializer) {
  logger.info('TicTacToe: InitModule called');
  initializer.registerMatch('tictactoe', {
    matchInit: matchInit,
    matchJoinAttempt: matchJoinAttempt,
    matchJoin: matchJoin,
    matchLeave: matchLeave,
    matchLoop: matchLoop,
    matchSignal: matchSignal,
    matchTerminate: matchTerminate,
  });
  initializer.registerRpc('find_or_create_match', rpcFindOrCreateMatch);
  logger.info('TicTacToe: Module initialized successfully');
}
