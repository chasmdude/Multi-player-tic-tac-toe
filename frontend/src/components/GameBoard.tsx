import { useGameStore } from '@/store/gameStore';
import { Circle, X } from 'lucide-react';

export default function GameBoard() {
  const { board, isYourTurn, playerMark } = useGameStore();
  const store = useGameStore();

  const handleCellClick = (index: number) => {
    if (board[index] === '' && isYourTurn()) {
      store.queueMoveToSend(index);
    }
  };

  const getCellStyle = (mark: string, canClick: boolean): React.CSSProperties => {
    const baseColor = mark === '' ? '#0f172a' : (mark === 'X' ? 'rgba(6,182,212,0.15)' : 'rgba(244,63,94,0.15)');
    const borderColor = mark === '' ? '#475569' : (mark === 'X' ? '#06b6d4' : '#f43f5e');
    const shadow = mark === '' ? 'none' : (mark === 'X' ? '0 0 25px rgba(6,182,212,0.3)' : '0 0 25px rgba(244,63,94,0.3)');
    
    return {
      width: '100px',
      height: '100px',
      borderRadius: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease',
      cursor: canClick ? 'pointer' : 'default',
      backgroundColor: baseColor,
      border: '2px solid ' + borderColor,
      boxShadow: shadow,
    };
  };

  return (
    <div style={{ width: '100%', maxWidth: '420px', margin: '0 auto' }}>
      <div 
        style={{
          background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '24px',
          padding: '24px',
          border: '2px solid #334155',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', justifyItems: 'center' }}>
          {board.map((mark, index) => {
            const canClick = mark === '' && isYourTurn();
            const cellStyle = getCellStyle(mark, canClick);
            
            return (
              <button
                key={index}
                onClick={() => handleCellClick(index)}
                disabled={!canClick}
                style={cellStyle}
                onMouseEnter={(e) => {
                  if (canClick) {
                    e.currentTarget.style.borderColor = '#22d3ee';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (canClick) {
                    e.currentTarget.style.borderColor = mark === '' ? '#475569' : (mark === 'X' ? '#06b6d4' : '#f43f5e');
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
              >
                {mark === 'X' && (
                  <X size={48} color="#22d3ee" strokeWidth={3} style={{ filter: 'drop-shadow(0 0 8px rgba(34,211,238,0.8))' }} />
                )} 
                {mark === 'O' && (
                  <Circle size={42} color="#f43f5e" strokeWidth={3} style={{ filter: 'drop-shadow(0 0 8px rgba(244,63,94,0.8))' }} />
                )}
                {!mark && canClick && playerMark === 'X' && (
                  <X size={32} color="rgba(34,211,238,0.3)" strokeWidth={2} />
                )}
                {!mark && canClick && playerMark === 'O' && (
                  <Circle size={28} color="rgba(244,63,94,0.3)" strokeWidth={2} />
                )}
              </button>
            );
          })}
        </div>
      </div>
      
      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <div 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 24px',
            borderRadius: '9999px',
            fontSize: '14px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            backgroundColor: isYourTurn() ? 'rgba(6,182,212,0.2)' : '#1e293b',
            color: isYourTurn() ? '#22d3ee' : '#94a3b8',
            border: `2px solid ${isYourTurn() ? '#06b6d4' : '#475569'}`,
            boxShadow: isYourTurn() ? '0 0 25px rgba(34,211,238,0.3)' : 'none',
          }}
        >
          {isYourTurn() && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22d3ee', animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite' }}></span>
            </span>
          )}
          {isYourTurn() ? "Your Turn" : "Waiting..."}
        </div>
      </div>
    </div>
  );
}