import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { useAuth } from '../contexts/AuthContext'
import { useProjects } from '../contexts/ProjectsContext'
import './Settings.css'

const PLANS = [
  {
    id: 'FREE',
    name: 'Free',
    price: '$0',
    period: null,
    features: ['20 AI actions/month', '5 total projects', 'Design analysis', 'Asset generation', 'Fix prompts'],
  },
]

export default function Settings() {
  const navigate = useNavigate()
  const { user, updateUser, deleteAccount } = useAuth()
  const { projects, getUsageThisMonth } = useProjects()

  const [name, setName] = useState(user?.name || '')
  const [email] = useState(user?.email || '') // email is read-only
  const [editingName, setEditingName] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [upgradeMsg, setUpgradeMsg] = useState('')
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

  const handleUpgrade = (planId) => {
    if (planId === user?.plan) return
    // In a real app this would open Stripe — for now we just update the local plan
    updateUser({ plan: planId })
    setUpgradeMsg(`Upgraded to ${planId} plan!`)
    setTimeout(() => setUpgradeMsg(''), 3000)
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

  const thisMonthCount = getUsageThisMonth()

  return (
    <AppShell>
      <div className="settings">
        <div className="settings__header">
          <h1 className="settings__title">Settings</h1>
          <p className="settings__sub">Manage your account, plan, and API configuration.</p>
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
            <p className="settings__card-sub">Your current usage this month.</p>
          </div>

          <div className="settings__usage-grid">
            <div className="settings__usage-stat">
              <span className="settings__usage-val">{thisMonthCount}</span>
              <span className="settings__usage-label">AI actions this month</span>
              <div className="settings__usage-bar">
                <div className="settings__usage-fill" style={{width:`${Math.min(100,(thisMonthCount/20)*100)}%`}}/>
              </div>
              <span className="settings__usage-limit">{thisMonthCount} of 20 free</span>
            </div>
            <div className="settings__usage-stat">
              <span className="settings__usage-val">{projects.length}</span>
              <span className="settings__usage-label">Total projects</span>
              <div className="settings__usage-bar">
                <div className="settings__usage-fill" style={{width:`${Math.min(100,(projects.length/5)*100)}%`}}/>
              </div>
              <span className="settings__usage-limit">{projects.length} of 5 max</span>
            </div>
            <div className="settings__usage-stat">
              <span className="settings__usage-val">{user?.plan || 'FREE'}</span>
              <span className="settings__usage-label">Current plan</span>
            </div>
          </div>
        </div>

        {/* ── AI Engine ── */}
        <div className="settings__card">
          <div className="settings__card-head">
            <h2 className="settings__card-title">AI Engine</h2>
            <p className="settings__card-sub">Image analysis is powered by Gemini 2.5 Flash (Google) on our server. No API key required from you.</p>
          </div>
          <div className="settings__row">
            <label className="settings__label">Model</label>
            <span className="settings__badge settings__badge--green">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <circle cx="5" cy="5" r="4" fill="currentColor" opacity="0.2"/>
                <path d="M2.5 5l2 2 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Gemini 2.5 Flash — Active
            </span>
          </div>
          <div className="settings__row">
            <label className="settings__label">Managed by</label>
            <span className="settings__value settings__value--muted">SHAZAM server — your designs stay private</span>
          </div>
        </div>

        {/* ── Plan ── */}
        <div className="settings__card">
          <div className="settings__card-head">
            <h2 className="settings__card-title">Plan</h2>
            <p className="settings__card-sub">Billing and monthly prompt usage.</p>
          </div>

          <div className="settings__row">
            <label className="settings__label">Current Plan</label>
            <span className="settings__badge settings__badge--lightning">{user?.plan || 'FREE'}</span>
          </div>

          {upgradeMsg && (
            <div className="settings__upgrade-msg">⚡ {upgradeMsg}</div>
          )}

          <div className="settings__plans">
            {PLANS.map(plan => (
              <div
                key={plan.id}
                className={`settings__plan ${plan.featured ? 'settings__plan--featured' : ''} ${user?.plan === plan.id ? 'settings__plan--active' : ''}`}
              >
                {plan.featured && <div className="settings__plan-badge">⚡ POPULAR</div>}
                <div className="settings__plan-header">
                  <span className="settings__plan-name">{plan.name}</span>
                  <span className="settings__plan-price">
                    {plan.price}
                    {plan.period && <span className="settings__plan-per">/{plan.period}</span>}
                  </span>
                </div>
                <ul className="settings__plan-features">
                  {plan.features.map((f,i) => (
                    <li key={i}>
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                        <path d="M1.5 5.5l2.5 2.5 5.5-5.5" stroke={plan.featured ? 'var(--lightning)' : 'var(--orange)'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={`settings__plan-btn ${user?.plan === plan.id ? 'settings__plan-btn--active' : plan.featured ? 'settings__plan-btn--featured' : ''}`}
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={user?.plan === plan.id}
                >
                  {user?.plan === plan.id ? 'Current Plan' : `Upgrade to ${plan.name}`}
                </button>
              </div>
            ))}
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
