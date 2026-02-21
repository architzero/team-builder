import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axiosClient'
import ProjectCard from '../components/ProjectCard'
import SkillCard from '../components/SkillCard'

export default function Dashboard() {
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [myProjects, setMyProjects] = useState({ created: [], joined: [] })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [availabilityFilter, setAvailabilityFilter] = useState('all')
  const [filteredProjects, setFilteredProjects] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsRes, usersRes, myProjectsRes] = await Promise.allSettled([
          api.get('/projects'),
          api.get('/users'),
          api.get('/projects/user/mine')
        ])

        if (projectsRes.status === 'fulfilled') {
          const data = projectsRes.value.data
          const projectsList = data.projects || data || []
          setProjects(projectsList)
          setFilteredProjects(projectsList)
        }

        if (usersRes.status === 'fulfilled') {
          const usersList = usersRes.value.data.users || []
          setUsers(usersList)
          setFilteredUsers(usersList)
        }

        if (myProjectsRes.status === 'fulfilled') {
          setMyProjects(myProjectsRes.value.data || { created: [], joined: [] })
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Unified search and filter
  useEffect(() => {
    if (!searchQuery && availabilityFilter === 'all') {
      setFilteredProjects(projects)
      setFilteredUsers(users)
      return
    }

    const query = searchQuery.toLowerCase()

    // Filter projects by title, skills, or domain
    const matchedProjects = projects.filter(p => 
      p.title?.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query) ||
      p.domain?.toLowerCase().includes(query) ||
      p.skillsNeeded?.some(s => s.toLowerCase().includes(query))
    )

    // Filter users by name, skills, or college
    let matchedUsers = users.filter(u => 
      u.name?.toLowerCase().includes(query) ||
      u.college?.toLowerCase().includes(query) ||
      u.skills?.some(s => s.toLowerCase().includes(query)) ||
      u.interests?.some(i => i.toLowerCase().includes(query))
    )

    // Apply availability filter
    if (availabilityFilter !== 'all') {
      matchedUsers = matchedUsers.filter(u => u.availability === availabilityFilter)
    }

    setFilteredProjects(matchedProjects)
    setFilteredUsers(matchedUsers)
  }, [searchQuery, availabilityFilter, projects, users])

  return (
    <div className="dashboard">
      <div className="dash-header">
        <h1>Dashboard</h1>
        <div className="dash-actions">
          <Link to="/projects" className="btn btn-primary">New Project</Link>
          <Link to="/ai" className="btn btn-accent">AI Agent</Link>
        </div>
      </div>

      {/* Unified Search Bar */}
      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search projects, users, skills..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 2 }}
        />
        <select value={availabilityFilter} onChange={(e) => setAvailabilityFilter(e.target.value)}>
          <option value="all">All Users</option>
          <option value="available">Available</option>
          <option value="busy">Busy</option>
          <option value="in-team">In Team</option>
        </select>
        {(searchQuery || availabilityFilter !== 'all') && (
          <button className="btn btn-sm btn-outline" onClick={() => { setSearchQuery(''); setAvailabilityFilter('all'); }}>
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <p className="muted">Loading...</p>
      ) : (
        <>
          {(myProjects.created.length > 0 || myProjects.joined.length > 0) && (
            <section className="section">
              <h2>My Teams</h2>
              <div className="card-grid">
                {myProjects.created.map(p => (
                  <Link key={p._id} to={`/projects/${p._id}`} className="project-card owned">
                    <span className="badge badge-accent">Creator</span>
                    <h3>{p.title}</h3>
                    <p className="muted">{p.domain} · {p.teamSize} members</p>
                  </Link>
                ))}
                {myProjects.joined.map(p => (
                  <Link key={p._id} to={`/projects/${p._id}`} className="project-card">
                    <span className="badge">Member</span>
                    <h3>{p.title}</h3>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="section">
            <h2>Open Projects ({filteredProjects.length})</h2>
            {filteredProjects.length === 0 ? <p className="muted">No projects found</p> : (
              <div className="card-grid">
                {filteredProjects.map(p => <ProjectCard key={p._id} project={p} />)}
              </div>
            )}
          </section>

          <section className="section">
            <h2>Available Teammates ({filteredUsers.length})</h2>
            {filteredUsers.length === 0 ? <p className="muted">No users found</p> : (
              <div className="card-grid">
                {filteredUsers.slice(0, 12).map(u => <SkillCard key={u._id} user={u} />)}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
