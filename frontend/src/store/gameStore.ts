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

  // Actions
  makeMove: (position: number) => void;
  updateState: (updates: Partial<GameState>) => void;
  resetGame: () => void;
  setMatchId: (id: string | null) => void;
  setConnected: (connected: boolean) => void;
  setCurrentUserId: (id: string) => void;

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
  ticksRemaining: 150, // 30 seconds at 5 ticks/sec
  isConnected: false,
  opponentName: 'Opponent',
  currentUserId: null,
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

  updateState: (updates: Partial<GameState>) => {
    set((state) => ({
      ...state,
      ...updates,
    }));
  },

  resetGame: () => {
    set({
      board: Array(9).fill(''),
      currentTurn: '',
      gameOver: false,
      winner: null,
      ticksRemaining: 150,
      matchId: null,
    });
  },

  setMatchId: (id: string | null) => {
    set({ matchId: id });
  },

  setConnected: (connected: boolean) => {
    set({ isConnected: connected });
  },

  setCurrentUserId: (id: string) => {
    set({ currentUserId: id });
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
