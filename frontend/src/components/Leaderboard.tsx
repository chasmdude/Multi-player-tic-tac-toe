import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { listLeaderboardRecords } from '@/lib/nakama';
import { Trophy, User, Loader2 } from 'lucide-react';

interface LeaderboardRecord {
  username: string;
  score: number;
  rank: number;
  metadata: {
    wins?: number;
    losses?: number;
    draws?: number;
  };
}

export default function Leaderboard() {
  const { session } = useGameStore();
  const [records, setRecords] = useState<LeaderboardRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    if (!session) return;
    try {
      setLoading(true);
      const result = await listLeaderboardRecords(session);
      const formattedRecords =
        result.records?.map((r: any) => {
          let metadata: any = {};
          try {
            metadata =
              typeof r?.metadata === 'string'
                ? JSON.parse(r.metadata)
                : r?.metadata || {};
          } catch (e) {
            console.error('Failed to parse leaderboard metadata:', e, r?.metadata);
            metadata = {};
          }

          return {
            username: r.username || 'Anonymous',
            score: r.score || 0,
            rank: r.rank || 0,
            metadata,
          };
        }) || [];
      setRecords(formattedRecords);
    } catch (err) {
      console.error('Leaderboard fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [session]);

  if (loading && records.length === 0) {
    return (
      <div className="glass-panel p-12 flex items-center justify-center">
        <Loader2 className="animate-spin text-cyan-400" size={32} />
      </div>
    );
  }

  return (
    <div className="glass-panel overflow-hidden border-slate-700/50 shadow-2xl animate-fade-in">
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/50 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" size={20} />
          <h3 className="text-white font-black text-xs uppercase tracking-[0.2em]">Global Hall of Fame</h3>
        </div>
        <div className="px-2 py-1 bg-cyan-500/10 rounded-md border border-cyan-500/20">
          <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">{records.length} CONTENDERS</span>
        </div>
      </div>
      
      <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
        {records.length > 0 ? (
          <div className="min-w-full">
            {/* header */}
            <div className="sticky top-0 z-10 bg-slate-950/70 backdrop-blur border-b border-slate-800/60">
              <div className="grid grid-cols-[44px_1fr_32px_32px_32px_64px] gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                <div className="text-center">#</div>
                <div>Player</div>
                <div className="text-center">W</div>
                <div className="text-center">L</div>
                <div className="text-center">D</div>
                <div className="text-right">PTS</div>
              </div>
            </div>

            {/* rows */}
            <div className="divide-y divide-slate-800/50">
              {records.map((record) => {
                const isTop = record.rank === 1;
                const wins = record.metadata.wins || 0;
                const losses = record.metadata.losses || 0;
                const draws = record.metadata.draws || 0;

                return (
                  <div
                    key={`${record.rank}-${record.username}-${record.score}`}
                    className={`group px-4 py-3 hover:bg-slate-800/30 transition-colors ${
                      isTop ? 'bg-cyan-500/5' : ''
                    }`}
                  >
                    <div className="grid grid-cols-[44px_1fr_32px_32px_32px_64px] gap-2 items-center">
                      <div className="flex items-center justify-center">
                        {record.rank === 1 ? (
                          <Trophy className="text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.35)]" size={18} />
                        ) : record.rank === 2 ? (
                          <div className="w-7 h-7 rounded-full bg-slate-400/15 border border-slate-400/25 flex items-center justify-center text-[11px] font-black text-slate-200">2</div>
                        ) : record.rank === 3 ? (
                          <div className="w-7 h-7 rounded-full bg-orange-500/15 border border-orange-500/25 flex items-center justify-center text-[11px] font-black text-orange-200">3</div>
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-slate-800/40 border border-slate-700/50 flex items-center justify-center text-[11px] font-black text-slate-400">
                            {record.rank}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-sm font-extrabold tracking-tight truncate ${isTop ? 'text-cyan-400' : 'text-slate-200'}`}>
                            {record.username}
                          </span>
                          {isTop && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
                        </div>
                        <div className="text-[10px] text-slate-600 font-black uppercase tracking-widest">
                          {wins + losses + draws} games
                        </div>
                      </div>

                      <div className="text-center font-black text-[12px] text-emerald-400">{wins}</div>
                      <div className="text-center font-black text-[12px] text-rose-400">{losses}</div>
                      <div className="text-center font-black text-[12px] text-slate-400">{draws}</div>

                      <div className="text-right">
                        <div className="text-lg font-black text-white group-hover:text-cyan-400 transition-colors tabular-nums">
                          {record.score}
                        </div>
                        <div className="text-[8px] text-slate-600 font-black uppercase tracking-widest -mt-0.5">PTS</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center">
            <User className="mx-auto text-slate-800 mb-4" size={48} />
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Zone cleared. No rankings found.</p>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>
    </div>
  );
}

