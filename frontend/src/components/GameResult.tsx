import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Trophy, X, Circle, RefreshCw, Medal } from 'lucide-react';
import { listLeaderboardRecordsByOwners } from '@/lib/nakama';

interface PlayerStat {
  userId: string;
  username: string;
  score: number;
  wins: number;
  losses: number;
  draws: number;
  isCurrentPlayer: boolean;
}

export default function GameResult() {
  const { gameOver, winner, resetGame, players, session, currentUserId } = useGameStore();
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchStatsOnce(ownerIds: string[]) {
      const result = await listLeaderboardRecordsByOwners(session!, ownerIds);

      const formattedStats = ownerIds.map((id) => {
        const record = result.records?.find((r: any) => r.owner_id === id);
        let metadata: any = {};
        try {
          metadata =
            typeof record?.metadata === 'string'
              ? JSON.parse(record.metadata)
              : record?.metadata || {};
        } catch (e) {
          console.error('Failed to parse metadata:', e);
        }

        return {
          userId: id,
          username: record?.username || 'Player',
          score: record?.score || 0,
          wins: metadata?.wins || 0,
          losses: metadata?.losses || 0,
          draws: metadata?.draws || 0,
          isCurrentPlayer: id === useGameStore.getState().currentUserId,
        };
      });

      // Put current player first.
      formattedStats.sort((a, b) => (a.isCurrentPlayer === b.isCurrentPlayer ? 0 : a.isCurrentPlayer ? -1 : 1));
      return { formattedStats, raw: result };
    }

    async function fetchStatsWithRetry() {
      if (!session || !gameOver) return;

      const ownerIds =
        Object.keys(players || {}).length > 0
          ? Object.keys(players || {})
          : currentUserId
            ? [currentUserId]
            : [];

      if (ownerIds.length === 0) return;

      const delaysMs = [0, 300, 800, 1500, 2500];
      try {
        setLoading(true);

        for (let attempt = 0; attempt < delaysMs.length; attempt++) {
          if (cancelled) return;
          const delay = delaysMs[attempt];
          if (delay > 0) {
            await new Promise((r) => setTimeout(r, delay));
          }

          const { formattedStats, raw } = await fetchStatsOnce(ownerIds);
          if (cancelled) return;

          setStats(formattedStats);

          // If we have a record for every owner, we can stop early.
          const recordCount = raw.records?.filter((r: any) => ownerIds.includes(r.owner_id)).length || 0;
          if (recordCount >= ownerIds.length) break;
        }
      } catch (err) {
        console.error('Failed to fetch match stats:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStatsWithRetry();
    return () => {
      cancelled = true;
    };
  }, [gameOver, session, players, currentUserId]);

  if (!gameOver) return null;
  
  const state = useGameStore.getState();
  const myUserId = state.currentUserId;
  const playerMark = state.playerMark;

  const playerIds = Object.keys(state.players || {});
  const opponentId = myUserId ? playerIds.find((id) => id !== myUserId) : undefined;

  // Prefer authoritative marks from `players` mapping.
  const myMarkFromPlayers = myUserId ? (state.players?.[myUserId] as 'X' | 'O' | undefined) : undefined;
  const opponentMarkFromPlayers = opponentId ? (state.players?.[opponentId] as 'X' | 'O' | undefined) : undefined;
  const marksInMatch = Object.values(state.players || {}) as Array<'X' | 'O'>;

  const myMark: 'X' | 'O' | null = myMarkFromPlayers || playerMark || null;
  const opponentMark: 'X' | 'O' | null =
    opponentMarkFromPlayers ||
    (myMark ? (marksInMatch.find((m) => m !== myMark) || (myMark === 'X' ? 'O' : 'X')) : null);
  
  let isWinner = false;
  let isDraw = false;
  let winnerMarkForDisplay: 'X' | 'O' | null = null;
  
  if (winner === 'DRAW') {
    isDraw = true;
    winnerMarkForDisplay = null;
  } else if (winner === 'WIN') {
    isWinner = true;
    winnerMarkForDisplay = myMark;
  } else if (winner === 'LOSS') {
    isWinner = false;
    winnerMarkForDisplay = opponentMark;
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(2, 6, 23, 0.95)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: '24px',
    }}>
      <div style={{
        maxWidth: '420px',
        width: '100%',
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.9) 100%)',
        borderRadius: '24px',
        padding: '40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        border: '1px solid rgba(34, 211, 238, 0.2)',
        boxShadow: '0 0 100px rgba(34, 211, 238, 0.15)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: '-80px',
          left: '-80px',
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          background: isWinner ? '#22d3ee' : (isDraw ? '#64748b' : '#f43f5e'),
          opacity: 0.2,
          filter: 'blur(60px)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-80px',
          right: '-80px',
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          background: isWinner ? '#22d3ee' : (isDraw ? '#64748b' : '#f43f5e'),
          opacity: 0.2,
          filter: 'blur(60px)',
        }} />

        <div style={{ marginBottom: '32px', position: 'relative' }}>
          {isDraw ? (
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <X size={80} color="#94a3b8" style={{ opacity: 0.6, strokeWidth: 2 }} />
              <Circle size={64} color="#94a3b8" style={{ opacity: 0.6, strokeWidth: 3 }} />
            </div>
          ) : isWinner ? (
            <div style={{ padding: '16px', backgroundColor: 'rgba(6, 182,212,0.1)', borderRadius: '50%', border: '2px solid rgba(34,211,238,0.3)' }}>
              {winnerMarkForDisplay === 'X' ? (
                <X size={96} color="#22d3ee" style={{ filter: 'drop-shadow(0 0 15px rgba(34,211,238,0.8))', strokeWidth: 3 }} />
              ) : (
                <Circle size={80} color="#22d3ee" style={{ filter: 'drop-shadow(0 0 15px rgba(34,211,238,0.8))', strokeWidth: 4 }} />
              )}
            </div>
          ) : winnerMarkForDisplay ? (
            <div style={{ padding: '16px', backgroundColor: 'rgba(244,63,94,0.1)', borderRadius: '50%', border: '2px solid rgba(244,63,94,0.3)' }}>
              {winnerMarkForDisplay === 'X' ? (
                <X size={96} color="#f43f5e" style={{ filter: 'drop-shadow(0 0 15px rgba(244,63,94,0.8))', strokeWidth: 3 }} />
              ) : (
                <Circle size={80} color="#f43f5e" style={{ filter: 'drop-shadow(0 0 15px rgba(244,63,94,0.8))', strokeWidth: 4 }} />
              )}
            </div>
          ) : (
            <div style={{ padding: '16px', backgroundColor: 'rgba(148,163,184,0.1)', borderRadius: '50%', border: '2px solid rgba(148,163,184,0.3)' }}>
              <X size={64} color="#94a3b8" style={{ opacity: 0.6 }} />
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{
            fontSize: '48px',
            fontWeight: 900,
            letterSpacing: '-0.05em',
            marginBottom: '8px',
            color: isWinner ? '#22d3ee' : (isDraw ? '#cbd5e1' : '#f43f5e'),
          }}>
            {isWinner ? "VICTORY" : isDraw ? "STALEMATE" : "DEFEAT"}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Medal size={16} color="#fbbf24" />
            <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 700, textTransform: 'uppercase', fontSize: '14px', letterSpacing: '0.1em' }}>
              {isDraw ? '+50 PTS' : isWinner ? '+200 PTS' : '+0 PTS'}
            </span>
          </div>
        </div>

        <div style={{ 
          width: '100%', 
          marginBottom: '40px', 
          backgroundColor: 'rgba(15, 23, 42, 0.4)', 
          borderRadius: '16px', 
          border: '1px solid rgba(51, 65, 85, 0.5)', 
          padding: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', color: '#64748b' }}>
            <Trophy size={14} color="#06b6d4" />
            <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Session Report</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '16px' }}>
                <RefreshCw size={16} color="#22d3ee" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Updating...</span>
              </div>
            ) : (
              stats.map((stat) => (
                <div key={stat.userId} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  backgroundColor: stat.isCurrentPlayer ? 'rgba(34, 211, 238, 0.05)' : 'transparent',
                  borderRadius: '12px',
                  border: stat.isCurrentPlayer ? '1px solid rgba(34, 211, 238, 0.2)' : '1px solid transparent',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: stat.isCurrentPlayer ? 'rgba(34, 211, 238, 0.10)' : 'rgba(148, 163, 184, 0.08)',
                      border: stat.isCurrentPlayer ? '1px solid rgba(34, 211, 238, 0.25)' : '1px solid rgba(148, 163, 184, 0.15)',
                      flexShrink: 0,
                      fontWeight: 900,
                      color: stat.isCurrentPlayer ? '#22d3ee' : '#94a3b8',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                    }}>
                      {stat.isCurrentPlayer ? 'YOU' : 'RIVL'}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', minWidth: 0 }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: 800,
                          color: '#ffffff',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '190px',
                        }}>
                          {stat.username || (stat.isCurrentPlayer ? 'You' : 'Opponent')}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          backgroundColor: 'rgba(52, 211, 153, 0.10)',
                          border: '1px solid rgba(52, 211, 153, 0.20)',
                          color: '#34d399',
                          fontFamily: 'monospace',
                          fontSize: '10px',
                          fontWeight: 900,
                        }}>{stat.wins}W</span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          backgroundColor: 'rgba(244, 63, 94, 0.10)',
                          border: '1px solid rgba(244, 63, 94, 0.20)',
                          color: '#f43f5e',
                          fontFamily: 'monospace',
                          fontSize: '10px',
                          fontWeight: 900,
                        }}>{stat.losses}L</span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          backgroundColor: 'rgba(100, 116, 139, 0.15)',
                          border: '1px solid rgba(100, 116, 139, 0.25)',
                          color: '#94a3b8',
                          fontFamily: 'monospace',
                          fontSize: '10px',
                          fontWeight: 900,
                        }}>{stat.draws}D</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff' }}>
                      {stat.score}
                    </div>
                    <div style={{ fontSize: '8px', color: '#475569', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px' }}>
                      SCORE
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <button
          onClick={() => {
            resetGame();
            window.location.reload();
          }}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: '#22d3ee',
            color: '#020617',
            border: 'none',
            borderRadius: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            boxShadow: '0 0 20px rgba(34, 211, 238, 0.4)',
          }}
        >
          <RefreshCw size={18} />
          New Battle
        </button>
      </div>
    </div>
  );
}