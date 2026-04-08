import { useGameStore } from '@/store/gameStore';
import { Circle, Clock, User } from 'lucide-react';

export default function GameStatus() {
  const { playerMark, opponentName, timeoutSeconds, isConnected, isYourTurn } = useGameStore();

  const getMarkColor = (mark: string | null) => {
    if (mark === 'X') return { bg: '#dbeafe', text: '#1d4ed8', border: '#3b82f6' };
    if (mark === 'O') return { bg: '#fee2e2', text: '#dc2626', border: '#ef4444' };
    return { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' };
  };

  const markStyle = getMarkColor(playerMark);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '16px',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
    }}>
      {/* Connection Status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Circle size={12} fill={isConnected ? '#22c55e' : '#ef4444'} color={isConnected ? '#22c55e' : '#ef4444'} />
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', color: '#6b7280' }}>
          <Clock size={14} />
          <span>{timeoutSeconds()}s</span>
        </div>
      </div>

      {/* Player Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ 
          padding: '16px', 
          backgroundColor: markStyle.bg, 
          borderRadius: '12px', 
          border: `2px solid ${markStyle.border}`,
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '4px' }}>
            <User size={16} />
            <p style={{ fontSize: '0.875rem', color: markStyle.text }}>Your Mark</p>
          </div>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: markStyle.text }}>{playerMark || '-'}</p>
        </div>

        <div style={{ 
          padding: '16px', 
          backgroundColor: '#f3f4f6', 
          borderRadius: '12px', 
          border: '2px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '4px' }}>
            <User size={16} />
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Current Turn</p>
          </div>
          <p style={{ fontSize: '1.125rem', fontWeight: 600, color: isYourTurn() ? '#16a34a' : '#d97706' }}>
            {isYourTurn() ? '🎯 Your Turn!' : `${opponentName}'s Turn`}
          </p>
        </div>
      </div>
    </div>
  );
}
