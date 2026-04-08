import { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { Socket } from '@heroiclabs/nakama-js';
import {
  authenticateAnonymously,
  createSocket,
  findOrCreateMatch,
  joinMatch,
  sendMove,
  leaveMatch,
} from '@/lib/nakama';
import GameBoard from '@/components/GameBoard';
import GameStatus from '@/components/GameStatus';
import GameResult from '@/components/GameResult';
import MatchLobby from '@/components/MatchLobby';
import './App.css';

const OpCode = {
  UPDATE_STATE: 1,
  GAME_OVER: 2,
  MAKE_MOVE: 3,
} as const;

function App() {
  const store = useGameStore();
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const isProcessingMoveRef = useRef(false);

  /**
   * Setup WebSocket event listeners
   */
  const setupSocketListeners = (socket: Socket) => {
    socket.onmatchdata = (data) => {
      try {
        const dataStr = typeof data.data === 'string' ? data.data : new TextDecoder().decode(data.data);
        const serverState = JSON.parse(dataStr);

        if (data.op_code === OpCode.UPDATE_STATE) {
          const currentState = useGameStore.getState();
          const ticksRemaining = serverState.ticksSinceLastMove !== undefined ? Math.max(0, 75 - serverState.ticksSinceLastMove) : 75;
          
          const mergedBoard: string[] = [];
          for (let i = 0; i < 9; i++) {
            if (serverState.board?.[i] && serverState.board[i] !== '') {
              mergedBoard[i] = serverState.board[i];
            } else if (currentState.board?.[i] && currentState.board[i] !== '') {
              // We have a local optimistic mark but server says empty.
              // If server still thinks it's our turn, keep optimistic mark (pending server response).
              // If server thinks it's the opponent's turn, our rejected moves should be cleared.
              if (serverState.currentTurn === currentState.currentUserId) {
                mergedBoard[i] = currentState.board[i];
              } else {
                mergedBoard[i] = '';
              }
            } else {
              mergedBoard[i] = '';
            }
          }
          
          store.updateState({
            board: mergedBoard,
            currentTurn: serverState.currentTurn || '',
            players: serverState.players || {},
            ticksRemaining: ticksRemaining,
            gameOver: serverState.gameOver || false,
            winner: serverState.winner || null,
          });

          if (currentState.currentUserId && serverState.players) {
            const myMark = serverState.players[currentState.currentUserId];
            if (myMark) {
              store.updateState({ playerMark: myMark as 'X' | 'O' });
            }
            
              const opponentId = Object.keys(serverState.players || {}).find(id => id !== currentState.currentUserId);
              if (opponentId) {
                const oppName = currentState.playerNames[opponentId] || `Player ${opponentId.substring(0, 4)}...`;
                store.updateState({ opponentName: oppName });
              }
            }
          } else if (data.op_code === OpCode.GAME_OVER) {
          const currentState = useGameStore.getState();
          const winner = serverState.winner;
          let winStatus: 'WIN' | 'LOSS' | 'DRAW' = 'DRAW';
          
          if (winner === 'DRAW') {
            winStatus = 'DRAW';
          } else if (winner === currentState.currentUserId) {
            winStatus = 'WIN';
          } else {
            winStatus = 'LOSS';
          }

          store.updateState({ 
            gameOver: true, 
            winner: winStatus, 
            board: serverState.board || currentState.board 
          });
        }
      } catch (err) {
        console.error('Error processing message:', err);
      }
    };

    socket.onmatchpresence = (presence) => {
      console.log('Match presence:', presence);
      const joins = presence.joins || [];
      const leaves = presence.leaves || [];
      
      if (joins.length > 0) {
        const newNames: Record<string, string> = {};
        joins.forEach(p => {
            if (p.user_id && p.username) {
                newNames[p.user_id] = p.username;
            }
        });
        useGameStore.getState().setPlayerNames(newNames);
        
        store.setConnected(true);
        setError(null);
      }
      
      if (leaves.length > 0) {
        setError('Opponent disconnected. Waiting for reconnection...');
        store.setConnected(false);
      }
    };

    socket.ondisconnect = () => {
      store.setConnected(false);
      setError('Connection lost. Reconnecting...');
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 8000);
        setTimeout(initializeGame, delay);
      }
    };

    socket.onerror = (evt) => {
      console.error('Socket error:', evt);
      store.setConnected(false);
      setError('Connection error. Reconnecting...');
    };
  };

  /**
   * Initialize Nakama connection and find/join match
   */
  const initializeGame = async () => {
    try {
      setIsInitializing(true);
      setError(null);

      // Try to restore user ID from localStorage, or create new anonymous user
      let userId = localStorage.getItem('userId') || undefined;
      const session = await authenticateAnonymously(userId);
      userId = session.user_id!;
      localStorage.setItem('userId', userId);
      store.setCurrentUserId(userId, session.username || 'You');

      const socket = await createSocket(session);
      socketRef.current = socket;
      setupSocketListeners(socket);
      store.setConnected(true);

      // Find or create match with retry logic
      let matchId = localStorage.getItem('activeMatchId');
      let match;
      let joinAttempts = 0;
      const maxAttempts = 3;
      
      while (joinAttempts < maxAttempts) {
        if (!matchId) {
          matchId = await findOrCreateMatch(session);
        }
        
        try {
          match = await joinMatch(socket, matchId);
          // Success!
          localStorage.setItem('activeMatchId', matchId);
          break;
        } catch (joinErr) {
          // Join failed - clear and get new match
          console.log('Join failed (attempt ' + (joinAttempts + 1) + '), retrying...');
          localStorage.removeItem('activeMatchId');
          matchId = null;
          joinAttempts++;
        }
      }
      
      if (!match) {
        throw new Error('Could not join a match after ' + maxAttempts + ' attempts');
      }
      
      const actualMatchId = match.match_id;
      store.setMatchId(actualMatchId);
      
      // match.presences includes other players, plus self is in the session
      // However, we wait for UPDATE_STATE for official player mapping
      // We set an empty object just to indicate the match is active
      store.updateState({ players: {} });

      reconnectAttemptsRef.current = 0;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      // Clear invalid matchId from storage
      localStorage.removeItem('activeMatchId');
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 8000);
        setTimeout(initializeGame, delay);
      }
    } finally {
      setIsInitializing(false);
    }
  };

  const handleBoardUpdate = useCallback(async () => {
    const state = useGameStore.getState();
    const pendingMove = state.pendingMove;
    const matchId = state.matchId;
    const playerMark = state.playerMark;

    console.log('handleBoardUpdate called:', {
      pendingMove,
      matchId,
      isYourTurn: state.isYourTurn(),
      hasSocket: !!socketRef.current,
      isProcessing: isProcessingMoveRef.current,
      playerMark
    });

    if (pendingMove !== null && state.isYourTurn() && socketRef.current && matchId && !isProcessingMoveRef.current) {
      try {
        isProcessingMoveRef.current = true;
        
        // Optimistic update - show mark immediately and end turn locally
        const newBoard = [...state.board];
        if (playerMark && newBoard[pendingMove] === '') {
          newBoard[pendingMove] = playerMark;
          store.updateState({ board: newBoard, currentTurn: '' });
          console.log('Optimistic update: board now', newBoard);
        }
        
        await sendMove(socketRef.current, matchId, pendingMove);
        state.clearPendingMove();
      } catch (err) {
        console.error('Move send failed:', err);
        setError('Failed to send move.');
      } finally {
        isProcessingMoveRef.current = false;
      }
    } else if (pendingMove !== null) {
      console.log('Move rejected:', { pendingMove, isYourTurn: state.isYourTurn(), hasSocket: !!socketRef.current, matchId });
      useGameStore.getState().clearPendingMove();
    }
  }, []);

  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initializeGame();
    return () => {
      if (socketRef.current) {
        leaveMatch(socketRef.current, store.matchId || '').catch(console.error);
      }
    };
  }, []);

  // Clear matchId from storage when game ends
  useEffect(() => {
    if (store.gameOver) {
      localStorage.removeItem('activeMatchId');
    }
  }, [store.gameOver]);

  useEffect(() => {
    const unsubscribe = useGameStore.subscribe((state, prevState) => {
      if (state.pendingMove !== prevState.pendingMove && state.pendingMove !== null) {
        handleBoardUpdate();
      }
    });
    return unsubscribe;
  }, [handleBoardUpdate]);

  if (isInitializing && !store.matchId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Tic-Tac-Toe</h1>
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-lg text-gray-600">Initializing...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md w-full mx-auto bg-white rounded-lg shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 text-center">
          <h1 className="text-3xl font-bold">Tic-Tac-Toe</h1>
          <p className="text-indigo-100 mt-1">Nakama Multiplayer</p>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          {store.matchId && Object.keys(store.players).length === 2 && !store.gameOver ? (
            <>
              <GameStatus />
              <GameBoard />
            </>
          ) : store.gameOver ? (
            <>
              <GameResult />
              <GameStatus />
            </>
          ) : (
            <MatchLobby />
          )}
          {store.matchId && (
            <div className="text-center text-xs text-gray-500">
              {store.isConnected ? '✓ Connected' : '✗ Disconnected'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
