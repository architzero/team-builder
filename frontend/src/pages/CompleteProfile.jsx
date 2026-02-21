import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axiosClient'
import { useAuth } from '../App'
import AvatarUpload from '../components/AvatarUpload'

const SKILL_SUGGESTIONS = [
  'React', 'Node.js', 'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C#',
  'HTML', 'CSS', 'MongoDB', 'PostgreSQL', 'MySQL', 'Docker', 'AWS', 'Git',
  'Express', 'Django', 'Flask', 'Next.js', 'Vue.js', 'Angular', 'React Native',
  'Machine Learning', 'AI', 'Data Science', 'UI/UX Design', 'Figma',
  'Blockchain', 'Web3', 'DevOps', 'CI/CD'
]

const INTEREST_SUGGESTIONS = [
  'Web Development', 'Mobile Development', 'AI/ML', 'Data Science', 'Blockchain',
  'Cybersecurity', 'Cloud Computing', 'Game Development', 'FinTech', 'HealthTech',
  'UI/UX Design', 'Full Stack', 'Hackathons', 'Open Source', 'Startups'
]

export default function CompleteProfile() {
  const [form, setForm] = useState({
    skills: [],
    experienceLevel: 'beginner',
    interests: [],
    availability: 'available',
    bio: '',
    college: '',
    year: 1,
    avatar: ''
  })
  const [userName, setUserName] = useState('')
  const [skillInput, setSkillInput] = useState('')
  const [interestInput, setInterestInput] = useState('')
  const [skillSuggestions, setSkillSuggestions] = useState([])
  const [interestSuggestions, setInterestSuggestions] = useState([])
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false)
  const [showInterestSuggestions, setShowInterestSuggestions] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const navigate = useNavigate()
  const { setUser } = useAuth()

  useEffect(() => {
    api.get('/users/me').then(({ data }) => {
      setUserName(data.name || '')
      setForm({
        skills: data.skills || [],
        experienceLevel: data.experienceLevel || 'beginner',
        interests: data.interests || [],
        availability: data.availability || 'available',
        bio: data.bio || '',
        college: data.college || '',
        year: data.year || 1,
        avatar: data.avatar || ''
      })
    }).catch(() => { })
  }, [])

  const addSkill = (skill = skillInput) => {
    const trimmedSkill = skill.trim()
    if (trimmedSkill && trimmedSkill.length <= 50 && form.skills.length < 20 && !form.skills.includes(trimmedSkill)) {
      setForm({ ...form, skills: [...form.skills, trimmedSkill] })
      setSkillInput('')
      setShowSkillSuggestions(false)
    }
  }

  const removeSkill = (index) => {
    setForm({ ...form, skills: form.skills.filter((_, i) => i !== index) })
  }

  const addInterest = (interest = interestInput) => {
    const trimmedInterest = interest.trim()
    if (trimmedInterest && trimmedInterest.length <= 50 && form.interests.length < 10 && !form.interests.includes(trimmedInterest)) {
      setForm({ ...form, interests: [...form.interests, trimmedInterest] })
      setInterestInput('')
      setShowInterestSuggestions(false)
    }
  }

  const removeInterest = (index) => {
    setForm({ ...form, interests: form.interests.filter((_, i) => i !== index) })
  }

  const handleSkillInputChange = (value) => {
    setSkillInput(value)
    if (value.trim()) {
      const filtered = SKILL_SUGGESTIONS.filter(s =>
        s.toLowerCase().includes(value.toLowerCase()) &&
        !form.skills.includes(s)
      ).slice(0, 6)
      setSkillSuggestions(filtered)
      setShowSkillSuggestions(filtered.length > 0)
    } else {
      setShowSkillSuggestions(false)
    }
  }

  const handleInterestInputChange = (value) => {
    setInterestInput(value)
    if (value.trim()) {
      const filtered = INTEREST_SUGGESTIONS.filter(i =>
        i.toLowerCase().includes(value.toLowerCase()) &&
        !form.interests.includes(i)
      ).slice(0, 6)
      setInterestSuggestions(filtered)
      setShowInterestSuggestions(filtered.length > 0)
    } else {
      setShowInterestSuggestions(false)
    }
  }

  const handleNext = () => {
    if (form.skills.length === 0) {
      setError('Please add at least one skill')
      return
    }
    if (form.interests.length === 0) {
      setError('Please add at least one interest')
      return
    }
    setError('')
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.college.trim()) {
      setError('Please enter your college')
      return
    }

    setLoading(true)

    try {
      const { data } = await api.put('/users/me', form)

      // Update both localStorage and global auth context with the fresh server data
      const updatedUser = {
        id: data._id,
        name: data.name,
        email: data.email,
        profileComplete: data.profileComplete,
        avatar: data.avatar,
      }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setUser(data)

      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.clear()
        navigate('/login', { replace: true })
      } else {
        setError(err.response?.data?.error || 'Failed to update profile')
        setLoading(false)
      }
    }
  }

  return (
    <div className="complete-profile-page">
      <div className="complete-profile-card">
        <div className="profile-header">
          <h2>Complete Your Profile</h2>
          <p className="muted">Step {step} of 2</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {step === 1 ? (
          <div>
            {/* Profile Picture */}
            <div className="form-group" style={{ textAlign: 'center', marginBottom: '24px' }}>
              <AvatarUpload 
                currentAvatar={form.avatar}
                userName={userName}
                onUpload={(base64) => setForm({ ...form, avatar: base64 })}
              />
            </div>

            {/* Skills */}
            <div className="form-group">
              <label>Skills * (Add at least 1)</label>
              <div className="tag-input-wrapper">
                <div className="tag-input">
                  <input
                    value={skillInput}
                    onChange={(e) => handleSkillInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addSkill()
                      }
                    }}
                    placeholder="Type a skill (e.g., React)"
                    disabled={form.skills.length >= 20}
                  />
                  <button type="button" onClick={() => addSkill()} className="btn btn-sm" disabled={!skillInput.trim()}>
                    Add
                  </button>
                </div>
                {showSkillSuggestions && (
                  <div className="suggestions">
                    {skillSuggestions.map((suggestion, i) => (
                      <div
                        key={i}
                        className="suggestion-item"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          addSkill(suggestion)
                        }}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="skill-tags">
                {form.skills.map((skill, i) => (
                  <span key={i} className="tag tag-lg">
                    {skill}
                    <button type="button" onClick={() => removeSkill(i)} className="tag-remove">×</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Experience Level */}
            <div className="form-group">
              <label>Experience Level *</label>
              <select
                value={form.experienceLevel}
                onChange={(e) => setForm({ ...form, experienceLevel: e.target.value })}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>

            {/* Interests */}
            <div className="form-group">
              <label>Interests * (Add at least 1)</label>
              <div className="tag-input-wrapper">
                <div className="tag-input">
                  <input
                    value={interestInput}
                    onChange={(e) => handleInterestInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addInterest()
                      }
                    }}
                    placeholder="e.g., AI, Web3"
                    disabled={form.interests.length >= 10}
                  />
                  <button type="button" onClick={() => addInterest()} className="btn btn-sm" disabled={!interestInput.trim()}>
                    Add
                  </button>
                </div>
                {showInterestSuggestions && (
                  <div className="suggestions">
                    {interestSuggestions.map((suggestion, i) => (
                      <div
                        key={i}
                        className="suggestion-item"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          addInterest(suggestion)
                        }}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="skill-tags">
                {form.interests.map((interest, i) => (
                  <span key={i} className="tag tag-lg">
                    {interest}
                    <button type="button" onClick={() => removeInterest(i)} className="tag-remove">×</button>
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="btn btn-primary btn-block"
              disabled={form.skills.length === 0 || form.interests.length === 0}
            >
              Next →
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* College */}
            <div className="form-group">
              <label>College/University *</label>
              <input
                value={form.college}
                onChange={(e) => setForm({ ...form, college: e.target.value })}
                placeholder="MIT"
                disabled={loading}
                required
              />
            </div>

            {/* Year */}
            <div className="form-group">
              <label>Year</label>
              <select
                value={form.year}
                onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })}
                disabled={loading}
              >
                <option value={1}>Year 1</option>
                <option value={2}>Year 2</option>
                <option value={3}>Year 3</option>
                <option value={4}>Year 4</option>
                <option value={5}>Post-grad</option>
              </select>
            </div>

            {/* Availability */}
            <div className="form-group">
              <label>Availability *</label>
              <select
                value={form.availability}
                onChange={(e) => setForm({ ...form, availability: e.target.value })}
                disabled={loading}
              >
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="in-team">In Team</option>
              </select>
            </div>

            {/* Bio */}
            <div className="form-group">
              <label>Bio (Optional)</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={3}
                placeholder="Tell us about yourself..."
                maxLength={500}
                disabled={loading}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn btn-outline"
                disabled={loading}
              >
                ← Back
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={loading || !form.college.trim()}
              >
                {loading ? 'Saving...' : 'Complete Profile'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
