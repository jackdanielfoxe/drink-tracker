import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { DRINKS } from './constants'
import { dateString, formatNiceDate } from './dateUtils'
import DrinkRow from './DrinkRow'
import { submitSession, findRosterUser, getUnclaimedUsers, claimRosterUser } from './api'
import { supabase } from './supabaseClient'

const emptyQuantities = () =>
  DRINKS.reduce((acc, d) => ({ ...acc, [d.id]: 0 }), {})

export default function LogDrinks() {
  const navigate = useNavigate()
  const [identityLoading, setIdentityLoading] = useState(true)
  const [authUser, setAuthUser] = useState(null) // { id, email, googleName }
  const [userId, setUserId] = useState('')        // matched users.id, or '' if unlinked
  const [displayName, setDisplayName] = useState('')
  const [linked, setLinked] = useState(false)     // true once matched to a users row
  const [unclaimed, setUnclaimed] = useState([])  // roster names available to claim
  const [claimId, setClaimId] = useState('')      // selected name in the claim picker
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState(null)
  const [date, setDate] = useState(dateString(0))
  const [quantities, setQuantities] = useState(emptyQuantities)
  const [status, setStatus] = useState(null) // { type: 'success' | 'error', message }
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true

    async function loadIdentity() {
      setIdentityLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!active) return

        const email = user?.email ?? ''
        const googleName =
          user?.user_metadata?.full_name ||
          user?.user_metadata?.name ||
          email ||
          'there'
        setAuthUser({ id: user?.id ?? null, email, googleName })

        const match = await findRosterUser(user?.id ?? null, email)
        if (!active) return

        if (match) {
          setUserId(match.id)
          setDisplayName(match.name)
          setLinked(true)
        } else {
          // No roster match yet — show the claim picker so they can link.
          setDisplayName(googleName)
          setLinked(false)
          const names = await getUnclaimedUsers()
          if (!active) return
          setUnclaimed(names)
        }
      } finally {
        if (active) setIdentityLoading(false)
      }
    }

    loadIdentity()
    return () => { active = false }
  }, [])

  const handleClaim = async () => {
    if (!claimId || !authUser?.id) return
    setClaiming(true)
    setClaimError(null)
    try {
      const claimed = await claimRosterUser(claimId, authUser.id, authUser.email)
      setUserId(claimed.id)
      setDisplayName(claimed.name)
      setLinked(true)
    } catch (err) {
      setClaimError(err?.message || 'Could not claim that name. Try again.')
      // Refresh the available names in case the list changed.
      try { setUnclaimed(await getUnclaimedUsers()) } catch { /* ignore */ }
    } finally {
      setClaiming(false)
    }
  }

  const [openAccordions, setOpenAccordions] = useState({})

  const toggleAccordion = useCallback((cat) => {
    setOpenAccordions((prev) => ({ ...prev, [cat]: !prev[cat] }))
  }, [])

  const categorisedGroups = useMemo(() => {
    const groups = {}
    const flat = []
    for (const drink of DRINKS) {
      if (drink.category) {
        if (!groups[drink.category]) groups[drink.category] = []
        groups[drink.category].push(drink)
      } else {
        flat.push(drink)
      }
    }
    return { groups, flat }
  }, [])

  const total = useMemo(
    () => Object.values(quantities).reduce((a, b) => a + b, 0),
    [quantities]
  )

  const handleQuantityChange = (drinkId, value) => {
    setQuantities((prev) => ({ ...prev, [drinkId]: Math.max(0, value) }))
  }

  const resetForm = () => {
    setQuantities(emptyQuantities())
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus(null)

    if (!linked || !userId) {
      setStatus({ type: 'error', message: "Your account isn't linked yet, so we can't save this." })
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
        <a className="logo-link" href="https://titandpecker.com" aria-label="Tit & Pecker home">
          <img src="/images/tp-logo.png" alt="Tit & Pecker logo" className="logo" />
        </a>
        <div className="page__header-text">
          <p className="eyebrow">Tit & Pecker</p>
          <h1>Log your drinks</h1>
        </div>
      </header>

      <form id="log-form" onSubmit={handleSubmit} className="form">
        <div className="field">
          <label>Who are you?</label>
          {identityLoading ? (
            <p className="status">Loading…</p>
          ) : linked ? (
            <p className="identity">
              Logged in as <strong>{displayName}</strong>
            </p>
          ) : (
            <div className="claim">
              <p className="claim__intro">
                Welcome, {displayName}! Pick your name to link your account.
              </p>
              {unclaimed.length === 0 ? (
                <p className="status status--error" role="alert">
                  No roster names are available to claim. Ask the group admin to add you.
                </p>
              ) : (
                <>
                  <select
                    value={claimId}
                    onChange={(e) => setClaimId(e.target.value)}
                    disabled={claiming}
                  >
                    <option value="" disabled>Select your name</option>
                    {unclaimed.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={handleClaim}
                    disabled={!claimId || claiming}
                  >
                    {claiming ? 'Linking…' : 'This is me'}
                  </button>
                </>
              )}
              {claimError && (
                <p className="status status--error" role="alert">{claimError}</p>
              )}
            </div>
          )}
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
            {Object.entries(categorisedGroups.groups).map(([cat, drinks]) => {
              const isOpen = !!openAccordions[cat]
              const groupTotal = drinks.reduce((sum, d) => sum + (quantities[d.id] ?? 0), 0)
              return (
                <div key={cat} className="accordion">
                  <button
                    type="button"
                    className="accordion__header"
                    onClick={() => toggleAccordion(cat)}
                    aria-expanded={isOpen}
                  >
                    <span className="accordion__title">{cat}</span>
                    {groupTotal > 0 && (
                      <span className="accordion__tally">{groupTotal}</span>
                    )}
                    <span className={`accordion__chevron${isOpen ? ' accordion__chevron--open' : ''}`}>▼</span>
                  </button>
                  {isOpen && (
                    <div className="accordion__body">
                      {drinks.map((drink) => (
                        <DrinkRow
                          key={drink.id}
                          drink={drink}
                          quantity={quantities[drink.id] ?? 0}
                          onChange={(val) => handleQuantityChange(drink.id, val)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {categorisedGroups.flat.map((drink) => (
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
        <button type="submit" form="log-form" className="btn btn--primary btn--full" disabled={submitting || identityLoading || !linked}>
          {submitting ? 'Saving…' : 'Log your drinks'}
        </button>
      </div>
    </div>
  )
}
