import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export function useLeaderboard(autoRefresh = true) {
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    try {
      const data = await api.getLeaderboard()
      setLeaderboard(data)
      setLastUpdated(new Date())
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    if (!autoRefresh) return
    const id = setInterval(refresh, 60_000)
    return () => clearInterval(id)
  }, [autoRefresh])

  return { leaderboard, loading, lastUpdated, error, refresh }
}
