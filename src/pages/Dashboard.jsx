import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { useAuth } from '../contexts/AuthContext'
import { useProjects } from '../contexts/ProjectsContext'
import './Dashboard.css'

function StatCard({ label, value, accent }) {
  return (
    <div className="dash-stat">
      <span className={`dash-stat__value ${accent ? 'dash-stat__value--accent' : ''}`}>{value}</span>
      <span className="dash-stat__label">{label}</span>
    </div>
  )
}

function ProjectCard({ project, onDelete, onOpen, onCopy }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const statusDate = new Date(project.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="dash-project">
      <div className="dash-project__header">
        <div className="dash-project__meta-wrap">
          <h3 className="dash-project__name">{project.name}</h3>
          <div className="dash-project__meta">
            <span className="dash-project__status">
              {project.status}
            </span>
            <span className="dash-project__date">Updated {statusDate}</span>
            {project.imageCount > 0 && (
              <span className="dash-project__images">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <rect x="1" y="1" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.1"/>
                  <circle cx="3.5" cy="4" r="1" stroke="currentColor" strokeWidth="1"/>
                  <path d="M1.5 8.5l2.5-2.5 2 2 1-1 2 2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {project.imageCount} image{project.imageCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <div className="dash-project__actions">
          <button className="dash-project__btn" onClick={() => onOpen(project._id || project.id)}>Open</button>
          <button className="dash-project__btn dash-project__btn--ghost" onClick={() => onCopy(project.prompt)}>Copy Prompt</button>
          <div className="dash-project__menu-wrap">
            <button className="dash-project__menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="3" r="1" fill="currentColor"/>
                <circle cx="7" cy="7" r="1" fill="currentColor"/>
                <circle cx="7" cy="11" r="1" fill="currentColor"/>
              </svg>
            </button>
            {menuOpen && (
              <>
                <div className="dash-project__menu-overlay" onClick={() => setMenuOpen(false)} />
                <div className="dash-project__menu">
                  <button onClick={() => { onOpen(project._id || project.id); setMenuOpen(false) }}>Open</button>
                  <button onClick={() => { onCopy(project.prompt); setMenuOpen(false) }}>Copy Prompt</button>
                  <button className="danger" onClick={() => { setMenuOpen(false); onDelete(project._id || project.id) }}>Delete</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <p className="dash-project__preview">{project.prompt || 'No prompt generated yet.'}</p>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { projects, deleteProject, getUsageThisMonth } = useProjects()
  const [copied, setCopied] = useState(false)

  const firstName = user?.name?.split(' ')[0] || 'there'

  const handleCopy = (text) => {
    navigator.clipboard?.writeText(text || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const thisMonthCount = getUsageThisMonth()

  const readyCount = projects.filter(p => p.prompt && p.prompt.length > 50).length

  const stats = [
    { label: 'Prompt Projects', value: projects.length.toString() },
    { label: 'Prompts This Month', value: thisMonthCount.toString() },
    { label: 'Ready Prompts', value: readyCount.toString() },
    { label: 'Current Plan', value: user?.plan || 'FREE', accent: true },
  ]

  return (
    <AppShell>
      <div className="dash">
        {/* Welcome */}
        <div className="dash-welcome">
          <div>
            <h1 className="dash-welcome__title">Welcome back, <span>{firstName}</span></h1>
            <p className="dash-welcome__sub">Generate, refine, and organize master implementation prompts from design references.</p>
          </div>
          <button className="dash-welcome__cta" onClick={() => navigate('/editor/new')}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            New Prompt
          </button>
        </div>

        {/* Stats */}
        <div className="dash-stats">
          {stats.map((s, i) => <StatCard key={i} {...s} />)}
        </div>

        {/* Projects */}
        <div className="dash-section">
          <div className="dash-section__header">
            <h2 className="dash-section__title">Recent Prompt Projects</h2>
            <button className="dash-section__new-btn" onClick={() => navigate('/editor/new')}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              New Prompt
            </button>
          </div>

          <div className="dash-projects">
            {projects.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                onOpen={(id) => navigate(`/editor/${id}`)}
                onCopy={handleCopy}
                onDelete={deleteProject}
              />
            ))}

            {/* New project card */}
            <button className="dash-new-card" onClick={() => navigate('/editor/new')}>
              <div className="dash-new-card__icon">
                <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                  <path d="M13 4v18M4 13h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="dash-new-card__title">New Prompt</p>
              <p className="dash-new-card__sub">Upload reference designs or screen recordings and generate a strict implementation prompt.</p>
            </button>
          </div>
        </div>

        {/* Copy toast */}
        {copied && (
          <div className="dash-toast">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2 6.5l3.5 3.5L11 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Copied to clipboard!
          </div>
        )}
      </div>
    </AppShell>
  )
}
