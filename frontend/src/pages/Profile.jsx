import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axiosClient'
import { useAuth } from '../App'
import AvatarUpload from '../components/AvatarUpload'

export default function Profile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [msg, setMsg] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  const { setUser: setAuthUser } = useAuth()
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
  const isOwn = !id || id === currentUser.id

  useEffect(() => {
    const url = isOwn ? '/users/me' : `/users/${id}`
    api.get(url)
      .then(r => { setUser(r.data); setForm(r.data) })
      .catch(() => setLoadError(true))
  }, [id])

  const set = (key, val) => setForm({ ...form, [key]: val })

  const save = async () => {
    try {
      // Always send skills as a clean array, never a string
      const skillsArr = typeof form.skills === 'string'
        ? form.skills.split(',').map(s => s.trim()).filter(Boolean)
        : (form.skills || [])

      const payload = { ...form, skills: skillsArr }
      const { data } = await api.put('/users/me', payload)
      setUser(data)
      setForm(data)
      setEditing(false)
      setMsg('Profile saved!')
      setTimeout(() => setMsg(''), 3000)

      // Keep auth context + localStorage in sync so Navbar shows updated name
      if (isOwn) {
        const updatedUser = {
          id: data._id,
          name: data.name,
          email: data.email,
          profileComplete: data.profileComplete,
          avatar: data.avatar,
        }
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setAuthUser(data)
      }
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to save')
    }
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    setDeleteError('')

    try {
      const payload = user.googleId ? {} : { password: deletePassword }

      if (!user.googleId && !deletePassword.trim()) {
        setDeleteError('Password is required')
        setDeleting(false)
        return
      }

      await api.delete('/users/me', { data: payload })
      localStorage.clear()
      window.location.href = '/login'
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Failed to delete account')
      setDeleting(false)
    }
  }

  if (loadError) return <p className="muted" style={{ padding: 40, textAlign: 'center' }}>Could not load profile. Please try again.</p>
  if (!user) return <p className="muted" style={{ padding: 40, textAlign: 'center' }}>Loading profile...</p>

  return (
    <div className="profile-page">
      {msg && <div className="alert alert-success" style={{ marginBottom: 20 }}>{msg}</div>}
      
      <div className="profile-card">
        <div className="profile-header-card">
          <div className="profile-avatar-section">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="avatar avatar-xl" style={{ objectFit: 'cover' }} />
            ) : (
              <div className="avatar avatar-xl">{user.name?.charAt(0).toUpperCase()}</div>
            )}
          </div>
          <div className="profile-info-section">
            <h1>{user.name}</h1>
            <p className="muted">{user.email}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {user.college && <span className="muted">{user.college}</span>}
              {user.year && <span className="muted">• Year {user.year}</span>}
              <span className={`badge badge-${user.availability === 'available' ? 'open' : 'muted'}`}>{user.availability}</span>
            </div>
          </div>
          {isOwn && !editing && (
            <button className="btn btn-primary" onClick={() => setEditing(true)}>Edit Profile</button>
          )}
        </div>

        {editing ? (
          <div className="profile-edit-section">
            <div className="form-group" style={{ textAlign: 'center', marginBottom: 24 }}>
              <AvatarUpload 
                currentAvatar={form.avatar}
                userName={form.name}
                onUpload={(base64) => set('avatar', base64)}
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Name</label>
                <input value={form.name || ''} onChange={e => set('name', e.target.value)} />
              </div>
              <div className="form-group">
                <label>College</label>
                <input value={form.college || ''} onChange={e => set('college', e.target.value)} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Year</label>
                <select value={form.year || 1} onChange={e => set('year', e.target.value)}>
                  {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>{y === 5 ? 'Post-grad' : `Year ${y}`}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Availability</label>
                <select value={form.availability || 'available'} onChange={e => set('availability', e.target.value)}>
                  <option value="available">Available</option>
                  <option value="busy">Busy</option>
                  <option value="in-team">In a Team</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Bio</label>
              <textarea value={form.bio || ''} onChange={e => set('bio', e.target.value)} rows={3} placeholder="Tell us about yourself..." />
            </div>

            <div className="form-group">
              <label>Skills (comma separated)</label>
              <input value={typeof form.skills === 'string' ? form.skills : form.skills?.join(', ')} onChange={e => set('skills', e.target.value)} placeholder="React, Node.js, Python" />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>GitHub</label>
                <input value={form.github || ''} onChange={e => set('github', e.target.value)} placeholder="https://github.com/username" />
              </div>
              <div className="form-group">
                <label>LinkedIn</label>
                <input value={form.linkedin || ''} onChange={e => set('linkedin', e.target.value)} placeholder="https://linkedin.com/in/username" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn btn-primary" onClick={save}>Save Changes</button>
              <button className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
            </div>

            <div className="danger-zone">
              <h3>Danger Zone</h3>
              <p className="muted">Once you delete your account, there is no going back.</p>
              <button className="btn btn-danger" onClick={() => setShowDeleteModal(true)}>Delete Account</button>
            </div>
          </div>
        ) : (
          <div className="profile-content">
            {user.bio && (
              <div className="profile-section">
                <h3>About</h3>
                <p>{user.bio}</p>
              </div>
            )}

            <div className="profile-section">
              <h3>Skills</h3>
              {user.skills?.length === 0 ? (
                <p className="muted">No skills added</p>
              ) : (
                <div className="skill-tags">
                  {user.skills?.map((s, i) => <span key={i} className="tag tag-lg">{s}</span>)}
                </div>
              )}
            </div>

            {(user.github || user.linkedin) && (
              <div className="profile-section">
                <h3>Links</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  {user.github && <a href={user.github} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline">GitHub</a>}
                  {user.linkedin && <a href={user.linkedin} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline">LinkedIn</a>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ color: 'var(--danger)' }}>Delete Account</h3>
            <p>This action cannot be undone. {user.googleId ? 'Click delete to confirm.' : 'Enter your password to confirm.'}</p>
            {deleteError && <div className="alert alert-error">{deleteError}</div>}
            {!user.googleId && (
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={e => setDeletePassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={deleting}
                />
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                className="btn btn-danger"
                style={{ flex: 1 }}
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Account'}
              </button>
              <button className="btn btn-outline" onClick={() => setShowDeleteModal(false)} disabled={deleting}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
