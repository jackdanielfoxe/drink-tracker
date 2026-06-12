import { useEffect, useState, useCallback } from 'react'
import { getLeaderboard } from './api'

export default function Leaderboard() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getLeaderboard()
      setRows(data)
    } catch (err) {
      setError(err?.message || 'Could not load leaderboard.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()

    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  return (
    <div className="page">
      <header className="page__header">
        <img src="/images/tp-logo.png" alt="Tit & Pecker logo" className="logo" />
        <div className="page__header-text">
          <p className="eyebrow">Tit & Pecker</p>
          <h1>Leaderboard</h1>
        </div>
      </header>

      {loading && <p className="muted">Loading scores…</p>}
      {error && <p className="status status--error">{error}</p>}

      {!loading && !error && rows.length === 0 && (
        <p className="muted">No sessions logged yet. Be the first!</p>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="leaderboard">
          {rows.map((row) => (
            <div key={row.userId} className={`board-card ${row.rank === 1 ? 'board-card--first' : ''}`}>
              <div className="board-card__rank">{row.rank}</div>
              <div className="board-card__main">
                <div className="board-card__name">{row.name}</div>
                <div className="board-card__meta">
                  <span>{row.totalSessions} session{row.totalSessions === 1 ? '' : 's'}</span>
                  <span>·</span>
                  <span>Top: {row.topDrink}</span>
                </div>
              </div>
              <div className="board-card__total">
                <span className="board-card__count">{row.totalDrinks}</span>
                <span className="board-card__label">drinks</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <button type="button" className="btn btn--secondary" onClick={load} disabled={loading}>
        Refresh
      </button>
    </div>
  )
}
