import { useState, useEffect } from 'react'
import api from '../api/axiosClient'
import ProjectCard from '../components/ProjectCard'

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [search, setSearch] = useState('')
  const [domain, setDomain] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', skillsNeeded: '', domain: 'general', teamSize: 4 })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const load = () => {
    const params = {}
    if (search) params.search = search
    if (domain !== 'all') params.domain = domain
    api.get('/projects', { params }).then(r => {
      const data = r.data
      const projectsList = data.projects || data || []
      setProjects(projectsList)
    }).catch(err => {
      console.error('Load projects error:', err)
      setProjects([])
    })
  }

  useEffect(() => { load() }, [])

  const set = (key, val) => setForm({ ...form, [key]: val })

  const create = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!form.title.trim()) {
      setError('Project title is required')
      return
    }
    
    if (form.title.trim().length < 3) {
      setError('Project title must be at least 3 characters')
      return
    }
    
    if (!form.skillsNeeded.trim()) {
      setError('Please add at least one skill needed')
      return
    }
    
    const teamSize = parseInt(form.teamSize)
    if (teamSize < 2 || teamSize > 8) {
      setError('Team size must be between 2 and 8')
      return
    }
    
    setLoading(true)
    
    try {
      await api.post('/projects', form)
      setShowCreate(false)
      setForm({ title: '', description: '', skillsNeeded: '', domain: 'general', teamSize: 4 })
      setError('')
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Projects</h1>
        <button className="btn btn-primary" onClick={() => { setShowCreate(!showCreate); setError('') }}>
          {showCreate ? 'Cancel' : '+ New Project'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={create} className="create-form" style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 10, marginBottom: 24, border: '1px solid var(--border)' }}>
          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
          
          <div className="form-group">
            <label>Title *</label>
            <input 
              value={form.title} 
              onChange={e => set('title', e.target.value)} 
              required 
              placeholder="Project name" 
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea 
              value={form.description} 
              onChange={e => set('description', e.target.value)} 
              rows={3} 
              placeholder="What are you building?" 
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label>Domain</label>
            <select value={form.domain} onChange={e => set('domain', e.target.value)} disabled={loading}>
              {['fintech', 'healthtech', 'edtech', 'AI/ML', 'web3', 'social', 'general'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          
          <div className="form-group">
            <label>Skills Needed * (comma separated)</label>
            <input 
              value={form.skillsNeeded} 
              onChange={e => set('skillsNeeded', e.target.value)} 
              placeholder="React, Node.js, Python" 
              required
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label>Team Size (2-8)</label>
            <input 
              type="number" 
              value={form.teamSize} 
              onChange={e => set('teamSize', e.target.value)} 
              min={2} 
              max={8}
              disabled={loading}
            />
          </div>
          
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      )}

      <div className="filter-bar">
        <input placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} />
        <select value={domain} onChange={e => setDomain(e.target.value)}>
          <option value="all">All Domains</option>
          {['fintech', 'healthtech', 'edtech', 'AI/ML', 'web3', 'social', 'general'].map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <button className="btn btn-primary" onClick={load}>Search</button>
      </div>

      {projects.length === 0 ? <p className="muted" style={{ textAlign: 'center', padding: 40 }}>No projects found</p> : (
        <div className="card-grid">
          {projects.map(p => <ProjectCard key={p._id} project={p} />)}
        </div>
      )}
    </div>
  )
}
