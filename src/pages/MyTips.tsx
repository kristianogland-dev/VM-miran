import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { api } from '../lib/api'
import { usePlayer } from '../lib/PlayerContext'
import PredictionForm from '../components/PredictionForm'
import { getFlag } from '../data/teamNameMap'
import { ROUND_LABELS } from '../data/scoringRules'
import { LockedBadge } from '../components/LiveBadge'

function LoginSelector() {
  const { players, setCurrentPlayer } = usePlayer()
  const [selected, setSelected] = useState('')

  const handleLogin = () => {
    const p = players.find((p) => p.id === parseInt(selected))
    if (p) setCurrentPlayer(p)
  }

  return (
    <div className="max-w-md mx-auto card text-center">
      <p className="text-2xl mb-4">👤</p>
      <h3 className="text-xl font-bold text-gold-400 mb-2">Hvem er du?</h3>
      <p className="text-gray-400 text-sm mb-6">Velg ditt navn for å se og legge inn tips</p>
      <select
        className="input mb-4"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">– Velg navn –</option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <button className="btn-primary w-full" onClick={handleLogin} disabled={!selected}>
        Fortsett
      </button>
    </div>
  )
}

export default function MyTips() {
  const { currentPlayer, setCurrentPlayer } = usePlayer()
  const [matches, setMatches] = useState<any[]>([])
  const [predictions, setPredictions] = useState<any[]>([])
  const [metaPred, setMetaPred] = useState<any>(null)
  const [finalPred, setFinalPred] = useState<any>(null)
  const [activeGroup, setActiveGroup] = useState<string>('A')
  const [loading, setLoading] = useState(false)

  // Meta form state
  const [metaForm, setMetaForm] = useState({ tournament_winner: '', top_scorer: '', best_player: '' })
  // Final form state
  const [finalForm, setFinalForm] = useState({
    first_goalscorer: '', corners: '', throw_ins: '', yellow_cards: '',
    red_cards: '', offsides: '', free_kicks: ''
  })

  const loadData = useCallback(async () => {
    if (!currentPlayer) return
    setLoading(true)
    try {
      const [m, p, mp, fp] = await Promise.all([
        api.getMatches(),
        api.getPredictions(currentPlayer.id),
        api.getMetaPrediction(currentPlayer.id),
        api.getFinalPrediction(currentPlayer.id),
      ])
      setMatches(m)
      setPredictions(p)
      if (mp) {
        setMetaPred(mp)
        setMetaForm({ tournament_winner: mp.tournament_winner || '', top_scorer: mp.top_scorer || '', best_player: mp.best_player || '' })
      }
      if (fp) {
        setFinalPred(fp)
        setFinalForm({
          first_goalscorer: fp.first_goalscorer || '',
          corners: fp.corners ?? '',
          throw_ins: fp.throw_ins ?? '',
          yellow_cards: fp.yellow_cards ?? '',
          red_cards: fp.red_cards ?? '',
          offsides: fp.offsides ?? '',
          free_kicks: fp.free_kicks ?? '',
        })
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [currentPlayer])

  useEffect(() => { loadData() }, [loadData])

  if (!currentPlayer) return <LoginSelector />

  const getPred = (matchId: number) =>
    predictions.find((p) => p.match_id === matchId) || null

  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
  const groupMatches = matches.filter((m) => m.round === 'group' && m.group_label === activeGroup)
  const knockoutMatches = matches.filter((m) => m.round !== 'group')

  const saveMetaPred = async () => {
    try {
      await api.saveMetaPrediction({ player_id: currentPlayer.id, ...metaForm })
      toast.success('Generelle tips lagret!')
    } catch (e: any) { toast.error(e.message) }
  }

  const saveFinalPred = async () => {
    const data = {
      player_id: currentPlayer.id,
      first_goalscorer: finalForm.first_goalscorer,
      corners: finalForm.corners !== '' ? parseInt(finalForm.corners) : null,
      throw_ins: finalForm.throw_ins !== '' ? parseInt(finalForm.throw_ins) : null,
      yellow_cards: finalForm.yellow_cards !== '' ? parseInt(finalForm.yellow_cards) : null,
      red_cards: finalForm.red_cards !== '' ? parseInt(finalForm.red_cards) : null,
      offsides: finalForm.offsides !== '' ? parseInt(finalForm.offsides) : null,
      free_kicks: finalForm.free_kicks !== '' ? parseInt(finalForm.free_kicks) : null,
    }
    try {
      await api.saveFinalPrediction(data)
      toast.success('Finaletips lagret!')
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gold-400">📝 Mine tips</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Innlogget som: <span className="text-white font-medium">{currentPlayer.name}</span></span>
          <button className="btn-secondary text-xs" onClick={() => setCurrentPlayer(null)}>Bytt</button>
        </div>
      </div>

      {/* Meta predictions */}
      <div className="card mb-6">
        <h3 className="font-bold text-gold-400 mb-4">🌍 Generelle spådommer (separat premie)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { key: 'tournament_winner', label: '🏆 Turneringsvinner' },
            { key: 'top_scorer', label: '⚽ Toppscorer' },
            { key: 'best_player', label: '⭐ Beste spiller' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="text-sm text-gray-400 block mb-1">{label}</label>
              <input
                className="input"
                placeholder="Lag / Spillernavn"
                value={(metaForm as any)[key]}
                onChange={(e) => setMetaForm({ ...metaForm, [key]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <button className="btn-primary mt-4" onClick={saveMetaPred}>Lagre</button>
      </div>

      {/* Group stage */}
      <div className="card mb-6">
        <h3 className="font-bold text-gold-400 mb-4">🗂️ Gruppespill (maks 5 poeng per kamp)</h3>
        <p className="text-xs text-gray-400 mb-4">1p riktig utfall • 4p riktig resultat</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {groups.map((g) => (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              className={`px-3 py-1 rounded text-sm font-medium ${activeGroup === g ? 'bg-gold-500 text-forest-950' : 'bg-forest-800 text-gray-300 hover:bg-forest-700'}`}
            >
              {g}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {groupMatches.map((match) => {
            const pred = getPred(match.id)
            return (
              <div key={match.id} className="bg-forest-800 rounded-lg p-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 font-medium">
                    <span>{getFlag(match.home_team)} {match.home_team}</span>
                    <span className="text-gray-400">vs</span>
                    <span>{getFlag(match.away_team)} {match.away_team}</span>
                  </div>
                  {match.locked ? (
                    <div className="flex items-center gap-2">
                      <LockedBadge />
                      {pred && <span className="text-sm text-gray-300">{pred.predicted_home}–{pred.predicted_away}</span>}
                    </div>
                  ) : (
                    <PredictionForm match={match} playerId={currentPlayer.id} existingPrediction={pred} onSaved={loadData} />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(match.kickoff_utc).toLocaleString('no-NO', { timeZone: 'Europe/Oslo', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Knockout */}
      {knockoutMatches.length > 0 && (
        <div className="card mb-6">
          <h3 className="font-bold text-gold-400 mb-4">🏆 Sluttspill</h3>
          <div className="space-y-3">
            {['r32', 'r16', 'qf', 'sf', 'bronze', 'final'].map((round) => {
              const roundMatches = knockoutMatches.filter((m) => m.round === round)
              if (roundMatches.length === 0) return null
              return (
                <div key={round}>
                  <h4 className="text-sm font-medium text-gold-400 mb-2">{ROUND_LABELS[round]}</h4>
                  <div className="space-y-2">
                    {roundMatches.map((match) => {
                      const pred = getPred(match.id)
                      return (
                        <div key={match.id} className="bg-forest-800 rounded-lg p-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="font-medium">
                              {getFlag(match.home_team)} {match.home_team} vs {getFlag(match.away_team)} {match.away_team}
                            </span>
                            {match.locked ? (
                              <div className="flex items-center gap-2">
                                <LockedBadge />
                                {pred && <span className="text-sm text-gray-300">{pred.predicted_home}–{pred.predicted_away}</span>}
                              </div>
                            ) : (
                              <PredictionForm match={match} playerId={currentPlayer.id} existingPrediction={pred} onSaved={loadData} />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Final special predictions */}
      <div className="card">
        <h3 className="font-bold text-gold-400 mb-2">🏆 Finale – Spesialtips (5 poeng hver)</h3>
        <p className="text-xs text-gray-400 mb-4">Statistikk fra livescore.com er fasit</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Første målscorer</label>
            <input className="input" placeholder="Spillernavn" value={finalForm.first_goalscorer}
              onChange={(e) => setFinalForm({ ...finalForm, first_goalscorer: e.target.value })} />
          </div>
          {[
            { key: 'corners', label: 'Antall cornere' },
            { key: 'throw_ins', label: 'Antall innkast' },
            { key: 'yellow_cards', label: 'Antall gule kort' },
            { key: 'red_cards', label: 'Antall røde kort' },
            { key: 'offsides', label: 'Antall offside' },
            { key: 'free_kicks', label: 'Antall frispark' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="text-sm text-gray-400 block mb-1">{label}</label>
              <input className="input" type="number" min="0" placeholder="0"
                value={(finalForm as any)[key]}
                onChange={(e) => setFinalForm({ ...finalForm, [key]: e.target.value })} />
            </div>
          ))}
        </div>
        <button className="btn-primary mt-4" onClick={saveFinalPred}>Lagre finaletips</button>
      </div>
    </div>
  )
}
