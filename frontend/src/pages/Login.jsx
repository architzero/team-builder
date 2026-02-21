import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import api from '../api/axiosClient'
import { useAuth } from '../App'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setUser } = useAuth()

  const handleLoginSuccess = (data) => {
    localStorage.setItem('token', data.token)
    localStorage.setItem('refreshToken', data.refreshToken)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    navigate(data.user.profileComplete ? '/dashboard' : '/complete-profile', { replace: true })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data } = await api.post('/auth/login', { email, password })
      handleLoginSuccess(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('')
    setLoading(true)

    try {
      const { data } = await api.post('/auth/google', {
        credential: credentialResponse.credential
      })
      handleLoginSuccess(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Google login failed')
      setLoading(false)
    }
  }

  const handleGoogleError = () => {
    setError('Google login failed. Please try again.')
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Welcome Back</h2>
          <p className="muted">Sign in to find your perfect team</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading && <div className="alert alert-info">Signing in with Google...</div>}

        {/* Google Sign In */}
        <div className="google-auth">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap={false}
            theme="filled_blue"
            size="large"
            text="signin_with"
            width="100%"
            ux_mode="popup"
          />
        </div>

        <div className="divider">
          <span>or continue with email</span>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@college.edu"
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              disabled={loading}
            />
            <div style={{ textAlign: 'right', marginTop: '8px' }}>
              <Link to="/forgot-password" style={{ fontSize: '14px', color: 'var(--primary)' }}>
                Forgot password?
              </Link>
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
            style={{ marginTop: '8px' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-switch">
          New to TeamBuilder? <Link to="/signup" style={{ fontWeight: 600 }}>Create an account</Link>
        </p>
      </div>
    </div>
  )
}

