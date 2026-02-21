import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api/axiosClient'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState({ valid: false, errors: [] })
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link')
    }
  }, [token])

  const validatePassword = (pwd) => {
    const errors = []
    if (!pwd || pwd.length < 8) errors.push('At least 8 characters')
    if (!/[A-Z]/.test(pwd)) errors.push('One uppercase letter')
    if (!/[a-z]/.test(pwd)) errors.push('One lowercase letter')
    if (!/\d/.test(pwd)) errors.push('One number')

    setPasswordStrength({
      valid: errors.length === 0 && pwd.length > 0,
      errors
    })
  }

  const handlePasswordChange = (pwd) => {
    setPassword(pwd)
    validatePassword(pwd)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!passwordStrength.valid) {
      setError('Password must meet all requirements')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      await api.post('/auth/reset-password', { token, password })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <h2>✅ Password Reset</h2>
            <p className="muted">Redirecting to login...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h2>🔑 Reset Password</h2>
          <p className="muted">Enter your new password</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              value={password}
              onChange={e => handlePasswordChange(e.target.value)}
              required
              placeholder="Min 8 characters"
              disabled={loading || !token}
            />
            {password && (
              <div className="password-strength">
                {passwordStrength.valid ? (
                  <span className="text-success">✓ Strong password</span>
                ) : (
                  <ul className="password-requirements">
                    {passwordStrength.errors.map((err, i) => (
                      <li key={i} className="text-muted">• {err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              placeholder="Re-enter password"
              disabled={loading || !token}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading || !token || !passwordStrength.valid}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <p className="auth-switch">
          <Link to="/login">Back to Login</Link>
        </p>
      </div>
    </div>
  )
}
