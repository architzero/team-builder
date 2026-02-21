import { useState } from 'react'

export default function AvatarUpload({ currentAvatar, userName, onUpload }) {
  const [preview, setPreview] = useState(currentAvatar || '')
  const [uploading, setUploading] = useState(false)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      alert('Image too large. Max 2MB')
      return
    }

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    setUploading(true)
    const reader = new FileReader()
    
    reader.onloadend = () => {
      const base64 = reader.result
      setPreview(base64)
      onUpload(base64)
      setUploading(false)
    }
    
    reader.onerror = () => {
      alert('Failed to read file')
      setUploading(false)
    }
    
    reader.readAsDataURL(file)
  }

  const handleRemove = () => {
    setPreview('')
    onUpload('')
  }

  const getInitials = () => {
    if (!userName) return '?'
    return userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="avatar-upload">
      <div className="avatar-preview">
        {preview ? (
          <img src={preview} alt="Profile" />
        ) : (
          <div className="avatar-placeholder">{getInitials()}</div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <label className="btn btn-sm btn-outline">
          {uploading ? 'Uploading...' : 'Change Photo'}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>
        {preview && (
          <button 
            className="btn btn-sm btn-outline" 
            onClick={handleRemove}
            style={{ color: 'var(--danger)' }}
          >
            Remove
          </button>
        )}
      </div>
      <p className="text-muted" style={{ fontSize: '12px', marginTop: '8px' }}>
        Max 2MB · JPG, PNG, GIF
      </p>
    </div>
  )
}
