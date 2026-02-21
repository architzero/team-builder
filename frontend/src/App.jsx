import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import Navbar from './components/Navbar'
import ThemeToggle from './components/ThemeToggle'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import CompleteProfile from './pages/CompleteProfile'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import AIAgent from './pages/AIAgent'
import Messages from './pages/Messages'
import api from './api/axiosClient'

// ── Auth Context ─────────────────────────────────────────────────────────────
export const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

// ── Private Route ────────────────────────────────────────────────────────────
function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <p className="muted">Authenticating...</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />

  if (!user.profileComplete && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />
  }

  return children
}

// ── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const location = useLocation()

  // Check if current page is auth page (no navbar)
  const isAuthPage = ['/', '/login', '/signup', '/forgot-password', '/reset-password'].includes(location.pathname)

  // Validate token on mount — fetch fresh user from server
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setAuthLoading(false)
      return
    }

    api.get('/auth/me')
      .then(({ data }) => {
        // Sync localStorage with fresh server data
        localStorage.setItem('user', JSON.stringify({
          id: data._id,
          name: data.name,
          email: data.email,
          profileComplete: data.profileComplete,
          avatar: data.avatar,
        }))
        setUser(data)
      })
      .catch(() => {
        // Token invalid or expired beyond refresh — clear everything
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        setUser(null)
      })
      .finally(() => setAuthLoading(false))
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  const authValue = { user, setUser, loading: authLoading }

  return (
    <AuthContext.Provider value={authValue}>
      {user && <Navbar theme={theme} toggleTheme={toggleTheme} />}
      {!user && isAuthPage && <ThemeToggle theme={theme} toggleTheme={toggleTheme} />}
      <main className="container">
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/complete-profile" element={<PrivateRoute><CompleteProfile /></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/profile/:id" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/projects" element={<PrivateRoute><Projects /></PrivateRoute>} />
          <Route path="/projects/:id" element={<PrivateRoute><ProjectDetail /></PrivateRoute>} />
          <Route path="/ai" element={<PrivateRoute><AIAgent /></PrivateRoute>} />
          <Route path="/messages" element={<PrivateRoute><Messages /></PrivateRoute>} />
          <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
        </Routes>
      </main>
    </AuthContext.Provider>
  )
}

