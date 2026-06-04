const BASE = '/api'

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Ukjent feil' }))
    throw new Error(err.error || 'Forespørsel feilet')
  }
  return res.json()
}

export const api = {
  // Players
  getPlayers: () => req<any[]>('/players'),
  createPlayer: (data: any) => req<any>('/players', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }),
  updatePlayer: (id: number, data: any, adminPw: string) => req<any>(`/players/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPw },
    body: JSON.stringify(data)
  }),
  deletePlayer: (id: number, adminPw: string) => req<any>(`/players/${id}`, {
    method: 'DELETE', headers: { 'x-admin-password': adminPw }
  }),

  // Matches
  getMatches: () => req<any[]>('/matches'),

  // Predictions
  getPredictions: (playerId: number) => req<any[]>(`/predictions/${playerId}`),
  getMatchPredictions: (matchId: number) => req<any[]>(`/predictions/match/${matchId}`),
  savePrediction: (data: any) => req<any>('/predictions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }),
  saveBulkPredictions: (playerId: number, predictions: any[]) => req<any>('/predictions/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player_id: playerId, predictions })
  }),

  // Final predictions
  getFinalPrediction: (playerId: number) => req<any>(`/final-predictions/${playerId}`),
  saveFinalPrediction: (data: any) => req<any>('/final-predictions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }),

  // Meta predictions
  getMetaPrediction: (playerId: number) => req<any>(`/meta-predictions/${playerId}`),
  saveMetaPrediction: (data: any) => req<any>('/meta-predictions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }),

  // Scores
  getLeaderboard: () => req<any[]>('/scores'),
  getPlayerScores: (playerId: number) => req<any[]>(`/scores/player/${playerId}`),

  // Admin
  updateMatchResult: (matchId: number, data: any, adminPw: string) => req<any>(`/matches/${matchId}/result`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPw },
    body: JSON.stringify(data)
  }),
  recalculateScores: (adminPw: string) => req<any>('/admin/recalculate', {
    method: 'POST', headers: { 'x-admin-password': adminPw }
  }),
  getAdminMatchPredictions: (matchId: number, adminPw: string) => req<any[]>(`/admin/match/${matchId}/predictions`, {
    headers: { 'x-admin-password': adminPw }
  }),
}
