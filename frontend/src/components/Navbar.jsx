import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import api from '../api/axiosClient'
import { useAuth } from '../App'

export default function Navbar({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const { setUser } = useAuth()

  useEffect(() => {
    // Check for unread messages
    api.get('/match/my-messages')
      .then(r => {
        const unread = r.data.received.filter(m => m.status === 'sent').length
        setUnreadCount(unread)
      })
      .catch(() => {})
  }, [])

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {}
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setUser(null)
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <Link to="/dashboard" className="nav-brand">
        TeamBuilder
      </Link>
      <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
        <Link to="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link>
        <Link to="/projects" onClick={() => setMenuOpen(false)}>Projects</Link>
        <Link to="/ai" onClick={() => setMenuOpen(false)}>AI Agent</Link>
        <Link to="/profile" onClick={() => setMenuOpen(false)}>Profile</Link>
        <Link to="/messages" onClick={() => setMenuOpen(false)} className="nav-messages" title="Messages">
          Messages
          {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
        </Link>
        <button onClick={toggleTheme} className="btn-icon" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        <button onClick={logout} className="btn btn-sm btn-outline">Logout</button>
      </div>
      <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
    </nav>
  )
}
