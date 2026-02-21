import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import api from '../api/axiosClient'
import { useAuth } from '../App'

export default function Signup() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState({ valid: false, errors: [] })
  const navigate = useNavigate()
  const { setUser } = useAuth()

  const handleSignupSuccess = (data) => {
    localStorage.setItem('token', data.token)
    localStorage.setItem('refreshToken', data.refreshToken)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    navigate(data.user.profileComplete ? '/dashboard' : '/complete-profile', { replace: true })
  }

  const set = (key, val) => {
    setForm({ ...form, [key]: val })
    if (key === 'password') validatePassword(val)
  }

  const validatePassword = (password) => {
    const errors = []
    if (!password || password.length < 8) errors.push('At least 8 characters')
    if (!/[A-Z]/.test(password)) errors.push('One uppercase letter')
    if (!/[a-z]/.test(password)) errors.push('One lowercase letter')
    if (!/\d/.test(password)) errors.push('One number')

    setPasswordStrength({
      valid: errors.length === 0 && password.length > 0,
      errors
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) {
      setError('Name is required')
      return
    }

    if (!form.email.trim()) {
      setError('Email is required')
      return
    }

    if (!passwordStrength.valid) {
      setError('Password must be at least 8 characters with uppercase, lowercase, and number')
      return
    }

    setLoading(true)

    try {
      const { data } = await api.post('/auth/register', form)
      handleSignupSuccess(data)
    } catch (err) {
      if (err.response?.data?.details) {
        setError(err.response.data.details.map(d => d.message).join(', '))
      } else if (err.response?.data?.error) {
        setError(err.response.data.error)
      } else {
        setError('Signup failed. Please try again.')
      }
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
      handleSignupSuccess(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Google signup failed')
      setLoading(false)
    }
  }

  const handleGoogleError = () => {
    setError('Google signup failed. Please try again.')
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Create Your Account</h2>
          <p className="muted">Start building your dream team today</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading && <div className="alert alert-info">Signing in with Google...</div>}

        <div className="google-auth">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="filled_blue"
            size="large"
            text="signup_with"
            width="100%"
            ux_mode="popup"
          />
        </div>

        <div className="divider">
          <span>or continue with email</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              required
              placeholder="Enter your full name"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              required
              placeholder="you@college.edu"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              required
              placeholder="Create a strong password"
              disabled={loading}
            />
            {form.password && (
              <div className="password-strength" style={{ marginTop: '10px' }}>
                {passwordStrength.valid ? (
                  <span className="text-success" style={{ fontSize: '13px', fontWeight: 500 }}>✓ Strong password</span>
                ) : (
                  <ul className="password-requirements" style={{ fontSize: '13px' }}>
                    {passwordStrength.errors.map((err, i) => (
                      <li key={i} className="text-muted">• {err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading || !form.name || !form.email || !form.password}
            style={{ marginTop: '8px' }}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login" style={{ fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
