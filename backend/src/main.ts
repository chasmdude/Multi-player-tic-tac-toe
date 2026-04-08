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
      ticksSinceLastMove: 0,
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
  logger.info('TicTacToe: matchJoin - players: ' + JSON.stringify(state.players) + ', currentTurn: ' + state.currentTurn + ', playerCount: ' + Object.keys(state.players).length);
  
  // Broadcast state to newly joined player(s)
  dispatcher.broadcastMessage(1, JSON.stringify(state), null, null, true);
  
  // Set currentTurn to X player as soon as first player joins (for testing) or after 2nd player joins (for real games)
  if (state.currentTurn === '') {
    const xPlayerId = Object.keys(state.players).find(function(id) { return state.players[id] === 'X'; });
    if (xPlayerId) {
      state.currentTurn = xPlayerId;
      logger.info('TicTacToe: Setting currentTurn to X player: ' + xPlayerId);
    }
  }
  
  // When 2nd player joins, close the match for new players
  if (Object.keys(state.players).length === 2) {
    dispatcher.matchLabelUpdate(JSON.stringify({ open: false }));
    logger.info('TicTacToe: Match now full (2 players), closing for new joins');
  }
  
  dispatcher.broadcastMessage(1, JSON.stringify(state), null, null, true);
  logger.info('TicTacToe: Broadcast updated state');
  
  return { state: state };
};

const matchLeave = function(ctx, logger, nk, dispatcher, tick, state, presences) {
  for (let i = 0; i < presences.length; i++) {
    const presence = presences[i];
    logger.info('TicTacToe: ' + presence.username + ' left');
    // We keep them in state.players for reconnection support, 
    // but in a real app you might want to remove them if the game hasn't started.
  }
  return { state: state };
};

const matchLoop = function(ctx, logger, nk, dispatcher, tick, state, messages) {
  // Only process if match is full (2 players)
  const playerCount = Object.keys(state.players).length;
  
  if (!state.gameOver && messages && messages.length > 0) {
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.opCode === 3) {  // MAKE_MOVE
        if (playerCount < 2) {
          logger.info('TicTacToe: Move rejected - waiting for second player');
          continue;
        }
        
        if (msg.sender.userId === state.currentTurn) {
          let move;
          try {
            // Need to convert to string if it's not a string already, though JSON.parse might try
            let dataStr = typeof msg.data === 'string' ? msg.data : nk.binaryToString(msg.data);
            move = JSON.parse(dataStr);
            logger.info('TicTacToe: Valid move parsed: ' + JSON.stringify(move));
          } catch (e) {
            logger.error('TicTacToe: Failed to parse move data. Error: ' + e + ', Data type: ' + typeof msg.data + ', Data: ' + msg.data);
            continue;
          }
          const pos = move.position;
          if (pos >= 0 && pos <= 8 && state.board[pos] === '') {
            const mark = state.players[msg.sender.userId];
            state.board[pos] = mark;
            state.ticksSinceLastMove = 0;  // Reset timer after move
            
            const result = checkWinner(state.board);
            if (result) {
              if (result === 'DRAW') {
                state.winner = 'DRAW';
              } else {
                state.winner = msg.sender.userId;
              }
              state.gameOver = true;
              // Broadcast final state AND game over
              dispatcher.broadcastMessage(1, JSON.stringify(state), null, null, true);
              dispatcher.broadcastMessage(2, JSON.stringify({ winner: state.winner, board: state.board }), null, null, true);
              return { state: state };
            }
            
            const opponentId = Object.keys(state.players).find(function(id) { return id !== msg.sender.userId; });
            if (opponentId) {
              state.currentTurn = opponentId;
            }
          }
        }
      }
    }
  }
  
  // Skip timer/timeout if not full
  if (playerCount < 2) {
    state.ticksSinceLastMove = 0;
    dispatcher.broadcastMessage(1, JSON.stringify(state), null, null, true);
    return { state: state };
  }

  // Check for timeout (15 seconds = 75 ticks at 5 ticks/sec)
  if (!state.gameOver) {
    state.ticksSinceLastMove = (state.ticksSinceLastMove || 0) + 1;
    if (state.ticksSinceLastMove >= 75) {
      const opponent = Object.keys(state.players).find(function(id) { return id !== state.currentTurn; });
      if (opponent) {
        state.currentTurn = opponent;
        state.ticksSinceLastMove = 0;
      }
    }
  }
  
  // Broadcast state to keep everyone synced
  dispatcher.broadcastMessage(1, JSON.stringify(state), null, null, true);
  
  return { state: state };
};

const matchSignal = function(ctx, logger, nk, dispatcher, tick, state, data) {
  return { state: state, data: 'pong' };
};

const matchTerminate = function(ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
  return { state: state };
};

const rpcFindOrCreateMatch = function(ctx, logger, nk, payload) {
  try {
    logger.info('TicTacToe: RPC find_or_create_match called');
    
    // Find existing open match (size < 2 means less than 2 players)
    // matchList params: limit, authoritative, label, minSize, maxSize, query
    const matches = nk.matchList(10, true, null, 0, 2, null);
    logger.info('TicTacToe: Found ' + (matches ? matches.length : 0) + ' matches');
    
    if (matches && matches.length > 0) {
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        // Check the label to see if match is open
        let label: Record<string, any> = {};
        try {
          label = match.label ? JSON.parse(match.label) : {};
        } catch (e) {
          logger.error('TicTacToe: Failed to parse label for match ' + match.matchId + ': ' + e);
        }
        logger.info('TicTacToe: ✓ Checking match ' + match.matchId + ', player_count: ' + match.size + ', label: ' + JSON.stringify(label) + ', open: ' + label.open);
        
        // Only return match if it's marked as open in the label
        if (label.open === true) {
          logger.info('TicTacToe: ✓✓ RETURNING OPEN MATCH ' + match.matchId);
          return JSON.stringify({ match_id: match.matchId });
        } else {
          logger.info('TicTacToe: ✗ Match ' + match.matchId + ' is NOT OPEN (open=' + label.open + '), skipping');
        }
      }
    }
    
    // No open match found, create new one
    const matchId = nk.matchCreate('tictactoe', {});
    logger.info('TicTacToe: ✗✗ NO OPEN MATCH FOUND, CREATING NEW: ' + matchId);
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
