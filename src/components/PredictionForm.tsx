import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { api } from '../lib/api'

interface Match {
  id: number
  home_team: string
  away_team: string
  locked: number
  status: string
  round: string
}

interface PredictionFormProps {
  match: Match
  playerId: number
  existingPrediction?: { predicted_home: number; predicted_away: number } | null
  onSaved?: () => void
}

export default function PredictionForm({ match, playerId, existingPrediction, onSaved }: PredictionFormProps) {
  const [value, setValue] = useState(
    existingPrediction ? `${existingPrediction.predicted_home}-${existingPrediction.predicted_away}` : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (existingPrediction) {
      setValue(`${existingPrediction.predicted_home}-${existingPrediction.predicted_away}`)
    }
  }, [existingPrediction])

  if (match.locked) {
    return (
      <div className="text-gray-500 text-sm">
        {existingPrediction
          ? <span className="text-white">{existingPrediction.predicted_home}–{existingPrediction.predicted_away}</span>
          : <span className="italic">Ingen tips</span>}
        <span className="ml-2 text-xs">🔒</span>
      </div>
    )
  }

  const parseScore = (s: string) => {
    const match = s.trim().match(/^(\d{1,2})[^0-9](\d{1,2})$/)
    if (!match) return null
    return { home: parseInt(match[1]), away: parseInt(match[2]) }
  }

  const handleSave = async () => {
    const parsed = parseScore(value)
    if (!parsed) {
      setError('Ugyldig format. Bruk f.eks. 2-1')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.savePrediction({
        player_id: playerId,
        match_id: match.id,
        predicted_home: parsed.home,
        predicted_away: parsed.away,
      })
      toast.success('Tips lagret!')
      onSaved?.()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        className="input w-24 text-center"
        placeholder="2-1"
        value={value}
        onChange={(e) => { setValue(e.target.value); setError('') }}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        maxLength={5}
      />
      <button
        className="btn-primary text-sm py-1 px-3"
        onClick={handleSave}
        disabled={saving || !value}
      >
        {saving ? '…' : 'Lagre'}
      </button>
      {error && <span className="text-red-400 text-xs">{error}</span>}
    </div>
  )
}
