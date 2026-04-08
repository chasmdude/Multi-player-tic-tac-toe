import { create } from 'zustand';

export interface GameState {
  // Board state
  board: string[];
  playerMark: 'X' | 'O' | null;
  currentTurn: string;
  players: { [userId: string]: 'X' | 'O' };

  // Match state
  matchId: string | null;
  gameOver: boolean;
  winner: string | null | 'DRAW';
  ticksRemaining: number;

  // Connection state
  isConnected: boolean;
  opponentName: string;
  currentUserId: string | null;
  currentUserName: string | null;
  playerNames: { [userId: string]: string };
  
  // Pending move to send to server (not applied to local board)
  pendingMove: number | null;

  // Actions
  makeMove: (position: number) => void;
  queueMoveToSend: (position: number) => void;
  clearPendingMove: () => void;
  updateState: (updates: Partial<GameState>) => void;
  resetGame: () => void;
  setMatchId: (id: string | null) => void;
  setConnected: (connected: boolean) => void;
  setCurrentUserId: (id: string, name: string) => void;
  setPlayerNames: (names: { [userId: string]: string }) => void;

  // Selectors
  isYourTurn: () => boolean;
  opponentMark: () => 'X' | 'O' | null;
  timeoutSeconds: () => number;
}

const initialState = {
  board: Array(9).fill(''),
  playerMark: null,
  currentTurn: '',
  players: {},
  matchId: null,
  gameOver: false,
  winner: null,
  ticksRemaining: 75, // 15 seconds at 5 ticks/sec
  isConnected: false,
  opponentName: 'Opponent',
  currentUserId: null,
  currentUserName: null,
  playerNames: {},
  pendingMove: null,
};

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,

  makeMove: (position: number) => {
    set((state) => {
      const newBoard = [...state.board];
      if (state.playerMark && newBoard[position] === '') {
        newBoard[position] = state.playerMark;
      }
      return { board: newBoard };
    });
  },

  queueMoveToSend: (position: number) => {
    set({ pendingMove: position });
  },

  clearPendingMove: () => {
    set({ pendingMove: null });
  },

  updateState: (updates: Partial<GameState>) => {
    set((state) => ({
      ...state,
      ...updates,
    }));
  },

  resetGame: () => {
    set({
      board: Array(9).fill(''),
      playerMark: null,
      currentTurn: '',
      players: {},
      gameOver: false,
      winner: null,
      ticksRemaining: 75,
      matchId: null,
      pendingMove: null,
    });
  },

  setMatchId: (id: string | null) => {
    set({ matchId: id });
  },

  setConnected: (connected: boolean) => {
    set({ isConnected: connected });
  },

  setCurrentUserId: (id: string, name: string) => {
    set((state) => ({
      currentUserId: id,
      currentUserName: name,
      playerNames: { ...state.playerNames, [id]: name }
    }));
  },

  setPlayerNames: (newNames: { [userId: string]: string }) => {
    set((state) => ({
      playerNames: { ...state.playerNames, ...newNames }
    }));
  },

  isYourTurn: () => {
    const state = get();
    return state.currentTurn === state.currentUserId && !state.gameOver;
  },

  opponentMark: () => {
    const state = get();
    if (!state.playerMark) return null;
    return state.playerMark === 'X' ? 'O' : 'X';
  },

  timeoutSeconds: () => {
    const state = get();
    return Math.ceil(state.ticksRemaining / 5);
  },
}));
