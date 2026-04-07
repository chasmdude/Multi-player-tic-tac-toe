import { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { Socket as NakamaSocket } from '@heroiclabs/nakama-js';
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

interface SocketMessage {
  op_code: number;
  data: string;
}

function App() {
  const store = useGameStore();
  const socketRef = useRef<NakamaSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const lastBoardRef = useRef<string[]>(Array(9).fill(''));

  /**
   * Initialize Nakama connection and find/join match
   */
  const initializeGame = async () => {
    try {
      setIsInitializing(true);
      setError(null);

      // Authenticate anonymously
      const session = await authenticateAnonymously();
      if (!session.user_id) {
        throw new Error('Failed to get user ID from session');
      }
      store.setCurrentUserId(session.user_id);

      // Create WebSocket socket
      const socket = await createSocket(session);
      socketRef.current = socket;
      setupSocketListeners(socket);
      store.setConnected(true);

      // Find or create a match
      const matchId = await findOrCreateMatch(session);
      store.setMatchId(matchId);

      // Join the match
      const joinResult = await joinMatch(socket, matchId);
      console.log('Join result:', joinResult);

      // The match will start and send UPDATE_STATE when both players join
      reconnectAttemptsRef.current = 0;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Initialization failed:', errorMsg);
      setError(errorMsg);

      // Retry with exponential backoff
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 8000);
        console.log(`Retrying in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
        setTimeout(initializeGame, delay);
      }
    } finally {
      setIsInitializing(false);
    }
  };

  /**
   * Setup WebSocket event listeners
   */
  const setupSocketListeners = (socket: NakamaSocket) => {
    // Handle incoming match messages
    socket.onmatchdata = (message: SocketMessage) => {
      try {
        console.log('Received message:', message);

        if (message.op_code === OpCode.UPDATE_STATE) {
          // Parse server state update
          const state = JSON.parse(message.data);
          console.log('State update:', state);

          store.updateState({
            board: state.board || [],
            currentTurn: state.currentTurn || '',
            players: state.players || {},
            ticksRemaining: state.ticksSinceLastMove !== undefined ? 150 - state.ticksSinceLastMove : 150,
          });

          // Assign player mark if not set
          if (!store.playerMark && store.currentUserId && state.players[store.currentUserId]) {
            store.updateState({
              playerMark: state.players[store.currentUserId],
            });
          }

          // Determine and set opponent name
          const opponentId = Object.keys(state.players).find(
            (id) => id !== store.currentUserId
          );
          if (opponentId) {
            store.updateState({ opponentName: `Player ${opponentId.substring(0, 8)}` });
          }
        } else if (message.op_code === OpCode.GAME_OVER) {
          // Parse game over message
          const result = JSON.parse(message.data);
          console.log('Game over:', result);

          // Determine win/loss/draw
          const winner = result.winner;
          if (winner === 'DRAW') {
            store.updateState({
              gameOver: true,
              winner: 'DRAW',
              board: result.board || store.board,
            });
          } else if (winner === store.currentUserId) {
            store.updateState({
              gameOver: true,
              winner: 'WIN',
              board: result.board || store.board,
            });
          } else {
            store.updateState({
              gameOver: true,
              winner: 'LOSS',
              board: result.board || store.board,
            });
          }
        }
      } catch (err) {
        console.error('Error processing message:', err);
      }
    };

    // Handle match presence changes
    socket.onmatchpresence = (presence: Record<string, unknown>) => {
      console.log('Match presence:', presence);
      if (presence.leaves && presence.leaves.length > 0) {
        console.log('Player disconnected');
        setError('Opponent disconnected. Waiting for reconnection...');
        store.setConnected(false);
      }
      if (presence.joins && presence.joins.length > 0) {
        console.log('Player joined');
        store.setConnected(true);
        setError(null);
      }
    };

    // Handle socket close
    socket.onclose = () => {
      console.log('Socket closed');
      store.setConnected(false);
      setError('Connection lost. Reconnecting...');

      // Attempt reconnection
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 8000);
        setTimeout(initializeGame, delay);
      }
    };

    socket.onerror = (err: Error) => {
      console.error('Socket error:', err);
      store.setConnected(false);
      setError('Connection error. Reconnecting...');
    };
  };

  /**
   * Handle board click - send move to server
   */
  const handleBoardUpdate = useCallback(async () => {
    // Check if board has changed (move was made locally)
    const currentBoard = store.board;
    const changed = currentBoard.some((cell, i) => lastBoardRef.current[i] !== cell);

    if (changed && store.isYourTurn() && socketRef.current && store.matchId) {
      const position = currentBoard.findIndex((cell, i) => lastBoardRef.current[i] !== cell);

      if (position !== -1) {
        try {
          await sendMove(socketRef.current, store.matchId, position);
          lastBoardRef.current = [...currentBoard];
          console.log(`Sent move: position ${position}`);
        } catch (err) {
          console.error('Failed to send move:', err);
          setError('Failed to send move. Please try again.');
        }
      }
    }
  }, [store]);

  // Initialize on mount
  useEffect(() => {
    initializeGame();

    return () => {
      if (socketRef.current) {
        leaveMatch(socketRef.current, store.matchId || '').catch(console.error);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle board updates
  useEffect(() => {
    void handleBoardUpdate();
  }, [handleBoardUpdate, store.board]);

  // Render loading state
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
          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Conditional rendering based on game state */}
          {!store.matchId ? (
            <MatchLobby />
          ) : store.gameOver ? (
            <>
              <GameResult />
              <GameStatus />
            </>
          ) : (
            <>
              <GameStatus />
              <GameBoard />
            </>
          )}

          {/* Connection indicator */}
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
