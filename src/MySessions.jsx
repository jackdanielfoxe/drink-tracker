import { useEffect, useState, useCallback } from 'react'
import { DRINKS } from './constants'
import { formatNiceDate } from './dateUtils'
import DrinkRow from './DrinkRow'
import { getUserSessions, updateSessionDrinks, deleteSession, findRosterUser } from './api'
import { supabase } from './supabaseClient'

const quantitiesFromSession = (session) => {
  const q = DRINKS.reduce((acc, d) => ({ ...acc, [d.id]: 0 }), {})
  for (const sd of session.session_drinks ?? []) {
    if (sd?.drink_type_id != null) {
      q[sd.drink_type_id] = Number(sd.quantity) || 0
    }
  }
  return q
}

export default function MySessions() {
  // null = still resolving the signed-in user; '' = signed in but no roster match
  const [userId, setUserId] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Resolve the signed-in Google user to their roster row (by auth_id, then
  // email) — same matching LogDrinks uses.
  useEffect(() => {
    let active = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const match = await findRosterUser(user?.id ?? null, user?.email ?? '')
      if (!active) return
      setUserId(match?.id ?? '')
    })()
    return () => { active = false }
  }, [])

  const [editingId, setEditingId] = useState(null)
  const [editQuantities, setEditQuantities] = useState({})
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const load = useCallback(async () => {
    if (userId === null) return // still resolving the signed-in user
    if (!userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getUserSessions(userId)
      setSessions(data)
    } catch (err) {
      setError(err?.message || 'Could not load your sessions.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  const startEdit = (session) => {
    setActionError(null)
    setEditingId(session.id)
    setEditQuantities(quantitiesFromSession(session))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditQuantities({})
    setActionError(null)
  }

  const handleQuantityChange = (drinkId, value) => {
    setEditQuantities((prev) => ({ ...prev, [drinkId]: Math.max(0, value) }))
  }

  const saveEdit = async (sessionId) => {
    setSaving(true)
    setActionError(null)
    try {
      await updateSessionDrinks(sessionId, editQuantities)
      await load()
      setEditingId(null)
      setEditQuantities({})
    } catch (err) {
      setActionError(err?.message || 'Could not save changes.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (sessionId) => {
    setActionError(null)
    setDeletingId(sessionId)
    try {
      await deleteSession(sessionId)
      await load()
      if (editingId === sessionId) {
        setEditingId(null)
        setEditQuantities({})
      }
    } catch (err) {
      setActionError(err?.message || 'Could not delete session.')
    } finally {
      setDeletingId(null)
    }
  }

  const editTotal = Object.values(editQuantities).reduce((a, b) => a + b, 0)

  if (!userId) {
    return (
      <div className="page">
        <header className="page__header">
          <a className="logo-link" href="https://titandpecker.com/members" aria-label="Back to Members">
            <img src="/images/tp-logo.png" alt="Tit & Pecker logo" className="logo" />
          </a>
          <div className="page__header-text">
            <p className="eyebrow">Tit & Pecker</p>
            <h1>My sessions</h1>
          </div>
        </header>
        <p className="muted">
          {userId === null
            ? 'Loading…'
            : 'We couldn’t find your linked account. Head to the Log screen to pick your name.'}
        </p>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page__header">
        <img src="/images/tp-logo.png" alt="Tit & Pecker logo" className="logo" />
        <div className="page__header-text">
          <p className="eyebrow">Tit & Pecker</p>
          <h1>My sessions</h1>
        </div>
      </header>

      {loading && <p className="muted">Loading your sessions…</p>}
      {error && <p className="status status--error">{error}</p>}

      {!loading && !error && sessions.length === 0 && (
        <p className="muted">No sessions logged yet.</p>
      )}

      {actionError && (
        <p className="status status--error" role="alert">{actionError}</p>
      )}

      {!loading && !error && sessions.length > 0 && (
        <div className="session-list">
          {sessions.map((session) => {
            const isEditing = editingId === session.id
            const drinkSummary = (session.session_drinks ?? [])
              .filter((sd) => Number(sd?.quantity) > 0)
              .map((sd) => `${sd.quantity}× ${sd.drink_types?.name ?? 'Unknown'}`)
              .join(', ')
            const sessionTotal = (session.session_drinks ?? [])
              .reduce((sum, sd) => sum + (Number(sd?.quantity) || 0), 0)

            return (
              <div key={session.id} className="session-card">
                <div className="session-card__header">
                  <div>
                    <div className="session-card__date">{formatNiceDate(session.session_date)}</div>
                    {!isEditing && (
                      <div className="session-card__summary">
                        {drinkSummary || 'No drinks recorded'}
                      </div>
                    )}
                  </div>
                  <div className="session-card__total">
                    <span className="board-card__count">{sessionTotal}</span>
                    <span className="board-card__label">drinks</span>
                  </div>
                </div>

                {isEditing ? (
                  <>
                    <div className="drink-list">
                      {DRINKS.map((drink) => (
                        <DrinkRow
                          key={drink.id}
                          drink={drink}
                          quantity={editQuantities[drink.id] ?? 0}
                          onChange={(val) => handleQuantityChange(drink.id, val)}
                        />
                      ))}
                    </div>

                    <div className="total-bar">
                      <span>Total</span>
                      <span className="total-bar__count">{editTotal}</span>
                    </div>

                    <div className="session-card__actions">
                      <button
                        type="button"
                        className="btn btn--secondary"
                        onClick={cancelEdit}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn btn--primary"
                        onClick={() => saveEdit(session.id)}
                        disabled={saving}
                      >
                        {saving ? 'Saving…' : 'Save changes'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="session-card__actions">
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={() => startEdit(session)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger"
                      onClick={() => handleDelete(session.id)}
                      disabled={deletingId === session.id}
                    >
                      {deletingId === session.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
