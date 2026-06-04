import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Player {
  id: number
  name: string
  age: number
  favorite_team: string
  is_child: number
  paid_entry: number
  total_points?: number
}

interface PlayerContextType {
  currentPlayer: Player | null
  setCurrentPlayer: (p: Player | null) => void
  players: Player[]
  refreshPlayers: () => void
}

const PlayerContext = createContext<PlayerContextType>({
  currentPlayer: null,
  setCurrentPlayer: () => {},
  players: [],
  refreshPlayers: () => {},
})

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentPlayer, setCurrentPlayerState] = useState<Player | null>(() => {
    const saved = localStorage.getItem('vm2026_player')
    return saved ? JSON.parse(saved) : null
  })
  const [players, setPlayers] = useState<Player[]>([])

  const setCurrentPlayer = (p: Player | null) => {
    setCurrentPlayerState(p)
    if (p) localStorage.setItem('vm2026_player', JSON.stringify(p))
    else localStorage.removeItem('vm2026_player')
  }

  const refreshPlayers = async () => {
    try {
      const res = await fetch('/api/players')
      const data = await res.json()
      setPlayers(data)
      // Update current player data if logged in
      if (currentPlayer) {
        const updated = data.find((p: Player) => p.id === currentPlayer.id)
        if (updated) setCurrentPlayerState(updated)
      }
    } catch (e) {
      console.error('Failed to load players', e)
    }
  }

  useEffect(() => { refreshPlayers() }, [])

  return (
    <PlayerContext.Provider value={{ currentPlayer, setCurrentPlayer, players, refreshPlayers }}>
      {children}
    </PlayerContext.Provider>
  )
}

export const usePlayer = () => useContext(PlayerContext)
