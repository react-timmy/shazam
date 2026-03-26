
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { useProjects } from '../contexts/ProjectsContext'
import './PromptsLibrary.css'

function ProjectCard({ project, onOpen }) {
  const [copied, setCopied] = useState(false)
  const date = new Date(project.updatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  const handleCopy = (e) => {
    e.stopPropagation()
    navigator.clipboard?.writeText(project.prompt || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    // FIX: Pass the entire project object instead of just project.id
    <div className="lib-card" onClick={() => onOpen(project)}>
      {/* Thumbnail */}
      <div className="lib-card__thumb">
        {project.thumbnail ? (
          <img src={project.thumbnail} alt={project.name} className="lib-card__thumb-img" />
        ) : (
          <div className="lib-card__thumb-empty">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="3" y="3" width="26" height="26" rx="6" stroke="currentColor" strokeWidth="1.4"/>
              <circle cx="11" cy="12" r="3" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M4 24l7-7 5 5 4-4 8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
        <span className="lib-card__badge">ANALYZED</span>
      </div>

      {/* Body */}
      <div className="lib-card__body">
        <h3 className="lib-card__title">{project.name}</h3>
        <p className="lib-card__date">Updated {date}</p>
        <p className="lib-card__preview">{project.prompt?.slice(0, 120)}...</p>

        <div className="lib-card__actions" onClick={e => e.stopPropagation()}>
          {/* FIX: Pass the entire project object here as well */}
          <button className="lib-card__btn lib-card__btn--primary" onClick={() => onOpen(project)}>
            Open
          </button>
          <button className={`lib-card__btn lib-card__btn--ghost ${copied ? 'lib-card__btn--copied' : ''}`} onClick={handleCopy}>
            {copied ? '✓ Copied' : 'Copy Prompt'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PromptsLibrary() {
  const navigate = useNavigate()
  const { projects } = useProjects()
  const [search, setSearch] = useState('')

  const filtered = projects.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.prompt?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppShell>
      <div className="lib">
        {/* Header */}
        <div className="lib__header">
          <div>
            <h1 className="lib__title">Prompt Library</h1>
            <p className="lib__sub">Your history of generated implementation prompts.</p>
          </div>
          <button className="lib__new-btn" onClick={() => navigate('/editor/new')}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1v13M1 7.5h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            New Prompt
          </button>
        </div>

        {/* Search */}
        <div className="lib__search">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input
            placeholder="Search your prompts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="lib__search-clear" onClick={() => setSearch('')}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* Count */}
        {projects.length > 0 && (
          <div className="lib__count">
            <span className="lib__count-num">{filtered.length}</span>
            {search ? ` result${filtered.length !== 1 ? 's' : ''} for "${search}"` : ` prompt${filtered.length !== 1 ? 's' : ''}`}
          </div>
        )}

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="lib__grid">
            {filtered.map(p => (
              <ProjectCard key={p._id || p.id} project={p} onOpen={proj => navigate(`/editor/${proj._id || proj.id}`)} />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="lib__empty">
            <div className="lib__empty-icon">⚡</div>
            <h2 className="lib__empty-title">No prompts yet</h2>
            <p className="lib__empty-desc">Upload a design and analyze it to generate your first implementation spec. It'll appear here.</p>
            <button className="lib__empty-btn" onClick={() => navigate('/editor/new')}>
              Analyze Your First Design
            </button>
          </div>
        ) : (
          <div className="lib__empty">
            <div className="lib__empty-icon">🔍</div>
            <h2 className="lib__empty-title">No results</h2>
            <p className="lib__empty-desc">No prompts match "{search}"</p>
            <button className="lib__empty-btn lib__empty-btn--ghost" onClick={() => setSearch('')}>Clear search</button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
