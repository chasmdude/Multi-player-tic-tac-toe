import { useGameStore } from '@/store/gameStore';
import { Circle } from 'lucide-react';

export default function GameStatus() {
  const { playerMark, currentTurn, opponentName, timeoutSeconds, isConnected, currentUserId } =
    useGameStore();
  const { isYourTurn } = useGameStore();

  const getMarkColor = (mark: string | null) => {
    if (mark === 'X') return 'text-blue-600';
    if (mark === 'O') return 'text-red-600';
    return 'text-gray-600';
  };

  const getTurnDisplay = () => {
    if (isYourTurn()) {
      return `Your Turn (X = blue, O = red)`;
    }
    return `${opponentName}'s Turn - ${timeoutSeconds()}s`;
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-white rounded-lg shadow-md border border-gray-200">
      <div className="flex items-center gap-2">
        <Circle
          size={12}
          className={isConnected ? 'fill-green-500 text-green-500' : 'fill-red-500 text-red-500'}
        />
        <span className="text-sm text-gray-600">{isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>

      <div className="flex gap-4">
        <div>
          <p className="text-sm text-gray-600">Your Mark</p>
          <p className={`text-2xl font-bold ${getMarkColor(playerMark)}`}>{playerMark || '-'}</p>
        </div>

        <div className="flex-1">
          <p className="text-sm text-gray-600">Current Turn</p>
          <p className="text-lg font-semibold text-gray-900">{getTurnDisplay()}</p>
        </div>
      </div>
    </div>
  );
}
