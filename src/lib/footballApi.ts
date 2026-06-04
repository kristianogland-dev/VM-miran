import { apiToNor } from '../data/teamNameMap'

const API_KEY = import.meta.env.VITE_FOOTBALL_API_KEY
const BASE_URL = 'https://api.football-data.org/v4'

// FIFA World Cup 2026 competition ID (will be updated when available)
const WC_2026_ID = 2000

interface ApiMatch {
  id: number
  status: string
  utcDate: string
  homeTeam: { name: string }
  awayTeam: { name: string }
  score: {
    fullTime: { home: number | null; away: number | null }
    halfTime: { home: number | null; away: number | null }
  }
  minute?: number
}

export async function fetchLiveMatches(): Promise<ApiMatch[]> {
  if (!API_KEY) return []
  try {
    const res = await fetch(`${BASE_URL}/competitions/${WC_2026_ID}/matches?status=LIVE`, {
      headers: { 'X-Auth-Token': API_KEY },
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.matches || []
  } catch {
    return []
  }
}

export async function fetchTodayMatches(): Promise<ApiMatch[]> {
  if (!API_KEY) return []
  try {
    const today = new Date().toISOString().split('T')[0]
    const res = await fetch(
      `${BASE_URL}/competitions/${WC_2026_ID}/matches?dateFrom=${today}&dateTo=${today}`,
      { headers: { 'X-Auth-Token': API_KEY } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.matches || []
  } catch {
    return []
  }
}

export function mapApiTeamToNor(apiName: string): string {
  return apiToNor[apiName] || apiName
}
