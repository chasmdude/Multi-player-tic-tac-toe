import { useGameStore } from '@/store/gameStore';
import { Loader } from 'lucide-react';

export default function MatchLobby() {
  const { matchId, players, playerMark } = useGameStore();

  if (matchId) {
    const playerCount = Object.keys(players).length;
    const ready = playerCount === 2;

    return (
      <div className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-lg border border-gray-200">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Match Found!</h2>
          <p className="text-sm text-gray-600 mb-4">Match ID: {matchId.substring(0, 12)}...</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-blue-50 rounded-lg text-center">
            <p className="text-sm text-gray-600 mb-1">You</p>
            <p className="text-2xl font-bold text-blue-600">{playerMark || '-'}</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg text-center">
            <p className="text-sm text-gray-600 mb-1">Opponent</p>
            <p className="text-2xl font-bold text-red-600">{playerMark === 'X' ? 'O' : 'X'}</p>
          </div>
        </div>

        <div className={`text-center font-semibold ${ready ? 'text-green-600' : 'text-yellow-600'}`}>
          {ready ? '✓ Both players connected' : `Waiting for opponent... (${playerCount}/2)`}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-lg border border-gray-200 items-center justify-center">
      <Loader className="animate-spin text-blue-600" size={40} />
      <h2 className="text-xl font-bold text-gray-900">Finding a match...</h2>
      <p className="text-sm text-gray-600">This may take a few moments</p>
    </div>
  );
}
