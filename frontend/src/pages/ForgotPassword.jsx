import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axiosClient'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [resetToken, setResetToken] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data } = await api.post('/auth/forgot-password', { email })
      setSuccess(true)
      if (data.resetToken) setResetToken(data.resetToken)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset link')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <h2>✅ Check Your Email</h2>
            <p className="muted">If the email exists, we've sent a reset link</p>
          </div>

          {resetToken && (
            <div className="alert alert-info">
              <strong>Dev Mode:</strong> 
              <Link to={`/reset-password?token=${resetToken}`}>Click here to reset</Link>
            </div>
          )}

          <Link to="/login" className="btn btn-outline btn-block">Back to Login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h2>🔒 Forgot Password</h2>
          <p className="muted">Enter your email to reset password</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@college.edu"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="auth-switch">
          Remember password? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
