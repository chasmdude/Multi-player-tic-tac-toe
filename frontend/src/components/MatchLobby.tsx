import { useGameStore } from '@/store/gameStore';
import { Loader2, Users, Zap } from 'lucide-react';

export default function MatchLobby() {
  const { matchId, players, playerMark, gameOver } = useGameStore();
  
  const playerCount = Object.keys(players).length;
  const ready = playerCount === 2;
  const hasMatch = !!matchId;

  if (gameOver) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 animate-fade-in w-full">
      {!hasMatch ? (
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 bg-slate-900/80 rounded-full flex items-center justify-center border-2 border-cyan-500/40">
              <Loader2 size={48} className="text-cyan-400 animate-spin" />
            </div>
            <div className="absolute inset-0 bg-cyan-400 blur-3xl opacity-30 animate-pulse rounded-full"></div>
          </div>
          
          <div className="text-center">
            <h2 className="text-2xl font-black text-white mb-3 tracking-widest uppercase">Initializing</h2>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-[0.3em]">Quantum Link Sync...</p>
          </div>
        </div>
      ) : ready ? (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-center gap-3">
            <Zap size={28} className="text-cyan-400 animate-pulse" />
            <h2 className="text-xl font-black text-white tracking-widest uppercase">Match Ready</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 bg-cyan-500/20 border-2 border-cyan-500/50 rounded-2xl text-center">
              <p className="text-xs text-cyan-400 font-black uppercase tracking-widest mb-2">You</p>
              <p className="text-6xl font-black text-white drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]">{playerMark || '?'}</p>
            </div>
            <div className="p-6 bg-rose-500/20 border-2 border-rose-500/50 rounded-2xl text-center">
              <p className="text-xs text-rose-400 font-black uppercase tracking-widest mb-2">Rival</p>
              <p className="text-6xl font-black text-white drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]">
                {playerMark === 'X' ? 'O' : playerMark === 'O' ? 'X' : '?'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-center gap-3">
            <Users size={28} className="text-cyan-400" />
            <h2 className="text-xl font-black text-white tracking-widest uppercase">Waiting for Player</h2>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="px-6 py-3 bg-slate-900/60 rounded-xl border border-slate-700/50 flex justify-between items-center">
              <span className="text-xs text-slate-500 font-black uppercase">Match ID</span>
              <span className="text-xs text-cyan-400/70 font-mono">{matchId?.substring(0, 16)}...</span>
            </div>
            
            <div className="p-8 rounded-2xl bg-slate-900/40 border-2 border-slate-700/50 flex flex-col gap-4">
              <div className="flex items-center justify-center gap-3">
                <Loader2 size={24} className="text-cyan-400 animate-spin" />
                <span className="text-slate-200 text-base font-black uppercase tracking-widest">Searching ({playerCount}/2)</span>
              </div>
              <p className="text-xs text-slate-500 font-black uppercase tracking-widest text-center">
                Connect a second player to start
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}