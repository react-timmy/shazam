import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { useAuth } from '../contexts/AuthContext'
import { useProjects } from '../contexts/ProjectsContext'
import './Settings.css'

export default function Settings() {
  const navigate = useNavigate()
  const { user, updateUser, deleteAccount } = useAuth()
  const { projects, getUsageToday, getUsageRemaining } = useProjects()

  const [name, setName] = useState(user?.name || '')
  const [editingName, setEditingName] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = React.useRef()

  const handleSaveName = () => {
    if (!name.trim()) return
    updateUser({ name: name.trim() })
    setEditingName(false)
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2000)
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const dataUrl = ev.target.result
        // Store as avatar in DB via updateUser
        await updateUser({ avatar: dataUrl })
        setAvatarUploading(false)
      }
      reader.readAsDataURL(file)
    } catch {
      setAvatarUploading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') return
    try {
      await deleteAccount()
      navigate('/')
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email ? user.email[0].toUpperCase() : '?'

  const actionsToday = getUsageToday()
  const actionsRemaining = getUsageRemaining()

  return (
    <AppShell>
      <div className="settings">
        <div className="settings__header">
          <h1 className="settings__title">Settings</h1>
          <p className="settings__sub">Manage your account and see how much of today’s allowance you’ve used.</p>
        </div>

        {/* ── Account ── */}
        <div className="settings__card">
          <div className="settings__card-head">
            <h2 className="settings__card-title">Account</h2>
            <p className="settings__card-sub">Your profile information.</p>
          </div>

          <div className="settings__row">
            <label className="settings__label">Avatar</label>
            {user?.avatar ? (
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="settings__avatar"
                  style={{objectFit:'cover',padding:0}}
                />
                {!user?.googleId && (
                  <>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleAvatarUpload}
                    />
                    <button
                      className="settings__btn settings__btn--ghost"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarUploading}
                    >
                      {avatarUploading ? 'Uploading...' : 'Change photo'}
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div className="settings__avatar">{initials}</div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleAvatarUpload}
                />
                <button
                  className="settings__btn settings__btn--ghost"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                >
                  {avatarUploading ? 'Uploading...' : 'Upload photo'}
                </button>
              </div>
            )}
          </div>

          <div className="settings__row">
            <label className="settings__label">Name</label>
            {editingName ? (
              <div className="settings__inline-edit">
                <input
                  className="settings__input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                />
                <button className="settings__btn settings__btn--primary" onClick={handleSaveName}>Save</button>
                <button className="settings__btn settings__btn--ghost" onClick={() => { setEditingName(false); setName(user?.name || '') }}>Cancel</button>
              </div>
            ) : (
              <div className="settings__inline-edit">
                <span className="settings__value">{user?.name}</span>
                <button className="settings__btn settings__btn--ghost" onClick={() => setEditingName(true)}>Edit</button>
                {nameSaved && <span className="settings__saved">✓ Saved</span>}
              </div>
            )}
          </div>

          <div className="settings__row">
            <label className="settings__label">Email</label>
            <span className="settings__value settings__value--muted">{user?.email}</span>
          </div>

          <div className="settings__row">
            <label className="settings__label">Member since</label>
            <span className="settings__value settings__value--muted">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
            </span>
          </div>
        </div>

        {/* ── Usage ── */}
        <div className="settings__card">
          <div className="settings__card-head">
            <h2 className="settings__card-title">Usage</h2>
            <p className="settings__card-sub">SHAZAM is a free tool. Each account can use up to 20 AI actions per day; the count resets at midnight UTC.</p>
          </div>

          <div className="settings__usage-grid">
            <div className="settings__usage-stat">
              <span className="settings__usage-val">{actionsToday}</span>
              <span className="settings__usage-label">AI actions used today</span>
              <div className="settings__usage-bar">
                <div className="settings__usage-fill" style={{width:`${Math.min(100,(actionsToday/20)*100)}%`}}/>
              </div>
              <span className="settings__usage-limit">{actionsToday} of 20 actions</span>
            </div>
            <div className="settings__usage-stat">
              <span className="settings__usage-val">{actionsRemaining}</span>
              <span className="settings__usage-label">Actions remaining today</span>
              <div className="settings__usage-bar">
                <div className="settings__usage-fill" style={{width:`${Math.min(100,(actionsRemaining/20)*100)}%`}}/>
              </div>
              <span className="settings__usage-limit">Resets at midnight UTC</span>
            </div>
          </div>
        </div>

        {/* ── AI Engine ── */}
        <div className="settings__card">
          <div className="settings__card-head">
            <h2 className="settings__card-title">AI Engine</h2>
            <p className="settings__card-sub">Image analysis and generation run through SHAZAM’s Gemini service. The provider key stays on the server.</p>
          </div>
          <div className="settings__row">
            <label className="settings__label">Model</label>
            <span className="settings__badge settings__badge--green">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <circle cx="5" cy="5" r="4" fill="currentColor" opacity="0.2"/>
                <path d="M2.5 5l2 2 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Gemini 3.8 Flash
            </span>
          </div>
          <div className="settings__row">
            <label className="settings__label">Managed by</label>
            <span className="settings__value settings__value--muted">SHAZAM server — your designs stay private</span>
          </div>
        </div>

        {/* ── Danger Zone ── */}
        <div className="settings__card settings__card--danger">
          <div className="settings__card-head">
            <h2 className="settings__card-title settings__card-title--danger">Danger Zone</h2>
            <p className="settings__card-sub">Irreversible actions. Be careful.</p>
          </div>

          <div className="settings__danger-row">
            <div>
              <p className="settings__danger-title">Delete Account</p>
              <p className="settings__danger-desc">Permanently delete your account and all generated prompts. This cannot be undone.</p>
            </div>
            <button className="settings__btn settings__btn--danger" onClick={() => setShowDeleteConfirm(true)}>
              Delete Account
            </button>
          </div>
        </div>

        {/* Delete confirm modal */}
        {showDeleteConfirm && (
          <div className="settings__modal-backdrop" onClick={e => e.target === e.currentTarget && setShowDeleteConfirm(false)}>
            <div className="settings__modal">
              <h3 className="settings__modal-title">Delete your account?</h3>
              <p className="settings__modal-body">
                This will permanently delete your account, all {projects.length} generated prompt{projects.length !== 1 ? 's' : ''}, and all your data. This <strong>cannot be undone</strong>.
              </p>
              <p className="settings__modal-instruction">
                Type <strong>DELETE</strong> to confirm:
              </p>
              <input
                className="settings__input"
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder="DELETE"
                autoFocus
              />
              <div className="settings__modal-actions">
                <button className="settings__btn settings__btn--ghost" onClick={() => { setShowDeleteConfirm(false); setDeleteInput('') }}>
                  Cancel
                </button>
                <button
                  className="settings__btn settings__btn--danger"
                  disabled={deleteInput !== 'DELETE'}
                  onClick={handleDeleteAccount}
                >
                  Yes, Delete Everything
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
