import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Logo from './Logo'
import './AppShell.css'

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
  },
  {
    label: 'Prompt Library',
    path: '/library',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 3h12M2 6.5h8M2 10h10M2 13.5h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2M2.93 2.93l1.41 1.41M11.66 11.66l1.41 1.41M2.93 13.07l1.41-1.41M11.66 4.34l1.41-1.41" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
]

export default function AppShell({ children }) {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { user, logout } = useAuth()

  const [collapsed,    setCollapsed]    = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileOpen,   setMobileOpen]   = useState(false)

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email
    ? user.email[0].toUpperCase()
    : '?'

  return (
    <div className={`shell ${collapsed ? 'shell--collapsed' : ''}`}>

      {/* ── Mobile top bar ── */}
      <div className="shell__mobile-bar">
        <Logo />
        <button className="shell__hamburger" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen
            ? <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
            : <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
          }
        </button>
      </div>

      {mobileOpen && <div className="shell__overlay" onClick={() => setMobileOpen(false)} />}

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>

        <div className="sidebar__top">
          <Logo onClick={() => setMobileOpen(false)} />
          <button className="sidebar__collapse-btn" onClick={() => setCollapsed(!collapsed)}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d={collapsed ? 'M4 1.5l4.5 5-4.5 5' : 'M8.5 1.5L4 6.5l4.5 5'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <nav className="sidebar__nav">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar__link ${location.pathname === item.path ? 'sidebar__link--active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="sidebar__link-icon">{item.icon}</span>
              {!collapsed && <span className="sidebar__link-label">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="sidebar__bottom">
          {!collapsed && (
            <div className="sidebar__plan">
              <span className="sidebar__plan-badge">{user?.plan || 'FREE'}</span>
              <span className="sidebar__plan-label">Current Plan</span>
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <button className="sidebar__avatar" onClick={() => setUserMenuOpen(!userMenuOpen)} title={user?.name}>
              {user?.avatar
                ? <img src={user.avatar} alt={user.name} style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}} />
                : initials}
            </button>

            {userMenuOpen && (
              <>
                <div className="sidebar__user-overlay" onClick={() => setUserMenuOpen(false)} />
                <div className="sidebar__user-menu">
                  <div className="sidebar__user-info">
                    <span className="sidebar__user-name">{user?.name}</span>
                    <span className="sidebar__user-email">{user?.email}</span>
                  </div>
                  <div className="sidebar__user-divider" />
                  <button onClick={() => { navigate('/settings'); setUserMenuOpen(false) }}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <circle cx="6.5" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M6.5 1v1.5M6.5 10v1.5M1 6.5h1.5M10 6.5h1.5M2.7 2.7l1 1M9.3 9.3l1 1M9.3 2.7l-1 1M2.7 9.3l1-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                    Settings
                  </button>
                  <button className="danger" onClick={() => { logout(); navigate('/login'); setUserMenuOpen(false) }}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M5 2H2.5A1.5 1.5 0 001 3.5v6A1.5 1.5 0 002.5 11H5M9 9l3-3-3-3M12 6.5H5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="shell__main">
        <div className="shell__content">
          {children}
        </div>
      </main>
    </div>
  )
}
