import { getFlag } from '../data/teamNameMap'

interface LeaderboardEntry {
  id: number
  name: string
  favorite_team: string
  total_points: number
  is_child: number
}

interface LeaderboardProps {
  entries: LeaderboardEntry[]
  currentPlayerId?: number | null
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function Leaderboard({ entries, currentPlayerId }: LeaderboardProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left border-b border-forest-800">
            <th className="pb-3 text-gold-400 text-sm w-10">#</th>
            <th className="pb-3 text-gold-400 text-sm">Navn</th>
            <th className="pb-3 text-gold-400 text-sm hidden sm:table-cell">Favorittlag</th>
            <th className="pb-3 text-gold-400 text-sm text-right">Poeng</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, idx) => {
            const isCurrentUser = entry.id === currentPlayerId
            const isLeader = idx === 0 && entry.total_points > 0
            return (
              <tr
                key={entry.id}
                className={`border-b border-forest-800/50 ${
                  isCurrentUser ? 'bg-forest-800/50' : ''
                } ${isLeader ? 'bg-gold-500/5' : ''}`}
              >
                <td className="py-3 text-lg">
                  {idx < 3 ? MEDALS[idx] : <span className="text-gray-400 text-sm">{idx + 1}</span>}
                </td>
                <td className="py-3">
                  <span className={`font-medium ${isCurrentUser ? 'text-gold-400' : 'text-white'}`}>
                    {entry.name}
                    {isCurrentUser && <span className="text-xs text-gray-400 ml-1">(deg)</span>}
                  </span>
                </td>
                <td className="py-3 text-gray-300 text-sm hidden sm:table-cell">
                  {entry.favorite_team ? (
                    <>
                      {getFlag(entry.favorite_team)} {entry.favorite_team}
                    </>
                  ) : '–'}
                </td>
                <td className="py-3 text-right">
                  <span className={`font-bold text-lg ${isLeader ? 'text-gold-400' : 'text-white'}`}>
                    {entry.total_points}
                  </span>
                </td>
              </tr>
            )
          })}
          {entries.length === 0 && (
            <tr>
              <td colSpan={4} className="py-8 text-center text-gray-500">
                Ingen deltakere ennå
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
