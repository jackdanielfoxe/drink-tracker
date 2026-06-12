import { Routes, Route, NavLink } from 'react-router-dom'
import LogDrinks from './LogDrinks'
import Leaderboard from './Leaderboard'

export default function App() {
  return (
    <div className="app">
      <main className="app__main">
        <Routes>
          <Route path="/" element={<LogDrinks />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </main>

      <nav className="bottom-nav">
        <NavLink to="/" className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}>
          <span className="bottom-nav__icon">🍻</span>
          <span>Log</span>
        </NavLink>
        <NavLink to="/leaderboard" className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}>
          <span className="bottom-nav__icon">🏆</span>
          <span>Leaderboard</span>
        </NavLink>
      </nav>
    </div>
  )
}
