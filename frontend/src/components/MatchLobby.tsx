import { useGameStore } from '@/store/gameStore';
import { Loader2, Users, Zap } from 'lucide-react';

export default function MatchLobby() {
  const { matchId, players, playerMark, isConnected, gameOver } = useGameStore();
  
  const playerCount = Object.keys(players).length;
  const ready = playerCount === 2;
  const hasMatch = !!matchId;

  // If game is over, don't show lobby
  if (gameOver) {
    return null;
  }

  // If we have a match and 2 players, show game starting
  if (hasMatch && ready) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '24px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Zap size={24} color="#16a34a" />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#16a34a' }}>Game Starting!</h2>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ padding: '16px', background: '#dbeafe', borderRadius: '12px', textAlign: 'center', border: '2px solid #3b82f6' }}>
            <p style={{ fontSize: '0.875rem', color: '#1d4ed8', marginBottom: '4px' }}>You</p>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1d4ed8' }}>{playerMark || '?'}</p>
          </div>
          <div style={{ padding: '16px', background: '#fee2e2', borderRadius: '12px', textAlign: 'center', border: '2px solid #ef4444' }}>
            <p style={{ fontSize: '0.875rem', color: '#dc2626', marginBottom: '4px' }}>Opponent</p>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#dc2626' }}>{playerMark === 'X' ? 'O' : playerMark === 'O' ? 'X' : '?'}</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: isConnected ? '#16a34a' : '#dc2626' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isConnected ? '#16a34a' : '#dc2626' }} />
          <span style={{ fontSize: '0.875rem' }}>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
    );
  }

  // If we have a match but waiting for more players
  if (hasMatch) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '24px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Users size={24} color="#16a34a" />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#16a34a' }}>Match Found!</h2>
        </div>
        
        <p style={{ fontFamily: 'monospace', fontSize: '0.875rem', background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px' }}>
          {matchId?.substring(0, 8)}...
        </p>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '8px',
          padding: '12px',
          borderRadius: '8px',
          background: ready ? '#dcfce7' : '#fef3c7',
          color: ready ? '#16a34a' : '#d97706',
          fontWeight: 500
        }}>
          {ready ? (
            <>
              <Zap size={20} />
              <span>Ready to Play!</span>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Loader2 size={18} className="animate-spin" />
                <span>Waiting for opponent... ({playerCount}/2)</span>
              </div>
              <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                (Tip: Use an Incognito window for the second player)
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // No match yet - still looking
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      padding: '32px',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ position: 'relative' }}>
        <div style={{ 
          width: '80px', 
          height: '80px', 
          background: '#dbeafe', 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <Loader2 size={40} color="#2563eb" className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
      
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Finding Match</h2>
        <p style={{ color: '#6b7280' }}>Connecting to multiplayer server...</p>
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
