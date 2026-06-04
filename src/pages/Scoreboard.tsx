import { useLeaderboard } from '../hooks/useLeaderboard'
import Leaderboard from '../components/Leaderboard'
import { usePlayer } from '../lib/PlayerContext'
import { TOTAL_MAX_POINTS } from '../data/scoringRules'

export default function Scoreboard() {
  const { leaderboard, loading, lastUpdated, error, refresh } = useLeaderboard(true)
  const { currentPlayer } = usePlayer()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gold-400">🏆 Poengtabell</h2>
          <p className="text-gray-400 text-sm mt-1">
            Maks {TOTAL_MAX_POINTS} poeng totalt
          </p>
        </div>
        <div className="text-right">
          {lastUpdated && (
            <p className="text-xs text-gray-500">
              Oppdatert {lastUpdated.toLocaleTimeString('no-NO')}
            </p>
          )}
          <button onClick={refresh} className="btn-secondary text-xs mt-1">
            ↻ Oppdater
          </button>
        </div>
      </div>

      {error && (
        <div className="card border-red-700 text-red-400 mb-4">
          ⚠️ {error}
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="py-12 text-center text-gray-400">Laster tabell…</div>
        ) : (
          <Leaderboard entries={leaderboard} currentPlayerId={currentPlayer?.id} />
        )}
      </div>

      {leaderboard.length > 0 && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card text-center">
            <p className="text-3xl mb-1">🥇</p>
            <p className="font-bold text-gold-400">{leaderboard[0]?.name}</p>
            <p className="text-2xl font-bold">{leaderboard[0]?.total_points}</p>
            <p className="text-xs text-gray-400">poeng</p>
          </div>
          {leaderboard[1] && (
            <div className="card text-center">
              <p className="text-3xl mb-1">🥈</p>
              <p className="font-bold text-gray-300">{leaderboard[1]?.name}</p>
              <p className="text-2xl font-bold">{leaderboard[1]?.total_points}</p>
              <p className="text-xs text-gray-400">poeng</p>
            </div>
          )}
          {leaderboard[2] && (
            <div className="card text-center">
              <p className="text-3xl mb-1">🥉</p>
              <p className="font-bold text-orange-400">{leaderboard[2]?.name}</p>
              <p className="text-2xl font-bold">{leaderboard[2]?.total_points}</p>
              <p className="text-xs text-gray-400">poeng</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
