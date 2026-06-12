import { useEffect, useState, useCallback, useRef } from 'react'
import { getLeaderboard, getUserDrinkBreakdown } from './api'

export default function Leaderboard() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [breakdowns, setBreakdowns] = useState({})   // userId -> { data, loading, error }
  const fetchedRef = useRef({})

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
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  const handleCardClick = async (userId) => {
    if (expandedId === userId) {
      setExpandedId(null)
      return
    }
    setExpandedId(userId)

    // Only fetch once
    if (fetchedRef.current[userId]) return
    fetchedRef.current[userId] = true

    setBreakdowns((prev) => ({ ...prev, [userId]: { data: null, loading: true, error: null } }))
    try {
      const data = await getUserDrinkBreakdown(userId)
      setBreakdowns((prev) => ({ ...prev, [userId]: { data, loading: false, error: null } }))
    } catch (err) {
      setBreakdowns((prev) => ({ ...prev, [userId]: { data: null, loading: false, error: err?.message || 'Could not load breakdown.' } }))
    }
  }

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
          {rows.map((row) => {
            const isExpanded = expandedId === row.userId
            const bd = breakdowns[row.userId]
            return (
              <div
                key={row.userId}
                className={`board-card ${row.rank === 1 ? 'board-card--first' : ''} ${isExpanded ? 'board-card--expanded' : ''}`}
              >
                <button
                  type="button"
                  className="board-card__summary"
                  onClick={() => handleCardClick(row.userId)}
                  aria-expanded={isExpanded}
                >
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
                    <span className="board-card__count">{row.totalUnits}</span>
                    <span className="board-card__label">units</span>
                    <span className="board-card__sublabel">{row.totalDrinks} drinks</span>
                  </div>
                  <span className="board-card__chevron" aria-hidden="true">
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </button>

                {isExpanded && (
                  <div className="board-card__breakdown">
                    {bd?.loading && <p className="breakdown__loading">Loading…</p>}
                    {bd?.error && <p className="status status--error">{bd.error}</p>}
                    {bd?.data && bd.data.length === 0 && (
                      <p className="breakdown__empty">No drinks logged yet.</p>
                    )}
                    {bd?.data && bd.data.length > 0 && (
                      <ul className="breakdown__list">
                        {bd.data.map((d) => (
                          <li key={d.drinkTypeId} className="breakdown__item">
                            <span className="breakdown__name">{d.name}</span>
                            <span className="breakdown__stats">
                              {d.totalQuantity} drink{d.totalQuantity === 1 ? '' : 's'}
                              <span className="breakdown__dot">·</span>
                              {d.totalUnits} units
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <button type="button" className="btn btn--secondary" onClick={load} disabled={loading}>
        Refresh
      </button>
    </div>
  )
}
