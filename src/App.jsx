import { Routes, Route, NavLink } from 'react-router-dom'
import LogDrinks from './LogDrinks'
import Leaderboard from './Leaderboard'
import MySessions from './MySessions'

export default function App() {
  return (
    <div className="app">
      <main className="app__main">
        <Routes>
          <Route path="/" element={<LogDrinks />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/my-sessions" element={<MySessions />} />
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
      </nav>
    </div>
  )
}
