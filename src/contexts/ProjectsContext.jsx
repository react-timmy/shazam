import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'

const ProjectsContext = createContext(null)

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function ProjectsProvider({ children }) {
  const { user } = useAuth()
  const [projects,   setProjects]   = useState([])
  const [usageCount, setUsageCount] = useState(0)

  const fetchProjects = useCallback(async () => {
    if (!user) { setProjects([]); return }
    try {
      const res  = await fetch(`${API_BASE}/api/projects`, { credentials: 'include' })
      const data = await res.json()
      setProjects(data.projects || [])
    } catch { setProjects([]) }
  }, [user])

  const fetchUsage = useCallback(async () => {
    if (!user) { setUsageCount(0); return }
    try {
      const res  = await fetch(`${API_BASE}/api/usage`, { credentials: 'include' })
      const data = await res.json()
      setUsageCount(data.count || 0)
    } catch { setUsageCount(0) }
  }, [user])

  useEffect(() => {
    fetchProjects()
    fetchUsage()
  }, [fetchProjects, fetchUsage])

  const addProject = async (project) => {
    const res  = await fetch(`${API_BASE}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(project),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to create project')
    setProjects(prev => [data.project, ...prev])
    await trackUsage()
    return data.project
  }

  const updateProject = async (id, updates) => {
    try {
      const res  = await fetch(`${API_BASE}/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      })
      const data = await res.json()
      if (data.project) {
        setProjects(prev => prev.map(p =>
          (p._id === id || p.id === id) ? data.project : p
        ))
      }
    } catch (err) {
      console.error('updateProject failed:', err)
    }
  }

  const deleteProject = async (id) => {
    await fetch(`${API_BASE}/api/projects/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    setProjects(prev => prev.filter(p => p._id !== id && p.id !== id))
  }

  const getProject = (id) => projects.find(p => p._id === id || p.id === id) || null

  const trackUsage = async () => {
    try {
      const res  = await fetch(`${API_BASE}/api/usage/track`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json()
      setUsageCount(data.count || 0)
    } catch {}
  }

  const getUsageThisMonth = () => usageCount

  return (
    <ProjectsContext.Provider value={{
      projects, addProject, updateProject, deleteProject,
      getProject, trackUsage, getUsageThisMonth,
      refreshProjects: fetchProjects,
    }}>
      {children}
    </ProjectsContext.Provider>
  )
}

export const useProjects = () => useContext(ProjectsContext)
