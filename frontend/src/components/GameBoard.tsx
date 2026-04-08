import { useGameStore } from '@/store/gameStore';

export default function GameBoard() {
  const { board, isYourTurn } = useGameStore();
  const store = useGameStore();

  const handleCellClick = (index: number) => {
    if (board[index] === '' && isYourTurn()) {
      store.queueMoveToSend(index);
    }
  };

  const getMarkStyle = (mark: string) => {
    if (mark === 'X') {
      return {
        color: '#2563eb',
        bgColor: '#dbeafe',
        borderColor: '#3b82f6'
      };
    }
    if (mark === 'O') {
      return {
        color: '#dc2626',
        bgColor: '#fee2e2',
        borderColor: '#ef4444'
      };
    }
    return {
      color: '#6b7280',
      bgColor: '#ffffff',
      borderColor: '#d1d5db'
    };
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Game Board - Using CSS Grid properly */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          padding: '16px',
          background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
          borderRadius: '12px',
          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'
        }}
      >
        {board.map((mark, index) => {
          const style = getMarkStyle(mark);
          const isEmpty = board[index] === '';
          const canClick = isEmpty && isYourTurn();

          return (
            <button
              key={index}
              onClick={() => handleCellClick(index)}
              disabled={!canClick}
              style={{
                width: '100%',
                aspectRatio: '1',
                backgroundColor: style.bgColor,
                border: `3px solid ${style.borderColor}`,
                borderRadius: '12px',
                cursor: canClick ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isEmpty ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none'
              }}
            >
              <span style={{
                color: style.color,
                fontSize: '2rem',
                fontWeight: 'bold',
              }}>
                {mark}
              </span>
            </button>
          );
        })}
      </div>
      
      {/* Turn indicator */}
      <div 
        style={{
          textAlign: 'center',
          padding: '8px 16px',
          borderRadius: '8px',
          backgroundColor: isYourTurn() ? '#dbeafe' : '#fee2e2',
          color: isYourTurn() ? '#1d4ed8' : '#dc2626',
          fontWeight: 600
        }}
      >
        {isYourTurn() ? "🎯 Your Turn!" : "⏳ Opponent's Turn"}
      </div>
    </div>
  );
}
