import { useGameStore } from '@/store/gameStore';
import { Clock, User, ShieldCheck, Wifi, WifiOff } from 'lucide-react';

export default function GameStatus() {
  const { playerMark, opponentName, timeoutSeconds, isConnected, isYourTurn } = useGameStore();

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isConnected ? (
            <Wifi size={14} className="text-cyan-400" />
          ) : (
            <WifiOff size={14} className="text-rose-400" />
          )}
          <span className={`text-xs font-bold ${isConnected ? 'text-cyan-400' : 'text-rose-400'} uppercase tracking-widest`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/80 rounded-full border border-slate-700/50">
          <Clock size={14} className="text-cyan-400" />
          <span className="text-sm font-mono font-bold text-white">{timeoutSeconds().toString().padStart(2, '0')}s</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900/60 border-2 border-slate-700/50 p-5 rounded-2xl flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 mb-1">
            <User size={14} className="text-slate-500" />
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">You</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-white">PLAYER</span>
            <span className={`text-3xl font-black ${playerMark === 'X' ? 'text-cyan-400' : 'text-rose-400'}`}>
              [{playerMark || '?'}]
            </span>
          </div>
        </div>

        <div className={`p-5 rounded-2xl border-2 transition-all duration-500 ${
          isYourTurn() 
            ? 'bg-rose-500/10 border-rose-500/50' 
            : 'bg-cyan-500/10 border-cyan-500/50'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={14} className={isYourTurn() ? "text-rose-400" : "text-cyan-400"} />
            <span className={`text-xs font-black uppercase tracking-widest ${isYourTurn() ? "text-rose-400" : "text-cyan-400"}`}>
              {isYourTurn() ? "Your Turn" : "Opponent"}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className={`text-sm font-bold truncate w-full text-center ${isYourTurn() ? 'text-rose-300' : 'text-white'}`}>
              {isYourTurn() ? "WAITING FOR MOVE" : opponentName.toUpperCase()}
            </span>
            {!isYourTurn() && <div className="h-1 w-8 bg-cyan-400 mt-2 rounded-full animate-pulse" />}
          </div>
        </div>
      </div>
    </div>
  );
}