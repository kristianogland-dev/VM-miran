import { useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../lib/api'
import { usePlayer } from '../lib/PlayerContext'
import { getFlag } from '../data/teamNameMap'

export default function Players() {
  const { players, refreshPlayers } = usePlayer()
  const [form, setForm] = useState({ name: '', age: '', favorite_team: '', is_child: false })
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const handleAdd = async () => {
    if (!form.name || !form.age) { toast.error('Navn og alder er påkrevd'); return }
    setAdding(true)
    try {
      await api.createPlayer({
        name: form.name.trim(),
        age: parseInt(form.age),
        favorite_team: form.favorite_team,
        is_child: form.is_child,
        paid_entry: false,
      })
      toast.success(`${form.name} er lagt til!`)
      setForm({ name: '', age: '', favorite_team: '', is_child: false })
      setShowForm(false)
      refreshPlayers()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setAdding(false)
    }
  }

  const entryFee = (p: any) => p.is_child ? 50 : 350

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gold-400">👥 Deltakere</h2>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '× Lukk' : '+ Legg til'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h3 className="font-bold text-white mb-4">Ny deltaker</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Navn *</label>
              <input className="input" placeholder="Navn" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Alder *</label>
              <input className="input" type="number" placeholder="Alder" value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Favorittlag</label>
              <input className="input" placeholder="f.eks. Norge" value={form.favorite_team}
                onChange={(e) => setForm({ ...form, favorite_team: e.target.value })} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-gold-500"
                  checked={form.is_child}
                  onChange={(e) => setForm({ ...form, is_child: e.target.checked })} />
                <span className="text-sm text-gray-300">
                  Barn (50 kr innsats)
                  {!form.is_child && <span className="text-gray-500 ml-1">(Voksen = 350 kr)</span>}
                </span>
              </label>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-primary" onClick={handleAdd} disabled={adding}>
              {adding ? 'Legger til…' : 'Legg til deltaker'}
            </button>
            <span className="text-sm text-gray-400">
              Innsats: <span className="text-gold-400 font-bold">{form.is_child ? 50 : 350} kr</span>
            </span>
          </div>
        </div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-forest-800">
                <th className="pb-3 text-gold-400 text-sm">Navn</th>
                <th className="pb-3 text-gold-400 text-sm hidden sm:table-cell">Alder</th>
                <th className="pb-3 text-gold-400 text-sm hidden sm:table-cell">Favorittlag</th>
                <th className="pb-3 text-gold-400 text-sm">Innsats</th>
                <th className="pb-3 text-gold-400 text-sm">Betalt</th>
                <th className="pb-3 text-gold-400 text-sm text-right">Poeng</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className="border-b border-forest-800/50">
                  <td className="py-3 font-medium text-white">{p.name}</td>
                  <td className="py-3 text-gray-400 hidden sm:table-cell">{p.age}</td>
                  <td className="py-3 text-gray-300 hidden sm:table-cell">
                    {p.favorite_team ? <>{getFlag(p.favorite_team)} {p.favorite_team}</> : '–'}
                  </td>
                  <td className="py-3 text-gray-300">
                    {entryFee(p)} kr
                    <span className="text-xs text-gray-500 ml-1">({p.is_child ? 'barn' : 'voksen'})</span>
                  </td>
                  <td className="py-3">
                    {p.paid_entry
                      ? <span className="text-green-400 text-sm">✅ Betalt</span>
                      : <span className="text-red-400 text-sm">❌ Ikke betalt</span>}
                  </td>
                  <td className="py-3 text-right font-bold text-white">{p.total_points ?? 0}</td>
                </tr>
              ))}
              {players.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">Ingen deltakere ennå</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {players.length > 0 && (
          <div className="mt-4 pt-4 border-t border-forest-800 flex justify-between text-sm text-gray-400">
            <span>{players.length} deltakere</span>
            <span>
              Pott: <span className="text-gold-400 font-bold">
                {players.reduce((sum, p) => sum + (p.is_child ? 50 : 350), 0)} kr
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
