import { useGameStore } from '@/store/gameStore';
import { RotateCcw } from 'lucide-react';

export default function GameResult() {
  const { gameOver, winner, resetGame, board } = useGameStore();

  const getResultMessage = () => {
    if (winner === 'DRAW') {
      return "It's a Draw!";
    }

    // winner is a userId, need to check if it's current player
    // For now, we'll show a generic message - App.tsx will set this properly
    if (winner === 'WIN') {
      return 'You Won! 🎉';
    }
    if (winner === 'LOSS') {
      return 'You Lost! 😢';
    }

    return 'Game Over';
  };

  const getResultColor = () => {
    if (winner === 'DRAW') return 'text-yellow-600';
    if (winner === 'WIN') return 'text-green-600';
    if (winner === 'LOSS') return 'text-red-600';
    return 'text-gray-600';
  };

  if (!gameOver) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md text-center">
        <h2 className={`text-4xl font-bold mb-4 ${getResultColor()}`}>{getResultMessage()}</h2>

        <div className="mb-6">
          <p className="text-gray-600 mb-2">Final Board:</p>
          <div className="grid grid-cols-3 gap-1 mb-4 p-2 bg-gray-50 rounded">
            {board.map((mark, i) => (
              <div
                key={i}
                className="w-12 h-12 border border-gray-300 rounded flex items-center justify-center font-bold text-lg bg-white"
              >
                {mark}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            resetGame();
            window.location.reload(); // Reload to find new match
          }}
          className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RotateCcw size={20} />
          Play Again
        </button>
      </div>
    </div>
  );
}
