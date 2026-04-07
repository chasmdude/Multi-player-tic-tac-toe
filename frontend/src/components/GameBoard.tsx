import { useGameStore } from '@/store/gameStore';

export default function GameBoard() {
  const { board, playerMark, isYourTurn, currentTurn, currentUserId } = useGameStore();
  const store = useGameStore();

  const handleCellClick = (index: number) => {
    if (board[index] === '' && isYourTurn()) {
      store.makeMove(index);
      // Note: Actual server send happens in App.tsx
    }
  };

  const getMarkColor = (mark: string) => {
    if (mark === 'X') return 'text-blue-600';
    if (mark === 'O') return 'text-red-600';
    return '';
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2 p-4 bg-gray-50 rounded-lg">
        {board.map((mark, index) => (
          <button
            key={index}
            onClick={() => handleCellClick(index)}
            disabled={!isYourTurn() || board[index] !== ''}
            className={`
              w-20 h-20 border-2 border-gray-300 rounded-lg font-bold text-3xl
              transition-all duration-200 flex items-center justify-center
              ${board[index] === '' && isYourTurn() ? 'cursor-pointer hover:bg-blue-50 hover:border-blue-400' : ''}
              ${board[index] === '' && !isYourTurn() ? 'cursor-not-allowed' : ''}
              ${board[index] !== '' ? 'bg-gray-100 cursor-default' : 'bg-white'}
              ${getMarkColor(mark)}
            `}
          >
            {mark}
          </button>
        ))}
      </div>
    </div>
  );
}
