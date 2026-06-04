import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Scoreboard from './pages/Scoreboard'
import Matches from './pages/Matches'
import MyTips from './pages/MyTips'
import Admin from './pages/Admin'
import Players from './pages/Players'
import { PlayerProvider } from './lib/PlayerContext'

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-gold-500 text-forest-950'
            : 'text-gray-300 hover:text-white hover:bg-forest-800'
        }`
      }
    >
      {label}
    </NavLink>
  )
}

export default function App() {
  return (
    <PlayerProvider>
      <div className="min-h-screen bg-forest-950">
        <header className="bg-forest-900 border-b border-forest-800 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚽</span>
              <div>
                <h1 className="font-bold text-gold-500 leading-tight">VM 2026</h1>
                <p className="text-xs text-gray-400">Tippekonkurranse</p>
              </div>
            </div>
            <nav className="flex items-center gap-1 flex-wrap">
              <NavItem to="/scoreboard" label="Tabell" />
              <NavItem to="/matches" label="Kamper" />
              <NavItem to="/my-tips" label="Mine tips" />
              <NavItem to="/players" label="Deltakere" />
              <NavItem to="/admin" label="Admin" />
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Navigate to="/scoreboard" replace />} />
            <Route path="/scoreboard" element={<Scoreboard />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/my-tips" element={<MyTips />} />
            <Route path="/players" element={<Players />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1a472a', color: '#fff', border: '1px solid #ffd700' },
          success: { iconTheme: { primary: '#ffd700', secondary: '#1a472a' } },
        }}
      />
    </PlayerProvider>
  )
}
