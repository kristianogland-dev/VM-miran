export function LiveBadge({ minute }: { minute?: number }) {
  return (
    <span className="badge-live">
      🔴 LIVE{minute ? ` ${minute}'` : ''}
    </span>
  )
}

export function LockedBadge() {
  return <span className="badge-locked">🔒 Låst</span>
}

export function StatusBadge({ status }: { status: string }) {
  if (status === 'live') return <LiveBadge />
  if (status === 'finished') return (
    <span className="bg-gray-700 text-gray-300 text-xs font-medium px-2 py-0.5 rounded-full">
      ✅ Ferdig
    </span>
  )
  return (
    <span className="bg-forest-800 text-gray-300 text-xs font-medium px-2 py-0.5 rounded-full">
      🕐 Kommende
    </span>
  )
}
