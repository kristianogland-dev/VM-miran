import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import MatchCard from '../components/MatchCard'
import { usePlayer } from '../lib/PlayerContext'

type Tab = 'live' | 'upcoming' | 'finished'

export default function Matches() {
  const [matches, setMatches] = useState<any[]>([])
  const [predictions, setPredictions] = useState<any[]>([])
  const [matchPredictions, setMatchPredictions] = useState<Record<number, any[]>>({})
  const [tab, setTab] = useState<Tab>('upcoming')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { currentPlayer } = usePlayer()

  useEffect(() => {
    loadData()
    const id = setInterval(loadData, 60_000)
    return () => clearInterval(id)
  }, [currentPlayer?.id])

  async function loadData() {
    try {
      const [m, p] = await Promise.all([
        api.getMatches(),
        currentPlayer ? api.getPredictions(currentPlayer.id) : Promise.resolve([]),
      ])
      setMatches(m)
      setPredictions(p)

      // Load predictions for locked matches
      const locked = m.filter((m: any) => m.locked)
      const predMap: Record<number, any[]> = {}
      await Promise.all(
        locked.map(async (match: any) => {
          const preds = await api.getMatchPredictions(match.id)
          predMap[match.id] = preds
        })
      )
      setMatchPredictions(predMap)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const now = new Date()
  const live = matches.filter((m) => m.status === 'live')
  const upcoming = matches.filter((m) => m.status === 'scheduled' && new Date(m.kickoff_utc) > now)
  const finished = matches.filter((m) => m.status === 'finished' || (m.status === 'scheduled' && new Date(m.kickoff_utc) <= now))

  const getPrediction = (matchId: number) =>
    predictions.find((p) => p.match_id === matchId) || null

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'live', label: '🔴 Live', count: live.length },
    { key: 'upcoming', label: '📅 Kommende', count: upcoming.length },
    { key: 'finished', label: '✅ Ferdig', count: finished.length },
  ]

  const displayMatches = { live, upcoming, finished }[tab]

  return (
    <div>
      <h2 className="text-2xl font-bold text-gold-400 mb-6">⚽ Kamper</h2>

      {error && (
        <div className="card border-red-700 text-red-400 mb-4">
          ⚠️ Klarte ikke laste kamper: {error}
          <p className="text-xs mt-1 text-gray-400">Sjekk at miljøvariabler er satt i Netlify og at databasen er seedet via Admin-panelet.</p>
        </div>
      )}

      <div className="flex gap-6 border-b border-forest-800 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`${tab === t.key ? 'tab-active' : 'tab-inactive'} text-sm font-medium`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="ml-1 bg-forest-800 text-xs px-1.5 rounded-full">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-12">Laster kamper…</div>
      ) : matches.length === 0 && !error ? (
        <div className="card text-center py-10">
          <p className="text-2xl mb-3">🗄️</p>
          <p className="text-white font-medium mb-1">Ingen kamper i databasen ennå</p>
          <p className="text-gray-400 text-sm">Gå til <strong>Admin</strong>-siden og trykk <strong>"🌱 Seed kamper"</strong> for å laste inn alle 104 kamper.</p>
        </div>
      ) : displayMatches.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          {tab === 'live' ? 'Ingen kamper spilles nå' :
           tab === 'upcoming' ? 'Ingen kommende kamper' : 'Ingen fullførte kamper'}
        </div>
      ) : (
        <div className="space-y-3">
          {displayMatches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              prediction={getPrediction(match.id)}
              showPredictions={match.locked ? matchPredictions[match.id] : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
