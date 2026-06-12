import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DRINKS } from './constants'
import { dateString, formatNiceDate } from './dateUtils'
import DrinkRow from './DrinkRow'
import { submitSession, getUsers } from './api'

const emptyQuantities = () =>
  DRINKS.reduce((acc, d) => ({ ...acc, [d.id]: 0 }), {})

export default function LogDrinks() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState(null)
  const [userId, setUserId] = useState(() => localStorage.getItem('roundUserId') || '')
  const [date, setDate] = useState(dateString(0))
  const [quantities, setQuantities] = useState(emptyQuantities)
  const [status, setStatus] = useState(null) // { type: 'success' | 'error', message }
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true

    async function loadUsers() {
      setUsersLoading(true)
      setUsersError(null)
      try {
        const data = await getUsers()
        if (!active) return
        setUsers(data)

        // If the saved user id no longer exists, clear it
        const savedId = localStorage.getItem('roundUserId')
        if (savedId && !data.some((u) => u.id === savedId)) {
          localStorage.removeItem('roundUserId')
          setUserId('')
        }
      } catch (err) {
        if (!active) return
        setUsersError(err.message || 'Could not load users.')
      } finally {
        if (active) setUsersLoading(false)
      }
    }

    loadUsers()
    return () => { active = false }
  }, [])

  const total = useMemo(
    () => Object.values(quantities).reduce((a, b) => a + b, 0),
    [quantities]
  )

  const handleUserChange = (e) => {
    const id = e.target.value
    setUserId(id)
    if (id) {
      localStorage.setItem('roundUserId', id)
    } else {
      localStorage.removeItem('roundUserId')
    }
  }

  const handleQuantityChange = (drinkId, value) => {
    setQuantities((prev) => ({ ...prev, [drinkId]: Math.max(0, value) }))
  }

  const resetForm = () => {
    setQuantities(emptyQuantities())
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus(null)

    if (!userId) {
      setStatus({ type: 'error', message: 'Pick who you are first.' })
      return
    }
    if (total === 0) {
      setStatus({ type: 'error', message: 'Add at least one drink before submitting.' })
      return
    }

    setSubmitting(true)

    try {
      await submitSession(userId, date, quantities)

      setStatus({
        type: 'success',
        message: `Logged ${total} drink${total === 1 ? '' : 's'} for ${formatNiceDate(date).toLowerCase()}.`,
      })
      resetForm()
      setTimeout(() => navigate('/leaderboard'), 900)
    } catch (err) {
      setStatus({ type: 'error', message: err?.message || 'Something went wrong. Try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <header className="page__header">
        <img src="/images/tp-logo.png" alt="Tit & Pecker logo" className="logo" />
        <div className="page__header-text">
          <p className="eyebrow">Tit & Pecker</p>
          <h1>Log your drinks</h1>
        </div>
      </header>

      <form id="log-form" onSubmit={handleSubmit} className="form">
        <div className="field">
          <label htmlFor="user">Who are you?</label>
          {usersError && (
            <p className="status status--error" role="alert">
              Could not load users: {usersError}
            </p>
          )}
          <select
            id="user"
            value={userId}
            onChange={handleUserChange}
            required
            disabled={usersLoading || !!usersError}
          >
            <option value="" disabled>
              {usersLoading ? 'Loading…' : 'Select your name'}
            </option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="date">Which day?</label>
          <select id="date" value={date} onChange={(e) => setDate(e.target.value)}>
            <option value={dateString(0)}>Today</option>
            <option value={dateString(-1)}>Yesterday</option>
          </select>
        </div>

        <div className="field">
          <label>Drinks</label>
          <div className="drink-list">
            {DRINKS.map((drink) => (
              <DrinkRow
                key={drink.id}
                drink={drink}
                quantity={quantities[drink.id] ?? 0}
                onChange={(val) => handleQuantityChange(drink.id, val)}
              />
            ))}
          </div>
        </div>

        <div className="total-bar">
          <span>Total</span>
          <span className="total-bar__count">{total}</span>
        </div>

        {status && (
          <p className={`status status--${status.type}`} role="alert">
            {status.message}
          </p>
        )}
      </form>

      <div className="sticky-submit">
        <button type="submit" form="log-form" className="btn btn--primary btn--full" disabled={submitting || usersLoading}>
          {submitting ? 'Saving…' : 'Log your drinks'}
        </button>
      </div>
    </div>
  )
}
