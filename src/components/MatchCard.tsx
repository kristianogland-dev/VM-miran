import { getFlag } from '../data/teamNameMap'
import { ROUND_LABELS } from '../data/scoringRules'
import { StatusBadge, LockedBadge } from './LiveBadge'

interface Match {
  id: number
  home_team: string
  away_team: string
  group_label: string | null
  round: string
  kickoff_utc: string
  home_score: number | null
  away_score: number | null
  status: string
  locked: number
}

interface MatchCardProps {
  match: Match
  prediction?: { predicted_home: number; predicted_away: number } | null
  showPredictions?: Array<{ player_name: string; predicted_home: number; predicted_away: number }>
}

function formatKickoff(utc: string) {
  return new Date(utc).toLocaleString('no-NO', {
    timeZone: 'Europe/Oslo',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function MatchCard({ match, prediction, showPredictions }: MatchCardProps) {
  const isFinished = match.status === 'finished'
  const isLive = match.status === 'live'
  const hasScore = match.home_score != null && match.away_score != null

  return (
    <div className={`card ${isLive ? 'border-red-600' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {match.group_label && (
            <span className="text-xs bg-forest-800 px-2 py-0.5 rounded text-gold-400 font-medium">
              Gruppe {match.group_label}
            </span>
          )}
          {!match.group_label && (
            <span className="text-xs bg-forest-800 px-2 py-0.5 rounded text-gold-400 font-medium">
              {ROUND_LABELS[match.round] || match.round}
            </span>
          )}
          <StatusBadge status={match.status} />
          {match.locked ? <LockedBadge /> : null}
        </div>
        <span className="text-xs text-gray-400">{formatKickoff(match.kickoff_utc)}</span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 text-right">
          <div className="flex items-center justify-end gap-2">
            <span className="font-semibold text-white">{match.home_team}</span>
            <span className="text-xl">{getFlag(match.home_team)}</span>
          </div>
        </div>

        <div className="text-center min-w-[80px]">
          {hasScore ? (
            <div className={`text-2xl font-bold ${isLive ? 'text-red-400' : isFinished ? 'text-gold-400' : 'text-white'}`}>
              {match.home_score} – {match.away_score}
            </div>
          ) : (
            <div className="text-gray-500 text-sm">vs</div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">{getFlag(match.away_team)}</span>
            <span className="font-semibold text-white">{match.away_team}</span>
          </div>
        </div>
      </div>

      {prediction && match.locked && (
        <div className="mt-3 pt-3 border-t border-forest-800">
          <p className="text-xs text-gray-400">
            Ditt tips:{' '}
            <span className="text-white font-medium">
              {prediction.predicted_home} – {prediction.predicted_away}
            </span>
          </p>
        </div>
      )}

      {showPredictions && showPredictions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-forest-800">
          <p className="text-xs text-gray-400 mb-2">Deltakernes tips:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
            {showPredictions.map((p) => (
              <div key={p.player_name} className="text-xs bg-forest-800 rounded px-2 py-1">
                <span className="text-gray-300">{p.player_name}:</span>{' '}
                <span className="text-white font-medium">
                  {p.predicted_home}–{p.predicted_away}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
