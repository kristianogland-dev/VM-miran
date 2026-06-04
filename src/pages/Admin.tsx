import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { api } from '../lib/api'
import { getFlag } from '../data/teamNameMap'
import { ROUND_LABELS } from '../data/scoringRules'

const ADMIN_PW_KEY = 'vm2026_admin_pw'

function AdminLogin({ onLogin }: { onLogin: (pw: string) => void }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')

  const tryLogin = async () => {
    try {
      await api.recalculateScores(pw)
      localStorage.setItem(ADMIN_PW_KEY, pw)
      onLogin(pw)
    } catch {
      setError('Feil passord')
    }
  }

  return (
    <div className="max-w-md mx-auto card text-center">
      <p className="text-4xl mb-4">🔐</p>
      <h3 className="text-xl font-bold text-gold-400 mb-6">Admin-innlogging</h3>
      <input
        type="password"
        className="input mb-4"
        placeholder="Passord"
        value={pw}
        onChange={(e) => { setPw(e.target.value); setError('') }}
        onKeyDown={(e) => e.key === 'Enter' && tryLogin()}
      />
      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
      <button className="btn-primary w-full" onClick={tryLogin}>Logg inn</button>
    </div>
  )
}

export default function Admin() {
  const [adminPw, setAdminPw] = useState(() => localStorage.getItem(ADMIN_PW_KEY) || '')
  const [authed, setAuthed] = useState(false)
  const [matches, setMatches] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [editingMatch, setEditingMatch] = useState<number | null>(null)
  const [resultForm, setResultForm] = useState({ home: '', away: '', status: 'finished', home_team: '', away_team: '' })
  const [matchPredictions, setMatchPredictions] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'matches' | 'players'>('matches')
  const [filterRound, setFilterRound] = useState('group')

  useEffect(() => {
    if (adminPw) {
      // Verify stored password
      api.recalculateScores(adminPw)
        .then(() => { setAuthed(true); loadData() })
        .catch(() => { localStorage.removeItem(ADMIN_PW_KEY); setAdminPw('') })
    }
  }, [])

  const loadData = async () => {
    const [m, p] = await Promise.all([api.getMatches(), api.getPlayers()])
    setMatches(m)
    setPlayers(p)
  }

  const handleLogin = (pw: string) => {
    setAdminPw(pw)
    setAuthed(true)
    loadData()
  }

  const startEdit = async (match: any) => {
    setEditingMatch(match.id)
    setResultForm({
      home: match.home_score ?? '',
      away: match.away_score ?? '',
      status: match.status,
      home_team: match.home_team,
      away_team: match.away_team,
    })
    const preds = await api.getAdminMatchPredictions(match.id, adminPw)
    setMatchPredictions(preds)
  }

  const saveResult = async (matchId: number) => {
    if (resultForm.home === '' || resultForm.away === '') {
      toast.error('Skriv inn resultatet')
      return
    }
    setSaving(true)
    try {
      await api.updateMatchResult(matchId, {
        home_score: parseInt(resultForm.home as string),
        away_score: parseInt(resultForm.away as string),
        status: resultForm.status,
        home_team: resultForm.home_team,
        away_team: resultForm.away_team,
      }, adminPw)
      toast.success('Resultat lagret og poeng beregnet!')
      setEditingMatch(null)
      loadData()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const seedDb = async () => {
    try {
      const res: any = await api.seedMatches(adminPw)
      if (res.skipped) toast.success(`Databasen har allerede ${res.count} kamper`)
      else toast.success(`Seedet ${res.seeded} kamper!`)
      loadData()
    } catch (e: any) { toast.error(e.message) }
  }

  const recalculateAll = async () => {
    try {
      const res: any = await api.recalculateScores(adminPw)
      toast.success(`Omberegnet ${res.recalculated} kamper`)
      loadData()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const togglePaid = async (player: any) => {
    try {
      await api.updatePlayer(player.id, { ...player, paid_entry: !player.paid_entry }, adminPw)
      toast.success('Oppdatert!')
      loadData()
    } catch (e: any) { toast.error(e.message) }
  }

  if (!authed) return <AdminLogin onLogin={handleLogin} />

  const rounds = ['group', 'r32', 'r16', 'qf', 'sf', 'bronze', 'final']
  const filteredMatches = matches.filter((m) => m.round === filterRound)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gold-400">⚙️ Admin</h2>
        <div className="flex gap-2 flex-wrap justify-end">
          {matches.length === 0 && (
            <button className="btn-primary text-sm" onClick={seedDb}>
              🌱 Seed kamper (104)
            </button>
          )}
          <button className="btn-secondary text-sm" onClick={recalculateAll}>
            🔄 Omberegn alle poeng
          </button>
          <button className="btn-secondary text-sm" onClick={() => {
            setAuthed(false)
            localStorage.removeItem(ADMIN_PW_KEY)
          }}>
            Logg ut
          </button>
        </div>
      </div>

      <div className="flex gap-4 border-b border-forest-800 mb-6">
        <button onClick={() => setTab('matches')} className={tab === 'matches' ? 'tab-active' : 'tab-inactive'}>
          ⚽ Kamper
        </button>
        <button onClick={() => setTab('players')} className={tab === 'players' ? 'tab-active' : 'tab-inactive'}>
          👥 Deltakere
        </button>
      </div>

      {tab === 'matches' && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {rounds.map((r) => (
              <button key={r} onClick={() => setFilterRound(r)}
                className={`px-3 py-1 rounded text-sm ${filterRound === r ? 'bg-gold-500 text-forest-950 font-bold' : 'bg-forest-800 text-gray-300 hover:bg-forest-700'}`}>
                {ROUND_LABELS[r]}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filteredMatches.map((match) => (
              <div key={match.id} className="card">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2 font-medium">
                    <span>{getFlag(match.home_team)} {match.home_team}</span>
                    <span className="text-gray-400">vs</span>
                    <span>{getFlag(match.away_team)} {match.away_team}</span>
                    {match.home_score != null && (
                      <span className="text-gold-400 font-bold ml-2">
                        {match.home_score}–{match.away_score}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      match.status === 'finished' ? 'bg-green-900 text-green-400' :
                      match.status === 'live' ? 'bg-red-900 text-red-400' :
                      'bg-forest-800 text-gray-400'
                    }`}>
                      {match.status}
                    </span>
                    <button className="btn-secondary text-xs py-1" onClick={() => startEdit(match)}>
                      ✏️ Rediger
                    </button>
                  </div>
                </div>

                {editingMatch === match.id && (
                  <div className="mt-4 pt-4 border-t border-forest-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Hjemmelag</label>
                        <input className="input text-sm" value={resultForm.home_team}
                          onChange={(e) => setResultForm({ ...resultForm, home_team: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Bortelag</label>
                        <input className="input text-sm" value={resultForm.away_team}
                          onChange={(e) => setResultForm({ ...resultForm, away_team: e.target.value })} />
                      </div>
                    </div>
                    <div className="flex items-end gap-3 flex-wrap">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Hjemmemål</label>
                        <input type="number" min="0" className="input w-20 text-center"
                          value={resultForm.home}
                          onChange={(e) => setResultForm({ ...resultForm, home: e.target.value })} />
                      </div>
                      <span className="text-xl text-gray-400 mb-2">–</span>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Bortemål</label>
                        <input type="number" min="0" className="input w-20 text-center"
                          value={resultForm.away}
                          onChange={(e) => setResultForm({ ...resultForm, away: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Status</label>
                        <select className="input"
                          value={resultForm.status}
                          onChange={(e) => setResultForm({ ...resultForm, status: e.target.value })}>
                          <option value="scheduled">scheduled</option>
                          <option value="live">live</option>
                          <option value="finished">finished</option>
                        </select>
                      </div>
                      <button className="btn-primary mb-0" onClick={() => saveResult(match.id)} disabled={saving}>
                        {saving ? '…' : '✅ Lagre'}
                      </button>
                      <button className="btn-secondary" onClick={() => setEditingMatch(null)}>Avbryt</button>
                    </div>

                    {matchPredictions.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-400 mb-2">Deltakernes tips:</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {matchPredictions.map((p) => (
                            <div key={p.id} className="bg-forest-800 rounded px-2 py-1 text-xs">
                              <span className="text-gray-300">{p.player_name}:</span>{' '}
                              <span className="text-white font-medium">{p.predicted_home}–{p.predicted_away}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'players' && (
        <div className="card">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-forest-800">
                <th className="pb-3 text-gold-400 text-sm">Navn</th>
                <th className="pb-3 text-gold-400 text-sm">Alder</th>
                <th className="pb-3 text-gold-400 text-sm">Innsats</th>
                <th className="pb-3 text-gold-400 text-sm">Betalt</th>
                <th className="pb-3 text-gold-400 text-sm text-right">Poeng</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className="border-b border-forest-800/50">
                  <td className="py-2 font-medium">{p.name}</td>
                  <td className="py-2 text-gray-400">{p.age}</td>
                  <td className="py-2 text-gray-300">{p.is_child ? 50 : 350} kr</td>
                  <td className="py-2">
                    <button
                      onClick={() => togglePaid(p)}
                      className={`text-xs px-2 py-1 rounded ${p.paid_entry ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}
                    >
                      {p.paid_entry ? '✅ Betalt' : '❌ Ikke betalt'}
                    </button>
                  </td>
                  <td className="py-2 text-right font-bold">{p.total_points ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
