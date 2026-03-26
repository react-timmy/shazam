import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProjectsProvider } from './contexts/ProjectsContext'
import Homepage from './pages/Homepage'
import Dashboard from './pages/Dashboard'
import PromptEditor from './pages/PromptEditor'
import PromptsLibrary from './pages/PromptsLibrary'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Settings from './pages/Settings'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#080808'}}>
      <div style={{width:24,height:24,border:'2px solid rgba(255,92,0,0.2)',borderTopColor:'#FF5C00',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
    </div>
  )
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/editor/:id" element={<ProtectedRoute><PromptEditor /></ProtectedRoute>} />
      <Route path="/library" element={<ProtectedRoute><PromptsLibrary /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProjectsProvider>
          <AppRoutes />
        </ProjectsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
