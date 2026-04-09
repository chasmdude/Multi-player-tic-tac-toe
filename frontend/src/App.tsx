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
import { Play } from 'lucide-react';
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
  const [isQueuing, setIsQueuing] = useState(false);
  const isProcessingMoveRef = useRef(false);
  const initializeGameRef = useRef<() => void>(() => {});

  /**
   * Setup WebSocket event listeners
   */
  const setupSocketListeners = useCallback((socket: Socket) => {
    socket.onmatchdata = (data) => {
      try {
        const dataStr = typeof data.data === 'string' ? data.data : new TextDecoder().decode(data.data);
        const serverState = JSON.parse(dataStr);

        if (data.op_code === OpCode.UPDATE_STATE) {
          const currentState = useGameStore.getState();
          const ticksRemaining = serverState.ticksSinceLastMove !== undefined ? Math.max(0, 75 - serverState.ticksSinceLastMove) : 75;
          
          let mergedBoard: string[];
          
          if (serverState.gameOver) {
            mergedBoard = serverState.board || [];
          } else {
            mergedBoard = [];
            for (let i = 0; i < 9; i++) {
              if (serverState.board?.[i] && serverState.board[i] !== '') {
                mergedBoard[i] = serverState.board[i];
              } else if (currentState.board?.[i] && currentState.board[i] !== '') {
                if (serverState.currentTurn === currentState.currentUserId) {
                  mergedBoard[i] = currentState.board[i];
                } else {
                  mergedBoard[i] = '';
                }
              } else {
                mergedBoard[i] = '';
              }
            }
          }
          
          let winStatus: 'WIN' | 'LOSS' | 'DRAW' | null = null;
          if (serverState.gameOver && serverState.winner) {
            if (serverState.winner === 'DRAW') {
              winStatus = 'DRAW';
            } else if (serverState.winner === currentState.currentUserId) {
              winStatus = 'WIN';
            } else {
              winStatus = 'LOSS';
            }
          }
          
          store.updateState({
            board: mergedBoard,
            currentTurn: serverState.currentTurn || '',
            players: serverState.players || {},
            ticksRemaining: ticksRemaining,
            gameOver: serverState.gameOver || false,
            winner: winStatus,
          });

          if (currentState.currentUserId && serverState.players) {
            const myMark = serverState.players[currentState.currentUserId];
            if (myMark) {
              store.updateState({ playerMark: myMark as 'X' | 'O' });
            }
            
            const opponentId = Object.keys(serverState.players || {}).find(id => id !== currentState.currentUserId);
            if (opponentId) {
              const oppName = currentState.playerNames[opponentId] || `Player ${opponentId.substring(0, 4)}`;
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
      console.log('Presence update:', presence);
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
        setError('Opponent disconnected.');
        store.setConnected(false);
      }
    };

    socket.ondisconnect = () => {
      store.setConnected(false);
      setError('Connection lost. Reconnecting...');
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 8000);
        setTimeout(() => initializeGameRef.current(), delay);
      }
    };

    socket.onerror = (evt) => {
      console.error('Socket error:', evt);
      store.setConnected(false);
      setError('Connection error.');
    };
  }, [store]);

  /**
   * Initialize Nakama connection
   */
  const initializeGame = useCallback(async () => {
    try {
      setIsInitializing(true);
      setError(null);

      let userId = localStorage.getItem('userId') || undefined;
      const session = await authenticateAnonymously(userId);
      userId = session.user_id!;
      localStorage.setItem('userId', userId);
      store.setCurrentUserId(userId, session.username || 'You');
      store.setSession(session);

      const socket = await createSocket(session);
      socketRef.current = socket;
      setupSocketListeners(socket);
      store.setConnected(true);

      // Reconnect to active match if exists
      const activeMatchId = localStorage.getItem('activeMatchId');
      if (activeMatchId) {
        setIsQueuing(true);
        try {
          const match = await joinMatch(socket, activeMatchId);
          store.setMatchId(match.match_id);
          store.updateState({ players: {} });
        } catch {
          localStorage.removeItem('activeMatchId');
          setIsQueuing(false);
        }
      }

      reconnectAttemptsRef.current = 0;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 8000);
        setTimeout(() => initializeGameRef.current(), delay);
      }
    } finally {
      setIsInitializing(false);
    }
  }, [setupSocketListeners, store]);

  useEffect(() => {
    initializeGameRef.current = () => {
      void initializeGame();
    };
  }, [initializeGame]);

  /**
   * Start finding a match
   */
  const handleStartMatchmaking = async () => {
    if (!store.session || !socketRef.current) return;
    
    try {
      setIsQueuing(true);
      setError(null);

      const matchId = await findOrCreateMatch(store.session);
      const match = await joinMatch(socketRef.current, matchId);
      
      localStorage.setItem('activeMatchId', match.match_id);
      store.setMatchId(match.match_id);
      store.updateState({ players: {} });
    } catch {
      setError('Matchmaking failed. Try again.');
      setIsQueuing(false);
    }
  };

  const handleBoardUpdate = useCallback(async () => {
    const state = useGameStore.getState();
    const pendingMove = state.pendingMove;
    const matchId = state.matchId;
    const playerMark = state.playerMark;
    const matchReady = Object.keys(state.players || {}).length === 2;

    console.log('handleBoardUpdate called:', {
      pendingMove,
      matchId,
      isYourTurn: state.isYourTurn(),
      hasSocket: !!socketRef.current,
      isProcessing: isProcessingMoveRef.current,
      playerMark
    });

    if (pendingMove !== null && matchReady && state.isYourTurn() && socketRef.current && matchId && !isProcessingMoveRef.current) {
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
  }, [store]);

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
  }, [initializeGame, store.matchId]);

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
    <div className="flex items-center justify-center min-h-screen p-4 font-sans">
      <div className="max-w-md w-full animate-fade-in">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]">
            LILA <span className="text-cyan-400">BLACK</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">multiplayer tic-tac-toe</p>
        </div>
        
        <div className="space-y-8">
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl animate-shake">
              <p className="text-xs text-rose-400 text-center font-black uppercase tracking-widest">{error}</p>
            </div>
          )}
          
          {!isQueuing && !store.matchId ? (
            <div className="flex flex-col gap-10 animate-fade-in">
              <button 
                onClick={handleStartMatchmaking}
                className="btn-primary w-full py-6 text-lg font-black tracking-[0.3em] flex items-center justify-center gap-4 group"
              >
                <Play className="fill-current transition-transform group-hover:scale-125" size={24} />
                QUICK PLAY
              </button>
            </div>
          ) : (
            <div className="space-y-8 animate-fade-in">
              <GameStatus />
              
              <div className="relative">
                <GameBoard />
                
                {/* Lobby Overlay - only shown if match isn't full */}
                {(isQueuing || !store.matchId || Object.keys(store.players).length < 2) && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/60 backdrop-blur-md rounded-[24px] border border-slate-800/50 p-6">
                    <MatchLobby />
                  </div>
                )}
                
                {store.gameOver && <GameResult />}
              </div>

              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className={`w-1.5 h-1.5 rounded-full ${store.isConnected ? 'bg-cyan-400' : 'bg-rose-500'}`} />
                    {store.isConnected && <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping opacity-50" />}
                  </div>
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">
                    {store.isConnected ? 'Auth Link Stable' : 'Link Connection Offline'}
                  </span>
                </div>
                
                {store.matchId && (
                  <button 
                    onClick={() => {
                      leaveMatch(socketRef.current!, store.matchId!);
                      store.setMatchId(null);
                      setIsQueuing(false);
                    }}
                    className="text-[9px] font-black text-rose-500/70 hover:text-rose-400 uppercase tracking-widest transition-colors"
                  >
                    Abort Match
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



export default App;
