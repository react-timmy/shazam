import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/auth/me`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => { setUser(data.user || null) })
      .catch(() => { setUser(null) })
      .finally(() => setLoading(false))
  }, [])

  // ── Google OAuth ──────────────────────────────────────────────────────────
  const loginWithGoogle = () => {
    window.location.href = `${API_BASE}/auth/google`
  }

  // ── Form signup (email + password) ────────────────────────────────────────
  const signup = async ({ name, email, password }) => {
    const res  = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Signup failed.')
    setUser(data.user)
    return data.user
  }

  // ── Form login (email + password) ─────────────────────────────────────────
  const login = async ({ email, password }) => {
    const res  = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed.')
    setUser(data.user)
    return data.user
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' })
    setUser(null)
  }

  // ── Update user ───────────────────────────────────────────────────────────
  const updateUser = async (updates) => {
    try {
      const res  = await fetch(`${API_BASE}/api/user`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      })
      const data = await res.json()
      if (data.user) setUser(data.user)
    } catch {}
  }

  // ── Delete account ────────────────────────────────────────────────────────
  const deleteAccount = async () => {
    await fetch(`${API_BASE}/api/user`, { method: 'DELETE', credentials: 'include' })
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user, loading,
      loginWithGoogle, signup, login, logout,
      updateUser, deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
