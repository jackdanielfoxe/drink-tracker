import { useEffect, useState } from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import LogDrinks from './LogDrinks'
import Leaderboard from './Leaderboard'
import MySessions from './MySessions'
import Auth from './Auth'
import { supabase } from './supabaseClient'

export default function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    let active = true

    // Initial session check on load
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setAuthLoading(false)
    })

    // React immediately to sign-in / sign-out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setAuthLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  if (authLoading) {
    return (
      <div className="app">
        <div className="auth-page">
          <p className="auth-subtitle">Loading…</p>
        </div>
      </div>
    )
  }

  // Not logged in: every route shows the sign-in page
  if (!session) {
    return (
      <div className="app">
        <main className="app__main app__main--auth">
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </Routes>
        </main>
      </div>
    )
  }

  // Logged in: the normal app
  return (
    <div className="app">
      <main className="app__main">
        <Routes>
          <Route path="/" element={<LogDrinks />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/my-sessions" element={<MySessions />} />
          <Route path="/auth" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <nav className="bottom-nav">
        <NavLink to="/" className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}>
          <span className="bottom-nav__icon">🍻</span>
          <span>Log</span>
        </NavLink>
        <NavLink to="/my-sessions" className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}>
          <span className="bottom-nav__icon">📝</span>
          <span>My sessions</span>
        </NavLink>
        <NavLink to="/leaderboard" className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}>
          <span className="bottom-nav__icon">🏆</span>
          <span>Leaderboard</span>
        </NavLink>
        <a href="https://titandpecker.com/members" className="bottom-nav__item">
          <span className="bottom-nav__icon">🏛️</span>
          <span>Members</span>
        </a>
        <button type="button" className="bottom-nav__signout" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </nav>
    </div>
  )
}
