import { useState, useEffect, useRef } from 'react'
import { fetchLiveMatches } from '../lib/footballApi'

interface LiveScore {
  apiMatchId: string
  homeScore: number | null
  awayScore: number | null
  minute?: number
  status: string
  isStale: boolean
}

export function useLiveScores() {
  const [liveScores, setLiveScores] = useState<Record<string, LiveScore>>({})
  const [hasLive, setHasLive] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  const fetchScores = async () => {
    const matches = await fetchLiveMatches()
    if (matches.length > 0) {
      setHasLive(true)
      const scores: Record<string, LiveScore> = {}
      for (const m of matches) {
        scores[String(m.id)] = {
          apiMatchId: String(m.id),
          homeScore: m.score.fullTime.home,
          awayScore: m.score.fullTime.away,
          status: m.status,
          isStale: false,
        }
      }
      setLiveScores(scores)
    } else {
      setHasLive(false)
    }
  }

  useEffect(() => {
    fetchScores()
    // Poll every 60s during live, every 5min otherwise
    const interval = hasLive ? 60_000 : 300_000
    intervalRef.current = setInterval(fetchScores, interval)
    return () => clearInterval(intervalRef.current)
  }, [hasLive])

  return { liveScores, hasLive }
}
