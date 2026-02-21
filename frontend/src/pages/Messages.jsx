import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axiosClient'

export default function Messages() {
  const [data, setData] = useState({ received: [], sent: [] })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState({})

  const load = () => {
    api.get('/match/my-messages').then(r => setData(r.data)).catch(() => setError('Failed to load messages'))
  }

  useEffect(() => { load() }, [])

  const showMessage = (msg, isError = false) => {
    if (isError) {
      setError(msg)
      setSuccess('')
    } else {
      setSuccess(msg)
      setError('')
    }
    setTimeout(() => { setError(''); setSuccess('') }, 3000)
  }

  const handleAccept = async (matchId) => {
    setLoading({ ...loading, [matchId]: true })
    try {
      await api.post(`/match/${matchId}/accept`)
      showMessage('Invite accepted! ✅')
      load()
    } catch (err) {
      showMessage(err.response?.data?.error || 'Failed to accept invite', true)
    } finally {
      setLoading({ ...loading, [matchId]: false })
    }
  }

  const handleReject = async (matchId) => {
    setLoading({ ...loading, [matchId]: true })
    try {
      await api.post(`/match/${matchId}/reject`)
      showMessage('Invite rejected')
      load()
    } catch (err) {
      showMessage(err.response?.data?.error || 'Failed to reject invite', true)
    } finally {
      setLoading({ ...loading, [matchId]: false })
    }
  }

  return (
    <div>
      <h1>Messages</h1>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

      <section className="section">
        <h2>Received ({data.received.length})</h2>
        {data.received.length === 0 ? (
          <div className="empty-state">
            <p className="muted">No messages yet</p>
            <Link to="/ai" className="btn btn-accent">Find Teammates</Link>
          </div>
        ) : (
          <div className="message-list">
            {data.received.map(m => (
              <div key={m._id} className="message-card unread">
                <div className="message-header">
                  <Link to={`/profile/${m.requester?._id}`}><strong>{m.requester?.name}</strong></Link>
                  {m.isAiDrafted && <span className="badge badge-accent">AI Drafted</span>}
                  <span className="badge badge-{m.status}">{m.status}</span>
                  <span className="muted">{new Date(m.createdAt).toLocaleDateString()}</span>
                </div>
                {m.project && <p className="muted">Re: {m.project?.title}</p>}
                <p style={{ margin: '12px 0' }}>{m.message}</p>
                {m.suggestedRole && <p className="muted">Suggested role: <strong>{m.suggestedRole}</strong></p>}
                {m.requester?.skills && m.requester.skills.length > 0 && (
                  <div className="skill-tags" style={{ marginTop: 8 }}>
                    {m.requester.skills.slice(0, 5).map((s, i) => <span key={i} className="tag">{s}</span>)}
                  </div>
                )}
                {m.status === 'sent' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button 
                      className="btn btn-sm btn-primary" 
                      onClick={() => handleAccept(m._id)}
                      disabled={loading[m._id]}
                    >
                      {loading[m._id] ? 'Accepting...' : '✓ Accept'}
                    </button>
                    <button 
                      className="btn btn-sm btn-outline" 
                      onClick={() => handleReject(m._id)}
                      disabled={loading[m._id]}
                    >
                      {loading[m._id] ? 'Rejecting...' : '✕ Reject'}
                    </button>
                  </div>
                )}
                {m.status === 'accepted' && (
                  <div className="alert alert-success" style={{ marginTop: 12, padding: 8, fontSize: 14 }}>
                    ✓ You accepted this invite
                  </div>
                )}
                {m.status === 'rejected' && (
                  <div className="alert alert-error" style={{ marginTop: 12, padding: 8, fontSize: 14 }}>
                    ✕ You rejected this invite
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <h2>Sent ({data.sent.length})</h2>
        {data.sent.length === 0 ? <p className="muted">No sent messages</p> : (
          <div className="message-list">
            {data.sent.map(m => (
              <div key={m._id} className="message-card">
                <div className="message-header">
                  <span>To: <Link to={`/profile/${m.matched?._id}`}><strong>{m.matched?.name}</strong></Link></span>
                  {m.isAiDrafted && <span className="badge badge-accent">AI Drafted</span>}
                  <span className="badge badge-{m.status}">{m.status}</span>
                  <span className="muted">{new Date(m.createdAt).toLocaleDateString()}</span>
                </div>
                {m.project && <p className="muted">Re: {m.project?.title}</p>}
                <p style={{ margin: '12px 0' }}>{m.message}</p>
                {m.status === 'accepted' && (
                  <div className="alert alert-success" style={{ marginTop: 12, padding: 8, fontSize: 14 }}>
                    ✓ Accepted by {m.matched?.name}
                  </div>
                )}
                {m.status === 'rejected' && (
                  <div className="alert alert-error" style={{ marginTop: 12, padding: 8, fontSize: 14 }}>
                    ✕ Rejected by {m.matched?.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
